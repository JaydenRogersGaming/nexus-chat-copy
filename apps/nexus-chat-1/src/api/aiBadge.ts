import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { integrations } from 'zitejs/integrations';
import OpenAI from 'openai';

const ICONS = ['Award', 'Trophy', 'Crown', 'Star', 'Shield', 'Gem', 'Flame', 'Zap', 'Heart', 'Rocket', 'Medal', 'Sparkles', 'Target', 'Swords', 'Gamepad2', 'Music', 'Palette', 'Brain', 'Code', 'MessageSquare', 'Dices', 'Moon', 'Sun', 'Leaf', 'Skull', 'Ghost', 'Bolt', 'Feather'];

export default createEndpoint({
  description: 'Designs a badge (name, description, icon, colors) from an idea using AI',
  inputSchema: z.object({ idea: z.string() }),
  outputSchema: z.object({ name: z.string(), description: z.string(), icon: z.string(), color: z.string(), color2: z.string() }),
  execute: async ({ input }) => {
    const { accessToken } = await integrations.get('openai');
    const client = new OpenAI({ apiKey: accessToken });
    const res = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `Design a polished achievement badge. Reply JSON: {"name": short 1-3 word title, "description": one short line, "icon": one of ${ICONS.join(', ')}, "color": hex, "color2": darker complementary hex}. Keep it family-friendly.` },
        { role: 'user', content: input.idea },
      ],
    });
    const d = JSON.parse(res.choices[0]?.message?.content || '{}');
    const hex = (v: unknown, f: string) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : f);
    return {
      name: String(d.name || 'New Badge').slice(0, 30),
      description: String(d.description || '').slice(0, 80),
      icon: ICONS.includes(d.icon) ? d.icon : 'Award',
      color: hex(d.color, '#f6d365'),
      color2: hex(d.color2, '#c8901a'),
    };
  },
});
