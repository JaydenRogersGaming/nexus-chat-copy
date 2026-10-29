import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { fetchViaProxy, ProxyConfig } from '../lib/proxyCore';

function readConfig(): ProxyConfig {
  const env = process.env as Record<string, string | undefined>;
  return {
    // On by default; set ZITE_PROXY_ENABLED=false to turn it off.
    enabled: (env.ZITE_PROXY_ENABLED ?? 'true').toLowerCase() !== 'false',
    endpoint: env.ZITE_PROXY_ENDPOINT || undefined,
    token: env.ZITE_PROXY_TOKEN || undefined,
    timeoutMs: Math.min(Math.max(Number(env.ZITE_PROXY_TIMEOUT_MS) || 12000, 2000), 25000),
  };
}

export default createEndpoint({
  description: 'Loads a public web page through the configured proxy for the in-app browser',
  authenticated: true,
  inputSchema: z.object({ url: z.string().min(1).max(2048) }),
  outputSchema: z.object({
    ok: z.boolean(),
    html: z.string().optional(),
    finalUrl: z.string().optional(),
    code: z.string().optional(),
    message: z.string().optional(),
  }),
  execute: async ({ input }) => {
    const r = await fetchViaProxy(input.url, readConfig(), (u, init) => fetch(u, init));
    return r.ok ? { ok: true, html: r.html, finalUrl: r.finalUrl } : { ok: false, code: r.code, message: r.message };
  },
});
