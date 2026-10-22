import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { integrations } from 'zitejs/integrations';
import OpenAI from 'openai';

export default createEndpoint({
  description: 'Streams an AI assistant reply, optionally looking at uploaded pictures',
  stream: true,
  inputSchema: z.object({
    messages: z.array(z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
      imageUrl: z.string().optional(),
    })),
  }),
  outputSchema: z.object({ text: z.string() }),
  execute: async ({ input, stream }) => {
    const { accessToken } = await integrations.get('openai');
    const client = new OpenAI({ apiKey: accessToken });

    const msgs = input.messages.map(m =>
      m.role === 'user' && m.imageUrl
        ? { role: 'user' as const, content: [
            { type: 'text' as const, text: m.content || 'What is in this picture? Help me with whatever it shows.' },
            { type: 'image_url' as const, image_url: { url: m.imageUrl } },
          ] }
        : { role: m.role, content: m.content },
    ) as OpenAI.Chat.ChatCompletionMessageParam[];

    const completion = await client.chat.completions.create({
      model: 'gpt-5',
      messages: [
        { role: 'system', content: 'You are a helpful, friendly AI assistant. You can help with anything — writing, coding, math, homework, creative ideas, analysis. When the user sends a picture, look at it carefully: read any text, solve any problems shown step by step, and answer what they ask. Be concise but thorough. Use markdown.' },
        ...msgs,
      ],
      stream: true,
    });

    async function* deltas() {
      for await (const chunk of completion) yield chunk.choices[0]?.delta?.content ?? '';
    }
    const text = await stream.forward(deltas());
    return { text };
  },
});
