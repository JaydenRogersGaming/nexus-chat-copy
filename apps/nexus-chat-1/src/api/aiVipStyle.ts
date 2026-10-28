import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { integrations } from 'zitejs/integrations';
import OpenAI from 'openai';

const ICONS = ['👑', '💎', '🌟', '🔥', '⚡', '🦋', '🐉', '🌙', '🎧', '🍀', '🦄', '🪐'];
const ANIMS = ['none', 'shimmer', 'pulse', 'rainbow'] as const;

export default createEndpoint({
  description: 'Designs a VIP name/role style from a vibe using AI',
  authenticated: true,
  inputSchema: z.object({ vibe: z.string().max(200) }),
  outputSchema: z.object({
    color1: z.string(), color2: z.string(), glow: z.boolean(), animation: z.enum(ANIMS),
    icon: z.string(), roleName: z.string(), flair: z.string(), status: z.string(), welcome: z.string(),
  }),
  execute: async ({ input }) => {
    const { accessToken } = await integrations.get('openai');
    const client = new OpenAI({ apiKey: accessToken });
    const res = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `Design a flashy VIP chat style. Reply JSON: {"color1": hex, "color2": hex (bright, readable on dark), "glow": bool, "animation": one of ${ANIMS.join('|')}, "icon": one of ${ICONS.join(' ')}, "roleName": 1-3 word cool role name max 20 chars, "flair": emoji + short phrase max 24 chars, "status": short status max 40 chars, "welcome": lounge welcome max 120 chars}. Family-friendly.` },
        { role: 'user', content: input.vibe || 'surprise me' },
      ],
    });
    const d = JSON.parse(res.choices[0]?.message?.content || '{}');
    const hex = (v: unknown, f: string) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : f);
    const str = (v: unknown, n: number) => String(v ?? '').slice(0, n);
    return {
      color1: hex(d.color1, '#f5c542'), color2: hex(d.color2, '#ff5fa2'), glow: d.glow !== false,
      animation: ANIMS.includes(d.animation) ? d.animation : 'shimmer',
      icon: ICONS.includes(d.icon) ? d.icon : '👑',
      roleName: str(d.roleName, 20) || 'VIP', flair: str(d.flair, 24), status: str(d.status, 40), welcome: str(d.welcome, 120),
    };
  },
});
