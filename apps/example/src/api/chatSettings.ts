import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requirePerm } from '../lib/serverAuth';
import { isOwnerEmail } from '../lib/permissions';
import { deny } from '../lib/serverAuth';

const read = async (key: string): Promise<string[] | null> => {
  const r = await zite.chatSettings.findOne({ filters: { key } });
  if (!r?.value) return null;
  try { return JSON.parse(r.value); } catch { return null; }
};
const write = (key: string, list: string[]) =>
  zite.chatSettings.bulkCreate({ records: [{ key, value: JSON.stringify(list) }], matchOn: ['key'] });
const clean = (l: string[]) => [...new Set(l.map(w => w.trim().toLowerCase()).filter(Boolean))].slice(0, 1000);

export default createEndpoint({
  description: 'Reads and saves the shared chat word filter and filter-immunity list',
  inputSchema: z.object({
    action: z.enum(['get', 'saveWords', 'setImmune']),
    words: z.array(z.string().max(60)).optional(),
    email: z.string().optional(),
    immune: z.boolean().optional(),
  }),
  outputSchema: z.object({ words: z.array(z.string()).nullable(), immune: z.array(z.string()) }),
  execute: async ({ input, context }) => {
    const me = context.user.email.toLowerCase();
    if (input.action === 'saveWords') {
      await requirePerm(me, 'users.restrict');
      await write('words', clean(input.words || []));
    }
    if (input.action === 'setImmune') {
      if (!isOwnerEmail(me)) deny('Only the owner can change filter immunity.');
      const cur = (await read('immune')) || [];
      const e = (input.email || '').toLowerCase();
      await write('immune', clean(input.immune ? [...cur, e] : cur.filter(x => x.toLowerCase() !== e)));
    }
    return { words: await read('words'), immune: (await read('immune')) || [] };
  },
});
