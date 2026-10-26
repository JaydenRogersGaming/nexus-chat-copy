// Official SI prefixes, kilo (10^3) through quetta (10^30).
const SI = ['', 'k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y', 'R', 'Q'];

/**
 * Symbol for the n-th power of 1,000 (tier 1 = 10^3).
 * Tiers 1–10 use official SI symbols. Beyond quetta (10^30) the app uses an
 * invented, non-standard sequence of two-plus lowercase letters:
 * aa, ab, … az, ba, … zz, aaa, … — it never runs out.
 */
export function tierSymbol(tier: number): string {
  if (tier < SI.length) return SI[tier];
  let n = tier - SI.length; // 0 → "aa"
  let len = 2;
  let block = 26 ** len;
  while (n >= block) { n -= block; len++; block = 26 ** len; }
  let s = '';
  for (let i = 0; i < len; i++) { s = String.fromCharCode(97 + (n % 26)) + s; n = Math.floor(n / 26); }
  return s;
}

export function formatGems(value: number | undefined | null): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  const n = Math.floor(num);
  if (Math.abs(n) < 1000) return String(n);
  let tier = Math.floor(Math.log10(Math.abs(n)) / 3);
  let scaled = n / 10 ** (tier * 3);
  if (Math.abs(scaled) >= 999.95) { tier++; scaled = n / 10 ** (tier * 3); }
  const text = Math.abs(scaled) >= 100 ? scaled.toFixed(0) : Math.abs(scaled) >= 10 ? scaled.toFixed(1) : scaled.toFixed(2);
  return `${parseFloat(text)}${tierSymbol(tier)}`;
}
