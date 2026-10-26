import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requirePerm } from '../lib/serverAuth';

export default createEndpoint({
  description: 'Shows Admins the log of every staff and marketplace action',
  inputSchema: z.object({ q: z.string().max(100).optional() }),
  outputSchema: z.object({ entries: z.array(z.object({ id: z.string(), action: z.string(), actorEmail: z.string(), target: z.string(), details: z.string(), loggedAt: z.string() })) }),
  execute: async ({ input, context }) => {
    await requirePerm(context.user.email, 'audit.view');
    const q = `%${(input.q || '').trim().toLowerCase()}%`;
    const { rows } = await zite.sql({
      query: `SELECT id, "action", "actorEmail", "target", "details", created_at AS "loggedAt" FROM "AuditLog"
              WHERE lower(coalesce("action",'') || ' ' || coalesce("actorEmail",'') || ' ' || coalesce("target",'')) LIKE $1
              ORDER BY created_at DESC LIMIT 300`,
      params: [q],
    });
    return { entries: rows.map(r => ({ id: String(r.id), action: String(r.action || ''), actorEmail: String(r.actorEmail || ''), target: String(r.target || ''), details: String(r.details || ''), loggedAt: String(r.loggedAt || '') })) };
  },
});
