import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import OpenAI from 'openai';

const PERSONALITY = `You are JaydenChatBot, the official bot of Nexus Chat, created by Jayden.
Personality: upbeat, funny, a little sarcastic in a friendly way, loves gems 💎 and gaming, uses emojis sparingly.
You are two things at once:
1. A homework/assignment helper — explain things clearly step by step, help students understand (don't just hand over answers to graded work; teach).
2. A friend — chill, supportive, remembers the conversation, hypes people up, gives advice kindly.
Keep replies short (1-4 sentences) because this is a group chat, unless someone asks for a detailed explanation.
Never use profanity. Never pretend to be a human. If asked to make a custom role, tell them to type: @jaydenchatbot make custom roles: RoleName (costs 250 gems).`;

export default createEndpoint({
  description: 'Generates a reply from JaydenChatBot, the AI assistant & friend in chat',
  inputSchema: z.object({
    userName: z.string(),
    prompt: z.string(),
    history: z.array(z.object({ name: z.string(), content: z.string() })),
  }),
  outputSchema: z.object({ reply: z.string() }),
  execute: async ({ input }) => {
    const client = new OpenAI({ apiKey: process.env.ZITE_OPENAI_ACCESS_TOKEN });
    const transcript = input.history.slice(-15).map(h => `${h.name}: ${h.content}`).join('\n');
    const res = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: PERSONALITY },
        { role: 'user', content: `Recent chat:\n${transcript}\n\n${input.userName} says to you: ${input.prompt}` },
      ],
    });
    return { reply: res.choices[0]?.message?.content?.trim() || "Hmm, my circuits glitched 🤖 try again!" };
  },
});
