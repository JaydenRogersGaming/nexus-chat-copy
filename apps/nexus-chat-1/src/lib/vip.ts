import type { CSSProperties } from 'react';
import { isOwnerEmail } from './permissions';
// VIP membership — 1,500 gems one-time unlock (includes the first 30 days), then 7,000 gems / month.
export const VIP_UNLOCK_PRICE = 1500;
export const DEFAULT_VIP_PRICE = 7000;
/** Monthly price — the owner can change it; loaded from the server on start. */
export let VIP_PRICE = DEFAULT_VIP_PRICE;
export function setMonthlyPrice(n: number) { VIP_PRICE = n; window.dispatchEvent(new Event('vip-change')); }
/** The owner always has VIP and never pays. */
export const isOwnerVip = (email: string) => isOwnerEmail(email);
/** VIPs get 25% off shop items. */
export const VIP_DISCOUNT = 0.25;
export const shopPrice = (cost: number, email: string) => (isVip(email) ? Math.round(cost * (1 - VIP_DISCOUNT)) : cost);
/** "8 months" or "1 year, 3 months". */
export function durationLabel(months: number): string {
  const y = Math.floor(months / 12), m = months % 12;
  const ms = `${m} month${m === 1 ? '' : 's'}`;
  if (!y) return ms;
  const ys = `${y} year${y === 1 ? '' : 's'}`;
  return m ? `${ys}, ${ms}` : ys;
}
export const VIP_DAYS = 30;
const DAY = 86_400_000;

export type VipStatus = { expiresAt: number; autoRenew: boolean; since: number; months: number };
export type VipStyle = {
  color1: string; color2: string; glow: boolean; animation: 'none' | 'shimmer' | 'pulse' | 'rainbow';
  icon: string; roleName: string; nickname: string; flair: string; welcome: string; status: string;
};
export type VipRequest = { id: string; kind: 'song' | 'topic' | 'idea'; text: string; by: string; votes: string[]; at: number };

export const DEFAULT_STYLE: VipStyle = {
  color1: '#f5c542', color2: '#ff5fa2', glow: true, animation: 'shimmer',
  icon: '👑', roleName: 'VIP', nickname: '', flair: '', welcome: '', status: '',
};

export const VIP_ICONS = ['👑', '💎', '🌟', '🔥', '⚡', '🦋', '🐉', '🌙', '🎧', '🍀', '🦄', '🪐'];
export const VIP_FLAIRS = ['', '✨ Trendsetter', '🎮 Game Night Legend', '🎬 Movie Buff', '🎵 Playlist Curator', '🌍 Globetrotter', '🧠 Big Brain', '🫶 Community Heart'];

/** Seasonal variant of the VIP role, based on the month. */
export function seasonalVariant(d = new Date()): { label: string; emoji: string } {
  const m = d.getMonth();
  if (m === 9) return { label: 'Spooky VIP', emoji: '🎃' };
  if (m === 10) return { label: 'Harvest VIP', emoji: '🍂' };
  if (m === 11 || m === 0) return { label: 'Frost VIP', emoji: '❄️' };
  if (m <= 3) return { label: 'Bloom VIP', emoji: '🌸' };
  if (m <= 7) return { label: 'Sunburst VIP', emoji: '☀️' };
  return { label: 'Golden VIP', emoji: '🌾' };
}

const k = (key: string) => `hub:vip:${key}`;
function read<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(k(key)); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function write<T>(key: string, v: T) {
  localStorage.setItem(k(key), JSON.stringify(v));
  window.dispatchEvent(new Event('vip-change'));
}

export function getVip(email: string): VipStatus | null { return read<VipStatus | null>(`status:${email}`, null); }
export function isVip(email: string): boolean { if (isOwnerVip(email)) return true; const s = getVip(email); return !!s && s.expiresAt > Date.now(); }
export function daysLeft(email: string): number {
  const s = getVip(email); return s ? Math.max(0, Math.ceil((s.expiresAt - Date.now()) / DAY)) : 0;
}

export function hasUnlocked(email: string): boolean { return read<boolean>(`unlocked:${email}`, false) || !!getVip(email); }
export function markUnlocked(email: string) { write(`unlocked:${email}`, true); }
/** What the next payment costs: the one-time unlock first, then the monthly fee. */
export const nextPrice = (email: string) => (hasUnlocked(email) ? VIP_PRICE : VIP_UNLOCK_PRICE);
/** VIPs earn 3x gems per chat message. */
export const typingGems = (email: string) => (isVip(email) ? 15 : 5);

/** Adds 30 days (stacking on any remaining time). */
export function extendVip(email: string): VipStatus {
  const cur = getVip(email);
  const base = cur && cur.expiresAt > Date.now() ? cur.expiresAt : Date.now();
  const next: VipStatus = {
    expiresAt: base + VIP_DAYS * DAY, autoRenew: cur?.autoRenew ?? true,
    since: cur && cur.expiresAt > Date.now() ? cur.since : Date.now(), months: (cur?.months ?? 0) + 1,
  };
  write(`status:${email}`, next);
  return next;
}
export function setAutoRenew(email: string, on: boolean) {
  const cur = getVip(email); if (cur) write(`status:${email}`, { ...cur, autoRenew: on });
}

export function getStyle(email: string): VipStyle { return { ...DEFAULT_STYLE, ...read<Partial<VipStyle>>(`style:${email}`, {}) }; }
export function saveStyle(email: string, s: VipStyle) { write(`style:${email}`, s); }

export function getRequests(): VipRequest[] { return read<VipRequest[]>('requests', []); }
export function addRequest(r: Omit<VipRequest, 'id' | 'votes' | 'at'>) {
  write('requests', [{ ...r, id: crypto.randomUUID(), votes: [r.by], at: Date.now() }, ...getRequests()].slice(0, 200));
}
export function toggleVote(id: string, email: string) {
  write('requests', getRequests().map(r => r.id !== id ? r
    : { ...r, votes: r.votes.includes(email) ? r.votes.filter(v => v !== email) : [...r.votes, email] }));
}
export function deleteRequest(id: string) { write('requests', getRequests().filter(r => r.id !== id)); }

const monthKey = () => new Date().toISOString().slice(0, 7);
export function hasGiveawayEntry(email: string) { return read<string[]>(`giveaway:${monthKey()}`, []).includes(email); }
export function enterGiveaway(email: string) {
  const list = read<string[]>(`giveaway:${monthKey()}`, []);
  if (!list.includes(email)) write(`giveaway:${monthKey()}`, [...list, email]);
}
export function giveawayCount() { return read<string[]>(`giveaway:${monthKey()}`, []).length; }

export function getVipOfMonth(): string { return read<string>(`votm:${monthKey()}`, ''); }
export function setVipOfMonth(email: string) { write(`votm:${monthKey()}`, email); }

export type VipPost = { id: string; title: string; body: string; at: number; kind: 'early' | 'bts' | 'event' };
export function getPosts(): VipPost[] { return read<VipPost[]>('posts', []); }
export function addPost(p: Omit<VipPost, 'id' | 'at'>) { write('posts', [{ ...p, id: crypto.randomUUID(), at: Date.now() }, ...getPosts()]); }
export function deletePost(id: string) { write('posts', getPosts().filter(p => p.id !== id)); }

/** Bonus multiplier for game rewards. */
export const vipBonus = (email: string) => (isVip(email) ? 1.25 : 1);

/** CSS for a VIP-styled name. */
export function nameStyle(s: VipStyle): CSSProperties {
  const grad = s.animation === 'rainbow'
    ? 'linear-gradient(90deg,#ff5f6d,#ffc371,#47e891,#3fa7ff,#c86bff,#ff5f6d)'
    : `linear-gradient(90deg,${s.color1},${s.color2},${s.color1})`;
  return {
    backgroundImage: grad, backgroundSize: '200% auto', WebkitBackgroundClip: 'text', backgroundClip: 'text',
    color: 'transparent', filter: s.glow ? `drop-shadow(0 0 6px ${s.color1}aa)` : undefined,
    animation: s.animation === 'shimmer' || s.animation === 'rainbow' ? 'vip-shimmer 3s linear infinite'
      : s.animation === 'pulse' ? 'vip-pulse 2s ease-in-out infinite' : undefined,
  };
}
