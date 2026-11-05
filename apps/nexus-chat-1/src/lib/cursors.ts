export type CursorItem = { id: string; name: string; emoji: string; price: number; vipOnly?: boolean };

export const CURSORS: CursorItem[] = [
  { id: 'default', name: 'Classic', emoji: '🖱️', price: 0 },
  { id: 'pointer', name: 'Neon Finger', emoji: '👉', price: 150 },
  { id: 'lightning', name: 'Lightning', emoji: '⚡', price: 200 },
  { id: 'comet', name: 'Comet', emoji: '☄️', price: 250 },
  { id: 'bat', name: 'Bat', emoji: '🦇', price: 300 },
  { id: 'skull', name: 'Skull', emoji: '💀', price: 350 },
  { id: 'saturn', name: 'Planet', emoji: '🪐', price: 400 },
  { id: 'dragon', name: 'Dragon', emoji: '🐉', price: 600 },
  { id: 'ufo', name: 'UFO', emoji: '🛸', price: 750 },
  { id: 'sparkles', name: 'Sparkles', emoji: '✨', price: 900 },
  { id: 'trophy', name: 'Trophy', emoji: '🏆', price: 1500 },
  { id: 'crown', name: 'Crown', emoji: '👑', price: 3000 },
  { id: 'vipheart', name: 'VIP Heart', emoji: '💖', price: 500, vipOnly: true },
];

/** Making your own custom cursor costs this once; you can change it freely after. */
export const CUSTOM_CURSOR_PRICE = 1000;

const ownedKey = (e: string) => `nexus_cursors_owned_${e}`;
const eqKey = (e: string) => `nexus_cursor_equipped_${e}`;
const customKey = (e: string) => `nexus_cursor_custom_${e}`;
export const CURSOR_EVENT = 'nexus-cursor-change';

export type CustomCursor = { emoji: string; size: number };
export function getCustom(email: string): CustomCursor | null {
  try { return JSON.parse(localStorage.getItem(customKey(email)) || 'null'); } catch { return null; }
}
export function saveCustom(email: string, c: CustomCursor) {
  localStorage.setItem(customKey(email), JSON.stringify(c));
  window.dispatchEvent(new Event(CURSOR_EVENT));
}

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
export function emojiCursorCss(emoji: string, size = 24): string {
  const box = size + 8;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${box}' height='${box}'><text x='2' y='${size + 2}' font-size='${size}'>${emoji}</text></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") 4 4, auto`;
}
export function cursorCss(id: string, email = ''): string {
  if (id === 'custom') { const c = getCustom(email); return c ? emojiCursorCss(c.emoji, c.size) : ''; }
  const c = CURSORS.find(x => x.id === id);
  if (!c || c.id === 'default') return '';
  return emojiCursorCss(c.emoji);
}

/** VIPs get 20% off every cursor. */
export const cursorPrice = (c: CursorItem, vip: boolean) => (vip ? Math.round(c.price * 0.8) : c.price);
