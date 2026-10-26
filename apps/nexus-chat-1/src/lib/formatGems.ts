// Metric prefixes: k (kilo), M (mega), G (giga), T (tera), P (peta), E (exa)
const PREFIXES = ['', 'k', 'M', 'G', 'T', 'P', 'E'];

export function formatGems(value: number | undefined | null): string {
  const n = Math.floor(Number(value) || 0);
  if (Math.abs(n) < 1000) return String(n);
  let tier = Math.min(Math.floor(Math.log10(Math.abs(n)) / 3), PREFIXES.length - 1);
  let scaled = n / 1000 ** tier;
  if (Math.abs(scaled) >= 999.95 && tier < PREFIXES.length - 1) { tier++; scaled = n / 1000 ** tier; }
  const text = scaled >= 100 ? scaled.toFixed(0) : scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(2);
  return `${parseFloat(text)}${PREFIXES[tier]}`;
}
