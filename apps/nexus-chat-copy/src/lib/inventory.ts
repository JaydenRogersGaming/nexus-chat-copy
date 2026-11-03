import * as DB from './storage';
import { getAllBgThemes, getAllTypingStyles } from './cosmetics';
import { allLimitedThemes, allLimitedTyping } from './holidays';
import { allHolidaySongs } from './holidaySongs';
const COSMETICS_EVENT = 'nexus-cosmetics'; // same as SettingsExtras

export type ItemKind = 'theme' | 'typing' | 'title' | 'song';
export type InvItem = { kind: ItemKind; id: string; name: string; limited: boolean };

/** Everything this user owns that can be equipped or traded. */
export function getInventory(email: string): InvItem[] {
  const owned = new Set(DB.getUserItems(email));
  const limitedIds = new Set([...allLimitedThemes(), ...allLimitedTyping()].map(x => x.id));
  const out: InvItem[] = [];
  for (const t of getAllBgThemes()) if (owned.has(t.id)) out.push({ kind: 'theme', id: t.id, name: t.name, limited: limitedIds.has(t.id) });
  for (const t of getAllTypingStyles()) if (owned.has(t.id)) out.push({ kind: 'typing', id: t.id, name: t.name, limited: limitedIds.has(t.id) });
  for (const s of allHolidaySongs()) if (owned.has(s.id)) out.push({ kind: 'song', id: s.id, name: s.name, limited: true });
  for (const title of DB.getUserTitles(email)) out.push({ kind: 'title', id: title, name: title, limited: false });
  return out;
}

export function giveItem(email: string, it: { kind: ItemKind; id: string }) {
  if (it.kind === 'title') DB.addUserTitle(email, it.id); else DB.addUserItem(email, it.id);
}
export function takeItem(email: string, it: { kind: ItemKind; id: string }) {
  if (it.kind === 'title') DB.removeUserTitle(email, it.id); else DB.removeUserItem(email, it.id);
}
export function notifyInventory() { window.dispatchEvent(new Event(COSMETICS_EVENT)); }
