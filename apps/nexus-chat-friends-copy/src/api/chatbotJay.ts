import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import OpenAI from 'openai';

export default createEndpoint({
  description: 'ChatbotJay replies when someone @mentions him in chat',
  inputSchema: z.object({
    askerName: z.string(),
    message: z.string(),
    recent: z.array(z.object({ name: z.string(), content: z.string() })),
  }),
  outputSchema: z.object({ reply: z.string() }),
  execute: async ({ input }) => {
    const client = new OpenAI({ apiKey: process.env.ZITE_OPENAI_ACCESS_TOKEN });
    const history = input.recent.map(m => `${m.name}: ${m.content}`).join('\n');
    const res = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: 'You are ChatbotJay, a fun, friendly chat buddy in a group chat app for friends. Keep replies short (1-3 sentences), casual, kind, and family-friendly. Never use profanity. Plain text only, no markdown.' },
        { role: 'user', content: `Recent chat:\n${history}\n\n${input.askerName} said to you: ${input.message}` },
      ],
    });
    return { reply: res.choices[0]?.message?.content?.trim() || "Hmm, I'm not sure what to say! 🤔" };
  },
});
