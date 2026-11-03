// Run: npx tsx tests/searchCore.test.ts
import assert from 'node:assert/strict';
import { runSearch, buildRequest } from '../src/lib/searchCore';

/** Fake provider that echoes the decoded query into its results, so we can verify each query maps to its own results. */
const echo = (provider: 'brave' | 'wikipedia') => async (url: string) => {
  const u = new URL(url);
  const q = u.searchParams.get(provider === 'brave' ? 'q' : 'srsearch')!;
  const body = provider === 'brave'
    ? { type: 'search', web: { results: [{ title: `${q} — guide`, url: `https://example.com/${encodeURIComponent(q)}`, description: `All about <b>${q}</b>` }] } }
    : { query: { search: [{ title: `${q} overview`, snippet: `Article on <span>${q}</span>` }] } };
  return { status: 200, json: async () => body };
};

(async () => {
  for (const provider of ['wikipedia', 'brave'] as const) {
    const key = provider === 'brave' ? 'k' : undefined;
    for (const q of ['Minecraft', 'weather in Tokyo', 'how plants grow', 'C++ & Rust: "fast"?']) {
      const r = await runSearch(q, { braveKey: key }, echo(provider));
      assert.ok(r.ok, `${provider} ${q}`);
      if (r.ok) {
        assert.equal(r.provider, provider);
        assert.equal(r.query, q);
        assert.ok(r.results[0].title.includes(q), `title matches query: ${q}`);
        assert.ok(r.results[0].snippet.includes(q) && !r.results[0].snippet.includes('<'), 'snippet cleaned');
        assert.ok(r.results[0].url.startsWith('https://'));
      }
    }
  }
  // Spaces and special chars are encoded, never truncated
  assert.match(buildRequest('weather in Tokyo').url, /srsearch=weather%20in%20Tokyo$/);
  assert.match(buildRequest('a&b=c', 'k').url, /q=a%26b%3Dc&/);
  // Brave key goes in a header only
  assert.equal(buildRequest('x', 'secret').headers['X-Subscription-Token'], 'secret');
  assert.ok(!buildRequest('x', 'secret').url.includes('secret'));

  // Empty query never calls the provider
  let called = false;
  const e = await runSearch('   ', {}, async () => { called = true; return { status: 200, json: async () => ({}) }; });
  assert.ok(!e.ok && e.code === 'EMPTY_QUERY' && !called);
  // Network error, timeout, blocked, down, malformed
  const net = await runSearch('x', {}, async () => { throw new Error('offline'); });
  assert.ok(!net.ok && net.code === 'PROVIDER_UNAVAILABLE');
  const slow = (_u: string, i: { signal: AbortSignal }) => new Promise<never>((_, rej) => i.signal.addEventListener('abort', () => rej(new Error('abort'))));
  const t = await runSearch('x', { timeoutMs: 30 }, slow);
  assert.ok(!t.ok && t.code === 'TIMEOUT');
  const b = await runSearch('x', { braveKey: 'k' }, async () => ({ status: 429, json: async () => ({}) }));
  assert.ok(!b.ok && b.code === 'PROVIDER_BLOCKED');
  const d = await runSearch('x', {}, async () => ({ status: 503, json: async () => ({}) }));
  assert.ok(!d.ok && d.code === 'PROVIDER_UNAVAILABLE');
  const m = await runSearch('x', {}, async () => ({ status: 200, json: async () => ({ nope: 1 }) }));
  assert.ok(!m.ok && m.code === 'BAD_RESPONSE');
  console.log('searchCore: all tests passed');
})();
