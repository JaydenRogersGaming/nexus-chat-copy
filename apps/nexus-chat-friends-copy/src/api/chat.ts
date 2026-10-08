import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import OpenAI from 'openai';

export default createEndpoint({
  stream: true,
  inputSchema: z.object({
    messages: z.array(z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    })),
  }),
  outputSchema: z.object({ text: z.string() }),
  execute: async ({ input, stream }) => {
    const client = new OpenAI({ apiKey: process.env.ZITE_OPENAI_ACCESS_TOKEN });

    const completion = await client.chat.completions.create({
      model: 'gpt-5',
      messages: [
        { role: 'system', content: 'You are a helpful, friendly AI assistant. You can help with anything — writing, coding, math, creative ideas, analysis, and more. Be concise but thorough. Use markdown formatting when helpful.' },
        ...input.messages,
      ],
      stream: true,
    });

    let text = '';
    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        text += content;
        await stream.write(content);
      }
    }

    return { text };
  },
});
