import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';

type RoleUser = { email: string; name: string; role: string };
const NO_USERS: RoleUser[] = [];
import { isOwnerEmail } from '../lib/permissions';
const ROLES = ['user', 'vip', 'helper', 'guardian', 'mod', 'senior-mod', 'admin', 'co-owner', 'owner'] as const;
const RANK: Record<string, number> = { user: 0, vip: 1, helper: 2, mod: 3, 'senior-mod': 4, admin: 5, 'co-owner': 6, owner: 7 };

async function roleOf(email: string): Promise<string> {
  if (isOwnerEmail(email.toLowerCase())) return 'owner';
  const { rows } = await zite.sql({ query: `SELECT "role" FROM "Presence" WHERE lower("email") = $1 LIMIT 1`, params: [email.toLowerCase()] });
  const r = String(rows[0]?.role ?? 'user');
  return r in RANK ? r : 'user';
}

export default createEndpoint({
  authenticated: true,
  description: 'Lists everyone who signed up with their role, and lets staff change roles',
  inputSchema: z.object({
    action: z.enum(['list', 'set', 'mine', 'profile', 'setCustom']),
    email: z.string().optional(),
    role: z.enum(ROLES).optional(),
    customRole: z.object({ name: z.string(), color: z.string(), color2: z.string() }).nullable().optional(),
  }),
  outputSchema: z.object({
    myRole: z.string(),
    users: z.array(z.object({ email: z.string(), name: z.string(), role: z.string(), customRole: z.string(), customRoleColor: z.string(), customRoleColor2: z.string() })),
    profile: z.object({ email: z.string(), name: z.string(), profilePic: z.string(), nameColor: z.string(), activeTitle: z.string(), activeTitleColor: z.string(), activeTitleEffect: z.string(), role: z.string(), lastSeen: z.number(), joinedAt: z.number() }).nullable().optional(),
  }),
  execute: async ({ input, context }) => {
    const me = context.user;
    const myRole = await roleOf(me.email);

    if (input.action === 'mine') return { myRole, users: NO_USERS };

    if (input.action === 'profile') {
      const email = (input.email || '').toLowerCase();
      const { rows } = await zite.sql({ query: `SELECT * FROM "Presence" WHERE lower("email") = $1 LIMIT 1`, params: [email] });
      const r = rows[0];
      if (!r) return { myRole, users: NO_USERS, profile: null };
      const joined = await zite.sql({ query: `SELECT "created_at" FROM "ziteUsers" WHERE lower("email") = $1 LIMIT 1`, params: [email] });
      const joinedAt = joined.rows[0]?.created_at ?? r.created_at;
      return { myRole, users: NO_USERS, profile: {
        joinedAt: joinedAt ? new Date(String(joinedAt)).getTime() : 0,
        email: String(r.email), name: String(r.displayName || email.split('@')[0]), profilePic: String(r.profilePic ?? ''),
        nameColor: String(r.nameColor ?? ''), activeTitle: String(r.activeTitle ?? ''), activeTitleColor: String(r.activeTitleColor ?? ''),
        activeTitleEffect: String(r.activeTitleEffect ?? ''), role: isOwnerEmail(email) ? 'owner' : String(r.role || 'user'),
        lastSeen: r.lastSeen ? new Date(String(r.lastSeen)).getTime() : 0,
      } };
    }

    if (input.action === 'set') {
      const email = (input.email || '').trim().toLowerCase();
      const role = input.role;
      if (!email || !role) throw new ZiteError({ code: 'BAD_REQUEST', message: 'Missing email or role', userFacingMessage: 'Pick a user and a role.' });
      if (RANK[myRole] < RANK.admin) throw new ZiteError({ code: 'FORBIDDEN', message: 'forbidden', userFacingMessage: 'Only Admins and above can set roles.' });
      if (isOwnerEmail(email)) throw new ZiteError({ code: 'FORBIDDEN', message: 'owner', userFacingMessage: "The owner's role can't be changed." });
      const targetRole = await roleOf(email);
      const canAssign = myRole === 'owner' || RANK[role] < RANK[myRole];
      const canTouch = myRole === 'owner' || RANK[targetRole] < RANK[myRole];
      if (!canAssign || !canTouch) throw new ZiteError({ code: 'FORBIDDEN', message: 'rank', userFacingMessage: "You can only give roles below your own, to people below you." });
      let { records } = await zite.auth.findAllUsers({ filters: { email }, limit: 1 });
      if (!records.length) {
        // Emails may be stored with capital letters — fall back to a case-insensitive match.
        const all = await zite.auth.findAllUsers({ limit: 1000 });
        records = all.records.filter(u => u.email.toLowerCase() === email);
      }
      if (!records.length) throw new ZiteError({ code: 'NOT_FOUND', message: 'not found', userFacingMessage: 'No one has signed up with that email.' });
      const u = records[0];
      await zite.presence.bulkCreate({ matchOn: ['email'], records: [{ email: u.email, role, displayName: u.name || u.email.split('@')[0] }] });
    }

    if (input.action === 'setCustom') {
      const email = (input.email || '').trim().toLowerCase();
      if (!email) throw new ZiteError({ code: 'BAD_REQUEST', message: 'Missing email', userFacingMessage: 'Pick a user.' });
      if (RANK[myRole] < RANK.admin && email !== me.email.toLowerCase()) throw new ZiteError({ code: 'FORBIDDEN', message: 'forbidden', userFacingMessage: 'Only Admins and above can give custom roles.' });
      const { records } = await zite.auth.findAllUsers({ filters: { email }, limit: 1 });
      const realEmail = records[0]?.email ?? email;
      const cr = input.customRole;
      await zite.presence.bulkCreate({ matchOn: ['email'], records: [{
        email: realEmail,
        customRole: cr ? cr.name.slice(0, 32) : '',
        customRoleColor: cr ? cr.color : '',
        customRoleColor2: cr ? cr.color2 : '',
      }] });
    }

    const [{ records: all }, { rows }] = await Promise.all([
      zite.auth.findAllUsers({ appIds: ['1vc4gaurvx'], sort: [{ field: 'email', direction: 'asc' }], limit: 1000 }),
      zite.sql({ query: `SELECT "email","role","displayName","customRole","customRoleColor","customRoleColor2" FROM "Presence"` }),
    ]);
    const byEmail = new Map(rows.map(r => [String(r.email).toLowerCase(), r]));
    const users = all.map(u => {
      const p = byEmail.get(u.email.toLowerCase());
      const role = isOwnerEmail(u.email.toLowerCase()) ? 'owner' : String(p?.role ?? 'user');
      return {
        email: u.email, name: String(p?.displayName || u.name || u.email.split('@')[0]), role: role in RANK ? role : 'user',
        customRole: String(p?.customRole ?? ''), customRoleColor: String(p?.customRoleColor ?? ''), customRoleColor2: String(p?.customRoleColor2 ?? ''),
      };
    });
    return { myRole, users };
  },
});
