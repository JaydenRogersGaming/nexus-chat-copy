import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Gem } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { toast } from 'sonner';

type Props = { open: boolean; onClose: () => void };

const SLOTS = ['💎','🎰','🍒','🍋','⭐','💀','🎲','👑'];

export default function GambleModal({ open, onClose }: Props) {
  const { profile, addGems, updateProfile, checkAchievements } = useApp();
  const [bet, setBet] = useState('50');
  const [spinning, setSpinning] = useState(false);
  const [slots, setSlots] = useState(['❓','❓','❓']);
  const [result, setResult] = useState<null | { win: boolean; amount: number; message: string }>(null);

  if (!profile) return null;

  function spin() {
    const amount = parseInt(bet);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid bet'); return; }
    if (amount > profile!.gems) { toast.error('Not enough gems!'); return; }
    setSpinning(true); setResult(null);
    addGems(-amount);

    let ticks = 0;
    const interval = setInterval(() => {
      setSlots([SLOTS[Math.floor(Math.random()*SLOTS.length)], SLOTS[Math.floor(Math.random()*SLOTS.length)], SLOTS[Math.floor(Math.random()*SLOTS.length)]]);
      ticks++;
      if (ticks > 15) {
        clearInterval(interval);
        const finalSlots = [SLOTS[Math.floor(Math.random()*SLOTS.length)], SLOTS[Math.floor(Math.random()*SLOTS.length)], SLOTS[Math.floor(Math.random()*SLOTS.length)]];
        setSlots(finalSlots);
        const win = Math.random() < 0.4;
        let payout = 0;
        let msg = '';
        if (finalSlots[0] === finalSlots[1] && finalSlots[1] === finalSlots[2]) { payout = amount * 5; msg = `JACKPOT! Triple ${finalSlots[0]}! 🎉`; }
        else if (finalSlots[0] === finalSlots[1] || finalSlots[1] === finalSlots[2]) { payout = amount * 2; msg = 'Pair! You doubled up! 🙌'; }
        else if (win) { payout = Math.floor(amount * 1.5); msg = 'Lucky! Small win 😊'; }
        else { msg = 'No luck this time 😢'; }
        if (payout > 0) addGems(payout);

        const p = DB.getUser(profile!.email)!;
        const didWin = payout > 0;
        const newStreak = didWin ? 0 : p.gambleLoseStreak + 1;
        const updated = { ...p, gambleCount: p.gambleCount + 1, gambleWins: p.gambleWins + (didWin ? 1 : 0), gambleLoseStreak: newStreak };
        DB.saveUser(updated); updateProfile(updated);
        setResult({ win: didWin, amount: payout, message: msg });
        setSpinning(false);
        setTimeout(checkAchievements, 300);
      }
    }, 80);
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader><DialogTitle className="text-center">🎰 Gem Gambler</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="flex justify-center gap-3">
            {slots.map((s, i) => (
              <div key={i} className="w-16 h-16 bg-secondary rounded-xl flex items-center justify-center text-3xl border-2 border-border shadow-inner">
                <span className={spinning ? 'animate-bounce' : ''}>{s}</span>
              </div>
            ))}
          </div>
          {result && (
            <div className={`p-3 rounded-xl text-center text-sm font-semibold ${result.win ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
              {result.message}
              {result.win && <div className="text-xs mt-1 flex items-center justify-center gap-1">+{result.amount} <Gem className="w-3 h-3" /></div>}
            </div>
          )}
          <div><Label>Bet Amount</Label>
            <div className="flex gap-2 mt-1">
              <Input type="number" value={bet} onChange={e => setBet(e.target.value)} className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => setBet(String(Math.floor(profile.gems / 2)))}>Half</Button>
              <Button variant="outline" size="sm" onClick={() => setBet(String(profile.gems))}>All</Button>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Gem className="w-3.5 h-3.5 text-purple-400" />{profile.gems >= 999999999 ? '∞' : profile.gems.toLocaleString()} gems</span>
            <span>Win rate ~40% • Jackpot 5x</span>
          </div>
          <Button className="w-full" onClick={spin} disabled={spinning}>{spinning ? 'Spinning…' : '🎰 Spin!'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
