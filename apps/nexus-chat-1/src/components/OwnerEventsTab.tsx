import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { Switch } from '@project/components/ui/switch';
import { DatePicker } from '@project/components/ui/date-picker';
import { events as eventsApi } from 'zitejs/api';
import { HOLIDAYS, windowFor, variantFor, Override } from '../lib/holidays';
import { useActiveEvent, EVENTS_CHANGED } from '../hooks/useActiveEvent';

export default function OwnerEventsTab() {
  const { active, overrides } = useActiveEvent();
  const [busy, setBusy] = useState('');
  const now = new Date();

  const save = async (key: string, patch: Partial<Override>) => {
    const cur = overrides.find(o => o.holidayKey === key) || { holidayKey: key, earlyStart: null, forceOn: false, forceOff: false };
    const next = { ...cur, ...patch };
    setBusy(key);
    try {
      await eventsApi({ action: 'set', holidayKey: key, earlyStart: next.earlyStart, forceOn: next.forceOn, forceOff: next.forceOff });
      window.dispatchEvent(new Event(EVENTS_CHANGED)); toast.success('Event updated for everyone');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not update'); }
    finally { setBusy(''); }
  };

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl border border-border bg-secondary/30 text-sm">
        {active ? <>Live now: <b>{active.holiday.emoji} {active.holiday.name} {active.year} — {active.variant.name}</b> (ends {format(active.end, 'MMM d')})</> : 'No event is live right now.'}
        <p className="text-xs text-muted-foreground mt-1">Events start a week before the holiday and end a week after. Each year gets a new look and new limited items.</p>
      </div>
      {HOLIDAYS.map(h => {
        let year = now.getFullYear();
        if (windowFor(h, year).end < now) year++;
        const o = overrides.find(x => x.holidayKey === h.key);
        const w = windowFor(h, year, o);
        return (
          <div key={h.key} className="p-3 rounded-xl border border-border flex flex-wrap items-center gap-3">
            <span className="text-2xl">{h.emoji}</span>
            <div className="flex-1 min-w-[160px]">
              <p className="text-sm font-semibold">{h.name} {year}</p>
              <p className="text-[11px] text-muted-foreground">{variantFor(h, year).name} · {format(w.start, 'MMM d')} – {format(w.end, 'MMM d')}</p>
            </div>
            <div className="w-40"><DatePicker value={o?.earlyStart ? new Date(o.earlyStart + 'T00:00:00') : undefined} onChange={dt => save(h.key, { earlyStart: dt ? format(dt, 'yyyy-MM-dd') : null })} /></div>
            <label className="flex items-center gap-1.5 text-xs"><Switch checked={!!o?.forceOn} disabled={busy === h.key} onCheckedChange={v => save(h.key, { forceOn: v, forceOff: false })} />Start now</label>
            <label className="flex items-center gap-1.5 text-xs"><Switch checked={!!o?.forceOff} disabled={busy === h.key} onCheckedChange={v => save(h.key, { forceOff: v, forceOn: false })} />Turn off</label>
            {o?.earlyStart && <Button size="sm" variant="ghost" onClick={() => save(h.key, { earlyStart: null })}>Reset date</Button>}
          </div>
        );
      })}
    </div>
  );
}
