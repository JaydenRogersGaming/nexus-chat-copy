// Run: npx tsx tests/permissions.test.ts
import assert from 'node:assert/strict';
import {
  Actor, can, checkAssignRole, checkIpBan, checkRestrict, isBanActive, maskIp, isValidIp, canEditListing, OWNER_EMAIL,
} from '../src/lib/permissions';

const mk = (email: string, marketRole = 'Customer', chatRole = 'user', restriction = 'None'): Actor => ({ email, marketRole, chatRole, restriction });
const owner = mk(OWNER_EMAIL);
const admin = mk('admin@x.com', 'Admin');
const admin2 = mk('admin2@x.com', 'Admin');
const mod = mk('mod@x.com', 'Moderator');
const seller = mk('seller@x.com', 'Seller');
const customer = mk('cust@x.com');
let passed = 0;
const t = (name: string, fn: () => void) => { fn(); passed++; console.log('✓', name); };

// ── Roles & permissions ──
t('customers cannot open the dashboard or sell', () => {
  assert.equal(can(customer, 'dashboard.view'), false);
  assert.equal(can(customer, 'listings.sell'), false);
  assert.equal(can(customer, 'market.buy'), true);
});
t('moderators review but cannot ban IPs or assign roles', () => {
  assert.equal(can(mod, 'reports.review'), true);
  assert.equal(can(mod, 'ip.ban'), false);
  assert.equal(can(mod, 'ip.viewFull'), false);
  assert.equal(can(mod, 'roles.assign'), false);
});
t('existing chat staff roles map onto dashboard levels', () => {
  assert.equal(can(mk('a@x.com', 'Customer', 'admin'), 'ip.ban'), true);
  assert.equal(can(mk('m@x.com', 'Customer', 'mod'), 'reports.review'), true);
  assert.equal(can(mk('v@x.com', 'Customer', 'vip'), 'dashboard.view'), false);
});
t('suspended staff lose all staff powers; selling-disabled sellers cannot sell', () => {
  assert.equal(can(mk('a@x.com', 'Admin', 'user', 'Suspended'), 'ip.ban'), false);
  assert.equal(can(mk('s@x.com', 'Seller', 'user', 'Selling Disabled'), 'listings.sell'), false);
});

// ── Privilege escalation ──
t('cannot change own role', () => assert.ok(checkAssignRole(admin, admin, 'Customer')));
t('admin cannot create another admin or touch a peer admin', () => {
  assert.ok(checkAssignRole(admin, customer, 'Admin'));
  assert.ok(checkAssignRole(admin, admin2, 'Customer'));
});
t('admin can promote a customer to moderator', () => assert.equal(checkAssignRole(admin, customer, 'Moderator'), null));
t('only owner can create admins; owner role is untouchable', () => {
  assert.equal(checkAssignRole(owner, customer, 'Admin'), null);
  assert.ok(checkAssignRole(admin, owner, 'Customer'));
});
t('moderators and sellers cannot assign roles at all', () => {
  assert.ok(checkAssignRole(mod, customer, 'Seller'));
  assert.ok(checkAssignRole(seller, customer, 'Seller'));
});
t('restrictions only apply downward', () => {
  assert.equal(checkRestrict(mod, seller), null);
  assert.ok(checkRestrict(mod, admin));
  assert.ok(checkRestrict(mod, mod));
  assert.ok(checkRestrict(customer, seller));
});

// ── Listings ──
t('sellers edit only their own listings; moderators can edit any', () => {
  assert.equal(canEditListing(seller, 'seller@x.com'), true);
  assert.equal(canEditListing(seller, 'other@x.com'), false);
  assert.equal(canEditListing(mod, 'other@x.com'), true);
  assert.equal(canEditListing(customer, 'cust@x.com'), false);
});

// ── IP bans ──
t('only admins can ban IPs', () => {
  assert.ok(checkIpBan(mod, '203.0.113.7', [], []));
  assert.equal(checkIpBan(admin, '203.0.113.7', [], []), null);
});
t('lockout safeguards: own IP and staff IPs are refused', () => {
  assert.match(checkIpBan(admin, '198.51.100.1', ['198.51.100.1'], [])!, /own IP/);
  assert.match(checkIpBan(admin, '198.51.100.2', [], ['198.51.100.2'])!, /staff/);
});
t('invalid IPs are rejected', () => {
  assert.ok(checkIpBan(admin, '999.1.1.1', [], []));
  assert.ok(checkIpBan(admin, 'drop table', [], []));
  assert.equal(isValidIp('2001:db8::1'), true);
});
t('ban expiry: timed bans end, permanent bans do not', () => {
  const now = Date.parse('2026-10-26T12:00:00Z');
  assert.equal(isBanActive(null, now), true);
  assert.equal(isBanActive('2026-10-26T13:00:00Z', now), true);
  assert.equal(isBanActive('2026-10-26T11:00:00Z', now), false);
});
t('unbanned (deleted) / expired bans no longer match', () => {
  const now = Date.parse('2026-10-26T12:00:00Z');
  const bans = [{ ip: '203.0.113.7', expiresAt: '2026-10-26T11:59:00Z' }];
  assert.equal(bans.some(b => b.ip === '203.0.113.7' && isBanActive(b.expiresAt, now)), false);
});
t('IPs are masked for people without full access', () => {
  assert.equal(maskIp('203.0.113.7'), '203.0.*.*');
  assert.equal(maskIp('2001:db8:85a3::1'), '2001:db8:****');
  assert.equal(maskIp(''), '');
});

console.log(`\n${passed} tests passed`);
