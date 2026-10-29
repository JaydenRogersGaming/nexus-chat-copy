import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { integrations } from 'zitejs/integrations';
import OpenAI from 'openai';

export default createEndpoint({
  description: 'Builds a playable single-page website or mini game from a description',
  inputSchema: z.object({
    kind: z.string().max(60),
    prompt: z.string().max(2000),
    currentHtml: z.string().max(60000).optional(),
  }),
  outputSchema: z.object({ html: z.string() }),
  execute: async ({ input }) => {
    const { accessToken } = await integrations.get('openai');
    const client = new OpenAI({ apiKey: accessToken });
    const system = `You build complete, self-contained single-file websites and browser games.
Return ONLY one HTML document (<!DOCTYPE html> ... </html>) with all CSS in <style> and all JS in <script>. No external files, no CDNs, no markdown fences.
Make it polished, colorful, responsive, and fully working (games must be playable with mouse/touch/keyboard and save progress in localStorage when it makes sense).
Keep it family-friendly. Never include tracking, external requests, or forms that send data anywhere.`;
    const user = input.currentHtml
      ? `Here is the current ${input.kind} site:\n${input.currentHtml}\n\nApply this change and return the full updated HTML: ${input.prompt}`
      : `Build a ${input.kind}. Details from the user: ${input.prompt || 'surprise me'}`;
    const res = await client.chat.completions.create({
      model: 'gpt-4.1',
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    });
    let html = res.choices[0]?.message?.content ?? '';
    html = html.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
    if (!/<html/i.test(html)) throw new ZiteError({ code: 'INTERNAL_ERROR', message: 'Bad AI output', userFacingMessage: "The AI didn't return a website. Try again." });
    return { html };
  },
});
