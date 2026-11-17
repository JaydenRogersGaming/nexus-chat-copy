import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const MONTH = 30 * 864e5;
const site = z.object({
  id: z.string(), name: z.string(), slug: z.string(), html: z.string(), settings: z.string(),
  ownerName: z.string(), paidUntil: z.string(), active: z.boolean(), views: z.number(),
});
type Row = Awaited<ReturnType<typeof zite.publishedSites.findOne>>;
const shape = (r: NonNullable<Row>, withHtml = true) => ({
  id: r.id, name: r.siteName || 'My site', slug: r.slug || '', html: withHtml ? r.html || '' : '', settings: r.settings || '{}',
  ownerName: r.ownerName || '', paidUntil: r.paidUntil || '', active: !!r.paidUntil && new Date(r.paidUntil).getTime() > Date.now(), views: r.views ?? 0,
});
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'site';

async function mine(email: string) {
  const { records } = await zite.publishedSites.findAll({ filters: { ownerEmail: email }, limit: 100 });
  return records;
}

export default createEndpoint({
  description: 'Publishes Website Builder sites (free first month, then 1,000 gems/month) and serves them publicly',
  inputSchema: z.object({
    action: z.enum(['get', 'mine', 'publish', 'renew', 'unpublish']),
    slug: z.string().optional(),
    id: z.string().optional(),
    name: z.string().max(60).optional(),
    html: z.string().max(800_000).optional(),
    settings: z.string().max(5000).optional(),
  }),
  outputSchema: z.object({ site: site.nullable(), sites: z.array(site) }),
  execute: async ({ input, context }) => {
    if (input.action === 'get') {
      const r = input.slug ? await zite.publishedSites.findOne({ filters: { slug: input.slug } }) : null;
      if (!r) return { site: null, sites: [] };
      await zite.publishedSites.update({ id: r.id, record: { views: (r.views ?? 0) + 1 } });
      const out = shape(r);
      return { site: out.active ? out : { ...out, html: '' }, sites: [] };
    }
    const email = context.user?.email?.toLowerCase();
    if (!email) throw new ZiteError({ code: 'UNAUTHORIZED', message: 'sign in', userFacingMessage: 'Sign in to publish sites.' });
    const own = async (id?: string) => {
      const r = id ? await zite.publishedSites.findOne({ id }) : null;
      if (!r || r.ownerEmail?.toLowerCase() !== email) throw new ZiteError({ code: 'NOT_FOUND', message: 'not yours', userFacingMessage: 'Site not found.' });
      return r;
    };

    if (input.action === 'publish') {
      if (!input.html) throw new ZiteError({ code: 'BAD_REQUEST', message: 'no html', userFacingMessage: 'Build something first.' });
      const name = (input.name || 'My site').trim();
      if (input.id) {
        await own(input.id);
        await zite.publishedSites.update({ id: input.id, record: { siteName: name, html: input.html, settings: input.settings ?? '{}' } });
      } else {
        let slug = slugify(name);
        if (await zite.publishedSites.findOne({ filters: { slug } })) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
        await zite.publishedSites.create({ record: {
          siteName: name, slug, html: input.html, settings: input.settings ?? '{}', ownerEmail: email,
          ownerName: `${context.user?.firstName ?? ''} ${context.user?.lastName ?? ''}`.trim() || email.split('@')[0],
          paidUntil: new Date(Date.now() + MONTH).toISOString(), views: 0,
        } });
      }
    }
    if (input.action === 'renew') {
      const r = await own(input.id);
      const base = Math.max(Date.now(), r.paidUntil ? new Date(r.paidUntil).getTime() : 0);
      await zite.publishedSites.update({ id: r.id, record: { paidUntil: new Date(base + MONTH).toISOString() } });
    }
    if (input.action === 'unpublish') { const r = await own(input.id); await zite.publishedSites.delete({ id: r.id }); }

    return { site: null, sites: (await mine(email)).map(r => shape(r, false)) };
  },
});
