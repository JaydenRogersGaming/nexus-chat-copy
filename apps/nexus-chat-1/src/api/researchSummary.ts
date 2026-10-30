import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { integrations } from 'zitejs/integrations';
import OpenAI from 'openai';

export default createEndpoint({
  description: 'Summarizes search results into a short research brief with numbered sources',
  inputSchema: z.object({
    query: z.string(),
    results: z.array(z.object({ title: z.string(), url: z.string(), snippet: z.string() })),
  }),
  outputSchema: z.object({ summary: z.string() }),
  execute: async ({ input }) => {
    const { accessToken } = await integrations.get('openai');
    const client = new OpenAI({ apiKey: accessToken });
    const sources = input.results.slice(0, 8).map((r, i) => `[${i + 1}] ${r.title} — ${r.snippet}`).join('\n');
    const res = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.3,
      messages: [
        { role: 'system', content: 'You are a research helper for a student. Using ONLY the numbered sources, write a clear summary: 3-5 bullet points of key facts, each citing sources like [1]. Then one line "Look into next:" with 2 follow-up search ideas. Say plainly if the sources are thin. Remind nothing else.' },
        { role: 'user', content: `Topic: ${input.query}\n\nSources:\n${sources}` },
      ],
    });
    return { summary: res.choices[0]?.message?.content?.trim() || 'No summary available.' };
  },
});
