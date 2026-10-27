import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { integrations } from 'zitejs/integrations';
import OpenAI from 'openai';

export default createEndpoint({
  description: 'Translates a batch of app interface text into the user\'s language',
  inputSchema: z.object({ lang: z.string().max(10), texts: z.array(z.string().max(500)).max(80) }),
  outputSchema: z.object({ translations: z.array(z.string()) }),
  execute: async ({ input }) => {
    if (!input.texts.length) return { translations: [] };
    const { accessToken } = await integrations.get('openai');
    const openai = new OpenAI({ apiKey: accessToken });
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `Translate each UI string of a chat app into the language with code "${input.lang}", using that language's own script/alphabet. Keep emoji, numbers, @mentions, URLs and placeholders unchanged. Keep it short and natural. Reply as JSON {"t":[...]} with exactly ${input.texts.length} strings in the same order.` },
        { role: 'user', content: JSON.stringify(input.texts) },
      ],
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || '{"t":[]}');
    const out: string[] = Array.isArray(parsed.t) ? parsed.t.map(String) : [];
    return { translations: input.texts.map((t, i) => out[i] || t) };
  },
});
