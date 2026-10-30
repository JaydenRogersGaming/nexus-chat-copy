import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { isOwnerEmail } from '../lib/permissions';
import { loadActor } from '../lib/serverAuth';

const LIVE_MS = 20_000;
const ROLE_KEY = 'theaterRoles';
const DEFAULT_ROLES = ['co-owner'];
const fail = (m: string): never => { throw new ZiteError({ code: 'BAD_REQUEST', message: m, userFacingMessage: m }); };

const party = z.object({ id: z.string(), title: z.string(), videoUrl: z.string(), hostEmail: z.string(), hostName: z.string(), scheduledFor: z.string(), endsAt: z.string(), playing: z.boolean(), positionSeconds: z.number(), syncedAtMs: z.number(), ended: z.boolean(), viewers: z.array(z.object({ email: z.string(), name: z.string() })) });
type P = NonNullable<Awaited<ReturnType<typeof zite.watchParties.findOne>>>;
const toParty = (p: P, viewers: { email: string; name: string }[]) => ({
  id: p.id, title: p.title || 'Theater', videoUrl: p.videoUrl || '', hostEmail: p.hostEmail || '', hostName: p.hostName || '',
  scheduledFor: p.scheduledFor || '', endsAt: p.endsAt || '', playing: !!p.playing, positionSeconds: p.positionSeconds || 0, syncedAtMs: p.syncedAtMs || 0, ended: !!p.ended, viewers,
});
const isOver = (p: P) => !!p.endsAt && new Date(p.endsAt).getTime() <= Date.now();

async function viewersOf(ids: string[]) {
  const map = new Map<string, { email: string; name: string }[]>();
  if (!ids.length) return map;
  const { rows } = await zite.sql({ query: `SELECT "partyId", "email", "name" FROM "WatchPartyViewers" WHERE "lastSeenMs" > $1 LIMIT 2000`, params: [Date.now() - LIVE_MS] });
  const want = new Set(ids);
  for (const r of rows) { const k = String(r.partyId); if (!want.has(k)) continue; map.set(k, [...(map.get(k) || []), { email: String(r.email), name: String(r.name || r.email) }]); }
  return map;
}
async function allowedRoles(): Promise<string[]> {
  const r = await zite.chatSettings.findOne({ filters: { key: ROLE_KEY } });
  try { return r?.value ? JSON.parse(r.value) : DEFAULT_ROLES; } catch { return DEFAULT_ROLES; }
}
/** Ends any movie whose end time has passed. */
async function closeExpired(records: P[]) {
  const over = records.filter(isOver);
  await Promise.all(over.map(p => zite.watchParties.update({ id: p.id, record: { ended: true, playing: false } })));
  return records.filter(p => !isOver(p));
}

export default createEndpoint({
  description: 'Runs the Theater: movie listings, who can start movies, playback sync, start/end times and chat',
  authenticated: true,
  inputSchema: z.object({
    action: z.enum(['list', 'friends', 'create', 'state', 'control', 'send', 'end', 'schedule', 'access', 'setRoles']),
    id: z.string().optional(),
    name: z.string().max(60).optional(),
    title: z.string().trim().max(100).optional(),
    videoUrl: z.string().trim().max(1000).optional(),
    scheduledFor: z.string().optional(),
    endsAt: z.string().optional(),
    playing: z.boolean().optional(),
    positionSeconds: z.number().min(0).optional(),
    text: z.string().trim().max(300).optional(),
    isReaction: z.boolean().optional(),
    roles: z.array(z.string().max(40)).max(20).optional(),
  }),
  outputSchema: z.object({
    parties: z.array(party),
    messages: z.array(z.object({ id: z.string(), text: z.string(), senderName: z.string(), senderEmail: z.string(), isReaction: z.boolean(), sentAt: z.string() })),
    canStart: z.boolean().optional(),
    allowedRoles: z.array(z.string()).optional(),
  }),
  execute: async ({ input, context }): Promise<{ parties: ReturnType<typeof toParty>[]; messages: { id: string; text: string; senderName: string; senderEmail: string; isReaction: boolean; sentAt: string }[]; canStart?: boolean; allowedRoles?: string[] }> => {
    const email = context.user.email.toLowerCase();
    const name = input.name?.trim() || context.user.firstName || email.split('@')[0];
    const owner = isOwnerEmail(email);
    type Out = { parties: ReturnType<typeof toParty>[]; messages: { id: string; text: string; senderName: string; senderEmail: string; isReaction: boolean; sentAt: string }[]; canStart?: boolean; allowedRoles?: string[] };
    const empty: Out = { parties: [], messages: [] };

    if (input.action === 'access' || input.action === 'setRoles') {
      if (input.action === 'setRoles') {
        if (!owner) fail('Only the owner can change who starts movies.');
        await zite.chatSettings.bulkCreate({ records: [{ key: ROLE_KEY, value: JSON.stringify(input.roles || []) }], matchOn: ['key'] });
      }
      const roles = await allowedRoles();
      const me = await loadActor(email);
      return { ...empty, allowedRoles: roles, canStart: owner || roles.includes(me.chatRole) };
    }
    if (input.action === 'list') {
      const { records } = await zite.watchParties.findAll({ filters: { ended: false }, sort: [{ field: 'scheduledFor', direction: 'asc' }], limit: 100 });
      const open = await closeExpired(records);
      const v = await viewersOf(open.map(r => r.id));
      return { parties: open.map(r => toParty(r, v.get(r.id) || [])), messages: [] };
    }
    if (input.action === 'friends') {
      const { rows } = await zite.sql({ query: `SELECT "requesterEmail","addresseeEmail" FROM "Friendships" WHERE "status" = 'Accepted' AND (lower("requesterEmail") = $1 OR lower("addresseeEmail") = $1) LIMIT 1000`, params: [email] });
      const friends = new Set(rows.map(r => [String(r.requesterEmail).toLowerCase(), String(r.addresseeEmail).toLowerCase()].find(e => e !== email)!));
      if (!friends.size) return empty;
      const { records } = await zite.watchParties.findAll({ filters: { ended: false }, limit: 200 });
      const open = records.filter(p => !isOver(p));
      const v = await viewersOf(open.map(r => r.id));
      const soon = Date.now() + 15 * 60_000;
      return { parties: open.map(r => toParty(r, v.get(r.id) || [])).filter(p =>
        (friends.has(p.hostEmail.toLowerCase()) || p.viewers.some(x => friends.has(x.email.toLowerCase())))
        && new Date(p.scheduledFor).getTime() <= soon && !p.viewers.some(x => x.email.toLowerCase() === email)), messages: [] };
    }
    if (input.action === 'create') {
      const me = await loadActor(email);
      if (!owner && !(await allowedRoles()).includes(me.chatRole)) fail("You can't start movies. Join one that's playing instead!");
      if (!input.title || !input.videoUrl) fail('Add a title and a movie link.');
      if (!/^https?:\/\//.test(input.videoUrl!)) fail('The movie link must start with http:// or https://');
      const start = input.scheduledFor || new Date().toISOString();
      if (input.endsAt && new Date(input.endsAt) <= new Date(start)) fail('The end time must be after the start time.');
      const p = await zite.watchParties.create({ record: { title: input.title!, videoUrl: input.videoUrl!, hostEmail: email, hostName: name, scheduledFor: start, endsAt: input.endsAt || null, playing: false, positionSeconds: 0, syncedAtMs: Date.now(), ended: false } });
      return { parties: [toParty(p, [])], messages: [] };
    }

    if (!input.id) fail('Pick a movie.');
    const p = await zite.watchParties.findOne({ id: input.id! });
    if (!p) fail('That movie is no longer showing.');
    const canControl = owner || (p!.hostEmail || '').toLowerCase() === email;

    if (input.action === 'control') {
      if (!canControl) fail('Only the host or the owner controls playback.');
      await zite.watchParties.update({ id: p!.id, record: { playing: input.playing ?? !!p!.playing, positionSeconds: input.positionSeconds ?? p!.positionSeconds ?? 0, syncedAtMs: Date.now() } });
    }
    if (input.action === 'schedule') {
      if (!canControl) fail('Only the host or the owner can change the showtimes.');
      const start = input.scheduledFor || p!.scheduledFor || new Date().toISOString();
      if (input.endsAt && new Date(input.endsAt) <= new Date(start)) fail('The end time must be after the start time.');
      await zite.watchParties.update({ id: p!.id, record: { scheduledFor: start, endsAt: input.endsAt || null } });
    }
    if (input.action === 'end') {
      if (!canControl) fail('Only the host or the owner can end the movie.');
      await zite.watchParties.update({ id: p!.id, record: { ended: true, playing: false } });
    }
    if (input.action === 'send') {
      if (!input.text) fail('Type a message first.');
      await zite.watchPartyMessages.create({ record: { text: input.text!, partyId: p!.id, senderEmail: email, senderName: name, isReaction: !!input.isReaction } });
    }

    if (isOver(p!) && !p!.ended) await zite.watchParties.update({ id: p!.id, record: { ended: true, playing: false } });
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
