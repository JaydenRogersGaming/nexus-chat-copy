import { allLimitedThemes, allLimitedTyping } from './holidays';
export type BgTheme = { id: string; name: string; cost: number; css: string };
export const BG_THEMES: BgTheme[] = [
  { id: 'bg-sunset', name: '🌅 Sunset', cost: 300, css: 'linear-gradient(135deg, #2a0f2e 0%, #5b1a3a 45%, #a8432f 100%)' },
  { id: 'bg-ocean', name: '🌊 Deep Ocean', cost: 300, css: 'linear-gradient(160deg, #021526 0%, #03346e 60%, #0a6e8a 100%)' },
  { id: 'bg-forest', name: '🌲 Forest', cost: 400, css: 'linear-gradient(160deg, #06140c 0%, #0f3b22 60%, #2d6a3f 100%)' },
  { id: 'bg-galaxy', name: '🌌 Galaxy', cost: 800, css: 'radial-gradient(circle at 20% 20%, #4c1d95 0%, transparent 40%), radial-gradient(circle at 80% 70%, #be185d 0%, transparent 40%), #070312' },
  { id: 'bg-lava', name: '🌋 Lava', cost: 800, css: 'linear-gradient(180deg, #120202 0%, #4a0b0b 55%, #c2410c 100%)' },
  { id: 'bg-candy', name: '🍬 Candy', cost: 600, css: 'linear-gradient(135deg, #3b0a45 0%, #a21caf 50%, #f472b6 100%)' },
  { id: 'bg-gold', name: '👑 Royal Gold', cost: 2000, css: 'linear-gradient(135deg, #1a1203 0%, #5c4306 50%, #b8860b 100%)' },
  { id: 'bg-aurora', name: '🌠 Aurora', cost: 900, css: 'linear-gradient(160deg, #020617 0%, #064e3b 40%, #0e7490 70%, #7c3aed 100%)' },
  { id: 'bg-midnight', name: '🌙 Midnight', cost: 250, css: 'linear-gradient(180deg, #000000 0%, #0f172a 60%, #1e293b 100%)' },
  { id: 'bg-cherry', name: '🌸 Cherry Blossom', cost: 500, css: 'linear-gradient(135deg, #3f0d1f 0%, #9d174d 55%, #fbcfe8 100%)' },
  { id: 'bg-ice', name: '❄️ Frostbite', cost: 500, css: 'linear-gradient(160deg, #0c1a2b 0%, #1e40af 50%, #a5f3fc 100%)' },
  { id: 'bg-toxic', name: '☢️ Toxic', cost: 700, css: 'radial-gradient(circle at 50% 100%, #65a30d 0%, transparent 55%), #0a0f02' },
  { id: 'bg-neon', name: '💜 Neon City', cost: 1000, css: 'radial-gradient(circle at 15% 85%, #db2777 0%, transparent 40%), radial-gradient(circle at 85% 15%, #06b6d4 0%, transparent 40%), #0b0217' },
  { id: 'bg-desert', name: '🏜️ Desert Dusk', cost: 400, css: 'linear-gradient(180deg, #1c0f05 0%, #78350f 55%, #f59e0b 100%)' },
  { id: 'bg-void', name: '🕳️ The Void', cost: 1500, css: 'radial-gradient(circle at 50% 50%, #1e1b4b 0%, #000000 70%)' },
  { id: 'bg-rainbow', name: '🌈 Rainbow', cost: 2500, css: 'linear-gradient(135deg, #7f1d1d, #9a3412, #854d0e, #166534, #1e3a8a, #581c87)' },
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
export function getAllBgThemes(): BgTheme[] { return [...BG_THEMES, ...getCustomThemes(), ...allLimitedThemes()]; }
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

/** Owner-made typing effects (saved like custom themes). */
export type CustomTyping = TypingStyle & { inShop: boolean };
export function getCustomTyping(): CustomTyping[] {
  try { return JSON.parse(localStorage.getItem('hub:customTyping') || '[]'); } catch { return []; }
}
export function saveCustomTyping(list: CustomTyping[]) {
  localStorage.setItem('hub:customTyping', JSON.stringify(list));
  window.dispatchEvent(new Event(THEMES_EVENT));
}
export function getShopTypingStyles(): TypingStyle[] { return [...TYPING_STYLES, ...getCustomTyping().filter(t => t.inShop)]; }

/** Every typing style including owner-made and limited holiday ones. */
export function getAllTypingStyles(): TypingStyle[] { return [...TYPING_STYLES, ...getCustomTyping(), ...allLimitedTyping()]; }

// ── Weekly rotating titles ──────────────────────────────────
export type WeeklyTitle = { name: string; effect: string; color: string; cost: number };
const TITLE_POOL: WeeklyTitle[] = [
  { name: 'Night Owl', effect: 'glow', color: '#818cf8', cost: 800 }, { name: 'Speed Demon', effect: 'fire', color: '#f97316', cost: 1200 },
  { name: 'Chill Vibes', effect: 'none', color: '#5eead4', cost: 500 }, { name: 'Meme Lord', effect: 'rainbow', color: '#f472b6', cost: 1500 },
  { name: 'Gem Hoarder', effect: 'glow', color: '#22d3ee', cost: 2000 }, { name: 'Legend', effect: 'rainbow', color: '#facc15', cost: 5000 },
  { name: 'Pixel Artist', effect: 'none', color: '#a78bfa', cost: 700 }, { name: 'Lucky Star', effect: 'glow', color: '#fde047', cost: 1000 },
  { name: 'Shadow', effect: 'none', color: '#64748b', cost: 600 }, { name: 'Storm Chaser', effect: 'fire', color: '#60a5fa', cost: 1300 },
  { name: 'Sweet Tooth', effect: 'none', color: '#fb7185', cost: 500 }, { name: 'Galaxy Brain', effect: 'rainbow', color: '#c084fc', cost: 2500 },
  { name: 'Early Bird', effect: 'glow', color: '#fbbf24', cost: 700 }, { name: 'Wildcard', effect: 'fire', color: '#ef4444', cost: 1800 },
  { name: 'Frostbite', effect: 'glow', color: '#bae6fd', cost: 900 }, { name: 'Vibe Check', effect: 'rainbow', color: '#34d399', cost: 1100 },
];
export function weekNumber(d = new Date()) { return Math.floor((d.getTime() / 86400000 + 4) / 7); }
/** 3 titles for the current week; changes every Monday-ish. */
export function getWeeklyTitles(d = new Date()): WeeklyTitle[] {
  const w = weekNumber(d);
  return [0, 1, 2].map(i => TITLE_POOL[(w * 3 + i * 5) % TITLE_POOL.length]);
}
