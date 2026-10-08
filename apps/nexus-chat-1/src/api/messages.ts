import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

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
});

export default createEndpoint({
  description: 'Sends, lists, reacts to and deletes shared chat messages',
  inputSchema: z.object({
    action: z.enum(['getMessages', 'send', 'react', 'delete']),
    roomId: z.string().optional(),
    limit: z.number().optional(),
    message: messageSchema.optional(),
    messageId: z.string().optional(),
    reactions: z.record(z.array(z.string())).optional(),
  }),
  outputSchema: z.object({ messages: z.array(messageSchema) }),
  execute: async ({ input }) => {
    if (input.action === 'send' && input.message) {
      const m = input.message;
      await zite.chatMessages.create({ record: {
        messageId: m.id, roomId: m.chatRoomId, senderEmail: m.senderEmail, senderName: m.senderName,
        content: m.content, senderTitle: m.senderTitle, senderTitleColor: m.senderTitleColor,
        senderTitleEffect: m.senderTitleEffect, senderNameColor: m.senderNameColor,
        reactionsJson: JSON.stringify(m.reactions || {}), replyToJson: m.replyTo ? JSON.stringify(m.replyTo) : null,
        deleted: false, sentAt: new Date(m.timestamp).toISOString(),
      } });
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
      query: `SELECT * FROM (SELECT "messageId","roomId","senderEmail","senderName","content","senderTitle","senderTitleColor","senderTitleEffect","senderNameColor","reactionsJson","replyToJson","deleted","sentAt" FROM "ChatMessages" WHERE "roomId" = $1 ORDER BY "sentAt" DESC LIMIT ${limit}) t ORDER BY "sentAt" ASC`,
      params: [input.roomId ?? 'global'],
    });
    const parse = <T,>(v: unknown, fb: T): T => { try { return v ? JSON.parse(String(v)) : fb; } catch { return fb; } };
    return {
      messages: rows.map(r => ({
        id: String(r.messageId ?? ''), chatRoomId: String(r.roomId ?? ''),
        senderEmail: String(r.senderEmail ?? ''), senderName: String(r.senderName ?? ''),
        content: String(r.content ?? ''), reactions: parse<Record<string, string[]>>(r.reactionsJson, {}),
        deleted: Boolean(r.deleted), senderTitle: String(r.senderTitle ?? ''),
        senderTitleEffect: String(r.senderTitleEffect ?? ''), senderTitleColor: String(r.senderTitleColor ?? ''),
        senderNameColor: String(r.senderNameColor ?? ''),
        replyTo: parse<{ id: string; senderName: string; content: string } | undefined>(r.replyToJson, undefined),
        timestamp: r.sentAt ? new Date(String(r.sentAt)).getTime() : 0,
      })),
    };
  },
});
