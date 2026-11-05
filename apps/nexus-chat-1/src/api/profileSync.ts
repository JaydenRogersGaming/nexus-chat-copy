import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

// One profile per email, shared across devices. The oldest row is the original;
// any duplicate rows for the same email are deleted.
export default createEndpoint({
  description: 'Loads or saves the signed-in user\'s single shared profile',
  inputSchema: z.object({ action: z.enum(['get', 'save']), data: z.string().max(200000).optional() }),
  outputSchema: z.object({ data: z.string().nullable() }),
  execute: async ({ input, context }) => {
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
