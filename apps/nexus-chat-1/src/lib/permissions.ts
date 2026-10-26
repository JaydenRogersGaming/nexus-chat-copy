// Pure permission rules shared by the server endpoints and the tests.
// No database or framework imports here — callers pass in the facts.

export const MARKET_ROLES = ['Customer', 'Seller', 'Moderator', 'Admin'] as const;
export type MarketRole = typeof MARKET_ROLES[number];
export const RESTRICTIONS = ['None', 'Muted', 'Selling Disabled', 'Suspended'] as const;
export type Restriction = typeof RESTRICTIONS[number];

export const OWNER_EMAIL = 'jaydenaltfirst@gmail.com';

/** Chat rank (existing roles) */
const CHAT_RANK: Record<string, number> = { user: 0, vip: 1, helper: 2, mod: 3, 'senior-mod': 4, admin: 5, 'co-owner': 6, owner: 7 };

export type Actor = { email: string; chatRole: string; marketRole: string; restriction: string };

/** 0 customer · 1 seller · 2 moderator · 3 admin · 4 owner */
export function level(a: Actor): number {
  if (a.email.toLowerCase() === OWNER_EMAIL || a.chatRole === 'owner') return 4;
  const chat = CHAT_RANK[a.chatRole] ?? 0;
  if (a.marketRole === 'Admin' || chat >= CHAT_RANK.admin) return 3;
  if (a.marketRole === 'Moderator' || chat >= CHAT_RANK.mod) return 2;
  if (a.marketRole === 'Seller') return 1;
  return 0;
}

export const isAdmin = (a: Actor) => level(a) >= 3;
export const isModerator = (a: Actor) => level(a) >= 2;
const suspended = (a: Actor) => a.restriction === 'Suspended';

export type Permission =
  | 'dashboard.view' | 'users.search' | 'users.restrict' | 'roles.assign'
  | 'ip.view' | 'ip.viewFull' | 'ip.ban' | 'reports.review'
  | 'listings.moderate' | 'listings.sell' | 'audit.view' | 'market.buy';

export function can(a: Actor, p: Permission): boolean {
  if (suspended(a) && level(a) < 4) return false;
  switch (p) {
    case 'dashboard.view': case 'users.search': case 'users.restrict':
    case 'ip.view': case 'reports.review': case 'listings.moderate':
      return isModerator(a);
    case 'roles.assign': case 'ip.viewFull': case 'ip.ban': case 'audit.view':
      return isAdmin(a);
    case 'listings.sell':
      return (level(a) >= 1) && a.restriction !== 'Selling Disabled';
    case 'market.buy':
      return true;
  }
}

export function permissionsOf(a: Actor): Permission[] {
  const all: Permission[] = ['dashboard.view', 'users.search', 'users.restrict', 'roles.assign', 'ip.view', 'ip.viewFull', 'ip.ban', 'reports.review', 'listings.moderate', 'listings.sell', 'audit.view', 'market.buy'];
  return all.filter(p => can(a, p));
}

const ROLE_LEVEL: Record<MarketRole, number> = { Customer: 0, Seller: 1, Moderator: 2, Admin: 3 };

/** Returns an error message, or null if allowed. Prevents privilege escalation. */
export function checkAssignRole(actor: Actor, target: Actor, newRole: MarketRole): string | null {
  if (!can(actor, 'roles.assign')) return 'Only Admins can change marketplace roles.';
  if (actor.email.toLowerCase() === target.email.toLowerCase()) return "You can't change your own role.";
  if (level(target) >= 4) return "The owner's role can't be changed.";
  const me = level(actor);
  if (me < 4 && level(target) >= me) return 'You can only change roles for people below you.';
  if (me < 4 && ROLE_LEVEL[newRole] >= me) return 'You can only give roles below your own.';
  return null;
}

export function checkRestrict(actor: Actor, target: Actor): string | null {
  if (!can(actor, 'users.restrict')) return 'Only Moderators and above can restrict accounts.';
  if (actor.email.toLowerCase() === target.email.toLowerCase()) return "You can't restrict yourself.";
  if (level(target) >= level(actor)) return 'You can only restrict people below you.';
  return null;
}

/** Hides the last parts of an IP for people without full access. */
export function maskIp(ip: string): string {
  if (!ip) return '';
  if (ip.includes(':')) { const p = ip.split(':'); return `${p.slice(0, 2).join(':')}:****`; }
  const p = ip.split('.');
  return p.length === 4 ? `${p[0]}.${p[1]}.*.*` : '***';
}

export function isValidIp(ip: string): boolean {
  const v4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
  const v6 = /^[0-9a-f:]+$/i;
  return v4.test(ip) || (ip.includes(':') && v6.test(ip) && ip.length <= 39);
}

/** Bans with no expiry are permanent. */
export function isBanActive(expiresAt: string | null | undefined, now = Date.now()): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() > now;
}

/**
 * Lockout safeguard: refuse an IP ban that would hit the actor's own IP
 * or any IP an Admin/Moderator/owner has been seen on.
 */
export function checkIpBan(actor: Actor, ip: string, actorIps: string[], staffIps: string[]): string | null {
  if (!can(actor, 'ip.ban')) return 'Only Admins can ban IP addresses.';
  if (!isValidIp(ip)) return "That doesn't look like a valid IP address.";
  if (actorIps.includes(ip)) return "That's your own IP address — banning it would lock you out.";
  if (staffIps.includes(ip)) return 'A staff member uses this IP address. Remove their staff role first if you really mean it.';
  return null;
}

export function canEditListing(actor: Actor, sellerEmail: string): boolean {
  if (can(actor, 'listings.moderate')) return true;
  return can(actor, 'listings.sell') && actor.email.toLowerCase() === sellerEmail.toLowerCase();
}
