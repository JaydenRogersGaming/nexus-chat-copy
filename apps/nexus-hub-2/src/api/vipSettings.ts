import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { isOwnerEmail } from '../lib/permissions';
import { deny } from '../lib/serverAuth';

const KEY = 'vipMonthlyPrice';
const DEFAULT = 7000;

export default createEndpoint({
  description: 'Reads the VIP monthly price, and lets the owner change it',
  authenticated: true,
  inputSchema: z.object({ monthlyPrice: z.number().int().min(0).max(100_000_000).optional() }),
  outputSchema: z.object({ monthlyPrice: z.number() }),
  execute: async ({ input, context }) => {
    if (input.monthlyPrice !== undefined) {
      if (!isOwnerEmail(context.user.email)) deny('Only the owner can change the VIP price.');
      await zite.chatSettings.bulkCreate({ records: [{ key: KEY, value: String(input.monthlyPrice) }], matchOn: ['key'] });
    }
    const r = await zite.chatSettings.findOne({ filters: { key: KEY } });
    const n = Number(r?.value);
    return { monthlyPrice: Number.isFinite(n) && r?.value ? n : DEFAULT };
  },
});
