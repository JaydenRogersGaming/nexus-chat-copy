import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L for easy copying
const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
const STALE_MS = 15_000;

const fail = (m: string, code: 'BAD_REQUEST' | 'NOT_FOUND' = 'BAD_REQUEST'): never => {
  throw new ZiteError({ code, message: m, userFacingMessage: m });
};
const genCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), b => ALPHABET[b % ALPHABET.length]).join('');
const normCode = (c?: string) => (c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

async function liveRoom(code: string) {
  if (!code) fail('Enter a room code.');
  const room = await zite.videoRooms.findOne({ filters: { code } });
  if (!room) fail("That room doesn't exist. Check the code and try again.", 'NOT_FOUND');
  if (room!.expiresAt && new Date(room!.expiresAt).getTime() < Date.now()) fail('This room has expired. Ask the host to create a new one.', 'NOT_FOUND');
  return room!;
}

function iceServers() {
  const servers: { urls: string | string[]; username?: string; credential?: string }[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];
  const env = process.env as Record<string, string | undefined>;
  if (env.ZITE_TURN_URL) {
    servers.push({ urls: env.ZITE_TURN_URL.split(',').map(s => s.trim()), username: env.ZITE_TURN_USERNAME, credential: env.ZITE_TURN_CREDENTIAL });
  }
  return servers;
}

const signalSchema = z.object({ to: z.string(), kind: z.string(), payload: z.string() });

export default createEndpoint({
  description: 'Creates and validates video rooms and relays WebRTC signaling between participants',
  inputSchema: z.object({
    action: z.enum(['create', 'check', 'sync', 'leave']),
    code: z.string().optional(),
    peerId: z.string().optional(),
    displayName: z.string().optional(),
    outgoing: z.array(signalSchema).optional(),
  }),
  outputSchema: z.object({
    code: z.string(),
    iceServers: z.array(z.object({ urls: z.union([z.string(), z.array(z.string())]), username: z.string().optional(), credential: z.string().optional() })),
    participants: z.array(z.object({ peerId: z.string(), displayName: z.string() })),
    signals: z.array(z.object({ from: z.string(), kind: z.string(), payload: z.string() })),
  }),
  execute: async ({ input }) => {
    const base = { iceServers: iceServers(), participants: [], signals: [] };

    if (input.action === 'create') {
      let code = genCode();
      for (let i = 0; i < 5 && (await zite.videoRooms.findOne({ filters: { code } })); i++) code = genCode();
      await zite.videoRooms.create({ record: { code, hostName: (input.displayName || '').slice(0, 40), expiresAt: new Date(Date.now() + ROOM_TTL_MS).toISOString() } });
      return { ...base, code };
    }

    const code = normCode(input.code);
    if (input.action === 'check') { await liveRoom(code); return { ...base, code }; }

    const peerId = input.peerId || fail('Missing peer id.');
    if (input.action === 'leave') {
      const { records } = await zite.videoParticipants.findAll({ filters: { peerId }, limit: 10 });
      await Promise.all(records.map(r => zite.videoParticipants.delete({ id: r.id })));
      return { ...base, code };
    }

    // sync: heartbeat + send + receive
    await liveRoom(code);
    const now = new Date().toISOString();
    await zite.videoParticipants.bulkCreate({
      records: [{ peerId, roomCode: code, displayName: (input.displayName || 'Guest').slice(0, 40), lastSeen: now }],
      matchOn: ['peerId'],
    });
    const out = (input.outgoing || []).slice(0, 100);
    if (out.length) {
      await zite.videoSignals.bulkCreate({ records: out.map(s => ({ roomCode: code, fromPeer: peerId, toPeer: s.to, kind: s.kind, payload: s.payload })) });
    }

    const { rows: inbox } = await zite.sql({
      query: `SELECT "id","fromPeer","kind","payload" FROM "VideoSignals" WHERE "roomCode" = $1 AND "toPeer" = $2 LIMIT 200`,
      params: [code, peerId],
    });
    if (inbox.length) await Promise.all(inbox.map(r => zite.videoSignals.delete({ id: String(r.id) })));

    const cutoff = new Date(Date.now() - STALE_MS).toISOString();
    const { rows: people } = await zite.sql({
      query: `SELECT "peerId","displayName" FROM "VideoParticipants" WHERE "roomCode" = $1 AND "lastSeen" >= $2 LIMIT 50`,
      params: [code, cutoff],
    });

    return {
      ...base, code,
      participants: people.map(p => ({ peerId: String(p.peerId), displayName: String(p.displayName || 'Guest') })).filter(p => p.peerId !== peerId),
      signals: inbox.map(r => ({ from: String(r.fromPeer), kind: String(r.kind), payload: String(r.payload) })),
    };
  },
});
