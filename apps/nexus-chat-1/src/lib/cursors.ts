export type CursorItem = { id: string; name: string; emoji: string; price: number };

export const CURSORS: CursorItem[] = [
  { id: 'default', name: 'Classic', emoji: '🖱️', price: 0 },
  { id: 'sword', name: 'Sword', emoji: '🗡️', price: 150 },
  { id: 'star', name: 'Star', emoji: '⭐', price: 200 },
  { id: 'heart', name: 'Heart', emoji: '❤️', price: 200 },
  { id: 'fire', name: 'Fire', emoji: '🔥', price: 300 },
  { id: 'ghost', name: 'Ghost', emoji: '👻', price: 300 },
  { id: 'pumpkin', name: 'Pumpkin', emoji: '🎃', price: 350 },
  { id: 'cat', name: 'Cat Paw', emoji: '🐾', price: 400 },
  { id: 'rocket', name: 'Rocket', emoji: '🚀', price: 500 },
  { id: 'wand', name: 'Magic Wand', emoji: '🪄', price: 750 },
  { id: 'diamond', name: 'Diamond', emoji: '💎', price: 1500 },
  { id: 'crown', name: 'Crown', emoji: '👑', price: 3000 },
];

const ownedKey = (e: string) => `nexus_cursors_owned_${e}`;
const eqKey = (e: string) => `nexus_cursor_equipped_${e}`;
export const CURSOR_EVENT = 'nexus-cursor-change';

export function getOwned(email: string): string[] {
  try { return ['default', ...JSON.parse(localStorage.getItem(ownedKey(email)) || '[]')]; } catch { return ['default']; }
}
export function addOwned(email: string, id: string) {
  const list = getOwned(email).filter(x => x !== 'default');
  localStorage.setItem(ownedKey(email), JSON.stringify([...new Set([...list, id])]));
}
export function getEquipped(email: string) { return localStorage.getItem(eqKey(email)) || 'default'; }
export function equip(email: string, id: string) {
  localStorage.setItem(eqKey(email), id);
  window.dispatchEvent(new Event(CURSOR_EVENT));
}
export function cursorCss(id: string): string {
  const c = CURSORS.find(x => x.id === id);
  if (!c || c.id === 'default') return '';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><text x='2' y='26' font-size='24'>${c.emoji}</text></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") 4 4, auto`;
}
