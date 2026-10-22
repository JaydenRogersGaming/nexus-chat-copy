import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const banSchema = z.object({
  id: z.string(), email: z.string(), ipAddress: z.string(), deviceId: z.string(),
  banType: z.string(), reason: z.string(), bannedBy: z.string(), bannedAt: z.string(),
});

export default createEndpoint({
  description: 'Checks, lists, creates and removes bans (normal, IP and hard bans)',
  inputSchema: z.object({
    action: z.enum(['check', 'list', 'ban', 'unban']),
    ip: z.string().optional(),
    deviceId: z.string().optional(),
    email: z.string().optional(),
    banType: z.enum(['Ban', 'IP Ban', 'Hard Ban']).optional(),
    reason: z.string().optional(),
    bannedBy: z.string().optional(),
  }),
  outputSchema: z.object({ ban: banSchema.nullable(), bans: z.array(banSchema) }),
  execute: async ({ input, context }) => {
    const toOut = (r: Awaited<ReturnType<typeof zite.bans.findAll>>['records'][number]) => ({
      id: r.id, email: r.email || '', ipAddress: r.ipAddress || '', deviceId: r.deviceId || '',
      banType: r.banType || 'Ban', reason: r.reason || '', bannedBy: r.bannedBy || '', bannedAt: r.bannedAt || '',
    });

    if (input.action === 'check') {
      const me = context.user.email.toLowerCase();
      const ip = input.ip || '';
      const dev = input.deviceId || '';
      if (ip || dev) {
        await zite.userSightings.bulkCreate({
          records: [{ email: me, ipAddress: ip, deviceId: dev }],
          matchOn: ['email', 'ipAddress', 'deviceId'],
        });
      }
      const { records } = await zite.bans.findAll({ limit: 2000 });
      const hit = records.find(b =>
        (b.email && b.email.toLowerCase() === me) ||
        (ip && b.ipAddress === ip && (b.banType === 'IP Ban' || b.banType === 'Hard Ban')) ||
        (dev && b.deviceId === dev && b.banType === 'Hard Ban'));
      return { ban: hit ? toOut(hit) : null, bans: [] };
    }

    if (input.action === 'ban') {
      const email = (input.email || '').trim().toLowerCase();
      const type = input.banType || 'Ban';
      const base = { email, banType: type, reason: input.reason || '', bannedBy: input.bannedBy || 'Staff' };
      const rows: Array<typeof base & { ipAddress?: string; deviceId?: string }> = [base];
      if (type !== 'Ban') {
        const { records: seen } = await zite.userSightings.findAll({ filters: { email }, limit: 500 });
        const ips = [...new Set(seen.map(s => s.ipAddress).filter(Boolean))] as string[];
        ips.forEach(ip => rows.push({ ...base, ipAddress: ip }));
        if (type === 'Hard Ban') {
          const devs = [...new Set(seen.map(s => s.deviceId).filter(Boolean))] as string[];
          devs.forEach(d => rows.push({ ...base, deviceId: d }));
        }
      }
      await zite.bans.bulkCreate({ records: rows.slice(0, 100) });
    }

    if (input.action === 'unban' && input.email) {
      const { records } = await zite.bans.findAll({ filters: { email: input.email.toLowerCase() }, limit: 500 });
      for (const r of records) await zite.bans.delete({ id: r.id });
    }

    const { records } = await zite.bans.findAll({ limit: 2000 });
    return { ban: null, bans: records.map(toOut) };
  },
});
