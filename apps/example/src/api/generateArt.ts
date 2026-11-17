import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { integrations } from 'zitejs/integrations';
import { zite } from 'zitejs/db';
import OpenAI from 'openai';

const ENGINES = ['flux', 'turbo', 'flux-realism', 'flux-anime', 'flux-3d', 'openai'] as const;
const BLOCK = /\b(nude|naked|nsfw|porn|sex|gore|kill|blood|suicide|nazi)\b/i;

export default createEndpoint({
  description: 'Generates an AI image with the chosen engine, blocking and reporting inappropriate prompts',
  authenticated: true,
  inputSchema: z.object({ prompt: z.string(), engine: z.enum(ENGINES).optional() }),
  outputSchema: z.object({ imageBase64: z.string(), imageUrl: z.string().optional(), blocked: z.boolean() }),
  execute: async ({ input, context }) => {
    const prompt = input.prompt.trim().slice(0, 1000);
    const engine = input.engine ?? 'flux';
    const who = context.user;
    const name = [who.firstName, who.lastName].filter(Boolean).join(' ') || who.email;

    const report = async (why: string) => {
      await zite.reports.create({ record: {
        subject: `🚩 Inappropriate AI image prompt by ${name}`, targetType: 'User', targetId: who.email,
        reason: `${why}\n\nPrompt: "${prompt}"`, reporterEmail: 'AI Image Filter', status: 'Open', resolutionNote: null, reviewedBy: null,
      } });
      return { imageBase64: '', blocked: true };
    };

    if (BLOCK.test(prompt)) return report('Blocked by the word filter');

    if (engine === 'openai') {
      const { accessToken } = await integrations.get('openai-2');
      const client = new OpenAI({ apiKey: accessToken });
      const mod = await client.moderations.create({ model: 'omni-moderation-latest', input: prompt });
      if (mod.results[0]?.flagged) return report('Flagged by moderation');
      try {
        const image = await client.images.generate({ model: 'gpt-image-1-mini', prompt, n: 1, size: '1024x1024' });
        return { imageBase64: image.data?.[0]?.b64_json ?? '', blocked: false };
      } catch (err) {
        if (/safety|moderation|rejected/i.test(String(err))) return report('Rejected by the image safety system');
        throw new Error(/402|paid plan/i.test(String(err)) ? 'OpenAI images need a paid plan — pick a free engine like Flux.' : 'OpenAI image failed. Try another engine.');
      }
    }

    // Free engines via Pollinations (no key needed).
    const seed = Math.floor(Math.random() * 1e9);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=${engine}&width=1024&height=1024&seed=${seed}&nologo=true&safe=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`The ${engine} engine is busy right now. Try again or pick another engine.`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { imageBase64: btoa(bin), imageUrl: url, blocked: false };
  },
});
