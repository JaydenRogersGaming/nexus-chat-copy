import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requirePerm, bad, audit } from '../lib/serverAuth';

const GAMES = ['Reaction', 'Click Frenzy', 'Speed Typing'] as const;
// Sanity caps so obviously faked scores are rejected
const MAX_SCORE: Record<string, number> = { Reaction: 900, 'Click Frenzy': 250, 'Speed Typing': 250 };

const tSchema = z.object({
  id: z.string(), title: z.string(), game: z.string(), prizeGems: z.number(),
  endsAt: z.string(), ended: z.boolean(), prizePaid: z.boolean(),
  leaderboard: z.array(z.object({ email: z.string(), name: z.string(), score: z.number(), attempts: z.number() })),
});

export default createEndpoint({
  description: 'Lists, creates, scores and pays out mini-game tournaments',
  authenticated: true,
  inputSchema: z.object({
    action: z.enum(['list', 'create', 'submit', 'claim', 'delete']),
    tournamentId: z.string().optional(),
    title: z.string().optional(),
    game: z.enum(GAMES).optional(),
    prizeGems: z.number().optional(),
    hours: z.number().optional(),
    score: z.number().optional(),
    playerName: z.string().optional(),
  }),
  outputSchema: z.object({ tournaments: z.array(tSchema), prize: z.number() }),
  execute: async ({ input, context }) => {
    const me = context.user.email.toLowerCase();
    const empty = { tournaments: [], prize: 0 };

    if (input.action === 'create') {
      await requirePerm(me, 'users.restrict');
      const title = (input.title || '').trim();
      if (!title || !input.game) bad('Add a title and pick a game');
      const hours = Math.min(Math.max(input.hours ?? 24, 1), 24 * 14);
      await zite.tournaments.create({ record: {
        title: title.slice(0, 60), game: input.game, prizeGems: Math.max(0, Math.floor(input.prizeGems ?? 0)),
        endsAt: new Date(Date.now() + hours * 3600_000).toISOString(), createdBy: me, prizePaid: false,
      } });
      await audit(me, 'createTournament', title, `${input.game}, ${hours}h`);
      return empty;
    }

    if (input.action === 'delete') {
      await requirePerm(me, 'users.restrict');
      if (input.tournamentId) await zite.tournaments.delete({ id: input.tournamentId });
      return empty;
    }

    const t = input.tournamentId ? await zite.tournaments.findOne({ filters: { id: input.tournamentId } }) : null;

    if (input.action === 'submit') {
      if (!t) bad('Tournament not found');
      if (new Date(t.endsAt || 0).getTime() < Date.now()) bad('This tournament has ended');
      const score = Math.floor(input.score ?? 0);
      if (score < 0 || score > (MAX_SCORE[t.game || ''] ?? 1000)) bad('That score looks invalid');
      const { records } = await zite.tournamentEntries.findAll({ filters: { tournamentId: t.id, playerEmail: me }, limit: 1 });
      const cur = records[0];
      const name = (input.playerName || context.user.firstName || me.split('@')[0]).slice(0, 30);
      if (cur) {
        await zite.tournamentEntries.update({ id: cur.id, record: { bestScore: Math.max(cur.bestScore ?? 0, score), attempts: (cur.attempts ?? 0) + 1, playerName: name } });
      } else {
        await zite.tournamentEntries.create({ record: { tournamentId: t.id, playerEmail: me, playerName: name, bestScore: score, attempts: 1 } });
      }
      return empty;
    }

    if (input.action === 'claim') {
      if (!t) bad('Tournament not found');
      if (new Date(t.endsAt || 0).getTime() > Date.now()) bad('Tournament is still running');
      if (t.prizePaid) bad('Prize already claimed');
      const { rows } = await zite.sql({
        query: `SELECT "playerEmail" FROM "TournamentEntries" WHERE "tournamentId" = $1 ORDER BY "bestScore" DESC LIMIT 1`,
        params: [t.id],
      });
      if (String(rows[0]?.playerEmail || '').toLowerCase() !== me) bad('Only the winner can claim the prize');
      await zite.tournaments.update({ id: t.id, record: { prizePaid: true } });
      return { tournaments: [], prize: t.prizeGems ?? 0 };
    }

    // list
    const { records: ts } = await zite.tournaments.findAll({ limit: 50 });
    const { rows } = await zite.sql({
      query: `SELECT "tournamentId","playerEmail","playerName","bestScore","attempts" FROM "TournamentEntries" ORDER BY "bestScore" DESC LIMIT 2000`,
    });
    const now = Date.now();
    return {
      prize: 0,
      tournaments: ts
        .map(x => ({
          id: x.id, title: x.title || 'Tournament', game: x.game || 'Reaction', prizeGems: x.prizeGems ?? 0,
          endsAt: x.endsAt || '', ended: new Date(x.endsAt || 0).getTime() < now, prizePaid: !!x.prizePaid,
          leaderboard: rows.filter(r => r.tournamentId === x.id).slice(0, 10).map(r => ({
            email: String(r.playerEmail ?? ''), name: String(r.playerName ?? ''), score: Number(r.bestScore ?? 0), attempts: Number(r.attempts ?? 0),
          })),
        }))
        .sort((a, b) => Number(a.ended) - Number(b.ended) || b.endsAt.localeCompare(a.endsAt)),
    };
  },
});
