import { useState } from 'react';
import { Button } from '@project/components/ui/button';
import { Slider } from '@project/components/ui/slider';
import * as DB from '../lib/storage';

/** settle(gameName, payout) — page deducts bet up front and records the result. Returns false if bet invalid. */
export type Settle = { start: () => boolean; finish: (game: string, payout: number) => void; bet: number; disabled: boolean };

function Result({ r }: { r: { win: boolean; text: string } | null }) {
  if (!r) return null;
  return <div className={`p-3 rounded-xl text-center text-sm font-semibold border ${r.win ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-destructive/10 text-destructive border-destructive/30'}`}>{r.text}</div>;
}
const rigged = () => DB.getGambleRig();
const wrap = 'bg-card border border-border rounded-2xl p-6 space-y-4';

// ── Dice: roll over/under target ──
export function DiceGame({ s }: { s: Settle }) {
  const [target, setTarget] = useState(50);
  const [over, setOver] = useState(true);
  const [roll, setRoll] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ win: boolean; text: string } | null>(null);
  const chance = over ? 100 - target : target - 1;
  const mult = Math.max(1.01, +(97 / chance).toFixed(2));
  function play() {
    if (!s.start()) return;
    setBusy(true); setRes(null);
    let t = 0;
    const iv = setInterval(() => {
      setRoll(1 + Math.floor(Math.random() * 100));
      if (++t > 12) {
        clearInterval(iv);
        const rig = rigged();
        let n = 1 + Math.floor(Math.random() * 100);
        const isWin = (x: number) => over ? x > target : x < target;
        if (rig === 'win' || rig === 'jackpot') while (!isWin(n)) n = 1 + Math.floor(Math.random() * 100);
        if (rig === 'lose') while (isWin(n)) n = 1 + Math.floor(Math.random() * 100);
        setRoll(n);
        const payout = isWin(n) ? Math.floor(s.bet * mult) : 0;
        setRes({ win: payout > 0, text: payout > 0 ? `🎲 Rolled ${n}! +${payout.toLocaleString()} gems` : `🎲 Rolled ${n}. You lose!` });
        s.finish('Dice', payout); setBusy(false);
      }
    }, 60);
  }
  return (
    <div className={wrap}>
      <div className="text-center text-6xl font-black tabular-nums">{roll ?? '🎲'}</div>
      <div className="flex gap-2">
        {[true, false].map(o => (
          <button key={String(o)} onClick={() => setOver(o)} className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold ${over === o ? 'border-primary bg-primary/20 text-primary' : 'border-border'}`}>
            {o ? `⬆️ Over ${target}` : `⬇️ Under ${target}`}
          </button>
        ))}
      </div>
      <Slider min={5} max={95} step={1} value={[target]} onValueChange={v => setTarget(v[0])} />
      <p className="text-xs text-muted-foreground text-center">Win chance {chance}% · Payout <span className="text-green-400 font-bold">{mult}x</span></p>
      <Result r={res} />
      <Button className="w-full h-12" onClick={play} disabled={busy || s.disabled}>{busy ? 'Rolling…' : `🎲 Roll for ${s.bet.toLocaleString()} gems`}</Button>
    </div>
  );
}

// ── Roulette: red / black / green ──
const REDS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const colorOf = (n: number) => n === 0 ? 'green' : REDS.has(n) ? 'red' : 'black';
export function RouletteGame({ s }: { s: Settle }) {
  const [pick, setPick] = useState<'red' | 'black' | 'green'>('red');
  const [num, setNum] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ win: boolean; text: string } | null>(null);
  function play() {
    if (!s.start()) return;
    setBusy(true); setRes(null);
    let t = 0;
    const iv = setInterval(() => {
      setNum(Math.floor(Math.random() * 37));
      if (++t > 20) {
        clearInterval(iv);
        const rig = rigged();
        let n = Math.floor(Math.random() * 37);
        if (rig === 'win' || rig === 'jackpot') while (colorOf(n) !== pick) n = Math.floor(Math.random() * 37);
        if (rig === 'lose') while (colorOf(n) === pick) n = Math.floor(Math.random() * 37);
        setNum(n);
        const payout = colorOf(n) === pick ? s.bet * (pick === 'green' ? 14 : 2) : 0;
        setRes({ win: payout > 0, text: `${n} ${colorOf(n).toUpperCase()}! ${payout ? `+${payout.toLocaleString()} gems` : 'You lose!'}` });
        s.finish('Roulette', payout); setBusy(false);
      }
    }, 70);
  }
  const bg = num === null ? 'bg-secondary' : colorOf(num) === 'red' ? 'bg-red-600' : colorOf(num) === 'black' ? 'bg-zinc-900' : 'bg-green-600';
  return (
    <div className={wrap}>
      <div className="flex justify-center"><div className={`w-28 h-28 rounded-full border-4 border-yellow-500/60 flex items-center justify-center text-4xl font-black text-white shadow-xl ${bg} ${busy ? 'animate-pulse' : ''}`}>{num ?? '🎡'}</div></div>
      <div className="flex gap-2">
        {(['red', 'black', 'green'] as const).map(c => (
          <button key={c} onClick={() => setPick(c)} className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold text-white ${c === 'red' ? 'bg-red-600/70' : c === 'black' ? 'bg-zinc-800' : 'bg-green-600/70'} ${pick === c ? 'border-primary ring-2 ring-primary' : 'border-transparent'}`}>
            {c === 'green' ? 'Green 14x' : `${c[0].toUpperCase() + c.slice(1)} 2x`}
          </button>
        ))}
      </div>
      <Result r={res} />
      <Button className="w-full h-12" onClick={play} disabled={busy || s.disabled}>{busy ? 'Spinning…' : `🎡 Spin for ${s.bet.toLocaleString()} gems`}</Button>
    </div>
  );
}

// ── Higher or Lower (cards) ──
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const SUITS = ['♠','♥','♦','♣'];
const draw = () => ({ r: 1 + Math.floor(Math.random() * 13), s: SUITS[Math.floor(Math.random() * 4)] });
export function HigherLowerGame({ s }: { s: Settle }) {
  const [card, setCard] = useState(draw);
  const [next, setNext] = useState<ReturnType<typeof draw> | null>(null);
  const [res, setRes] = useState<{ win: boolean; text: string } | null>(null);
  function guess(higher: boolean) {
    if (!s.start()) return;
    const rig = rigged();
    const ok = (c: { r: number }) => higher ? c.r > card.r : c.r < card.r;
    let n = draw(); let tries = 0;
    if (rig === 'win' || rig === 'jackpot') while (!ok(n) && tries++ < 200) n = draw();
    if (rig === 'lose') while (ok(n) && tries++ < 200) n = draw();
    setNext(n);
    const odds = higher ? 13 - card.r : card.r - 1;
    const mult = odds > 0 ? Math.max(1.1, +(12 / odds * 0.95).toFixed(2)) : 0;
    const payout = ok(n) ? Math.floor(s.bet * mult) : 0;
    setRes({ win: payout > 0, text: payout ? `✅ Correct! +${payout.toLocaleString()} gems (${mult}x)` : n.r === card.r ? '🤝 Tie — house wins!' : '❌ Wrong!' });
    s.finish('Higher/Lower', payout);
    setTimeout(() => { setCard(n); setNext(null); }, 1400);
  }
  const Card = ({ c }: { c: ReturnType<typeof draw> }) => (
    <div className={`w-20 h-28 rounded-xl bg-white border-2 border-border flex flex-col items-center justify-center text-2xl font-black shadow-lg ${c.s === '♥' || c.s === '♦' ? 'text-red-600' : 'text-zinc-900'}`}>
      {RANKS[c.r - 1]}<span>{c.s}</span>
    </div>
  );
  return (
    <div className={wrap}>
      <div className="flex justify-center items-center gap-4">
        <Card c={card} />
        <span className="text-2xl">→</span>
        {next ? <Card c={next} /> : <div className="w-20 h-28 rounded-xl bg-secondary border-2 border-dashed border-border flex items-center justify-center text-3xl">❓</div>}
      </div>
      <Result r={res} />
      <p className="text-xs text-muted-foreground text-center">Guess if the next card is higher or lower. Riskier guesses pay more. Ties lose.</p>
      <div className="flex gap-2">
        <Button className="flex-1 h-12" onClick={() => guess(true)} disabled={!!next || s.disabled || card.r === 13}>⬆️ Higher</Button>
        <Button className="flex-1 h-12" variant="secondary" onClick={() => guess(false)} disabled={!!next || s.disabled || card.r === 1}>⬇️ Lower</Button>
      </div>
    </div>
  );
}

// ── Prize Wheel ──
const WHEEL = [0, 0.5, 1.5, 0, 2, 0.5, 3, 0, 1.5, 5, 0.5, 10];
export function WheelGame({ s }: { s: Settle }) {
  const [rot, setRot] = useState(0);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ win: boolean; text: string } | null>(null);
  function spin() {
    if (!s.start()) return;
    setBusy(true); setRes(null);
    const rig = rigged();
    let idx = Math.floor(Math.random() * WHEEL.length);
    if (rig === 'jackpot') idx = WHEEL.indexOf(10);
    else if (rig === 'win') while (WHEEL[idx] < 1.5) idx = Math.floor(Math.random() * WHEEL.length);
    else if (rig === 'lose') while (WHEEL[idx] !== 0) idx = Math.floor(Math.random() * WHEEL.length);
    const seg = 360 / WHEEL.length;
    setRot(r => r - (r % 360) + 360 * 5 + (360 - idx * seg - seg / 2));
    setTimeout(() => {
      const payout = Math.floor(s.bet * WHEEL[idx]);
      setRes({ win: payout > s.bet, text: `🎡 ${WHEEL[idx]}x! ${payout ? `+${payout.toLocaleString()} gems` : 'Nothing!'}` });
      s.finish('Wheel', payout); setBusy(false);
    }, 3200);
  }
  const colors = ['#7c3aed', '#db2777', '#0891b2', '#16a34a', '#ea580c', '#ca8a04'];
  const grad = WHEEL.map((_, i) => `${colors[i % colors.length]} ${i * 30}deg ${(i + 1) * 30}deg`).join(',');
  return (
    <div className={wrap}>
      <div className="relative mx-auto w-56 h-56">
        <div className="absolute left-1/2 -top-2 -translate-x-1/2 z-10 text-2xl">🔻</div>
        <div className="w-full h-full rounded-full border-4 border-yellow-500/60 shadow-xl relative" style={{ background: `conic-gradient(${grad})`, transform: `rotate(${rot}deg)`, transition: 'transform 3s cubic-bezier(.17,.67,.2,1)' }}>
          {WHEEL.map((m, i) => (
            <span key={i} className="absolute left-1/2 top-1/2 text-[11px] font-black text-white" style={{ transform: `rotate(${i * 30 + 15}deg) translateY(-90px) translateX(-50%)` }}>{m}x</span>
          ))}
        </div>
      </div>
      <Result r={res} />
      <Button className="w-full h-12" onClick={spin} disabled={busy || s.disabled}>{busy ? 'Spinning…' : `🎡 Spin for ${s.bet.toLocaleString()} gems`}</Button>
    </div>
  );
}
