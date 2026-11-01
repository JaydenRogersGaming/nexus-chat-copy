import { z } from 'zod';
import OpenAI from 'openai';
import { createEndpoint } from 'zitejs/backend';
import { integrations } from 'zitejs/integrations';

const Q = z.object({ question: z.string(), choices: z.array(z.string()), answerIndex: z.number() });

export default createEndpoint({
  description: 'Generates daily quiz questions on a subject at a chosen difficulty',
  authenticated: true,
  inputSchema: z.object({ subject: z.string(), level: z.string() }),
  outputSchema: z.object({ questions: z.array(Q) }),
  execute: async ({ input }) => {
    const { accessToken } = await integrations.get('openai-2');
    const openai = new OpenAI({ apiKey: accessToken });
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You write accurate, family-friendly multiple-choice quiz questions. Reply as JSON: {"questions":[{"question":"...","choices":["a","b","c","d"],"answerIndex":0}]}' },
        { role: 'user', content: `Write 5 questions about "${input.subject.slice(0, 80)}" at ${input.level} difficulty. Exactly 4 choices each; vary the correct position.` },
      ],
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || '{}');
    const questions = z.array(Q).parse(parsed.questions ?? []).filter(q => q.choices.length === 4 && q.answerIndex >= 0 && q.answerIndex < 4).slice(0, 5);
    if (!questions.length) throw new Error('Could not make questions, try another subject');
    return { questions };
  },
});
