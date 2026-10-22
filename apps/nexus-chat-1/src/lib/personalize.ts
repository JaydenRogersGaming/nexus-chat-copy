import type { CSSProperties } from 'react';
// Per-user personalization: role text style, custom CSS (one-time unlock), background music
export const PERSONALIZE_EVENT = 'nexus-personalize';
export const CUSTOM_CSS_PRICE = 500;

export type TextStyle = { color: string; font: string; bold: boolean; italic: boolean; glow: boolean };
export const TEXT_FONTS = [
  { id: '', name: 'Default' },
  { id: '"Courier New", monospace', name: 'Mono' },
  { id: 'Georgia, serif', name: 'Serif' },
  { id: '"Comic Sans MS", cursive', name: 'Comic' },
  { id: 'Impact, sans-serif', name: 'Impact' },
];
export const DEFAULT_TEXT_STYLE: TextStyle = { color: '', font: '', bold: false, italic: false, glow: false };

export const SONGS = [
  { name: 'Chill Synth', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { name: 'Night Drive', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { name: 'Retro Groove', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { name: 'Lo-fi Beat', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
  { name: 'Arcade Rush', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3' },
];

function read<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}
function write(key: string, v: unknown) {
  localStorage.setItem(key, JSON.stringify(v));
  window.dispatchEvent(new Event(PERSONALIZE_EVENT));
}

const textKey = (role: string) => `nexus_textstyle_${role}`;
export function getRoleTextStyle(role: string): TextStyle { return { ...DEFAULT_TEXT_STYLE, ...read(textKey(role), {}) }; }
export function setRoleTextStyle(role: string, s: TextStyle) { write(textKey(role), s); }
export function textStyleCss(s: TextStyle): CSSProperties {
  return {
    color: s.color || undefined,
    fontFamily: s.font || undefined,
    fontWeight: s.bold ? 700 : undefined,
    fontStyle: s.italic ? 'italic' : undefined,
    textShadow: s.glow && s.color ? `0 0 8px ${s.color}` : undefined,
  };
}

export function hasCustomCss(email: string) { return read<string[]>('nexus_css_owners', []).includes(email); }
export function unlockCustomCss(email: string) { write('nexus_css_owners', [...read<string[]>('nexus_css_owners', []), email]); }
export function getCustomCss(email: string) { return read<string>(`nexus_css_${email}`, ''); }
export function setCustomCss(email: string, css: string) { write(`nexus_css_${email}`, css); }

export type MusicPrefs = { url: string; volume: number; playing: boolean };
export function getMusic(): MusicPrefs { return { url: SONGS[0].url, volume: 0.4, playing: false, ...read('nexus_music', {}) }; }
export function setMusic(m: MusicPrefs) { write('nexus_music', m); }
