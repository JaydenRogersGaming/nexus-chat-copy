import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { integrations } from 'zitejs/integrations';
import OpenAI from 'openai';

const FEATURES = 'global chat, DMs, group chats, video rooms, emoji/GIF picker, emoji mixer, art studio (drawing + music maker), casino games with gems, HP clicker idle game, leaderboard, achievements, daily quests, cosmetic shop, titles & badges, themes, marketplace, friends & notifications, AI assistant, calendar, in-app browser, staff roles and moderation tools';

export default createEndpoint({
  description: 'Suggests new feature ideas for the Nexus chat app',
  inputSchema: z.object({ focus: z.string().max(200).optional() }),
  outputSchema: z.object({
    ideas: z.array(z.object({ emoji: z.string(), title: z.string(), description: z.string(), effort: z.string() })),
  }),
  execute: async ({ input }) => {
    const { accessToken } = await integrations.get('openai');
    const openai = new OpenAI({ apiKey: accessToken });
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `You brainstorm fun, specific new features for "Nexus", a social chat app for teens/friends. It already has: ${FEATURES}. Never suggest something it already has. Reply as JSON: {"ideas":[{"emoji":"🎯","title":"short name","description":"1-2 sentences on what it does and why it's fun","effort":"Easy|Medium|Big"}]} with exactly 6 ideas.` },
        { role: 'user', content: input.focus?.trim() ? `Focus on: ${input.focus}` : 'Surprise me with a mix of ideas.' },
      ],
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || '{"ideas":[]}');
    return { ideas: (parsed.ideas || []).slice(0, 6).map((i: Record<string, unknown>) => ({ emoji: String(i.emoji || '💡'), title: String(i.title || ''), description: String(i.description || ''), effort: String(i.effort || 'Medium') })) };
  },
});
