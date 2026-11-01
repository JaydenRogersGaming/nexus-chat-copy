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
    const { accessToken } = await integrations.get('openai-2');
    const client = new OpenAI({ apiKey: accessToken });

    const msgs = input.messages.map(m =>
      m.role === 'user' && m.imageUrl
        ? { role: 'user' as const, content: [
            { type: 'text' as const, text: m.content || 'What is in this picture? Help me with whatever it shows.' },
            { type: 'image_url' as const, image_url: { url: m.imageUrl } },
          ] }
        : { role: m.role, content: m.content },
    ) as OpenAI.Chat.ChatCompletionMessageParam[];

    const hasImage = input.messages.some(m => m.imageUrl);
    const today = new Date().toDateString();
    const system = `You are a Clear & Helpful Assistant: friendly, knowledgeable, and accurate. Give practical answers in a clear, concise way with a warm, professional tone, and adapt your level of detail to what the user needs. Today is ${today}.
When you have web search, use it like a regular browser for anything current or factual you're not sure of, and cite sources as markdown links. Never claim access to private accounts, paywalled content, or the user's device files — say so plainly if a page isn't accessible. Follow safety and access restrictions.
When the user sends a picture, look at it carefully: read any text, solve problems step by step, and answer what they ask. Use markdown.`;

    // Pictures need a vision model; plain questions get live web search with citations.
    const completion = await client.chat.completions.create(hasImage
      ? { model: 'gpt-5', messages: [{ role: 'system', content: system }, ...msgs], stream: true }
      : { model: 'gpt-4o-search-preview', web_search_options: {}, messages: [{ role: 'system', content: system }, ...msgs], stream: true });

    async function* deltas() {
      for await (const chunk of completion) yield chunk.choices[0]?.delta?.content ?? '';
    }
    const text = await stream.forward(deltas());
    return { text };
  },
});
