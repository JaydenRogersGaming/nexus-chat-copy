import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { isOwnerEmail } from '../lib/permissions';

const item = z.object({
  id: z.string(), name: z.string(), kind: z.enum(['Title', 'Typing Effect', 'Background']),
  emoji: z.string(), color: z.string(), color2: z.string(), effect: z.string(), typingText: z.string(),
  cost: z.number(), holidayKey: z.string(), active: z.boolean(),
});

export default createEndpoint({
  description: 'Lists owner-made limited shop items; the owner can add, hide/show or delete them',
  inputSchema: z.object({
    action: z.enum(['list', 'create', 'toggle', 'delete']),
    id: z.string().optional(),
    item: item.omit({ id: true, active: true }).optional(),
  }),
  outputSchema: z.object({ items: z.array(item) }),
  execute: async ({ input, context }) => {
    if (input.action !== 'list' && !isOwnerEmail(context.user?.email?.toLowerCase())) throw new ZiteError('Only the owner can manage limited items.');
    if (input.action === 'create') {
      const i = input.item;
      if (!i || !i.name.trim()) throw new ZiteError('Give the item a name.');
      await zite.customLimitedItems.create({ record: {
        name: i.name.trim().slice(0, 40), kind: i.kind, emoji: i.emoji.slice(0, 8), color: i.color, color2: i.color2,
        effect: i.effect, typingText: i.typingText.slice(0, 60), cost: Math.max(0, Math.round(i.cost)), holidayKey: i.holidayKey, active: true,
      } });
    }
    if (input.action === 'toggle' && input.id) {
      const cur = await zite.customLimitedItems.findOne({ id: input.id });
      if (cur) await zite.customLimitedItems.update({ id: input.id, record: { active: !cur.active } });
    }
    if (input.action === 'delete' && input.id) await zite.customLimitedItems.delete({ id: input.id });
    const { records } = await zite.customLimitedItems.findAll({ limit: 500 });
    const kinds = ['Title', 'Typing Effect', 'Background'] as const;
    return { items: records.map(r => ({
      id: r.id, name: r.name || 'Item', kind: kinds.find(k => k === r.kind) ?? 'Title', emoji: r.emoji || '✨',
      color: r.color || '#f5c542', color2: r.color2 || '#ff5fa2', effect: r.effect || 'glow', typingText: r.typingText || 'is typing…',
      cost: r.cost ?? 0, holidayKey: r.holidayKey || '', active: !!r.active,
    })) };
  },
});
