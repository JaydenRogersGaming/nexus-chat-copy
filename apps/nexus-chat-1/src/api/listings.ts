import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { can, canEditListing } from '../lib/permissions';
import { audit, bad, deny, loadActor } from '../lib/serverAuth';

const listingOut = z.object({ id: z.string(), title: z.string(), description: z.string(), price: z.number(), inventory: z.number(), status: z.string(), sellerEmail: z.string(), imageUrl: z.string(), createdAt: z.string() });
const orderOut = z.object({ id: z.string(), orderNumber: z.number(), listingTitle: z.string(), buyerEmail: z.string(), sellerEmail: z.string(), quantity: z.number(), total: z.number(), status: z.string(), orderedAt: z.string() });

const fields = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().max(2000),
  price: z.number().min(0).max(1_000_000),
  inventory: z.number().int().min(0).max(100_000),
  imageUrl: z.string().url().max(1000).or(z.literal('')),
});

type L = Awaited<ReturnType<typeof zite.listings.findAll>>['records'][number];
type O = Awaited<ReturnType<typeof zite.orders.findAll>>['records'][number];
const toL = (r: L) => ({ id: r.id, title: r.title || '', description: r.description || '', price: Number(r.price ?? 0), inventory: Number(r.inventory ?? 0), status: r.status || 'Active', sellerEmail: r.sellerEmail || '', imageUrl: r.imageUrl || '', createdAt: r.createdAt || '' });
const toO = (r: O) => ({ id: r.id, orderNumber: Number(r.orderNumber ?? 0), listingTitle: r.listingTitle || '', buyerEmail: r.buyerEmail || '', sellerEmail: r.sellerEmail || '', quantity: Number(r.quantity ?? 0), total: Number(r.total ?? 0), status: r.status || 'Placed', orderedAt: r.orderedAt || '' });

export default createEndpoint({
  description: 'Marketplace: browse and buy listings, sellers manage their listings and orders, staff moderate',
  inputSchema: z.object({
    action: z.enum(['browse', 'mine', 'create', 'update', 'setStatus', 'buy', 'sellerOrders', 'myPurchases', 'search', 'setOrderStatus']),
    id: z.string().optional(),
    data: fields.optional(),
    status: z.enum(['Active', 'Paused', 'Removed']).optional(),
    orderStatus: z.enum(['Placed', 'Shipped', 'Completed', 'Cancelled']).optional(),
    quantity: z.number().int().min(1).max(100).optional(),
    q: z.string().max(100).optional(),
  }),
  outputSchema: z.object({ listings: z.array(listingOut), orders: z.array(orderOut) }),
  execute: async ({ input, context }) => {
    const me = await loadActor(context.user.email);
    const none = { listings: [] as ReturnType<typeof toL>[], orders: [] as ReturnType<typeof toO>[] };
    const getListing = async (id?: string) => {
      if (!id) bad('Pick a listing.');
      const l = await zite.listings.findOne({ id });
      if (!l || l.status === 'Removed') bad('That listing no longer exists.');
      return l;
    };

    switch (input.action) {
      case 'browse': {
        const { records } = await zite.listings.findAll({ filters: { status: 'Active' }, sort: [{ field: 'createdAt', direction: 'desc' }], limit: 200 });
        return { ...none, listings: records.map(toL) };
      }
      case 'search': {
        if (!can(me, 'listings.moderate')) deny("You don't have permission to do that.");
        const q = `%${(input.q || '').trim().toLowerCase()}%`;
        const { rows } = await zite.sql({ query: `SELECT id, "title", "description", "price", "inventory", "status", "sellerEmail", "imageUrl", created_at AS "createdAt" FROM "Listings" WHERE lower(coalesce("title",'')) LIKE $1 OR lower(coalesce("sellerEmail",'')) LIKE $1 ORDER BY created_at DESC LIMIT 100`, params: [q] });
        return { ...none, listings: rows.map(r => toL({ ...(r as object), id: String(r.id), createdAt: String(r.createdAt || '') } as L)) };
      }
      case 'mine': {
        const { records } = await zite.listings.findAll({ filters: { sellerEmail: me.email }, limit: 500 });
        return { ...none, listings: records.filter(r => r.status !== 'Removed').map(toL) };
      }
      case 'create': {
        if (!can(me, 'listings.sell')) deny('Only Sellers can create listings.');
        if (!input.data) bad('Fill in the listing details.');
        const rec = await zite.listings.create({ record: { ...input.data, status: 'Active', sellerEmail: me.email } });
        await audit(me.email, 'listing.create', rec.id, input.data.title);
        return { ...none, listings: [toL(rec)] };
      }
      case 'update': {
        const l = await getListing(input.id);
        if (!canEditListing(me, l.sellerEmail || '')) deny('You can only edit your own listings.');
        if (!input.data) bad('Fill in the listing details.');
        const rec = await zite.listings.update({ id: l.id, record: input.data });
        await audit(me.email, 'listing.update', l.id, input.data.title);
        return { ...none, listings: [toL(rec)] };
      }
      case 'setStatus': {
        const l = await getListing(input.id);
        if (!input.status) bad('Pick a status.');
        if (!canEditListing(me, l.sellerEmail || '')) deny('You can only change your own listings.');
        const rec = await zite.listings.update({ id: l.id, record: { status: input.status } });
        await audit(me.email, `listing.${input.status.toLowerCase()}`, l.id, l.title || '');
        return { ...none, listings: [toL(rec)] };
      }
      case 'buy': {
        if (me.restriction === 'Suspended') deny('Your account is suspended.');
        const l = await getListing(input.id);
        const qty = input.quantity ?? 1;
        if (l.status !== 'Active') bad('That listing is paused.');
        if ((l.sellerEmail || '').toLowerCase() === me.email) bad("You can't buy your own listing.");
        if (Number(l.inventory ?? 0) < qty) bad('Not enough in stock.');
        await zite.listings.update({ id: l.id, record: { inventory: Number(l.inventory ?? 0) - qty } });
        const order = await zite.orders.create({ record: {
          listing: l.id, listingTitle: l.title || '', buyerEmail: me.email, sellerEmail: l.sellerEmail || '',
          quantity: qty, total: Math.round(Number(l.price ?? 0) * qty * 100) / 100, status: 'Placed',
        } });
        await audit(me.email, 'order.place', order.id, `${qty} × ${l.title}`);
        return { ...none, orders: [toO(order)] };
      }
      case 'sellerOrders': {
        const filters = can(me, 'listings.moderate') && input.q === 'all' ? {} : { sellerEmail: me.email };
        const { records } = await zite.orders.findAll({ filters, sort: [{ field: 'orderedAt', direction: 'desc' }], limit: 500 });
        return { ...none, orders: records.map(toO) };
      }
      case 'myPurchases': {
        const { records } = await zite.orders.findAll({ filters: { buyerEmail: me.email }, sort: [{ field: 'orderedAt', direction: 'desc' }], limit: 500 });
        return { ...none, orders: records.map(toO) };
      }
      case 'setOrderStatus': {
        if (!input.id || !input.orderStatus) bad('Pick an order and status.');
        const o = await zite.orders.findOne({ id: input.id });
        if (!o) bad('That order no longer exists.');
        const isSeller = (o.sellerEmail || '').toLowerCase() === me.email;
        if (!isSeller && !can(me, 'listings.moderate')) deny('You can only update your own orders.');
        const rec = await zite.orders.update({ id: o.id, record: { status: input.orderStatus } });
        await audit(me.email, 'order.status', o.id, input.orderStatus);
        return { ...none, orders: [toO(rec)] };
      }
    }
  },
});
