import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { MARKET_ROLES, RESTRICTIONS, checkAssignRole, checkRestrict, permissionsOf } from '../lib/permissions';
import { audit, bad, deny, loadActor, requirePerm } from '../lib/serverAuth';

const userOut = z.object({ email: z.string(), name: z.string(), chatRole: z.string(), marketRole: z.string(), restriction: z.string(), restrictionReason: z.string() });

export default createEndpoint({
  description: 'Admin tools: my permissions, search users, set marketplace roles and account restrictions',
  inputSchema: z.object({
    action: z.enum(['me', 'search', 'setRole', 'restrict']),
    q: z.string().max(100).optional(),
    email: z.string().email().optional(),
    marketRole: z.enum(MARKET_ROLES).optional(),
    restriction: z.enum(RESTRICTIONS).optional(),
    reason: z.string().max(500).optional(),
  }),
  outputSchema: z.object({ permissions: z.array(z.string()), marketRole: z.string(), restriction: z.string(), users: z.array(userOut) }),
  execute: async ({ input, context }) => {
    const me = await loadActor(context.user.email);
    const base = { permissions: permissionsOf(me), marketRole: me.marketRole, restriction: me.restriction };
    if (input.action === 'me') return { ...base, users: [] };

    if (input.action === 'setRole' || input.action === 'restrict') {
      if (!input.email) bad('Pick a user.');
      const target = await loadActor(input.email);
      const { records } = await zite.auth.findAllUsers({ filters: { email: target.email }, limit: 1 });
      if (!records.length) bad('No one has signed up with that email.');
      const realEmail = records[0].email;
      if (input.action === 'setRole') {
        if (!input.marketRole) bad('Pick a role.');
        const err = checkAssignRole(me, target, input.marketRole);
        if (err) deny(err);
        await zite.presence.bulkCreate({ matchOn: ['email'], records: [{ email: realEmail, marketRole: input.marketRole }] });
        await audit(me.email, 'role.set', realEmail, `${target.marketRole} → ${input.marketRole}`);
      } else {
        if (!input.restriction) bad('Pick a restriction.');
        const err = checkRestrict(me, target);
        if (err) deny(err);
        if (input.restriction !== 'None' && !input.reason?.trim()) bad('Add a reason for the restriction.');
        await zite.presence.bulkCreate({ matchOn: ['email'], records: [{ email: realEmail, accountRestriction: input.restriction, restrictionReason: input.reason?.trim() || '' }] });
        await audit(me.email, 'user.restrict', realEmail, `${target.restriction} → ${input.restriction}${input.reason ? ` — ${input.reason}` : ''}`);
      }
    } else {
      await requirePerm(me.email, 'users.search');
    }

    const q = `%${(input.q || '').trim().toLowerCase()}%`;
    const { rows } = await zite.sql({
      query: `SELECT u."email", u."name", p."role", p."marketRole", p."accountRestriction", p."restrictionReason"
              FROM "ziteUsers" u LEFT JOIN "Presence" p ON lower(p."email") = lower(u."email")
              WHERE lower(u."email") LIKE $1 OR lower(coalesce(u."name",'')) LIKE $1 OR lower(coalesce(p."displayName",'')) LIKE $1
              ORDER BY u."email" LIMIT 50`,
      params: [q],
    });
    return { ...base, users: rows.map(r => ({
      email: String(r.email), name: String(r.name || String(r.email).split('@')[0]),
      chatRole: String(r.role || 'user'), marketRole: String(r.marketRole || 'Customer'),
      restriction: String(r.accountRestriction || 'None'), restrictionReason: String(r.restrictionReason || ''),
    })) };
  },
});
