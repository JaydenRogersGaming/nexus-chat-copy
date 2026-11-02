import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';

export default createEndpoint({
  description: 'Searches GIFs (or trending GIFs) from Giphy for the chat picker',
  inputSchema: z.object({ query: z.string().optional() }),
  outputSchema: z.object({ gifs: z.array(z.object({ id: z.string(), preview: z.string(), url: z.string() })) }),
  execute: async ({ input }) => {
    const q = (input.query ?? '').trim();
    const base = q ? 'https://api.giphy.com/v1/gifs/search' : 'https://api.giphy.com/v1/gifs/trending';
    const params = new URLSearchParams({ api_key: process.env.ZITE_GIPHY_API_KEY, limit: '24', rating: 'pg-13' });
    if (q) params.set('q', q);
    const res = await fetch(`${base}?${params}`);
    if (!res.ok) throw new Error('GIF search failed');
    const data = (await res.json()) as { data: { id: string; images: { fixed_width_small?: { url: string }; fixed_width: { url: string }; downsized?: { url: string } } }[] };
    return {
      gifs: data.data.map(g => ({
        id: g.id,
        preview: g.images.fixed_width_small?.url ?? g.images.fixed_width.url,
        url: g.images.downsized?.url ?? g.images.fixed_width.url,
      })),
    };
  },
});
