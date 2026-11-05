import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { integrations } from 'zitejs/integrations';
import OpenAI from 'openai';

const Option = z.object({ name: z.string(), effect: z.string(), color: z.string() });

export default createEndpoint({
  description: 'Invents several different custom chat title options from a short idea',
  inputSchema: z.object({
    idea: z.string(),
    effects: z.array(z.string()),
    name: z.string().optional(),
    keepName: z.boolean().optional(),
    color: z.string().optional(),
    effect: z.string().optional(),
  }),
  outputSchema: z.object({ options: z.array(Option) }),
  execute: async ({ input }) => {
    const { accessToken } = await integrations.get('openai');
    const client = new OpenAI({ apiKey: accessToken });
    const keep = !!(input.keepName && input.name?.trim());
    const wordsRule = keep
      ? `Every option must use exactly this title text: "${input.name!.trim()}". Vary only the effect and color.`
      : input.name?.trim()
        ? `Use "${input.name.trim()}" only as inspiration. Each title must be a genuinely different phrase with different words and structure — do NOT just swap one word between options.`
        : `Each title must be a genuinely different phrase with different words and structure — do NOT reuse the same pattern and just swap one word.`;
    const res = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `You design short, cool, family-friendly chat titles (max 20 characters, no emoji). Give 4 varied options mixing styles (epic, funny, mysterious, punny). ${wordsRule} Reply as JSON: {"options":[{"name": string, "effect": one of [${input.effects.join(', ')}], "color": hex like "#ff66cc"}]}` },
        { role: 'user', content: `Vibe: ${input.idea.slice(0, 200)}` },
      ],
    });
    const raw = JSON.parse(res.choices[0]?.message?.content || '{}');
    const list: { name?: string; effect?: string; color?: string }[] = Array.isArray(raw.options) ? raw.options : [];
    const options = list.slice(0, 4).map(o => {
      const pe = input.effect && input.effects.includes(input.effect) ? input.effect : o.effect || '';
      const pc = input.color || o.color || '';
      return {
        name: String(keep ? input.name!.trim() : o.name || 'Legend').slice(0, 24),
        effect: input.effects.includes(pe) ? pe : 'none',
        color: /^#[0-9a-f]{6}$/i.test(pc) ? pc : '#a78bfa',
      };
    });
    if (!options.length) throw new Error('No titles generated');
    return { options };
  },
});
