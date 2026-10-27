// Run: npx tsx tests/formatGems.test.ts
import assert from 'node:assert/strict';
import { formatGems, INFINITE_GEMS, isInfiniteGems } from '../src/lib/formatGems';

const eq = (v: unknown, want: string, mode?: 'game' | 'si') =>
  assert.equal(formatGems(v as number, mode), want, `formatGems(${String(v)}, ${mode ?? 'game'})`);

// Infinity — must never look like a finite suffix
eq(Infinity, '∞');
eq(-Infinity, '−∞');
eq(INFINITE_GEMS, '∞');
eq(-INFINITE_GEMS, '−∞');
eq('Infinity', '∞');
eq(Infinity, '∞', 'si');
eq(-Infinity, '−∞', 'si');
for (const v of [Infinity, INFINITE_GEMS]) {
  assert.notEqual(formatGems(v), '1b');
  assert.ok(!/[0-9]/.test(formatGems(v)), 'infinity must have no digits');
}
assert.ok(isInfiniteGems(Infinity) && isInfiniteGems(-Infinity) && isInfiniteGems(INFINITE_GEMS));
assert.ok(!isInfiniteGems(999_999_999) && !isInfiniteGems(1e300));
// The old "infinite" grant value is a real number, so it is NOT infinity
eq(999_999_999, '999.99m');

// Zero, small, invalid
eq(0, '0'); eq(-0, '0'); eq(7, '7'); eq(999, '999'); eq(12.9, '12');
eq(NaN, '0'); eq(undefined, '0'); eq(null, '0'); eq('', '0'); eq('abc', '0');

// Game-style boundaries
eq(1_000, '1k');
eq(999_999, '999.9k');
eq(1_000_000, '1m');
eq(1_000_000_000, '1b');
eq(1e12, '1t');
eq(1e15, '1q');
eq(1e18, '1Qn');
eq(1_500, '1.5k'); eq(12_340, '12.3k'); eq(123_456, '123k'); eq(2_500_000, '2.5m');

// SI boundaries — official symbols & capitalization
const si: [number, string][] = [[1e3, '1k'], [1e6, '1M'], [1e9, '1G'], [1e12, '1T'], [1e15, '1P'],
  [1e18, '1E'], [1e21, '1Z'], [1e24, '1Y'], [1e27, '1R'], [1e30, '1Q']];
for (const [v, want] of si) eq(v, want, 'si');
eq(1_500_000, '1.5M', 'si');

// Negatives use a real minus sign
eq(-1_000, '−1k'); eq(-2_500_000, '−2.5m'); eq(-5, '−5'); eq(-1e9, '−1G', 'si');

// Very large finite values fall back to scientific notation, never ∞
eq(1e40, '1e40'); eq(1e300, '1e300'); eq(1e33, '1e33', 'si');

console.log('formatGems: all tests passed');
