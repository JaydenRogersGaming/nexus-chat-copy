import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { OWNER_EMAIL } from '../lib/permissions';

const ov = z.object({ holidayKey: z.string(), earlyStart: z.string().nullable(), forceOn: z.boolean(), forceOff: z.boolean() });

export default createEndpoint({
  description: 'Reads holiday event overrides; the owner can start events early, force them on, or turn them off',
  inputSchema: z.object({
    action: z.enum(['list', 'set']),
    holidayKey: z.string().max(40).optional(),
    earlyStart: z.string().nullable().optional(),
    forceOn: z.boolean().optional(),
    forceOff: z.boolean().optional(),
  }),
  outputSchema: z.object({ overrides: z.array(ov) }),
  execute: async ({ input, context }) => {
    if (input.action === 'set') {
      if (context.user?.email?.toLowerCase() !== OWNER_EMAIL.toLowerCase()) throw new ZiteError('Only the owner can change events.');
      if (!input.holidayKey) throw new ZiteError('Pick a holiday.');
      if (input.forceOn) {
        const { records } = await zite.eventOverrides.findAll({ filters: { forceOn: true }, limit: 100 });
        await Promise.all(records.filter(r => r.holidayKey !== input.holidayKey).map(r => zite.eventOverrides.update({ id: r.id, record: { forceOn: false } })));
      }
      await zite.eventOverrides.bulkCreate({
        matchOn: ['holidayKey'],
        records: [{ holidayKey: input.holidayKey, earlyStart: input.earlyStart ?? null, forceOn: !!input.forceOn, forceOff: !!input.forceOff }],
      });
    }
    const { records } = await zite.eventOverrides.findAll({ limit: 100 });
    return { overrides: records.map(r => ({ holidayKey: r.holidayKey || '', earlyStart: r.earlyStart ? String(r.earlyStart).slice(0, 10) : null, forceOn: !!r.forceOn, forceOff: !!r.forceOff })) };
  },
});
