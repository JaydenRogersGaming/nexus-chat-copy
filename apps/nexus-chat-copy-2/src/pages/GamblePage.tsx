import { formatGems } from '../lib/formatGems';
import { useState, useEffect } from 'react';
import { Gem, TrendingUp, TrendingDown, RotateCcw } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { toast } from 'sonner';
import { DiceGame, RouletteGame, HigherLowerGame, WheelGame, Settle } from '../components/CasinoGames';
import DailyLottery from '../components/DailyLottery';
import WeeklyTitles from '../components/WeeklyTitles';

const SLOTS = ['💎','🎰','🍒','🍋','⭐','💀','🎲','👑','🌙','🔥'];

type HistoryEntry = { type: string; bet: number; result: number; win: boolean; timestamp: number };

function resolveSlotOutcome(rig: DB.GambleRig, betNum: number): { final: string[]; payout: number; msg: string } {
  if (rig === 'jackpot') {
    const sym = SLOTS[Math.floor(Math.random() * SLOTS.length)];
    return { final: [sym, sym, sym], payout: betNum * 10, msg: `🎉 JACKPOT! Triple ${sym}! 10x win!` };
  }
  if (rig === 'win') {
    const a = SLOTS[Math.floor(Math.random() * SLOTS.length)];
    const b = SLOTS[Math.floor(Math.random() * SLOTS.length)];
    return { final: [a, a, b], payout: betNum * 2, msg: '✌️ Pair! 2x win!' };
  }
  if (rig === 'lose') {
    // Ensure no matching pairs
    let f: string[];
    do { f = [SLOTS[Math.floor(Math.random()*SLOTS.length)], SLOTS[Math.floor(Math.random()*SLOTS.length)], SLOTS[Math.floor(Math.random()*SLOTS.length)]]; }
    while (f[0]===f[1] || f[1]===f[2] || f[0]===f[2]);
    return { final: f, payout: 0, msg: '😢 No luck this time…' };
  }
  // Normal
  const final = [SLOTS[Math.floor(Math.random()*SLOTS.length)], SLOTS[Math.floor(Math.random()*SLOTS.length)], SLOTS[Math.floor(Math.random()*SLOTS.length)]];
  let payout = 0; let msg = '';
  if (final[0]===final[1] && final[1]===final[2]) { payout = betNum * 10; msg = `🎉 JACKPOT! Triple ${final[0]}! 10x win!`; }
  else if (final[0]===final[1] || final[1]===final[2] || final[0]===final[2]) { payout = betNum * 2; msg = '✌️ Pair! 2x win!'; }
  else if (Math.random() < 0.35) { payout = Math.floor(betNum * 1.5); msg = '😊 Small win! 1.5x'; }
  else { msg = '😢 No luck this time…'; }
  return { final, payout, msg };
}

function resolveCoinOutcome(rig: DB.GambleRig, choice: 'heads' | 'tails'): 'heads' | 'tails' {
  if (rig === 'jackpot' || rig === 'win') return choice;
  if (rig === 'lose') return choice === 'heads' ? 'tails' : 'heads';
  return Math.random() < 0.5 ? 'heads' : 'tails';
}

export default function GamblePage() {
  const { profile, addGems, updateProfile, checkAchievements } = useApp();
  const [bet, setBet] = useState('50');
  const [slots, setSlots] = useState(['❓','❓','❓']);
  const [spinning, setSpinning] = useState(false);
  const [slotResult, setSlotResult] = useState<null | { win: boolean; amount: number; message: string }>(null);
  const [coinSide, setCoinSide] = useState<null | 'heads' | 'tails'>(null);
  const [coinFlipping, setCoinFlipping] = useState(false);
  const [coinChoice, setCoinChoice] = useState<'heads' | 'tails'>('heads');
  const [coinResult, setCoinResult] = useState<null | { win: boolean; amount: number; side: string }>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [rig, setRig] = useState<DB.GambleRig>('normal');

  useEffect(() => { setRig(DB.getGambleRig()); }, []);

  if (!profile) return null;

  function addHistory(entry: HistoryEntry) { setHistory(h => [entry, ...h].slice(0, 15)); }

  const betNum = parseInt(bet) || 0;

  // ── Slots ──────────────────────────────────────────────────
  function spinSlots() {
    if (betNum <= 0 || (betNum > profile!.gems)) { toast.error(betNum <= 0 ? 'Enter a valid bet' : 'Not enough gems!'); return; }
    setSpinning(true); setSlotResult(null);
    addGems(-betNum);
    let ticks = 0;
    const currentRig = DB.getGambleRig();
    const iv = setInterval(() => {
      setSlots([SLOTS[Math.floor(Math.random()*SLOTS.length)], SLOTS[Math.floor(Math.random()*SLOTS.length)], SLOTS[Math.floor(Math.random()*SLOTS.length)]]);
      if (++ticks > 18) {
        clearInterval(iv);
        const { final, payout, msg } = resolveSlotOutcome(currentRig, betNum);
        setSlots(final);
        if (payout > 0) addGems(payout);
        const didWin = payout > 0;
        const p = DB.getUser(profile!.email)!;
        const streak = didWin ? 0 : p.gambleLoseStreak + 1;
        const up = { ...p, gambleCount: p.gambleCount+1, gambleWins: p.gambleWins+(didWin?1:0), gambleLoseStreak: streak };
        DB.saveUser(up); updateProfile(up);
        setSlotResult({ win: didWin, amount: payout, message: msg });
        addHistory({ type: 'Slots', bet: betNum, result: payout - betNum, win: didWin, timestamp: Date.now() });
        DB.incrementQuestProgress(profile!.email, 'gamble_3');
        setSpinning(false); setTimeout(checkAchievements, 300);
      }
    }, 70);
  }

  // ── Coin Flip ─────────────────────────────────────────────
  function flipCoin() {
    if (betNum <= 0 || (betNum > profile!.gems)) { toast.error(betNum <= 0 ? 'Enter a valid bet' : 'Not enough gems!'); return; }
    setCoinFlipping(true); setCoinResult(null); setCoinSide(null);
    addGems(-betNum);
    setTimeout(() => {
      const currentRig = DB.getGambleRig();
      const result = resolveCoinOutcome(currentRig, coinChoice);
      setCoinSide(result);
      const didWin = result === coinChoice;
      const payout = didWin ? betNum * 2 : 0;
      if (payout > 0) addGems(payout);
      const p = DB.getUser(profile!.email)!;
      const streak = didWin ? 0 : p.gambleLoseStreak + 1;
      const up = { ...p, gambleCount: p.gambleCount+1, gambleWins: p.gambleWins+(didWin?1:0), gambleLoseStreak: streak };
      DB.saveUser(up); updateProfile(up);
      setCoinResult({ win: didWin, amount: payout, side: result });
      addHistory({ type: 'Coin Flip', bet: betNum, result: payout - betNum, win: didWin, timestamp: Date.now() });
      DB.incrementQuestProgress(profile!.email, 'gamble_3');
      setCoinFlipping(false); setTimeout(checkAchievements, 300);
    }, 1200);
  }

  const settle: Settle = {
    bet: betNum,
    disabled: betNum <= 0 || (betNum > profile.gems),
    start: () => {
      if (betNum <= 0 || (betNum > profile!.gems)) { toast.error(betNum <= 0 ? 'Enter a valid bet' : 'Not enough gems!'); return false; }
      addGems(-betNum);
      return true;
    },
    finish: (game, payout) => {
      if (payout > 0) addGems(payout);
      const didWin = payout > betNum;
      const p = DB.getUser(profile!.email)!;
      const up = { ...p, gambleCount: p.gambleCount + 1, gambleWins: p.gambleWins + (didWin ? 1 : 0), gambleLoseStreak: didWin ? 0 : p.gambleLoseStreak + 1 };
      DB.saveUser(up); updateProfile(up);
      addHistory({ type: game, bet: betNum, result: payout - betNum, win: didWin, timestamp: Date.now() });
      DB.incrementQuestProgress(profile!.email, 'gamble_3');
      setTimeout(checkAchievements, 300);
    },
  };

  const winRate = profile.gambleCount > 0 ? Math.round((profile.gambleWins / profile.gambleCount) * 100) : 0;

  const RIG_LABELS: Record<DB.GambleRig, string> = {
    normal: '🎲 Fair',
    win:    '✅ Rigged — Win',
    jackpot:'🏆 Rigged — Jackpot',
    lose:   '❌ Rigged — Lose',
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 h-full overflow-y-auto">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">🎰</div>
        <h1 className="text-2xl font-black">Gem Casino</h1>
        <p className="text-muted-foreground text-sm">Bet your gems, win big (or lose it all)</p>
        {rig !== 'normal' && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-xs text-yellow-400 font-semibold">
            ⚠️ {RIG_LABELS[rig]}
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <DailyLottery />
        <WeeklyTitles />
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <Gem className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <p className="text-lg font-black text-purple-300">{formatGems(profile.gems)}</p>
          <p className="text-[10px] text-muted-foreground">Gems</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-1" />
          <p className="text-lg font-black text-green-400">{winRate}%</p>
          <p className="text-[10px] text-muted-foreground">Win Rate</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <RotateCcw className="w-5 h-5 text-blue-400 mx-auto mb-1" />
          <p className="text-lg font-black">{profile.gambleCount}</p>
          <p className="text-[10px] text-muted-foreground">Total Gambles</p>
        </div>
      </div>

      {/* Bet Input */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <Label className="text-sm font-semibold">Bet Amount</Label>
        <div className="flex gap-2 mt-2">
          <Input type="number" value={bet} onChange={e => setBet(e.target.value)} className="flex-1 text-lg font-bold" min={1} max={profile.gems} />
          <Button variant="outline" size="sm" onClick={() => setBet('10')}>10</Button>
          <Button variant="outline" size="sm" onClick={() => setBet('100')}>100</Button>
          <Button variant="outline" size="sm" onClick={() => setBet(String(Math.floor(profile.gems / 2)))}>½</Button>
          <Button variant="outline" size="sm" onClick={() => setBet(String(profile.gems))}>Max</Button>
        </div>
        {betNum > profile.gems && <p className="text-destructive text-xs mt-1">Not enough gems! You have {formatGems(profile.gems)}</p>}
      </div>

      <Tabs defaultValue="slots">
        <TabsList className="w-full mb-4 flex-wrap h-auto">
          <TabsTrigger value="slots" className="flex-1">🎰 Slots</TabsTrigger>
          <TabsTrigger value="coin" className="flex-1">🪙 Coin</TabsTrigger>
          <TabsTrigger value="dice" className="flex-1">🎲 Dice</TabsTrigger>
          <TabsTrigger value="roulette" className="flex-1">🔴 Roulette</TabsTrigger>
          <TabsTrigger value="hilo" className="flex-1">🃏 Hi-Lo</TabsTrigger>
          <TabsTrigger value="wheel" className="flex-1">🎡 Wheel</TabsTrigger>
          <TabsTrigger value="history" className="flex-1">📜 History</TabsTrigger>
        </TabsList>
        <TabsContent value="dice"><DiceGame s={settle} /></TabsContent>
        <TabsContent value="roulette"><RouletteGame s={settle} /></TabsContent>
        <TabsContent value="hilo"><HigherLowerGame s={settle} /></TabsContent>
        <TabsContent value="wheel"><WheelGame s={settle} /></TabsContent>

        <TabsContent value="slots">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex justify-center gap-4">
              {slots.map((s, i) => (
                <div key={i} className="w-20 h-20 bg-secondary rounded-2xl flex items-center justify-center text-4xl border-2 border-border shadow-inner">
                  <span className={spinning ? 'animate-bounce' : 'transition-all'}>{s}</span>
                </div>
              ))}
            </div>
            {slotResult && (
              <div className={`p-3 rounded-xl text-center text-sm font-semibold border ${slotResult.win ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-destructive/10 text-destructive border-destructive/30'}`}>
                {slotResult.message}
                {slotResult.win && <div className="text-xs mt-1 flex items-center justify-center gap-1">+{slotResult.amount.toLocaleString()} <Gem className="w-3 h-3" /></div>}
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center">Triple → <span className="text-yellow-400 font-bold">10x</span> · Pair → <span className="text-green-400 font-bold">2x</span> · Lucky → <span className="text-blue-400 font-bold">1.5x</span></p>
            <Button className="w-full text-base h-12" onClick={spinSlots} disabled={spinning || betNum <= 0 || (betNum > profile.gems)}>
              {spinning ? '🎰 Spinning…' : `🎰 Spin for ${betNum.toLocaleString()} gems`}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="coin">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex justify-center">
              <div className={`w-28 h-28 rounded-full border-4 flex items-center justify-center text-5xl shadow-xl transition-all ${coinFlipping ? 'animate-spin border-yellow-400/50' : 'border-border'}`}
                style={{ background: coinSide === 'heads' ? 'radial-gradient(circle, hsl(var(--primary)/0.3), hsl(var(--card)))' : coinSide === 'tails' ? 'radial-gradient(circle, hsl(var(--secondary)), hsl(var(--card)))' : undefined }}>
                {coinFlipping ? '🪙' : coinSide === 'heads' ? '👑' : coinSide === 'tails' ? '🌀' : '🪙'}
              </div>
            </div>
            {coinResult && (
              <div className={`p-3 rounded-xl text-center text-sm font-semibold border ${coinResult.win ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-destructive/10 text-destructive border-destructive/30'}`}>
                {coinResult.side.toUpperCase()}! {coinResult.win ? `🎉 You win ${coinResult.amount.toLocaleString()} gems!` : '😢 You lose!'}
              </div>
            )}
            <div>
              <Label className="text-sm font-semibold">Your Pick</Label>
              <div className="flex gap-3 mt-2">
                {(['heads','tails'] as const).map(side => (
                  <button key={side} onClick={() => setCoinChoice(side)} className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-colors ${coinChoice === side ? 'border-primary bg-primary/20 text-primary' : 'border-border hover:border-border/80'}`}>
                    {side === 'heads' ? '👑 Heads' : '🌀 Tails'}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">50/50 chance · Win = 2x your bet</p>
            <Button className="w-full text-base h-12" onClick={flipCoin} disabled={coinFlipping || betNum <= 0 || (betNum > profile.gems)}>
              {coinFlipping ? '🪙 Flipping…' : `🪙 Flip for ${betNum.toLocaleString()} gems`}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
            {history.length === 0 && <p className="text-center text-muted-foreground py-6">No gambles yet. Start playing!</p>}
            {history.map((h, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/30 border border-border">
                <span className="text-lg">{({ Slots: '🎰', 'Coin Flip': '🪙', Dice: '🎲', Roulette: '🔴', 'Higher/Lower': '🃏', Wheel: '🎡' } as Record<string, string>)[h.type] ?? '🎲'}</span>
                <div className="flex-1"><p className="text-xs font-semibold">{h.type}</p><p className="text-[10px] text-muted-foreground">Bet: {h.bet.toLocaleString()} gems</p></div>
                <div className={`flex items-center gap-1 font-bold text-sm ${h.win ? 'text-green-400' : 'text-destructive'}`}>
                  {h.win ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {h.result >= 0 ? '+' : ''}{h.result.toLocaleString()}
                  <Gem className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
        <p className="text-xs text-yellow-500/80 text-center">⚠️ Gamble responsibly. Gems are virtual and have no real-world value.</p>
      </div>
    </div>
  );
}
