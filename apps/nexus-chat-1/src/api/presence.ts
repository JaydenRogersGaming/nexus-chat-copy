import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const userSchema = z.object({
  email: z.string(),
  name: z.string(),
  profilePic: z.string(),
  nameColor: z.string(),
  activeTitle: z.string(),
  activeTitleColor: z.string(),
  activeTitleEffect: z.string(),
  role: z.string(),
  lastSeen: z.number(),
});

export default createEndpoint({
  description: 'Marks a user as online and lists everyone online right now',
  inputSchema: z.object({
    action: z.enum(['ping', 'getOnline']),
    user: userSchema.omit({ lastSeen: true }).optional(),
  }),
  outputSchema: z.object({ online: z.array(userSchema), everyone: z.array(userSchema) }),
  execute: async ({ input }) => {
    if (input.action === 'ping' && input.user) {
      const u = input.user;
      await zite.presence.bulkCreate({
        matchOn: ['email'],
        records: [{
          email: u.email, displayName: u.name, profilePic: u.profilePic, nameColor: u.nameColor,
          activeTitle: u.activeTitle, activeTitleColor: u.activeTitleColor,
          activeTitleEffect: u.activeTitleEffect, role: u.role, lastSeen: new Date().toISOString(),
        }],
      });
    }
    const cutoff = new Date(Date.now() - 60 * 1000).toISOString();
    const { rows } = await zite.sql({
      query: `SELECT u."email", coalesce(nullif(p."displayName",''), u."name", split_part(u."email",'@',1)) AS "displayName",
              coalesce(p."profilePic", u."image") AS "profilePic", p."nameColor", p."activeTitle", p."activeTitleColor", p."activeTitleEffect", p."role", p."lastSeen"
              FROM "ziteUsers" u LEFT JOIN "Presence" p ON lower(p."email") = lower(u."email")
              ORDER BY 2 ASC LIMIT 2000`,
    });
    const all = rows.map(r => ({
        email: String(r.email ?? ''), name: String(r.displayName ?? ''), profilePic: String(r.profilePic ?? ''),
        nameColor: String(r.nameColor ?? ''), activeTitle: String(r.activeTitle ?? ''),
        activeTitleColor: String(r.activeTitleColor ?? ''), activeTitleEffect: String(r.activeTitleEffect ?? ''),
        role: String(r.role ?? 'user'), lastSeen: r.lastSeen ? new Date(String(r.lastSeen)).getTime() : 0,
      }));
    const cut = Date.parse(cutoff);
    return { online: all.filter(u => u.lastSeen > cut), everyone: all };
  },
});
