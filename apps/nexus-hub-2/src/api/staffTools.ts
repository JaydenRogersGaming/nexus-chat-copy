import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requirePerm, loadActor, deny, bad, audit } from '../lib/serverAuth';
import { level } from '../lib/permissions';

const warningSchema = z.object({ id: z.string(), reason: z.string(), fromEmail: z.string(), created: z.string() });

export default createEndpoint({
  description: 'Staff warnings and bulk deletion of a user\'s recent messages',
  inputSchema: z.object({
    action: z.enum(['warn', 'myWarnings', 'ack', 'bulkDelete', 'hold']),
    messageId: z.string().optional(),
    email: z.string().optional(),
    reason: z.string().optional(),
    warningId: z.string().optional(),
    hours: z.number().optional(),
  }),
  outputSchema: z.object({ warnings: z.array(warningSchema), deleted: z.number() }),
  execute: async ({ input, context }) => {
    const me = (context.user?.email || '').toLowerCase();
    if (!me) deny('Please sign in.');

    if (input.action === 'myWarnings') {
      const { rows } = await zite.sql({
        query: `SELECT "id","reason","fromEmail","created" FROM "Warnings" WHERE lower("toEmail") = $1 AND COALESCE("acknowledged", false) = false ORDER BY "created" ASC LIMIT 20`,
        params: [me],
      });
      return { warnings: rows.map(r => ({ id: String(r.id), reason: String(r.reason ?? ''), fromEmail: String(r.fromEmail ?? ''), created: String(r.created ?? '') })), deleted: 0 };
    }

    if (input.action === 'ack') {
      const w = input.warningId ? await zite.warnings.findOne({ filters: { id: input.warningId } }) : null;
      if (!w || (w.toEmail || '').toLowerCase() !== me) bad('Warning not found');
      await zite.warnings.update({ id: w.id, record: { acknowledged: true } });
      return { warnings: [], deleted: 0 };
    }

    const target = (input.email || '').toLowerCase().trim();
    if (!target) bad('Pick a user');
    if (target === me) bad("You can't do that to yourself");
    const self = await loadActor(me);
    const tgt = await loadActor(target);
    if ((input.action === 'warn' || input.action === 'hold') && self.chatRole === 'guardian') {
      // Guardians may warn / hold messages from regular members only
      if (level(tgt) > 0 || ['helper', 'guardian', 'mod', 'senior-mod', 'admin', 'co-owner', 'owner'].includes(tgt.chatRole)) deny('Guardians can only act on regular members.');
    } else {
      const actor = await requirePerm(me, 'users.restrict');
      if (level(tgt) >= level(actor)) deny('You can only act on users below your rank.');
    }

    if (input.action === 'hold') {
      if (!input.messageId) bad('Pick a message');
      const { rows } = await zite.sql({ query: `SELECT "id","content","roomId" FROM "ChatMessages" WHERE "messageId" = $1 AND lower("senderEmail") = $2 LIMIT 1`, params: [input.messageId, target] });
      const m = rows[0];
      if (!m) bad('Message not found');
      await zite.chatMessages.update({ id: String(m.id), record: { deleted: true } as never });
      await zite.reports.create({ record: { subject: `Held message from ${target}`, targetType: 'Chat Message', targetId: input.messageId!, reason: `Hidden by ${me} for mod review. Room: ${String(m.roomId)}. Message: "${String(m.content ?? '').slice(0, 500)}"`, reporterEmail: me, status: 'Open', resolutionNote: null, reviewedBy: null } });
      await audit(me, 'holdMessage', target, input.messageId!);
      return { warnings: [], deleted: 1 };
    }

    if (input.action === 'warn') {
      const reason = (input.reason || '').trim();
      if (!reason) bad('Add a reason for the warning');
      await zite.warnings.create({ record: { reason: reason.slice(0, 500), toEmail: target, fromEmail: me, acknowledged: false } });
      await audit(me, 'warn', target, reason);
      return { warnings: [], deleted: 0 };
    }

    // bulkDelete: soft-delete the user's messages from the last N hours
    const hours = Math.min(Math.max(input.hours ?? 24, 1), 24 * 30);
    const since = new Date(Date.now() - hours * 3600_000).toISOString();
    const { rows } = await zite.sql({
      query: `SELECT "id" FROM "ChatMessages" WHERE lower("senderEmail") = $1 AND "sentAt" >= $2 AND COALESCE("deleted", false) = false LIMIT 1000`,
      params: [target, since],
    });
    for (let i = 0; i < rows.length; i += 25) {
      await Promise.all(rows.slice(i, i + 25).map(r => zite.chatMessages.update({ id: String(r.id), record: { deleted: true } as never })));
    }
    await audit(me, 'bulkDeleteMessages', target, `${rows.length} messages, last ${hours}h`);
    return { warnings: [], deleted: rows.length };
  },
});
