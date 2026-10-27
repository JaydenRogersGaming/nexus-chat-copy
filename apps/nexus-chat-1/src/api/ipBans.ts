import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { isOwnerEmail, can, checkIpBan, isBanActive, level, maskIp } from '../lib/permissions';
import { audit, bad, deny, requirePerm } from '../lib/serverAuth';

const DURATIONS = ['1h', '24h', '7d', '30d', 'permanent'] as const;
const HOURS: Record<typeof DURATIONS[number], number | null> = { '1h': 1, '24h': 24, '7d': 168, '30d': 720, permanent: null };

export default createEndpoint({
  description: 'Lets staff review recent IP addresses and lets Admins ban or unban an IP for a set time',
  inputSchema: z.object({
    action: z.enum(['list', 'ban', 'unban']),
    ip: z.string().trim().max(45).optional(),
    duration: z.enum(DURATIONS).optional(),
    reason: z.string().trim().max(500).optional(),
    banId: z.string().optional(),
  }),
  outputSchema: z.object({
    canBan: z.boolean(),
    fullIps: z.boolean(),
    bans: z.array(z.object({ id: z.string(), ip: z.string(), reason: z.string(), bannedBy: z.string(), bannedAt: z.string(), expiresAt: z.string(), active: z.boolean() })),
    sightings: z.array(z.object({ ip: z.string(), emails: z.array(z.string()), lastSeen: z.string(), banned: z.boolean(), staff: z.boolean() })),
  }),
  execute: async ({ input, context }) => {
    const me = await requirePerm(context.user.email, 'ip.view');

    // Which IPs belong to staff (lockout safeguard) and to me
    const { rows: seen } = await zite.sql({
      query: `SELECT s."ipAddress", lower(s."email") AS email, s.updated_at AS "lastSeen", p."role", p."marketRole"
              FROM "UserSightings" s LEFT JOIN "Presence" p ON lower(p."email") = lower(s."email")
              WHERE coalesce(s."ipAddress",'') <> '' ORDER BY s.updated_at DESC LIMIT 1000`,
    });
    const staffIps = new Set<string>();
    const myIps = new Set<string>();
    for (const r of seen) {
      const email = String(r.email);
      const lvl = level({ email, chatRole: isOwnerEmail(email) ? 'owner' : String(r.role || 'user'), marketRole: String(r.marketRole || ''), restriction: 'None' });
      if (lvl >= 2) staffIps.add(String(r.ipAddress));
      if (email === me.email) myIps.add(String(r.ipAddress));
    }

    if (input.action === 'ban') {
      const ip = input.ip || '';
      const err = checkIpBan(me, ip, [...myIps], [...staffIps]);
      if (err) deny(err);
      if (!input.duration) bad('Pick how long the ban lasts.');
      if (!input.reason) bad('Add a reason for the ban.');
      const hours = HOURS[input.duration];
      const expiresAt = hours === null ? null : new Date(Date.now() + hours * 3600_000).toISOString();
      await zite.bans.create({ record: { email: '', ipAddress: ip, banType: 'IP Ban', reason: input.reason, bannedBy: me.email, expiresAt } });
      await audit(me.email, 'ip.ban', ip, `${input.duration} — ${input.reason}`);
    }

    if (input.action === 'unban') {
      if (!can(me, 'ip.ban')) deny('Only Admins can remove IP bans.');
      if (!input.banId) bad('Pick a ban to remove.');
      const ban = await zite.bans.findOne({ id: input.banId });
      if (!ban || ban.banType !== 'IP Ban') bad('That IP ban no longer exists.');
      await zite.bans.delete({ id: input.banId });
      await audit(me.email, 'ip.unban', ban.ipAddress || '', ban.reason || '');
    }

    const full = can(me, 'ip.viewFull');
    const show = (ip: string) => (full ? ip : maskIp(ip));
    const { records: banRecs } = await zite.bans.findAll({ filters: { banType: 'IP Ban' }, limit: 500 });
    const activeIps = new Set(banRecs.filter(b => isBanActive(b.expiresAt)).map(b => b.ipAddress || ''));

    const byIp = new Map<string, { emails: Set<string>; lastSeen: string }>();
    for (const r of seen) {
      const ip = String(r.ipAddress);
      const e = byIp.get(ip) ?? { emails: new Set<string>(), lastSeen: String(r.lastSeen || '') };
      e.emails.add(String(r.email));
      byIp.set(ip, e);
    }

    return {
      canBan: can(me, 'ip.ban'),
      fullIps: full,
      bans: banRecs.map(b => ({
        id: b.id, ip: show(b.ipAddress || ''), reason: b.reason || '', bannedBy: b.bannedBy || '',
        bannedAt: b.bannedAt || '', expiresAt: b.expiresAt || '', active: isBanActive(b.expiresAt),
      })).sort((a, b) => b.bannedAt.localeCompare(a.bannedAt)),
      sightings: [...byIp.entries()].slice(0, 200).map(([ip, v]) => ({
        ip: show(ip), emails: [...v.emails].slice(0, 10), lastSeen: v.lastSeen, banned: activeIps.has(ip), staff: staffIps.has(ip),
      })),
    };
  },
});
