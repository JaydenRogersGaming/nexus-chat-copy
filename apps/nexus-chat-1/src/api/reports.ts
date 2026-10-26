import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { audit, bad, requirePerm } from '../lib/serverAuth';

const reportOut = z.object({ id: z.string(), subject: z.string(), targetType: z.string(), targetId: z.string(), reason: z.string(), reporterEmail: z.string(), status: z.string(), resolutionNote: z.string(), reviewedBy: z.string(), reportedAt: z.string() });
type R = Awaited<ReturnType<typeof zite.reports.findAll>>['records'][number];
const toR = (r: R) => ({ id: r.id, subject: r.subject || '', targetType: r.targetType || 'User', targetId: r.targetId || '', reason: r.reason || '', reporterEmail: r.reporterEmail || '', status: r.status || 'Open', resolutionNote: r.resolutionNote || '', reviewedBy: r.reviewedBy || '', reportedAt: r.reportedAt || '' });

export default createEndpoint({
  description: 'Anyone can report a user or listing; Moderators review and resolve reports',
  inputSchema: z.object({
    action: z.enum(['create', 'list', 'review']),
    targetType: z.enum(['User', 'Listing']).optional(),
    targetId: z.string().trim().max(200).optional(),
    subject: z.string().trim().max(150).optional(),
    reason: z.string().trim().max(2000).optional(),
    id: z.string().optional(),
    status: z.enum(['Open', 'Resolved', 'Dismissed']).optional(),
    note: z.string().trim().max(1000).optional(),
  }),
  outputSchema: z.object({ reports: z.array(reportOut) }),
  execute: async ({ input, context }) => {
    const email = context.user.email.toLowerCase();
    if (input.action === 'create') {
      if (!input.targetType || !input.targetId || !input.reason) bad('Say what you are reporting and why.');
      const { rows } = await zite.sql({ query: `SELECT count(*) AS n FROM "Reports" WHERE lower("reporterEmail") = $1 AND created_at > now() - interval '1 hour'`, params: [email] });
      if (Number(rows[0]?.n ?? 0) >= 10) bad("You've sent a lot of reports — try again later.");
      const r = await zite.reports.create({ record: { targetType: input.targetType, targetId: input.targetId, subject: input.subject || input.targetId, reason: input.reason, reporterEmail: email, status: 'Open' } });
      return { reports: [toR(r)] };
    }
    const me = await requirePerm(email, 'reports.review');
    if (input.action === 'review') {
      if (!input.id || !input.status) bad('Pick a report and outcome.');
      await zite.reports.update({ id: input.id, record: { status: input.status, resolutionNote: input.note || '', reviewedBy: me.email } });
      await audit(me.email, `report.${input.status.toLowerCase()}`, input.id, input.note || '');
    }
    const { records } = await zite.reports.findAll({ sort: [{ field: 'reportedAt', direction: 'desc' }], limit: 300 });
    return { reports: records.map(toR) };
  },
});
