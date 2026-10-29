// Run: npx tsx tests/proxyCore.test.ts
import assert from 'node:assert/strict';
import { fetchViaProxy, validateTarget, isPrivateHost, buildUpstream } from '../src/lib/proxyCore';

type R = { status: number; headers?: Record<string, string>; body?: string };
const fake = (responses: R[] | ((url: string) => R)) => {
  const calls: string[] = [];
  let i = 0;
  const fn = async (url: string) => {
    calls.push(url);
    const r = typeof responses === 'function' ? responses(url) : responses[i++];
    const h = Object.fromEntries(Object.entries(r.headers ?? { 'content-type': 'text/html' }).map(([k, v]) => [k.toLowerCase(), v]));
    return { status: r.status, headers: { get: (n: string) => h[n.toLowerCase()] ?? null }, text: async () => r.body ?? '' };
  };
  return { fn, calls };
};
const on = { enabled: true };

(async () => {
  // Successful load: HTML returned, <base> + nav script injected
  {
    const f = fake([{ status: 200, body: '<html><head><title>Hi</title></head><body><img src="/a.png"></body></html>' }]);
    const r = await fetchViaProxy('https://example.com/page', on, f.fn);
    assert.ok(r.ok);
    if (r.ok) {
      assert.match(r.html, /<base href="https:\/\/example.com\/page">/);
      assert.match(r.html, /nexus-nav/);
      assert.equal(r.finalUrl, 'https://example.com/page');
    }
  }
  // Redirects are followed and re-validated
  {
    const f = fake([{ status: 301, headers: { location: 'https://www.example.com/' } }, { status: 200, body: '<p>ok</p>' }]);
    const r = await fetchViaProxy('https://example.com', on, f.fn);
    assert.ok(r.ok && r.finalUrl === 'https://www.example.com/');
  }
  {
    const f = fake([{ status: 302, headers: { location: 'http://169.254.169.254/latest' } }]);
    const r = await fetchViaProxy('https://example.com', on, f.fn);
    assert.ok(!r.ok && r.code === 'BLOCKED_ADDRESS', 'redirect to metadata IP must be blocked');
  }
  // Proxy failure: network error, 503, timeout
  {
    const r = await fetchViaProxy('https://example.com', on, async () => { throw new Error('ECONNREFUSED'); });
    assert.ok(!r.ok && r.code === 'PROXY_UNAVAILABLE');
    const f = fake([{ status: 503 }]);
    const r2 = await fetchViaProxy('https://example.com', on, f.fn);
    assert.ok(!r2.ok && r2.code === 'PROXY_UNAVAILABLE');
    const slow = (_u: string, init: { signal: AbortSignal }) => new Promise<never>((_, rej) => init.signal.addEventListener('abort', () => rej(new Error('aborted'))));
    const r3 = await fetchViaProxy('https://example.com', { enabled: true, timeoutMs: 50 }, slow);
    assert.ok(!r3.ok && r3.code === 'TIMEOUT');
  }
  // Blocked by site / unsupported content
  {
    const r = await fetchViaProxy('https://example.com', on, fake([{ status: 403 }]).fn);
    assert.ok(!r.ok && r.code === 'BLOCKED_BY_SITE');
    const r2 = await fetchViaProxy('https://example.com/f.pdf', on, fake([{ status: 200, headers: { 'content-type': 'application/pdf' } }]).fn);
    assert.ok(!r2.ok && r2.code === 'UNSUPPORTED');
  }
  // Disabled proxy path never fetches
  {
    const f = fake([{ status: 200, body: 'x' }]);
    const r = await fetchViaProxy('https://example.com', { enabled: false }, f.fn);
    assert.ok(!r.ok && r.code === 'DISABLED');
    assert.equal(f.calls.length, 0);
  }
  // Input validation + private network protection
  for (const bad of ['ftp://example.com', 'javascript:alert(1)', 'not a url', 'https://user:pw@example.com']) assert.ok(!validateTarget(bad).ok, bad);
  for (const host of ['localhost', '127.0.0.1', '10.1.2.3', '192.168.0.1', '172.20.0.1', '169.254.169.254', '::1', 'fd00::1', '2130706433', 'intranet', 'printer.local'])
    assert.ok(isPrivateHost(host), host);
  for (const host of ['example.com', '8.8.8.8', 'www.google.com']) assert.ok(!isPrivateHost(host), host);
  // Upstream proxy URL + token stay server-side
  {
    const u = buildUpstream({ enabled: true, endpoint: 'https://p.example/fetch?u={url}', token: 'secret' }, 'https://a.com/?q=1');
    assert.equal(u.url, 'https://p.example/fetch?u=https%3A%2F%2Fa.com%2F%3Fq%3D1');
    assert.equal(u.headers.Authorization, 'Bearer secret');
  }
  console.log('proxyCore: all tests passed');
})();
