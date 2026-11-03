import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Records limited item ownership and reports how many people own each item and who was first',
  authenticated: true,
  inputSchema: z.object({
    action: z.enum(['claim', 'stats']),
    itemId: z.string().max(120).optional(),
    ownerName: z.string().max(40).optional(),
    itemIds: z.array(z.string().max(120)).max(50).optional(),
  }),
  outputSchema: z.object({
    stats: z.array(z.object({ itemId: z.string(), count: z.number(), firstEmail: z.string(), firstName: z.string() })),
  }),
  execute: async ({ input, context }) => {
    const me = context.user.email.toLowerCase();
    if (input.action === 'claim' && input.itemId) {
      await zite.itemOwners.bulkCreate({
        matchOn: ['itemId', 'ownerEmail'],
        records: [{ itemId: input.itemId, ownerEmail: me, ownerName: input.ownerName || me.split('@')[0] }],
      });
    }
    const ids = input.itemIds ?? (input.itemId ? [input.itemId] : []);
    if (!ids.length) return { stats: [] };
    const { rows } = await zite.sql({
      query: `SELECT DISTINCT ON ("itemId") "itemId", "ownerEmail", "ownerName",
                COUNT(*) OVER (PARTITION BY "itemId") AS cnt
              FROM "ItemOwners" WHERE "itemId" = ANY($1)
              ORDER BY "itemId", "claimedAt" ASC`,
      params: [ids],
    });
    return {
      stats: rows.map(r => ({ itemId: String(r.itemId), count: Number(r.cnt ?? 0), firstEmail: String(r.ownerEmail ?? '').toLowerCase(), firstName: String(r.ownerName ?? '') })),
    };
  },
});
