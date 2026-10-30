import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { integrations } from 'zitejs/integrations';
import OpenAI from 'openai';

const PROMPT_LIMIT = 200_000;

/** Pulls the HTML document out of whatever the model returned (fences, prose, etc.). */
function extractHtml(raw: string): string {
  let s = raw.replace(/```(?:html)?/gi, '');
  const start = s.search(/<!DOCTYPE html|<html/i);
  if (start === -1) return '';
  s = s.slice(start);
  const end = s.toLowerCase().lastIndexOf('</html>');
  return end === -1 ? `${s}\n</html>` : s.slice(0, end + 7);
}

const SYSTEM = `You are an expert AI website builder (like Base44, Lovable, Zite, Kliv, Bolt).
You turn a user's prompt into a complete, production-quality, single-file web app.
Rules:
- Return ONLY one HTML document, starting with <!DOCTYPE html> and ending with </html>. No markdown, no explanation.
- All CSS in <style>, all JS in <script>. You MAY load Google Fonts via <link>; no other external files.
- Follow the user's prompt exactly and completely: every page, section, feature and detail they ask for must exist and work.
- Multi-page sites: build them as one file with hash-based navigation (#home, #about...) and a working nav menu.
- Use realistic content (never lorem ipsum), modern design, strong typography, responsive layout, hover states and smooth transitions.
- Interactive features (forms, carts, todo lists, dashboards, games) must actually work in plain JS; persist data in localStorage.
- Keep it family-friendly. Never send data to external servers.`;

export default createEndpoint({
  description: 'AI website builder: builds or edits a full single-file website from a prompt',
  stream: true,
  inputSchema: z.object({
    kind: z.string().max(200),
    prompt: z.string().max(PROMPT_LIMIT),
    currentHtml: z.string().max(600_000).optional(),
    history: z.array(z.string().max(PROMPT_LIMIT)).max(20).optional(),
  }),
  outputSchema: z.object({ html: z.string() }),
  execute: async ({ input, stream }) => {
    if (input.prompt.length > PROMPT_LIMIT) {
      throw new ZiteError({ code: 'BAD_REQUEST', message: 'prompt too long', userFacingMessage: `Prompts can be up to ${PROMPT_LIMIT.toLocaleString()} characters.` });
    }
    const { accessToken } = await integrations.get('openai');
    const client = new OpenAI({ apiKey: accessToken });
    const past = (input.history ?? []).slice(-8).map((p, i) => `${i + 1}. ${p.slice(0, 4000)}`).join('\n');
    const user = input.currentHtml
      ? `Earlier requests for this site:\n${past || '(none)'}\n\nCurrent site code:\n${input.currentHtml}\n\nApply this change and return the FULL updated HTML document, keeping everything else that works:\n${input.prompt}`
      : `Type of project: ${input.kind}\n\nBuild exactly this:\n${input.prompt.trim() || 'Surprise me with something impressive.'}`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4.1',
      stream: true,
      max_tokens: 32000,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }],
    });
    async function* deltas() {
      for await (const chunk of completion) yield chunk.choices[0]?.delta?.content ?? '';
    }
    const raw = await stream.forward(deltas());
    const html = extractHtml(raw);
    if (!html) throw new Error("The AI didn't return a website. Try rewording your prompt.");
    return { html };
  },
});
