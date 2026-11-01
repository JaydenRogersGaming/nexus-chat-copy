import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { integrations } from 'zitejs/integrations';
import OpenAI from 'openai';

import { isOwnerEmail } from '../lib/permissions';
const FEATURES = 'global chat, DMs, group chats, video rooms, emoji/GIF picker, emoji kitchen, art studio (drawing + music maker), casino games with gems, HP clicker idle game, leaderboard, achievements, daily quests, cosmetic shop, titles & badges, themes, typing effects, holiday events with a limited shop, tournaments, watch parties, marketplace, friends & notifications, AI assistant, calendar, in-app browser, VIP membership, staff roles and moderation tools';
const ROLES = 'user, vip, helper, guardian, mod, senior-mod, admin, co-owner, owner';

const KINDS = {
  features: `new features. Never suggest something it already has.`,
  site: `a SITE REVIEW: for different parts of the app (pick from the existing list), say what to ADD, what to CHANGE/improve, or what to DELETE because it's clutter, broken-feeling or unused. Spread ideas across many different parts.`,
  roles: `new staff or community ROLES to add alongside the existing ones (${ROLES}). For each, the description says what the role can do and who should get it.`,
  events: `new THEMED EVENTS (seasonal or one-off, like a holiday week) with a limited shop. For each, describe the vibe, decorations and 1-2 limited items (theme, typing effect, title or song).`,
  tabs: `new sidebar TABS / pages to sit beside Art — games, activities, hangouts and events. Pitch each casually and specifically, but clear enough to build: say what the page shows and what people do there. No buzzwords. Never suggest a tab it already has.`,
  future: `a ROADMAP of bigger things to do in the future (next 1-6 months): growth, community, monetization with gems, polish and safety. Put a rough timeframe at the start of each description.`,
  titles: `new collectible TITLES (short name shown next to a username) with a rarity and how to earn them.`,
  typing: `new TYPING EFFECTS (animated styles for chat text, e.g. glitch, rainbow wave). Describe exactly how the animation looks.`,
} as const;

export default createEndpoint({
  description: 'Suggests new feature, role, event, tab or site-review ideas for the Nexus chat app',
  inputSchema: z.object({
    focus: z.string().max(200).optional(),
    kind: z.enum(['features', 'site', 'roles', 'events', 'tabs', 'future', 'titles', 'typing']).optional(),
    avoid: z.array(z.string()).max(150).optional(),
  }),
  outputSchema: z.object({
    ideas: z.array(z.object({ emoji: z.string(), title: z.string(), description: z.string(), effort: z.string(), section: z.string(), action: z.string() })),
  }),
  execute: async ({ input, context }) => {
    const kind = input.kind ?? 'features';
    if (!isOwnerEmail(context.user?.email?.toLowerCase())) {
      throw new ZiteError({ code: 'FORBIDDEN', message: 'owner only', userFacingMessage: 'Only the owner can use the idea generator.' });
    }
    const avoid = (input.avoid ?? []).slice(-150).map(s => s.slice(0, 80));
    const { accessToken } = await integrations.get('openai-2');
    const openai = new OpenAI({ apiKey: accessToken });
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 1.05,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `You brainstorm fun, specific ideas for "Nexus", a social chat app for teens/friends. It already has: ${FEATURES}. Suggest ${KINDS[kind]}${avoid.length ? `\nThese ideas were ALREADY suggested — do NOT repeat them or anything close to them: ${avoid.join('; ')}` : ''}\nReply as JSON: {"ideas":[{"emoji":"🎯","title":"short name","description":"1-2 sentences","effort":"Easy|Medium|Big","section":"which part of the app it's for, e.g. Chat, Shop, Casino","action":"Add|Change|Delete"}]} with exactly 6 ideas.` },
        { role: 'user', content: input.focus?.trim() ? `Focus on: ${input.focus}` : 'Surprise me with a mix of ideas.' },
      ],
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || '{"ideas":[]}');
    return { ideas: (parsed.ideas || []).slice(0, 6).map((i: Record<string, unknown>) => ({
      emoji: String(i.emoji || '💡'), title: String(i.title || ''), description: String(i.description || ''), effort: String(i.effort || 'Medium'),
      section: String(i.section || 'General'), action: String(i.action || 'Add'),
    })) };
  },
});
