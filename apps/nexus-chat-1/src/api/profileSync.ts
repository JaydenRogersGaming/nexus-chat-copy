import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { isOwnerEmail } from '../lib/permissions';
import { zite } from 'zitejs/db';

// One profile per email, shared across devices. The oldest row is the original;
// any duplicate rows for the same email are deleted.
export default createEndpoint({
  description: 'Loads or saves the signed-in user\'s single shared profile',
  inputSchema: z.object({ action: z.enum(['get', 'save', 'setName']), data: z.string().max(200000).optional(), targetEmail: z.string().optional(), name: z.string().max(30).optional() }),
  outputSchema: z.object({ data: z.string().nullable() }),
  execute: async ({ input, context }) => {
    if (input.action === 'setName') {
      if (!isOwnerEmail(context.user.email.toLowerCase())) throw new ZiteError('Only the owner can rename users.');
      const target = (input.targetEmail || '').toLowerCase(); const name = (input.name || '').trim();
      if (!target || !name) throw new ZiteError('Pick a user and a name.');
      const row = await zite.userProfiles.findOne({ filters: { email: target } });
      const data = JSON.stringify({ ...(row?.profileData ? JSON.parse(row.profileData) : {}), email: target, name });
      if (row) await zite.userProfiles.update({ id: row.id, record: { profileData: data } });
      else await zite.userProfiles.create({ record: { email: target, profileData: data } });
      return { data };
    }
    const email = context.user.email.toLowerCase();
    const { records } = await zite.userProfiles.findAll({ filters: { email }, sort: [{ field: 'created', direction: 'asc' }], limit: 50 });
    const [original, ...dupes] = records;
    for (const d of dupes) await zite.userProfiles.delete({ id: d.id });

    if (input.action === 'save' && input.data) {
      const parsed = JSON.parse(input.data);
      const clean = JSON.stringify({ ...parsed, email });
      if (original) await zite.userProfiles.update({ id: original.id, record: { profileData: clean } });
      else await zite.userProfiles.create({ record: { email, profileData: clean } });
      return { data: clean };
    }
    return { data: original?.profileData || null };
  },
});
