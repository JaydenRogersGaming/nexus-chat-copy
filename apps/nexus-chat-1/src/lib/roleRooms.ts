import type { ChatRoom, UserProfile } from './storage';
import { OWNER_EMAIL, isOwnerEmail } from './gameData';

const RANK: Record<string, number> = { user: 0, vip: 1, helper: 2, mod: 3, 'senior-mod': 4, admin: 5, 'co-owner': 6, owner: 7 };

// One private room per role. Staff rooms let in that rank and above;
// badge rooms (VIP / Helper) let in that role plus Admins and above.
export const ROLE_ROOMS: { role: string; name: string; badgeOnly?: boolean }[] = [
  { role: 'owner', name: '👑 Owner Lounge' },
  { role: 'co-owner', name: '🟠 Co-Owner Room' },
  { role: 'admin', name: '🔴 Admin Room' },
  { role: 'senior-mod', name: '🟣 Senior Mod Room' },
  { role: 'mod', name: '🔵 Mod Room' },
  { role: 'helper', name: '🟢 Helper Room', badgeOnly: true },
  { role: 'guardian', name: '🛡️ Guardian Room', badgeOnly: true },
  { role: 'vip', name: '💖 VIP Lounge', badgeOnly: true },
];

export function canEnterRoleRoom(p: UserProfile, role: string, badgeOnly?: boolean) {
  const rank = isOwnerEmail(p.email) ? 7 : RANK[p.role] ?? 0;
  if (badgeOnly) return p.role === role || rank >= RANK.admin;
  return rank >= RANK[role];
}

export const VIP_LOUNGE_ID = 'role-vip';
/** Everyone sees the VIP Lounge; non-VIPs get sent to buy VIP when they click it. */
export function roleRoomsFor(p: UserProfile): ChatRoom[] {
  return ROLE_ROOMS.filter(r => r.role === 'vip' || canEnterRoleRoom(p, r.role, r.badgeOnly))
    .map(r => ({ id: `role-${r.role}`, name: r.name, type: 'group' as const, members: [], createdBy: OWNER_EMAIL }));
}
