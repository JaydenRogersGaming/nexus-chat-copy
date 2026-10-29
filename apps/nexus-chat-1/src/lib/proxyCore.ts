/** Pure, testable core for the in-app browser proxy. No secrets live here — config is passed in. */

export type ProxyConfig = {
  enabled: boolean;
  /** Optional upstream proxy. Use `{url}` as a placeholder, e.g. https://proxy.example.com/fetch?url={url}. Empty = the server fetches directly. */
  endpoint?: string;
  /** Optional bearer token sent to the upstream proxy only. */
  token?: string;
  timeoutMs?: number;
};

export type ProxyResult =
  | { ok: true; html: string; finalUrl: string }
  | { ok: false; code: 'DISABLED' | 'INVALID_URL' | 'BLOCKED_ADDRESS' | 'TIMEOUT' | 'PROXY_UNAVAILABLE' | 'BLOCKED_BY_SITE' | 'UNSUPPORTED' | 'TOO_LARGE'; message: string; status?: number };

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_REDIRECTS = 5;

/** True for loopback, private, link-local, CGNAT, metadata and other non-public hosts. */
export function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (!h || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.lan') || h.endsWith('.home.arpa')) return true;
  if (!h.includes('.') && !h.includes(':')) return true; // bare intranet names
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)) || (a === 192 && b === 0);
  }
  if (/^\d+$/.test(h) || /^0x/i.test(h)) return true; // decimal / hex IP tricks
  if (h.includes(':')) {
    return h === '::' || h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80') || h.startsWith('::ffff:') || h.startsWith('64:ff9b');
  }
  return false;
}

/** Validates user input and returns a normalized public http(s) URL. */
export function validateTarget(raw: string): { ok: true; url: URL } | { ok: false; code: 'INVALID_URL' | 'BLOCKED_ADDRESS'; message: string } {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { return { ok: false, code: 'INVALID_URL', message: 'That doesn\'t look like a valid web address.' }; }
  if (raw.length > 2048) return { ok: false, code: 'INVALID_URL', message: 'That address is too long.' };
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, code: 'INVALID_URL', message: 'Only http and https pages can be opened.' };
  if (url.username || url.password) return { ok: false, code: 'INVALID_URL', message: 'Addresses with logins in them aren\'t allowed.' };
  if (url.port && !['80', '443', '8080', '8443'].includes(url.port)) return { ok: false, code: 'BLOCKED_ADDRESS', message: 'That port isn\'t allowed.' };
  if (isPrivateHost(url.hostname)) return { ok: false, code: 'BLOCKED_ADDRESS', message: 'Private or internal network addresses can\'t be opened.' };
  return { ok: true, url };
}

export function buildUpstream(cfg: ProxyConfig, target: string): { url: string; headers: Record<string, string> } {
  const headers: Record<string, string> = { 'User-Agent': 'Mozilla/5.0 (compatible; NexusBrowser/1.0)', Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5' };
  if (!cfg.endpoint) return { url: target, headers };
  if (cfg.token) headers.Authorization = `Bearer ${cfg.token}`;
  const enc = encodeURIComponent(target);
  return { url: cfg.endpoint.includes('{url}') ? cfg.endpoint.replace('{url}', enc) : `${cfg.endpoint}${cfg.endpoint.includes('?') ? '&' : '?'}url=${enc}`, headers };
}

/** Script injected into proxied pages: routes link clicks / GET forms back to the parent so navigation stays proxied. */
const NAV_SCRIPT = `<script>(function(){function go(u){try{parent.postMessage({type:'nexus-nav',url:new URL(u,document.baseURI).href},'*')}catch(e){}}
document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href');if(!h||h[0]==='#'||/^(javascript|mailto|tel):/i.test(h))return;e.preventDefault();go(a.href)},true);
document.addEventListener('submit',function(e){var f=e.target;if((f.method||'get').toLowerCase()!=='get')return;e.preventDefault();var u=new URL(f.action||document.baseURI,document.baseURI);new FormData(f).forEach(function(v,k){u.searchParams.append(k,String(v))});go(u.href)},true);})();</script>`;

/** Adds <base> so relative assets resolve to the real site, strips CSP/refresh metas, injects nav handler. */
export function rewriteHtml(html: string, baseUrl: string): string {
  const safeBase = baseUrl.replace(/"/g, '&quot;');
  let out = html
    .replace(/<base\b[^>]*>/gi, '')
    .replace(/<meta[^>]+http-equiv=["']?(content-security-policy|refresh)["']?[^>]*>/gi, '');
  const head = `<base href="${safeBase}">${NAV_SCRIPT}`;
  out = /<head[^>]*>/i.test(out) ? out.replace(/<head[^>]*>/i, m => m + head) : head + out;
  return out;
}

type FetchLike = (url: string, init: { headers: Record<string, string>; redirect: 'manual'; signal: AbortSignal }) => Promise<{ status: number; headers: { get(n: string): string | null }; text(): Promise<string> }>;

export async function fetchViaProxy(rawUrl: string, cfg: ProxyConfig, fetchImpl: FetchLike): Promise<ProxyResult> {
  if (!cfg.enabled) return { ok: false, code: 'DISABLED', message: 'The page proxy is turned off.' };
  let v = validateTarget(rawUrl);
  if (!v.ok) return v;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), cfg.timeoutMs ?? 12000);
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const up = buildUpstream(cfg, v.url.href);
      let res;
      try { res = await fetchImpl(up.url, { headers: up.headers, redirect: 'manual', signal: ctrl.signal }); }
      catch (e) {
        if (ctrl.signal.aborted) return { ok: false, code: 'TIMEOUT', message: 'The page took too long to load.' };
        return { ok: false, code: 'PROXY_UNAVAILABLE', message: 'Couldn\'t reach the page or proxy server.' };
      }
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) return { ok: false, code: 'UNSUPPORTED', message: 'The page redirected without a destination.' };
        v = validateTarget(new URL(loc, v.url).href); // re-check every hop
        if (!v.ok) return v;
        continue;
      }
      if (res.status === 401 || res.status === 403 || res.status === 407 || res.status === 429) return { ok: false, code: 'BLOCKED_BY_SITE', status: res.status, message: 'This site doesn\'t allow its pages to be loaded through the proxy. You can still open it in your regular browser.' };
      if (res.status === 502 || res.status === 503 || res.status === 504) return { ok: false, code: 'PROXY_UNAVAILABLE', status: res.status, message: 'The proxy or site is unavailable right now.' };
      if (res.status >= 400) return { ok: false, code: 'UNSUPPORTED', status: res.status, message: `The page returned an error (${res.status}).` };
      const type = (res.headers.get('content-type') || '').toLowerCase();
      if (type && !type.includes('html')) return { ok: false, code: 'UNSUPPORTED', message: 'This isn\'t a web page that can be shown here. Open it in a new tab.' };
      const len = Number(res.headers.get('content-length') || 0);
      if (len > MAX_BYTES) return { ok: false, code: 'TOO_LARGE', message: 'This page is too large to load here.' };
      const body = await res.text();
      if (body.length > MAX_BYTES) return { ok: false, code: 'TOO_LARGE', message: 'This page is too large to load here.' };
      return { ok: true, html: rewriteHtml(body, v.url.href), finalUrl: v.url.href };
    }
    return { ok: false, code: 'UNSUPPORTED', message: 'Too many redirects.' };
  } finally { clearTimeout(timer); }
}
