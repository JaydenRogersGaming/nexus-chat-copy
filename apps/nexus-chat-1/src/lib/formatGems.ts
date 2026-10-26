// Short-scale suffixes: k = thousand, m = million, b = billion, t = trillion, …
const NAMES = ['', 'k', 'm', 'b', 't', 'qa', 'qi', 'sx', 'sp', 'oc', 'no', 'dc', 'ud', 'dd', 'td', 'qad', 'qid', 'sxd', 'spd', 'ocd', 'nod', 'vg', 'uvg', 'dvg', 'tvg', 'qavg', 'qivg', 'sxvg', 'spvg', 'ocvg', 'novg', 'tg', 'utg', 'dtg'];
const GOOGOL = 100; // 10^100 → "g"

/** Suffix for the n-th power of 1,000 (tier 1 = thousand). */
export function tierSymbol(tier: number): string {
  return NAMES[tier] ?? `e${tier * 3}`;
}

function trim(scaled: number) {
  const a = Math.abs(scaled);
  return parseFloat(a >= 100 ? scaled.toFixed(0) : a >= 10 ? scaled.toFixed(1) : scaled.toFixed(2));
}

export function formatGems(value: number | undefined | null): string {
  const num = Number(value);
  if (num === Infinity) return '∞';
  if (num === -Infinity) return '-∞';
  if (!Number.isFinite(num)) return '0';
  const n = Math.floor(num);
  if (Math.abs(n) < 1000) return String(n);
  const exp = Math.log10(Math.abs(n));
  // Googol and up: show as "g" (1g = 10^100)
  if (exp >= GOOGOL) {
    const g = n / 10 ** GOOGOL;
    return Math.abs(g) < 1000 ? `${trim(g)}g` : `${formatGems(g)}g`;
  }
  let tier = Math.floor(exp / 3);
  let scaled = n / 10 ** (tier * 3);
  if (Math.abs(scaled) >= 999.95) { tier++; scaled = n / 10 ** (tier * 3); }
  if (tier * 3 >= GOOGOL) return `${trim(n / 10 ** GOOGOL)}g`;
  return `${trim(scaled)}${tierSymbol(tier)}`;
}
