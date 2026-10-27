import { useState } from 'react';
import { Ticket } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { toast } from 'sonner';
import { useApp } from '../contexts/AppContext';
import { formatGems } from '../lib/formatGems';

export const LOTTERY_MAX = 20_000_000;
const DAYS_OPEN = 7; // only the last 7 days of each month

// Weighted prize table — jackpot is the 20M max prize
const PRIZES: [number, number][] = [
  [100, 40], [500, 25], [1_000, 15], [5_000, 10], [25_000, 6], [100_000, 2.5], [1_000_000, 1], [5_000_000, 0.4], [LOTTERY_MAX, 0.1],
];

function draw() {
  const total = PRIZES.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [p, w] of PRIZES) { if ((r -= w) <= 0) return p; }
  return PRIZES[0][0];
}

function lotteryWindow(now = new Date()) {
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const openFrom = last - DAYS_OPEN + 1;
  return { open: now.getDate() >= openFrom, openFrom, daysUntil: openFrom - now.getDate() };
}

export default function DailyLottery() {
  const { profile, addGems } = useApp();
  const today = new Date().toDateString();
  const key = `nexus_lottery:${profile?.email}`;
  const [last, setLast] = useState(() => localStorage.getItem(key));
  const [won, setWon] = useState<number | null>(null);
  const win = lotteryWindow();
  const played = last === today;

  function play() {
    if (!win.open || played) return;
    const prize = draw();
    localStorage.setItem(key, today);
    setLast(today);
    setWon(prize);
    addGems(prize);
    toast.success(prize === LOTTERY_MAX ? `🎉 JACKPOT! ${formatGems(prize)} gems!` : `You won ${formatGems(prize)} gems!`);
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-2">
      <p className="font-bold flex items-center gap-2"><Ticket className="w-4 h-4 text-primary" /> Daily Lottery</p>
      <p className="text-xs text-muted-foreground">Free ticket every day during the last week of the month. Jackpot: 💎 {formatGems(LOTTERY_MAX)}</p>
      {won !== null && <p className="text-2xl font-black text-primary">+{formatGems(won)}</p>}
      {!win.open
        ? <p className="text-sm font-medium">Opens in {win.daysUntil} day{win.daysUntil === 1 ? '' : 's'} (on the {win.openFrom}th)</p>
        : <Button className="w-full" disabled={played} onClick={play}>{played ? 'Come back tomorrow' : '🎟️ Scratch today\'s ticket'}</Button>}
      {profile && <span className="sr-only">{profile.gems}</span>}
    </div>
  );
}
