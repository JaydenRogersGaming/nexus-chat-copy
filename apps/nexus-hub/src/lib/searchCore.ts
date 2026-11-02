/** Pure search core: provider selection, request building and result normalizing. Keys are passed in, never bundled. */

export type SearchResult = { title: string; url: string; snippet: string; source: string };
export type SearchResponse =
  | { ok: true; provider: 'brave' | 'wikipedia'; query: string; results: SearchResult[] }
  | { ok: false; code: 'EMPTY_QUERY' | 'TIMEOUT' | 'PROVIDER_UNAVAILABLE' | 'PROVIDER_BLOCKED' | 'BAD_RESPONSE'; message: string; status?: number };

type FetchLike = (url: string, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<{ status: number; json(): Promise<unknown> }>;

const strip = (s: unknown) => String(s ?? '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

export function normalizeQuery(q: string): string { return q.replace(/\s+/g, ' ').trim().slice(0, 300); }

export function buildRequest(query: string, braveKey?: string): { provider: 'brave' | 'wikipedia'; url: string; headers: Record<string, string> } {
  const q = encodeURIComponent(query); // preserves spaces/special chars correctly
  if (braveKey) return { provider: 'brave', url: `https://api.search.brave.com/res/v1/web/search?q=${q}&count=10&safesearch=strict`, headers: { Accept: 'application/json', 'X-Subscription-Token': braveKey } };
  return { provider: 'wikipedia', url: `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&utf8=1&srlimit=10&origin=*&srsearch=${q}`, headers: { Accept: 'application/json', 'User-Agent': 'NexusBrowser/1.0' } };
}

export function parseResults(provider: 'brave' | 'wikipedia', data: unknown): SearchResult[] | null {
  const d = data as Record<string, any>;
  if (provider === 'brave') {
    const list = d?.web?.results;
    if (!Array.isArray(list)) return d?.type === 'search' ? [] : null;
    return list.filter(r => r?.url).map(r => ({ title: strip(r.title), url: String(r.url), snippet: strip(r.description), source: hostOf(String(r.url)) }));
  }
  const list = d?.query?.search;
  if (!Array.isArray(list)) return null;
  return list.map(r => ({ title: strip(r.title), url: `https://en.wikipedia.org/wiki/${encodeURIComponent(String(r.title).replace(/ /g, '_'))}`, snippet: strip(r.snippet), source: 'wikipedia.org' }));
}

export async function runSearch(rawQuery: string, opts: { braveKey?: string; timeoutMs?: number }, fetchImpl: FetchLike): Promise<SearchResponse> {
  const query = normalizeQuery(rawQuery);
  if (!query) return { ok: false, code: 'EMPTY_QUERY', message: 'Type something to search for.' };
  const req = buildRequest(query, opts.braveKey);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 10000);
  try {
    let res;
    try { res = await fetchImpl(req.url, { headers: req.headers, signal: ctrl.signal }); }
    catch { return ctrl.signal.aborted ? { ok: false, code: 'TIMEOUT', message: 'Search took too long. Try again.' } : { ok: false, code: 'PROVIDER_UNAVAILABLE', message: 'Couldn\'t reach the search provider.' }; }
    if (res.status === 401 || res.status === 403 || res.status === 429) return { ok: false, code: 'PROVIDER_BLOCKED', status: res.status, message: 'The search provider refused this request (limit reached or key invalid). You can search in your regular browser instead.' };
    if (res.status >= 500) return { ok: false, code: 'PROVIDER_UNAVAILABLE', status: res.status, message: 'The search provider is down right now.' };
    if (res.status >= 400) return { ok: false, code: 'BAD_RESPONSE', status: res.status, message: 'The search couldn\'t be completed.' };
    const results = parseResults(req.provider, await res.json().catch(() => null));
    if (!results) return { ok: false, code: 'BAD_RESPONSE', message: 'The search provider sent back something unexpected.' };
    return { ok: true, provider: req.provider, query, results };
  } finally { clearTimeout(timer); }
}
