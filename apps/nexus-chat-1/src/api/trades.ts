import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const item = z.object({ kind: z.enum(['theme', 'typing', 'title', 'song']), id: z.string(), name: z.string() });
const deny = (m: string): never => { throw new ZiteError({ code: 'BAD_REQUEST', message: m, userFacingMessage: m }); };
const parse = (s?: string | null) => { try { return z.array(item).parse(JSON.parse(s || '[]')); } catch { return []; } };

export default createEndpoint({
  authenticated: true,
  description: 'Sends, answers and lists item trades (themes, typing effects, titles, songs) between users',
  inputSchema: z.object({
    action: z.enum(['list', 'offer', 'accept', 'decline', 'cancel', 'applied']),
    id: z.string().optional(),
    toEmail: z.string().optional(),
    items: z.array(item).optional(),
  }),
  outputSchema: z.object({
    trades: z.array(z.object({
      id: z.string(), fromEmail: z.string(), toEmail: z.string(), status: z.string(), created: z.string(),
      offer: z.array(item), giveBack: z.array(item), mine: z.boolean(), needsApply: z.boolean(),
    })),
  }),
  execute: async ({ input, context }) => {
    const me = context.user.email.toLowerCase();
    const items = input.items ?? [];

    if (input.action === 'offer') {
      const to = (input.toEmail || '').trim().toLowerCase();
      if (!to) deny('Pick who to trade with.');
      if (to === me) deny("You can't trade with yourself.");
      if (!items.length) deny('Add at least one item to offer.');
      const { records } = await zite.auth.findAllUsers({ filters: { email: to }, limit: 1 });
      if (!records.length) deny('No one has signed up with that email.');
      await zite.trades.create({ record: {
        summary: `${me} → ${to}: ${items.map(i => i.name).join(', ')}`.slice(0, 250),
        fromEmail: me, toEmail: to, offerItems: JSON.stringify(items), returnItems: '[]', status: 'Pending',
      } });
    } else if (input.action !== 'list') {
      const t = input.id ? await zite.trades.findOne({ id: input.id }) : null;
      if (!t) deny('Trade not found.');
      const from = (t!.fromEmail || '').toLowerCase(), to = (t!.toEmail || '').toLowerCase();
      if (me !== from && me !== to) deny('This is not your trade.');
      if (input.action === 'applied') {
        await zite.trades.update({ id: t!.id, record: me === from ? { appliedByFrom: true } : { appliedByTo: true } });
      } else {
        if (t!.status !== 'Pending') deny('This trade was already answered.');
        if (input.action === 'cancel' && me !== from) deny('Only the sender can cancel.');
        if ((input.action === 'accept' || input.action === 'decline') && me !== to) deny('Only the receiver can answer.');
        const status = input.action === 'accept' ? 'Accepted' : input.action === 'decline' ? 'Declined' : 'Cancelled';
        await zite.trades.update({ id: t!.id, record: { status, ...(input.action === 'accept' ? { returnItems: JSON.stringify(items) } : {}) } });
      }
    }

    const { rows } = await zite.sql({
      query: `SELECT * FROM "Trades" WHERE lower("fromEmail") = $1 OR lower("toEmail") = $1 ORDER BY "created" DESC LIMIT 50`,
      params: [me],
    });
    return { trades: rows.map(r => {
      const mine = String(r.fromEmail).toLowerCase() === me;
      const applied = mine ? r.appliedByFrom === true || r.appliedByFrom === 'true' : r.appliedByTo === true || r.appliedByTo === 'true';
      return {
        id: String(r.id), fromEmail: String(r.fromEmail), toEmail: String(r.toEmail), status: String(r.status),
        created: String(r.created ?? ''), offer: parse(r.offerItems as string), giveBack: parse(r.returnItems as string),
        mine, needsApply: r.status === 'Accepted' && !applied,
      };
    }) };
  },
});
