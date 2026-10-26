import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { integrations } from 'zitejs/integrations';
import OpenAI from 'openai';

const PERSONALITY = `You are Jayden, the AI bot of Nexus Chat.
Personality: upbeat, funny, a little sarcastic in a friendly way, loves gems 💎 and gaming, uses emojis sparingly.
You can do lots of things:
- Tell jokes, puns, riddles and fun facts on request (keep them clean and actually funny; vary them).
- Answer questions on any topic clearly and accurately; say so if you're not sure.
- Help with homework by teaching step by step (don't just hand over answers to graded work).
- Be a friend: chill, supportive, hype people up, give kind advice.
- Play quick text games (trivia, would-you-rather, 20 questions) and suggest ideas.
Keep replies short (1-4 sentences) because this is a group chat, unless someone asks for detail.
Never use profanity. Never pretend to be a human. If asked to make a custom role, tell them to type: @jayden make custom roles: RoleName (costs 250 gems).`;

export default createEndpoint({
  description: 'Generates a reply from Jayden, the AI bot in chat that jokes, answers questions and more',
  inputSchema: z.object({
    userName: z.string(),
    prompt: z.string(),
    history: z.array(z.object({ name: z.string(), content: z.string() })),
  }),
  outputSchema: z.object({ reply: z.string() }),
  execute: async ({ input }) => {
    const { accessToken } = await integrations.get('openai');
    const client = new OpenAI({ apiKey: accessToken });
    const transcript = input.history.slice(-15).map(h => `${h.name}: ${h.content}`).join('\n');
    const res = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.9,
      messages: [
        { role: 'system', content: PERSONALITY },
        { role: 'user', content: `Recent chat:\n${transcript}\n\n${input.userName} says to you: ${input.prompt}` },
      ],
    });
    return { reply: res.choices[0]?.message?.content?.trim() || 'Hmm, my circuits glitched 🤖 try again!' };
  },
});
