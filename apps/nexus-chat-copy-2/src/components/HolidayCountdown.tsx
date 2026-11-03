import { useState } from 'react';
import { format } from 'date-fns';
import { Timer } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { CAL_HOLIDAYS, daysUntil, nextOccurrence, upcoming } from '../lib/calendarHolidays';

const KEY = 'nexus_countdown_holiday';

/** Pick a holiday and see how many days are left until it. */
export default function HolidayCountdown() {
  const [key, setKey] = useState(() => localStorage.getItem(KEY) || upcoming(1)[0].key);
  const h = CAL_HOLIDAYS.find(x => x.key === key) || CAL_HOLIDAYS[0];
  const n = daysUntil(h);
  const pick = (k: string) => { setKey(k); localStorage.setItem(KEY, k); };

  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-4 flex flex-wrap items-center gap-4" style={{ borderLeft: `4px solid ${h.color}` }}>
      <span className="text-5xl">{h.emoji}</span>
      <div className="flex-1 min-w-[160px]">
        <p className="text-xs text-muted-foreground flex items-center gap-1"><Timer className="w-3 h-3" />Countdown</p>
        <p className="text-3xl font-black tabular-nums" style={{ color: h.color }}>
          {n === 0 ? "It's today! 🎉" : `${n} day${n === 1 ? '' : 's'}`}
        </p>
        <p className="text-sm">until <b>{h.name}</b> · {format(nextOccurrence(h), 'EEE, MMM d, yyyy')}</p>
      </div>
      <Select value={h.key} onValueChange={pick}>
        <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
        <SelectContent>
          {CAL_HOLIDAYS.map(x => <SelectItem key={x.key} value={x.key}>{x.emoji} {x.name} — {daysUntil(x)}d</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
