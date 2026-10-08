import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import OpenAI from 'openai';

export default createEndpoint({
  description: 'Generate AI art from a text prompt using OpenAI',
  inputSchema: z.object({
    prompt: z.string(),
  }),
  outputSchema: z.object({
    imageBase64: z.string(),
  }),
  execute: async ({ input }) => {
    const client = new OpenAI({ apiKey: process.env.ZITE_OPENAI_ACCESS_TOKEN });

    // Add a unique seed phrase so the same prompt produces different images each time
    const uniqueSuffix = ` [variation seed: ${Date.now()}-${Math.random().toString(36).slice(2, 10)}]`;

    const image = await client.images.generate({
      model: 'gpt-image-1',
      prompt: input.prompt + uniqueSuffix,
      n: 1,
      size: '1536x1024',
      quality: 'high',
    });

    const imageBase64 = image.data?.[0]?.b64_json ?? '';

    return { imageBase64 };
  },
});
