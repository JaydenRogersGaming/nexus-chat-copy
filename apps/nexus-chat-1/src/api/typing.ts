import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Shares who is typing in a chat room across all devices',
  inputSchema: z.object({
    action: z.enum(['start', 'stop', 'list']),
    roomId: z.string(),
    email: z.string().optional(),
    name: z.string().optional(),
  }),
  outputSchema: z.object({ typing: z.array(z.object({ email: z.string(), name: z.string() })) }),
  execute: async ({ input }) => {
    if ((input.action === 'start' || input.action === 'stop') && input.email) {
      await zite.presence.bulkCreate({
        matchOn: ['email'],
        records: [{
          email: input.email,
          ...(input.name ? { displayName: input.name } : {}),
          typingRoom: input.action === 'start' ? input.roomId : null,
          typingAt: input.action === 'start' ? new Date().toISOString() : null,
        } as never],
      });
    }
    const cutoff = new Date(Date.now() - 6000).toISOString();
    const { rows } = await zite.sql({
      query: `SELECT "email","displayName" FROM "Presence" WHERE "typingRoom" = $1 AND "typingAt" > $2`,
      params: [input.roomId, cutoff],
    });
    return { typing: rows.map(r => ({ email: String(r.email ?? ''), name: String(r.displayName ?? '') })) };
  },
});
