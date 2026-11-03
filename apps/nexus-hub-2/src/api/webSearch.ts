import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { runSearch } from '../lib/searchCore';

export default createEndpoint({
  description: 'Searches the web for the in-app browser',
  inputSchema: z.object({ query: z.string().max(500) }),
  outputSchema: z.object({
    ok: z.boolean(),
    provider: z.string().optional(),
    query: z.string().optional(),
    results: z.array(z.object({ title: z.string(), url: z.string(), snippet: z.string(), source: z.string() })).optional(),
    code: z.string().optional(),
    message: z.string().optional(),
  }),
  execute: async ({ input }) => {
    const env = process.env as Record<string, string | undefined>;
    const r = await runSearch(input.query, { braveKey: env.ZITE_BRAVE_SEARCH_KEY || undefined }, (u, init) => fetch(u, init));
    if (!r.ok && r.code !== 'EMPTY_QUERY') console.error('[webSearch] failed', { code: r.code, status: r.status, queryLength: input.query.length });
    return r.ok ? { ok: true, provider: r.provider, query: r.query, results: r.results } : { ok: false, code: r.code, message: r.message };
  },
});
