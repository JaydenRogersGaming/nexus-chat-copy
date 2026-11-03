import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const norm = (e: string) => e.trim().toLowerCase();
const parseMembers = (v?: string) => { try { return (JSON.parse(v || '[]') as string[]).map(norm); } catch { return []; } };

const groupOut = z.object({
  id: z.string(), name: z.string(), ownerEmail: z.string(),
  members: z.array(z.string()), visibility: z.enum(['Public', 'Private']), isMember: z.boolean(),
});

export default createEndpoint({
  description: 'Creates and manages shared chat groups: members, joining and public/private visibility',
  inputSchema: z.object({
    action: z.enum(['list', 'create', 'addMember', 'removeMember', 'setVisibility', 'join', 'leave', 'delete']),
    id: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    visibility: z.enum(['Public', 'Private']).optional(),
  }),
  outputSchema: z.object({ groups: z.array(groupOut) }),
  execute: async ({ input, context }) => {
    const me = norm(context.user.email);
    const deny = (m: string): never => { throw new ZiteError({ code: 'BAD_REQUEST', message: m, userFacingMessage: m }); };

    const load = async () => {
      if (!input.id) deny('Missing group.');
      const g = await zite.chatGroups.findOne({ id: input.id! });
      if (!g) deny('Group not found.');
      return { g: g!, members: parseMembers(g!.memberEmails), owner: norm(g!.ownerEmail || '') };
    };
    const save = (id: string, members: string[]) =>
      zite.chatGroups.update({ id, record: { memberEmails: JSON.stringify([...new Set(members)]) } });

    switch (input.action) {
      case 'create': {
        const name = (input.name || '').trim();
        if (!name) deny('Enter a group name.');
        await zite.chatGroups.create({ record: { name: name.slice(0, 60), ownerEmail: me, memberEmails: JSON.stringify([me]), visibility: input.visibility ?? 'Private' } });
        break;
      }
      case 'addMember': {
        const { g, members } = await load();
        if (!members.includes(me)) deny('Only members can add people.');
        const who = norm(input.email || '');
        if (!who.includes('@')) deny('Enter a valid email.');
        await save(g.id, [...members, who]);
        break;
      }
      case 'removeMember': {
        const { g, members, owner } = await load();
        if (owner !== me) deny('Only the group owner can remove people.');
        const who = norm(input.email || '');
        if (who === owner) deny("The owner can't be removed.");
        await save(g.id, members.filter(m => m !== who));
        break;
      }
      case 'setVisibility': {
        const { g, owner } = await load();
        if (owner !== me) deny('Only the group owner can change visibility.');
        await zite.chatGroups.update({ id: g.id, record: { visibility: input.visibility ?? 'Private' } });
        break;
      }
      case 'join': {
        const { g, members } = await load();
        if (g.visibility !== 'Public') deny('This group is private — ask a member to add you.');
        await save(g.id, [...members, me]);
        break;
      }
      case 'leave': {
        const { g, members, owner } = await load();
        if (owner === me) deny('Owners can delete the group instead of leaving.');
        await save(g.id, members.filter(m => m !== me));
        break;
      }
      case 'delete': {
        const { g, owner } = await load();
        if (owner !== me) deny('Only the group owner can delete it.');
        await zite.chatGroups.delete({ id: g.id });
        break;
      }
    }

    const { records } = await zite.chatGroups.findAll({ limit: 1000 });
    const groups = records
      .map(g => {
        const members = parseMembers(g.memberEmails);
        return {
          id: g.id, name: g.name || 'Group', ownerEmail: norm(g.ownerEmail || ''), members,
          visibility: (g.visibility === 'Public' ? 'Public' : 'Private') as 'Public' | 'Private',
          isMember: members.includes(me),
        };
      })
      .filter(g => g.isMember || g.visibility === 'Public');
    return { groups };
  },
});
