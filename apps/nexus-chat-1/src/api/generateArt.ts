import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { integrations } from 'zitejs/integrations';
import { zite } from 'zitejs/db';
import OpenAI from 'openai';

export default createEndpoint({
  description: 'Generates an AI image from a prompt, blocking and reporting inappropriate prompts to the owner',
  authenticated: true,
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: z.object({
    imageBase64: z.string(),
    blocked: z.boolean(),
  }),
  execute: async ({ input, context }) => {
    const prompt = input.prompt.trim().slice(0, 1000);
    const { accessToken } = await integrations.get('openai');
    const client = new OpenAI({ apiKey: accessToken });
    const who = context.user;
    const name = [who.firstName, who.lastName].filter(Boolean).join(' ') || who.email;

    const report = async (why: string) => {
      await zite.reports.create({ record: {
        subject: `🚩 Inappropriate AI image prompt by ${name}`,
        targetType: 'User',
        targetId: who.email,
        reason: `${why}\n\nPrompt: "${prompt}"`,
        reporterEmail: 'AI Image Filter',
        status: 'Open',
        resolutionNote: null,
        reviewedBy: null,
      } });
      return { imageBase64: '', blocked: true };
    };

    const mod = await client.moderations.create({ model: 'omni-moderation-latest', input: prompt });
    const result = mod.results[0];
    if (result?.flagged) {
      const cats = Object.entries(result.categories).filter(([, v]) => v).map(([k]) => k).join(', ');
      return report(`Flagged by moderation: ${cats || 'unsafe content'}`);
    }

    try {
      const image = await client.images.generate({ model: 'gpt-image-1-mini', prompt, n: 1, size: '1024x1024' });
      return { imageBase64: image.data?.[0]?.b64_json ?? '', blocked: false };
    } catch (err) {
      const msg = String(err);
      if (/safety|moderation|rejected/i.test(msg)) return report('Rejected by the image safety system');
      throw err;
    }
  },
});
