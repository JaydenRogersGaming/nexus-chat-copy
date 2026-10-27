/**
 * Gem number formatting.
 *
 * Infinity is detected FIRST, before any suffix logic, so it can never become "1b".
 * Saved data can't hold a real Infinity (JSON turns it into null), so "infinite gems"
 * are stored as INFINITE_GEMS (Number.MAX_VALUE) and displayed as ∞.
 */
export const INFINITE_GEMS = Number.MAX_VALUE;

export type GemFormatMode = 'game' | 'si';

/** Game-style short-scale suffixes (k = thousand, m = million, b = billion…). */
const GAME = ['', 'k', 'm', 'b', 't', 'q', 'Qn', 'sx', 'sp', 'oc', 'no', 'dc'];
/** Official SI prefixes, 10^3 … 10^30, exact capitalization. */
const SI = ['', 'k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y', 'R', 'Q'];
const MINUS = '−'; // U+2212

export function isInfiniteGems(value: unknown): boolean {
  const n = typeof value === 'number' ? value : Number(value);
  return n === Infinity || n === -Infinity || Math.abs(n) >= INFINITE_GEMS;
}

/** Suffix for the n-th power of 1,000 in game mode (kept for older callers). */
export function tierSymbol(tier: number): string {
  return GAME[tier] ?? `e${tier * 3}`;
}

/** Up to 2 decimals below 10, 1 below 100, none above; trailing zeros removed. */
function trim(x: number): string {
  const d = x >= 100 ? 0 : x >= 10 ? 1 : 2;
  const f = Math.floor(x * 10 ** d) / 10 ** d; // truncate so 999.99k never shows as 1000k
  return String(parseFloat(f.toFixed(d)));
}

export function formatGems(value: number | string | undefined | null, mode: GemFormatMode = 'game'): string {
  if (value === null || value === undefined || value === '') return '0';
  const num = typeof value === 'number' ? value : Number(value);
  // 1. Infinity before anything else.
  if (num === Infinity || num >= INFINITE_GEMS) return '∞';
  if (num === -Infinity || num <= -INFINITE_GEMS) return `${MINUS}∞`;
  // 2. Invalid values.
  if (Number.isNaN(num)) return '0';

  const sign = num < 0 ? MINUS : '';
  const abs = Math.abs(num);
  if (abs < 1000) return sign + String(Math.floor(abs));

  const table = mode === 'si' ? SI : GAME;
  let tier = Math.floor(Math.log10(abs) / 3);
  // Guard against floating-point log10 rounding at exact boundaries.
  if (abs < 10 ** (tier * 3)) tier--;
  if (abs >= 10 ** ((tier + 1) * 3)) tier++;

  if (tier >= table.length) {
    // Beyond the suffix table: scientific notation, never a misleading suffix.
    const exp = Math.floor(Math.log10(abs));
    return `${sign}${trim(abs / 10 ** exp)}e${exp}`;
  }
  return `${sign}${trim(abs / 10 ** (tier * 3))}${table[tier]}`;
}
