import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Ping online presence and get online users',
  authenticated: true,
  inputSchema: z.object({
    action: z.enum(['ping', 'getOnline']),
    displayName: z.string().optional(),
    profilePic: z.string().optional(),
    nameColor: z.string().optional(),
    activeTitle: z.string().optional(),
    activeTitleColor: z.string().optional(),
    activeTitleEffect: z.string().optional(),
    role: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    online: z.array(z.object({
      email: z.string(),
      displayName: z.string(),
      profilePic: z.string(),
      nameColor: z.string(),
      activeTitle: z.string(),
      activeTitleColor: z.string(),
      activeTitleEffect: z.string(),
      role: z.string(),
      lastSeen: z.string(),
    })).optional(),
  }),
  execute: async ({ input, context }) => {
    const email = context.user.email;

    if (input.action === 'ping') {
      await zite.presence.bulkCreate({
        records: [{
          email,
          displayName: input.displayName || email.split('@')[0],
          profilePic: input.profilePic || '',
          nameColor: input.nameColor || '#e0e0ff',
          activeTitle: input.activeTitle || '',
          activeTitleColor: input.activeTitleColor || '',
          activeTitleEffect: input.activeTitleEffect || '',
          role: input.role || 'user',
          lastSeen: new Date(),
        }],
        matchOn: ['email'],
      });
      return { success: true };
    }

    // getOnline - users seen in last 2 minutes
    const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { rows } = await zite.sql({
      query: `SELECT "email", "displayName", "profilePic", "nameColor", "activeTitle", "activeTitleColor", "activeTitleEffect", "role", "lastSeen" FROM "Presence" WHERE "lastSeen" > $1 ORDER BY "lastSeen" DESC`,
      params: [cutoff],
    });

    return {
      success: true,
      online: (rows as any[]).map(r => ({
        email: r.email || '',
        displayName: r.displayName || '',
        profilePic: r.profilePic || '',
        nameColor: r.nameColor || '#e0e0ff',
        activeTitle: r.activeTitle || '',
        activeTitleColor: r.activeTitleColor || '',
        activeTitleEffect: r.activeTitleEffect || '',
        role: r.role || 'user',
        lastSeen: r.lastSeen || '',
      })),
    };
  },
});
