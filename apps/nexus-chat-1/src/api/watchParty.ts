import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const LIVE_MS = 20_000;
const fail = (m: string) => { throw new ZiteError({ code: 'BAD_REQUEST', message: m, userFacingMessage: m }); };

const party = z.object({ id: z.string(), title: z.string(), videoUrl: z.string(), hostEmail: z.string(), hostName: z.string(), scheduledFor: z.string(), playing: z.boolean(), positionSeconds: z.number(), syncedAtMs: z.number(), ended: z.boolean(), viewers: z.array(z.object({ email: z.string(), name: z.string() })) });
type P = Awaited<ReturnType<typeof zite.watchParties.findOne>>;
const toParty = (p: NonNullable<P>, viewers: { email: string; name: string }[]) => ({
  id: p.id, title: p.title || 'Watch party', videoUrl: p.videoUrl || '', hostEmail: p.hostEmail || '', hostName: p.hostName || '',
  scheduledFor: p.scheduledFor || '', playing: !!p.playing, positionSeconds: p.positionSeconds || 0, syncedAtMs: p.syncedAtMs || 0, ended: !!p.ended, viewers,
});

async function viewersOf(ids: string[]) {
  const map = new Map<string, { email: string; name: string }[]>();
  if (!ids.length) return map;
  const { rows } = await zite.sql({ query: `SELECT "partyId", "email", "name" FROM "WatchPartyViewers" WHERE "lastSeenMs" > $1 LIMIT 2000`, params: [Date.now() - LIVE_MS] });
  const want = new Set(ids);
  for (const r of rows) { const k = String(r.partyId); if (!want.has(k)) continue; map.set(k, [...(map.get(k) || []), { email: String(r.email), name: String(r.name || r.email) }]); }
  return map;
}

export default createEndpoint({
  description: 'Creates, joins and syncs watch parties with live chat and reactions',
  inputSchema: z.object({
    action: z.enum(['list', 'friends', 'create', 'state', 'control', 'send', 'end']),
    id: z.string().optional(),
    name: z.string().max(60).optional(),
    title: z.string().trim().max(100).optional(),
    videoUrl: z.string().trim().max(500).optional(),
    scheduledFor: z.string().optional(),
    playing: z.boolean().optional(),
    positionSeconds: z.number().min(0).optional(),
    text: z.string().trim().max(300).optional(),
    isReaction: z.boolean().optional(),
  }),
  outputSchema: z.object({
    parties: z.array(party),
    messages: z.array(z.object({ id: z.string(), text: z.string(), senderName: z.string(), senderEmail: z.string(), isReaction: z.boolean(), sentAt: z.string() })),
  }),
  execute: async ({ input, context }) => {
    const email = context.user.email.toLowerCase();
    const name = input.name?.trim() || context.user.firstName || email.split('@')[0];

    if (input.action === 'list') {
      const { records } = await zite.watchParties.findAll({ filters: { ended: false }, sort: [{ field: 'scheduledFor', direction: 'asc' }], limit: 100 });
      const v = await viewersOf(records.map(r => r.id));
      return { parties: records.map(r => toParty(r, v.get(r.id) || [])), messages: [] };
    }
    if (input.action === 'friends') {
      // Parties a friend is hosting or watching: live now, or scheduled to start within 15 minutes
      const { rows } = await zite.sql({ query: `SELECT "requesterEmail","addresseeEmail" FROM "Friendships" WHERE "status" = 'Accepted' AND (lower("requesterEmail") = $1 OR lower("addresseeEmail") = $1) LIMIT 1000`, params: [email] });
      const friends = new Set(rows.map(r => [String(r.requesterEmail).toLowerCase(), String(r.addresseeEmail).toLowerCase()].find(e => e !== email)!));
      if (!friends.size) return { parties: [], messages: [] };
      const { records } = await zite.watchParties.findAll({ filters: { ended: false }, limit: 200 });
      const v = await viewersOf(records.map(r => r.id));
      const soon = Date.now() + 15 * 60_000;
      const out = records.map(r => toParty(r, v.get(r.id) || [])).filter(p => {
        const friendHere = friends.has(p.hostEmail.toLowerCase()) || p.viewers.some(x => friends.has(x.email.toLowerCase()));
        const startsSoon = new Date(p.scheduledFor).getTime() <= soon;
        return friendHere && startsSoon && !p.viewers.some(x => x.email.toLowerCase() === email);
      });
      return { parties: out, messages: [] };
    }
    if (input.action === 'create') {
      if (!input.title || !input.videoUrl) fail('Add a title and a video link.');
      if (!/^https?:\/\//.test(input.videoUrl!)) fail('The video link must start with http:// or https://');
      const p = await zite.watchParties.create({ record: { title: input.title, videoUrl: input.videoUrl, hostEmail: email, hostName: name, scheduledFor: input.scheduledFor || new Date().toISOString(), playing: false, positionSeconds: 0, syncedAtMs: Date.now(), ended: false } });
      return { parties: [toParty(p, [])], messages: [] };
    }

    if (!input.id) fail('Pick a watch party.');
    const p = await zite.watchParties.findOne({ id: input.id! });
    if (!p) fail('That watch party no longer exists.');
    const isHost = (p!.hostEmail || '').toLowerCase() === email;

    if (input.action === 'control') {
      if (!isHost) fail('Only the host controls playback.');
      await zite.watchParties.update({ id: p!.id, record: { playing: input.playing ?? !!p!.playing, positionSeconds: input.positionSeconds ?? p!.positionSeconds ?? 0, syncedAtMs: Date.now() } });
    }
    if (input.action === 'end') {
      if (!isHost) fail('Only the host can end the party.');
      await zite.watchParties.update({ id: p!.id, record: { ended: true, playing: false } });
    }
    if (input.action === 'send') {
      if (!input.text) fail('Type a message first.');
      await zite.watchPartyMessages.create({ record: { text: input.text, partyId: p!.id, senderEmail: email, senderName: name, isReaction: !!input.isReaction } });
    }

    // heartbeat: mark me as watching
    await zite.watchPartyViewers.bulkCreate({ records: [{ email, partyId: p!.id, name, lastSeenMs: Date.now() }], matchOn: ['email', 'partyId'] });
    const fresh = (await zite.watchParties.findOne({ id: p!.id }))!;
    const v = await viewersOf([p!.id]);
    const { records: msgs } = await zite.watchPartyMessages.findAll({ filters: { partyId: p!.id }, sort: [{ field: 'sentAt', direction: 'desc' }], limit: 80 });
    return {
      parties: [toParty(fresh, v.get(p!.id) || [])],
      messages: msgs.reverse().map(m => ({ id: m.id, text: m.text || '', senderName: m.senderName || '', senderEmail: m.senderEmail || '', isReaction: !!m.isReaction, sentAt: m.sentAt || '' })),
    };
  },
});
