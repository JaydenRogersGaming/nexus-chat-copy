import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { isOwnerEmail } from '../lib/gameData';
import { findPrank, VIP_MEAN_IDS } from '../lib/pranks';

export default createEndpoint({
  description: 'Sends a prank to another user or picks up pranks sent to you',
  authenticated: true,
  inputSchema: z.object({
    action: z.enum(['send', 'inbox']),
    targetEmail: z.string().optional(),
    prankId: z.string().optional(),
    senderName: z.string().optional(),
  }),
  outputSchema: z.object({
    pranks: z.array(z.object({ prankId: z.string(), senderName: z.string() })),
  }),
  execute: async ({ input, context }) => {
    const me = context.user.email.toLowerCase();
    if (input.action === 'send') {
      const p = findPrank(input.prankId || '');
      const target = (input.targetEmail || '').toLowerCase();
      if (!p || !target) throw new ZiteError({ code: 'BAD_REQUEST', message: 'Bad prank', userFacingMessage: 'Pick a prank and a person.' });
      if (target === me) throw new ZiteError({ code: 'BAD_REQUEST', message: 'self', userFacingMessage: "You can't prank yourself." });
      if (p.mean && !isOwnerEmail(me) && !VIP_MEAN_IDS.includes(p.id))
        throw new ZiteError({ code: 'BAD_REQUEST', message: 'locked', userFacingMessage: 'Only the owner can send that prank.' });
      await zite.pranks.create({ record: {
        prankId: p.id, targetEmail: target, senderEmail: me,
        senderName: (input.senderName || me.split('@')[0]).slice(0, 40), seen: false,
      } });
      return { pranks: [] };
    }
    const { records } = await zite.pranks.findAll({ filters: { targetEmail: me, seen: false }, limit: 5 });
    if (records.length) await Promise.all(records.map(r => zite.pranks.update({ id: r.id, record: { seen: true } })));
    return { pranks: records.map(r => ({ prankId: r.prankId || '', senderName: r.senderName || 'Someone' })) };
  },
});
