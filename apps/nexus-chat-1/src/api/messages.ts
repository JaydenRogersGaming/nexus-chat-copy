import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Send, fetch, and react to chat messages in a room',
  authenticated: true,
  inputSchema: z.object({
    action: z.enum(['send', 'getMessages', 'react', 'deleteMsg']),
    roomId: z.string().optional(),
    content: z.string().optional(),
    senderName: z.string().optional(),
    senderTitle: z.string().optional(),
    senderTitleColor: z.string().optional(),
    senderTitleEffect: z.string().optional(),
    senderNameColor: z.string().optional(),
    replyTo: z.object({ id: z.string(), senderName: z.string(), content: z.string() }).optional(),
    // For reactions
    messageId: z.string().optional(),
    emoji: z.string().optional(),
    // Pagination
    limit: z.number().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    messages: z.array(z.any()).optional(),
    messageId: z.string().optional(),
  }),
  execute: async ({ input, context }) => {
    const email = context.user.email;

    if (input.action === 'send') {
      const msgId = crypto.randomUUID();
      await zite.chatMessages.create({
        record: {
          messageId: msgId,
          roomId: input.roomId || 'global',
          senderEmail: email,
          senderName: input.senderName || email.split('@')[0],
          content: input.content || '',
          senderTitle: input.senderTitle || '',
          senderTitleColor: input.senderTitleColor || '',
          senderTitleEffect: input.senderTitleEffect || '',
          senderNameColor: input.senderNameColor || '',
          reactionsJson: '{}',
          replyToJson: input.replyTo ? JSON.stringify(input.replyTo) : '',
          deleted: false,
          sentAt: new Date(),
        },
      });
      return { success: true, messageId: msgId };
    }

    if (input.action === 'getMessages') {
      const limit = input.limit || 100;
      const { rows } = await zite.sql({
        query: `SELECT "messageId", "roomId", "senderEmail", "senderName", "content", "senderTitle", "senderTitleColor", "senderTitleEffect", "senderNameColor", "reactionsJson", "replyToJson", "deleted", "sentAt" FROM "ChatMessages" WHERE "roomId" = $1 ORDER BY "sentAt" DESC LIMIT $2`,
        params: [input.roomId || 'global', limit],
      });
      // Reverse so oldest first
      const messages = (rows as any[]).reverse().map(r => ({
        id: r.messageId,
        chatRoomId: r.roomId,
        senderEmail: r.senderEmail,
        senderName: r.senderName,
        content: r.content,
        senderTitle: r.senderTitle || '',
        senderTitleColor: r.senderTitleColor || '',
        senderTitleEffect: r.senderTitleEffect || '',
        senderNameColor: r.senderNameColor || '',
        reactions: r.reactionsJson ? safeJsonParse(r.reactionsJson, {}) : {},
        replyTo: r.replyToJson ? safeJsonParse(r.replyToJson, undefined) : undefined,
        deleted: r.deleted || false,
        timestamp: r.sentAt ? new Date(r.sentAt).getTime() : Date.now(),
      }));
      return { success: true, messages };
    }

    if (input.action === 'react') {
      if (!input.messageId || !input.emoji) return { success: false };
      const msg = await zite.chatMessages.findOne({ filters: { messageId: input.messageId } });
      if (!msg) return { success: false };
      const reactions: Record<string, string[]> = safeJsonParse(msg.reactionsJson || '{}', {});
      if (!reactions[input.emoji]) reactions[input.emoji] = [];
      const idx = reactions[input.emoji].indexOf(email);
      if (idx >= 0) reactions[input.emoji].splice(idx, 1);
      else reactions[input.emoji].push(email);
      await zite.chatMessages.update({ id: msg.id, record: { reactionsJson: JSON.stringify(reactions) } });
      return { success: true };
    }

    if (input.action === 'deleteMsg') {
      if (!input.messageId) return { success: false };
      const msg = await zite.chatMessages.findOne({ filters: { messageId: input.messageId } });
      if (!msg) return { success: false };
      await zite.chatMessages.update({ id: msg.id, record: { deleted: true } });
      return { success: true };
    }

    return { success: false };
  },
});

function safeJsonParse(str: string, fallback: any) {
  try { return JSON.parse(str); } catch { return fallback; }
}
