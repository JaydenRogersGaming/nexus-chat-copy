import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const norm = (e: string) => e.trim().toLowerCase();
const key = (a: string, b: string) => [norm(a), norm(b)].sort().join('|');

export default createEndpoint({
  description: 'Lists, sends, accepts and removes friend requests for the signed-in user',
  inputSchema: z.object({
    action: z.enum(['list', 'request', 'accept', 'remove']),
    email: z.string().optional(),
  }),
  outputSchema: z.object({
    friends: z.array(z.string()),
    incoming: z.array(z.string()),
    outgoing: z.array(z.string()),
  }),
  execute: async ({ input, context }) => {
    const me = norm(context.user.email);
    const other = input.email ? norm(input.email) : '';
    const deny = (m: string) => { throw new ZiteError({ code: 'BAD_REQUEST', message: m, userFacingMessage: m }); };

    if (input.action !== 'list') {
      if (!other) deny('Enter an email.');
      if (other === me) deny("You can't friend yourself.");
      const existing = await zite.friendships.findOne({ filters: { pairKey: key(me, other) } });
      if (input.action === 'request') {
        if (existing?.status === 'Pending' && norm(existing.requesterEmail || '') === other) {
          await zite.friendships.update({ id: existing.id, record: { status: 'Accepted' } });
        } else if (!existing) {
          await zite.friendships.create({ record: { pairKey: key(me, other), requesterEmail: me, addresseeEmail: other, status: 'Pending' } });
        }
      } else if (input.action === 'accept') {
        if (!existing || norm(existing.addresseeEmail || '') !== me) deny('No request to accept.');
        await zite.friendships.update({ id: existing!.id, record: { status: 'Accepted' } });
      } else if (existing) {
        await zite.friendships.delete({ id: existing.id });
      }
    }

    const { rows } = await zite.sql({
      query: `SELECT "requesterEmail","addresseeEmail","status" FROM "Friendships" WHERE lower("requesterEmail") = $1 OR lower("addresseeEmail") = $1 LIMIT 1000`,
      params: [me],
    });
    const out = { friends: [] as string[], incoming: [] as string[], outgoing: [] as string[] };
    for (const r of rows) {
      const req = norm(String(r.requesterEmail ?? '')), adr = norm(String(r.addresseeEmail ?? ''));
      const them = req === me ? adr : req;
      if (r.status === 'Accepted') out.friends.push(them);
      else if (req === me) out.outgoing.push(them);
      else out.incoming.push(them);
    }
    return out;
  },
});
