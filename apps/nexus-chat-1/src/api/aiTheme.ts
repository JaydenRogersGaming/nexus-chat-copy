import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { integrations } from 'zitejs/integrations';
import OpenAI from 'openai';

export default createEndpoint({
  description: 'Designs a background theme (name, colors, style) from an idea using AI',
  inputSchema: z.object({ idea: z.string() }),
  outputSchema: z.object({
    name: z.string(), colors: z.array(z.string()), style: z.enum(['linear', 'radial', 'glow']), angle: z.number(), cost: z.number(),
  }),
  execute: async ({ input }) => {
    const { accessToken } = await integrations.get('openai');
    const client = new OpenAI({ apiKey: accessToken });
    const res = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Design a dark, readable chat background theme. Reply JSON: {"name": emoji + 1-3 word title, "colors": [3 hex colors, first is the darkest base], "style": "linear"|"radial"|"glow", "angle": 0-360, "cost": gem price 200-3000 based on how fancy}. White text must stay readable. Family-friendly.' },
        { role: 'user', content: input.idea },
      ],
    });
    const d = JSON.parse(res.choices[0]?.message?.content || '{}');
    const hex = (v: unknown, f: string) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : f);
    const c = Array.isArray(d.colors) ? d.colors : [];
    return {
      name: String(d.name || '✨ AI Theme').slice(0, 30),
      colors: [hex(c[0], '#0b1020'), hex(c[1], '#1e3a8a'), hex(c[2], '#06b6d4')],
      style: ['linear', 'radial', 'glow'].includes(d.style) ? d.style : 'linear',
      angle: Math.max(0, Math.min(360, Number(d.angle) || 135)),
      cost: Math.max(0, Math.min(5000, Math.round(Number(d.cost) || 500))),
    };
  },
});
