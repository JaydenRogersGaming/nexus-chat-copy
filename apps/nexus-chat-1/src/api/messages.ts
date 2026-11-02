import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { filterText } from '../lib/wordFilter';
import { BAD_WORDS, isOwnerEmail } from '../lib/gameData';

/** The shared word list + immunity list live in Chat Settings. The server is the one place filtering happens. */
async function applyFilter(email: string, text: string): Promise<{ text: string; immune: boolean }> {
  const e = email.toLowerCase();
  const { records } = await zite.chatSettings.findAll({ limit: 10 });
  const read = (k: string): string[] | null => { const v = records.find(r => r.key === k)?.value; if (!v) return null; try { return JSON.parse(v); } catch { return null; } };
  const immuneList = (read('immune') || []).map(x => x.toLowerCase());
  const immune = isOwnerEmail(e) || immuneList.includes(e);
  if (immune || text.startsWith('[gif]')) return { text, immune };
  return { text: filterText(text, read('words') ?? BAD_WORDS).text, immune: false };
}

const messageSchema = z.object({
  id: z.string(),
  chatRoomId: z.string(),
  senderEmail: z.string(),
  senderName: z.string(),
  content: z.string(),
  reactions: z.record(z.array(z.string())),
  deleted: z.boolean(),
  senderTitle: z.string(),
  senderTitleEffect: z.string(),
  senderTitleColor: z.string(),
  senderNameColor: z.string(),
  replyTo: z.object({ id: z.string(), senderName: z.string(), content: z.string() }).optional(),
  timestamp: z.number(),
  edited: z.boolean().optional(),
  uncensored: z.boolean().optional(),
  hidden: z.boolean().optional(),
});

export default createEndpoint({
  description: 'Sends, lists, reacts to and deletes shared chat messages',
  inputSchema: z.object({
    action: z.enum(['getMessages', 'send', 'react', 'delete', 'clear', 'edit', 'hide', 'unhide']),
    content: z.string().optional(),
    roomId: z.string().optional(),
    limit: z.number().optional(),
    message: messageSchema.optional(),
    messageId: z.string().optional(),
    reactions: z.record(z.array(z.string())).optional(),
    uncensored: z.boolean().optional(),
  }),
  outputSchema: z.object({ messages: z.array(messageSchema) }),
  execute: async ({ input, context }) => {
    const viewerIsOwner = isOwnerEmail((context.user?.email || '').toLowerCase());
    if ((input.action === 'hide' || input.action === 'unhide') && input.messageId) {
      if (!viewerIsOwner) throw new Error('Only the owner can hide messages');
      const rec = await zite.chatMessages.findOne({ filters: { messageId: input.messageId } });
      if (!rec) throw new Error('Message not found');
      await zite.chatMessages.update({ id: rec.id, record: { hidden: input.action === 'hide' } });
      return { messages: [] };
    }
    if (input.action === 'edit' && input.messageId) {
      const text = (input.content || '').trim();
      if (!text) throw new Error('Message cannot be empty');
      const rec = await zite.chatMessages.findOne({ filters: { messageId: input.messageId } });
      if (!rec) throw new Error('Message not found');
      if ((rec.senderEmail || '').toLowerCase() !== (context.user?.email || '').toLowerCase()) {
        throw new Error('You can only edit your own messages');
      }
      const f = await applyFilter(context.user?.email || '', text);
      await zite.chatMessages.update({ id: rec.id, record: { content: f.text, edited: true, uncensored: f.immune } });
      return { messages: [] };
    }
    if (input.action === 'send' && input.message) {
      const m = input.message;
      const f = await applyFilter(context.user?.email || m.senderEmail, m.content);
      await zite.chatMessages.create({ record: {
        messageId: m.id, roomId: m.chatRoomId, senderEmail: m.senderEmail, senderName: m.senderName,
        content: f.text, senderTitle: m.senderTitle, senderTitleColor: m.senderTitleColor,
        senderTitleEffect: m.senderTitleEffect, senderNameColor: m.senderNameColor,
        reactionsJson: JSON.stringify(m.reactions || {}), replyToJson: m.replyTo ? JSON.stringify(m.replyTo) : null,
        deleted: false, uncensored: f.immune, sentAt: new Date().toISOString(),
      } });
      return { messages: [] };
    }

    if (input.action === 'clear') {
      const { records } = await zite.chatMessages.findAll({ filters: { roomId: input.roomId ?? 'global' }, limit: 2000 });
      for (let i = 0; i < records.length; i += 25) {
        await Promise.all(records.slice(i, i + 25).map(r => zite.chatMessages.delete({ id: r.id })));
      }
      return { messages: [] };
    }

    if ((input.action === 'react' || input.action === 'delete') && input.messageId) {
      const rec = await zite.chatMessages.findOne({ filters: { messageId: input.messageId } });
      if (rec) {
        await zite.chatMessages.update({ id: rec.id, record: input.action === 'delete'
          ? { deleted: true } as never
          : { reactionsJson: JSON.stringify(input.reactions || {}) } as never });
      }
      return { messages: [] };
    }

    const limit = Math.min(input.limit ?? 200, 500);
    const { rows } = await zite.sql({
      query: `SELECT * FROM (SELECT "messageId","roomId","senderEmail","senderName","content","senderTitle","senderTitleColor","senderTitleEffect","senderNameColor","reactionsJson","replyToJson","deleted","edited","uncensored","hidden","sentAt" FROM "ChatMessages" WHERE "roomId" = $1${viewerIsOwner ? '' : ' AND COALESCE("hidden", false) = false'} ORDER BY "sentAt" DESC, "messageId" DESC LIMIT ${limit}) t ORDER BY "sentAt" ASC, "messageId" ASC`,
      params: [input.roomId ?? 'global'],
    });
    const parse = <T,>(v: unknown, fb: T): T => { try { return v ? JSON.parse(String(v)) : fb; } catch { return fb; } };
    // Show each sender's current profile name, not the name saved on old messages
    const emails = [...new Set(rows.map(r => String(r.senderEmail ?? '').toLowerCase()).filter(Boolean))];
    const names = new Map<string, string>();
    // Fallback: the name on each sender's newest message
    for (const r of rows) { const e = String(r.senderEmail ?? '').toLowerCase(); if (e && r.senderName) names.set(e, String(r.senderName)); }
    if (emails.length) {
      const pres = await zite.sql({ query: `SELECT "email","displayName" FROM "Presence" WHERE LOWER("email") = ANY($1)`, params: [emails] });
      for (const p of pres.rows) if (p.displayName) names.set(String(p.email).toLowerCase(), String(p.displayName));
      const prof = await zite.sql({ query: `SELECT "email","profileData" FROM "UserProfiles" WHERE LOWER("email") = ANY($1)`, params: [emails] });
      for (const p of prof.rows) { const n = parse<{ name?: string }>(p.profileData, {}).name; if (n) names.set(String(p.email).toLowerCase(), n); }
    }
    return {
      messages: rows.map(r => ({
        id: String(r.messageId ?? ''), chatRoomId: String(r.roomId ?? ''),
        senderEmail: String(r.senderEmail ?? ''), senderName: names.get(String(r.senderEmail ?? '').toLowerCase()) || String(r.senderName ?? ''),
        content: String(r.content ?? ''), reactions: parse<Record<string, string[]>>(r.reactionsJson, {}),
        deleted: Boolean(r.deleted), senderTitle: String(r.senderTitle ?? ''),
        senderTitleEffect: String(r.senderTitleEffect ?? ''), senderTitleColor: String(r.senderTitleColor ?? ''),
        senderNameColor: String(r.senderNameColor ?? ''),
        replyTo: parse<{ id: string; senderName: string; content: string } | undefined>(r.replyToJson, undefined),
        timestamp: r.sentAt ? new Date(String(r.sentAt)).getTime() : 0,
        edited: Boolean(r.edited),
        uncensored: Boolean(r.uncensored),
        hidden: Boolean(r.hidden),
      })),
    };
  },
});
