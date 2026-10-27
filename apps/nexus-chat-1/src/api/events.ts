import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { isOwnerEmail } from '../lib/permissions';

const ov = z.object({ holidayKey: z.string(), earlyStart: z.string().nullable(), forceOn: z.boolean(), forceOff: z.boolean(), shopDrop: z.number() });

export default createEndpoint({
  description: 'Reads holiday event overrides; the owner can start events early, force them on/off, or refresh the limited shop',
  inputSchema: z.object({
    action: z.enum(['list', 'set', 'refreshShop']),
    holidayKey: z.string().max(40).optional(),
    earlyStart: z.string().nullable().optional(),
    forceOn: z.boolean().optional(),
    forceOff: z.boolean().optional(),
  }),
  outputSchema: z.object({ overrides: z.array(ov) }),
  execute: async ({ input, context }) => {
    const isOwner = isOwnerEmail(context.user?.email?.toLowerCase());
    if (input.action !== 'list') {
      if (!isOwner) throw new ZiteError('Only the owner can change events.');
      if (!input.holidayKey) throw new ZiteError('Pick a holiday.');
    }
    if (input.action === 'set') {
      if (input.forceOn) {
        const { records } = await zite.eventOverrides.findAll({ filters: { forceOn: true }, limit: 100 });
        await Promise.all(records.filter(r => r.holidayKey !== input.holidayKey).map(r => zite.eventOverrides.update({ id: r.id, record: { forceOn: false } })));
      }
      await zite.eventOverrides.bulkCreate({
        matchOn: ['holidayKey'],
        records: [{ holidayKey: input.holidayKey!, earlyStart: input.earlyStart ?? null, forceOn: !!input.forceOn, forceOff: !!input.forceOff }],
      });
    }
    if (input.action === 'refreshShop') {
      const cur = await zite.eventOverrides.findOne({ filters: { holidayKey: input.holidayKey! } });
      const next = ((cur?.shopDrop ?? 0) % 10) + 1; // up to 10 drops per event, then cycles
      await zite.eventOverrides.bulkCreate({ matchOn: ['holidayKey'], records: [{ holidayKey: input.holidayKey!, shopDrop: next }] });
    }
    const { records } = await zite.eventOverrides.findAll({ limit: 100 });
    return { overrides: records.map(r => ({ holidayKey: r.holidayKey || '', earlyStart: r.earlyStart ? String(r.earlyStart).slice(0, 10) : null, forceOn: !!r.forceOn, forceOff: !!r.forceOff, shopDrop: r.shopDrop ?? 0 })) };
  },
});
