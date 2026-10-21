import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const OWNER_EMAIL = 'jaydenaltfirst@gmail.com';
const ROLES = ['user', 'mod', 'admin', 'co-owner', 'owner'] as const;
const RANK: Record<string, number> = { user: 0, mod: 1, admin: 2, 'co-owner': 3, owner: 4 };

async function roleOf(email: string): Promise<string> {
  if (email.toLowerCase() === OWNER_EMAIL) return 'owner';
  const { rows } = await zite.sql({ query: `SELECT "role" FROM "Presence" WHERE lower("email") = $1 LIMIT 1`, params: [email.toLowerCase()] });
  const r = String(rows[0]?.role ?? 'user');
  return r in RANK ? r : 'user';
}

export default createEndpoint({
  description: 'Lists everyone who signed up with their role, and lets staff change roles',
  inputSchema: z.object({
    action: z.enum(['list', 'set', 'mine']),
    email: z.string().optional(),
    role: z.enum(ROLES).optional(),
  }),
  outputSchema: z.object({
    myRole: z.string(),
    users: z.array(z.object({ email: z.string(), name: z.string(), role: z.string() })),
  }),
  execute: async ({ input, context }) => {
    const me = context.user!;
    const myRole = await roleOf(me.email);

    if (input.action === 'mine') return { myRole, users: [] };

    if (input.action === 'set') {
      const email = (input.email || '').trim().toLowerCase();
      const role = input.role;
      if (!email || !role) throw new ZiteError({ code: 'BAD_REQUEST', message: 'Missing email or role', userFacingMessage: 'Pick a user and a role.' });
      if (RANK[myRole] < 2) throw new ZiteError({ code: 'FORBIDDEN', message: 'forbidden', userFacingMessage: 'Only Admins and above can set roles.' });
      if (email === OWNER_EMAIL) throw new ZiteError({ code: 'FORBIDDEN', message: 'owner', userFacingMessage: "The owner's role can't be changed." });
      const targetRole = await roleOf(email);
      const canAssign = myRole === 'owner' || RANK[role] < RANK[myRole];
      const canTouch = myRole === 'owner' || RANK[targetRole] < RANK[myRole];
      if (!canAssign || !canTouch) throw new ZiteError({ code: 'FORBIDDEN', message: 'rank', userFacingMessage: "You can only give roles below your own, to people below you." });
      const { records } = await zite.auth.findAllUsers({ filters: { email }, limit: 1 });
      if (!records.length) throw new ZiteError({ code: 'NOT_FOUND', message: 'not found', userFacingMessage: 'No one has signed up with that email.' });
      const u = records[0];
      await zite.presence.bulkCreate({ matchOn: ['email'], records: [{ email: u.email, role, displayName: u.name || u.email.split('@')[0] }] });
    }

    const [{ records: all }, { rows }] = await Promise.all([
      zite.auth.findAllUsers({ appIds: ['1vc4gaurvx'], sort: [{ field: 'email', direction: 'asc' }], limit: 1000 }),
      zite.sql({ query: `SELECT "email","role","displayName" FROM "Presence"` }),
    ]);
    const byEmail = new Map(rows.map(r => [String(r.email).toLowerCase(), r]));
    const users = all.map(u => {
      const p = byEmail.get(u.email.toLowerCase());
      const role = u.email.toLowerCase() === OWNER_EMAIL ? 'owner' : String(p?.role ?? 'user');
      return { email: u.email, name: String(p?.displayName || u.name || u.email.split('@')[0]), role: role in RANK ? role : 'user' };
    });
    return { myRole, users };
  },
});
