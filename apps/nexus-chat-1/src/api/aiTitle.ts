import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import OpenAI from 'openai';

export default createEndpoint({
  description: 'Invents a custom chat title from a short idea',
  inputSchema: z.object({ idea: z.string(), effects: z.array(z.string()) }),
  outputSchema: z.object({ name: z.string(), effect: z.string(), color: z.string() }),
  execute: async ({ input }) => {
    const client = new OpenAI({ apiKey: process.env.ZITE_OPENAI_ACCESS_TOKEN });
    const res = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `You design short, cool, family-friendly chat titles (max 20 characters, emoji allowed). Reply as JSON: {"name": string, "effect": one of [${input.effects.join(', ')}], "color": hex color like "#ff66cc"}.` },
        { role: 'user', content: `Make a title based on: ${input.idea.slice(0, 200)}` },
      ],
    });
    const out = JSON.parse(res.choices[0]?.message?.content || '{}');
    const effect = input.effects.includes(out.effect) ? out.effect : 'none';
    const color = /^#[0-9a-f]{6}$/i.test(out.color) ? out.color : '#a78bfa';
    const name = String(out.name || 'Legend').slice(0, 24);
    return { name, effect, color };
  },
});
