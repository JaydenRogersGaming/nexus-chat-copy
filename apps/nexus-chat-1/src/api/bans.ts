import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { can, isBanActive, level, maskIp } from '../lib/permissions';
import { audit, bad, deny, loadActor, requirePerm } from '../lib/serverAuth';

const banSchema = z.object({
  id: z.string(), email: z.string(), ipAddress: z.string(), deviceId: z.string(),
  banType: z.string(), reason: z.string(), bannedBy: z.string(), bannedAt: z.string(),
});

export default createEndpoint({
  description: 'Checks, lists, creates and removes bans (normal, IP and hard bans)',
  inputSchema: z.object({
    action: z.enum(['check', 'list', 'ban', 'unban']),
    ip: z.string().max(45).optional(),
    deviceId: z.string().max(100).optional(),
    email: z.string().max(200).optional(),
    banType: z.enum(['Ban', 'IP Ban', 'Hard Ban']).optional(),
    reason: z.string().max(500).optional(),
    bannedBy: z.string().optional(),
  }),
  outputSchema: z.object({ ban: banSchema.nullable(), bans: z.array(banSchema) }),
  execute: async ({ input, context }) => {
    type Rec = Awaited<ReturnType<typeof zite.bans.findAll>>['records'][number];
    const toOut = (r: Rec, full = true) => ({
      id: r.id, email: r.email || '', ipAddress: full ? r.ipAddress || '' : maskIp(r.ipAddress || ''), deviceId: full ? r.deviceId || '' : '',
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
      const actor = await loadActor(me);
      if (actor.restriction === 'Suspended' && level(actor) < 4) {
        const { rows } = await zite.sql({ query: `SELECT "restrictionReason" FROM "Presence" WHERE lower("email") = $1 LIMIT 1`, params: [me] });
        return { ban: { id: 'suspended', email: me, ipAddress: '', deviceId: '', banType: 'Suspended', reason: String(rows[0]?.restrictionReason || 'Account suspended'), bannedBy: 'Staff', bannedAt: '' }, bans: [] };
      }
      if (level(actor) >= 3) return { ban: null, bans: [] }; // Admins can never be locked out by a ban
      const { records } = await zite.bans.findAll({ limit: 2000 });
      const hit = records.find(b => isBanActive(b.expiresAt) && (
        (b.email && b.email.toLowerCase() === me) ||
        (ip && b.ipAddress === ip && (b.banType === 'IP Ban' || b.banType === 'Hard Ban')) ||
        (dev && b.deviceId === dev && b.banType === 'Hard Ban')));
      return { ban: hit ? toOut(hit) : null, bans: [] };
    }

    const actor = await requirePerm(context.user.email, 'users.restrict');

    if (input.action === 'ban') {
      const email = (input.email || '').trim().toLowerCase();
      if (!email) bad('Enter an email to ban.');
      const type = input.banType || 'Ban';
      if (type !== 'Ban' && !can(actor, 'ip.ban')) deny('Only Admins can IP-ban or hard-ban.');
      if (email === actor.email) deny("You can't ban yourself.");
      const target = await loadActor(email);
      if (level(target) >= level(actor)) deny('You can only ban people below you.');
      const base = { email, banType: type, reason: input.reason || '', bannedBy: actor.email };
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
      await audit(actor.email, 'user.ban', email, `${type}${input.reason ? ` — ${input.reason}` : ''}`);
    }

    if (input.action === 'unban' && input.email) {
      const email = input.email.toLowerCase();
      const { records } = await zite.bans.findAll({ filters: { email }, limit: 500 });
      if (records.some(r => r.banType !== 'Ban') && !can(actor, 'ip.ban')) deny('Only Admins can lift IP or hard bans.');
      for (const r of records) await zite.bans.delete({ id: r.id });
      await audit(actor.email, 'user.unban', email);
    }

    const { records } = await zite.bans.findAll({ limit: 2000 });
    const full = can(actor, 'ip.viewFull');
    return { ban: null, bans: records.filter(r => isBanActive(r.expiresAt)).map(r => toOut(r, full)) };
  },
});
