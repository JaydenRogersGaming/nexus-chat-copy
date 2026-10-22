export type BgTheme = { id: string; name: string; cost: number; css: string };
export const BG_THEMES: BgTheme[] = [
  { id: 'bg-sunset', name: '🌅 Sunset', cost: 300, css: 'linear-gradient(135deg, #2a0f2e 0%, #5b1a3a 45%, #a8432f 100%)' },
  { id: 'bg-ocean', name: '🌊 Deep Ocean', cost: 300, css: 'linear-gradient(160deg, #021526 0%, #03346e 60%, #0a6e8a 100%)' },
  { id: 'bg-forest', name: '🌲 Forest', cost: 400, css: 'linear-gradient(160deg, #06140c 0%, #0f3b22 60%, #2d6a3f 100%)' },
  { id: 'bg-galaxy', name: '🌌 Galaxy', cost: 800, css: 'radial-gradient(circle at 20% 20%, #4c1d95 0%, transparent 40%), radial-gradient(circle at 80% 70%, #be185d 0%, transparent 40%), #070312' },
  { id: 'bg-lava', name: '🌋 Lava', cost: 800, css: 'linear-gradient(180deg, #120202 0%, #4a0b0b 55%, #c2410c 100%)' },
  { id: 'bg-candy', name: '🍬 Candy', cost: 600, css: 'linear-gradient(135deg, #3b0a45 0%, #a21caf 50%, #f472b6 100%)' },
  { id: 'bg-gold', name: '👑 Royal Gold', cost: 2000, css: 'linear-gradient(135deg, #1a1203 0%, #5c4306 50%, #b8860b 100%)' },
];
export type CustomTheme = BgTheme & { inShop: boolean };
export const THEMES_EVENT = 'nexus-themes';
export function getCustomThemes(): CustomTheme[] {
  try { return JSON.parse(localStorage.getItem('hub:customThemes') || '[]'); } catch { return []; }
}
export function saveCustomThemes(list: CustomTheme[]) {
  localStorage.setItem('hub:customThemes', JSON.stringify(list));
  window.dispatchEvent(new Event(THEMES_EVENT));
}
/** Every background: built-in + owner-made themes. */
export function getAllBgThemes(): BgTheme[] { return [...BG_THEMES, ...getCustomThemes()]; }
/** Backgrounds that appear for sale in the shop. */
export function getShopBgThemes(): BgTheme[] { return [...BG_THEMES, ...getCustomThemes().filter(t => t.inShop)]; }

export type TypingStyle = { id: string; name: string; cost: number; text: string; className: string; color: string };
export const TYPING_STYLES: TypingStyle[] = [
  { id: 'type-fire', name: '🔥 On Fire', cost: 250, text: 'is cooking something up 🔥', className: 'animate-pulse', color: '#f97316' },
  { id: 'type-rainbow', name: '🌈 Rainbow', cost: 400, text: 'is typing…', className: 'title-rainbow', color: '#ffffff' },
  { id: 'type-ninja', name: '🥷 Ninja', cost: 300, text: 'is sneaking in a message 🥷', className: '', color: '#94a3b8' },
  { id: 'type-wizard', name: '🧙 Wizard', cost: 500, text: 'is casting a spell ✨', className: 'animate-pulse', color: '#a855f7' },
  { id: 'type-robot', name: '🤖 Robot', cost: 350, text: 'is computing… beep boop', className: '', color: '#22d3ee' },
  { id: 'type-king', name: '👑 Royal', cost: 1500, text: 'is preparing a royal decree 👑', className: 'animate-pulse', color: '#facc15' },
];
