import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const deny = (m: string): never => { throw new ZiteError({ code: 'BAD_REQUEST', message: m, userFacingMessage: m }); };

export default createEndpoint({
  description: 'Hosts, joins, leaves and reads theme swap parties where friends trade themes for a while',
  inputSchema: z.object({
    action: z.enum(['mine', 'host', 'join', 'leave']),
    code: z.string().optional(),
    minutes: z.number().optional(),
    themeName: z.string().optional(),
    themeCss: z.string().optional(),
  }),
  outputSchema: z.object({
    party: z.object({
      code: z.string(),
      endsAt: z.string(),
      isHost: z.boolean(),
      members: z.array(z.object({ email: z.string(), name: z.string(), themeName: z.string() })),
      myTheme: z.object({ name: z.string(), css: z.string(), from: z.string() }).nullable(),
    }).nullable(),
  }),
  execute: async ({ input, context }) => {
    const me = context.user.email.toLowerCase();
    const name = context.user.firstName || me.split('@')[0];
    const now = new Date().toISOString();
    const mine = await zite.swapPartyMembers.findAll({ filters: { email: me }, limit: 50 });
    const activeRow = mine.records.find(r => r.endsAt && r.endsAt > now);

    if (input.action === 'leave' && activeRow) {
      if (activeRow.isHost) {
        const all = await zite.swapPartyMembers.findAll({ filters: { partyCode: activeRow.partyCode }, limit: 100 });
        await Promise.all(all.records.map(r => zite.swapPartyMembers.delete({ id: r.id })));
      } else await zite.swapPartyMembers.delete({ id: activeRow.id });
      return { party: null };
    }

    if (input.action === 'host' || input.action === 'join') {
      if (activeRow) deny('You are already in a swap party. Leave it first.');
      if (!input.themeCss) deny('Equip a background theme first — that is what you bring to the swap.');
      let code = '', endsAt = '';
      if (input.action === 'host') {
        const mins = Math.min(Math.max(input.minutes ?? 30, 5), 24 * 60);
        code = Math.random().toString(36).slice(2, 8).toUpperCase();
        endsAt = new Date(Date.now() + mins * 60000).toISOString();
      } else {
        code = (input.code || '').trim().toUpperCase();
        const host = await zite.swapPartyMembers.findOne({ filters: { partyCode: code, isHost: true } });
        if (!host || !host.endsAt || host.endsAt <= now) deny('That party code is not active.');
        endsAt = host!.endsAt!;
      }
      await zite.swapPartyMembers.create({ record: {
        partyCode: code, email: me, displayName: name, themeName: input.themeName || 'Theme',
        themeCss: input.themeCss, isHost: input.action === 'host', endsAt,
      } });
      return readParty(code, me);
    }

    return activeRow ? readParty(activeRow.partyCode!, me) : { party: null };
  },
});

async function readParty(code: string, me: string) {
  const { records } = await zite.swapPartyMembers.findAll({ filters: { partyCode: code }, sort: [{ field: 'joinedAt', direction: 'asc' }], limit: 100 });
  const i = records.findIndex(r => r.email?.toLowerCase() === me);
  const self = records[i];
  // Everyone wears the theme of the next person in the circle.
  const giver = records.length > 1 ? records[(i + 1) % records.length] : null;
  return { party: {
    code, endsAt: self?.endsAt ?? '', isHost: !!self?.isHost,
    members: records.map(r => ({ email: r.email ?? '', name: r.displayName ?? '', themeName: r.themeName ?? '' })),
    myTheme: giver ? { name: giver.themeName ?? '', css: giver.themeCss ?? '', from: giver.displayName ?? '' } : null,
  } };
}
