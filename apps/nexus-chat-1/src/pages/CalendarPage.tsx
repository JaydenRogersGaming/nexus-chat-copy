import { useState, useEffect } from 'react';
import { addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, format } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarDays } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { cn } from '@project/components/lib/utils';
import { toast } from 'sonner';
import { useApp } from '../contexts/AppContext';
import EventDialog from '../components/EventDialog';
import * as DB from '../lib/storage';
import HolidayCountdown from '../components/HolidayCountdown';
import { holidaysOn } from '../lib/calendarHolidays';

export default function CalendarPage() {
  const { profile } = useApp();
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(DB.toDateKey(new Date()));
  const [open, setOpen] = useState(false);
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  useEffect(() => { const t = setInterval(refresh, 5000); return () => clearInterval(t); }, []);
  if (!profile) return null;

  const isStaff = ['owner', 'co-owner', 'admin'].includes(profile.role);
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) });
  const dayEvents = DB.eventsOn(selected);
  const todayRoles = DB.eventsOn(DB.toDateKey(new Date())).filter(e => e.roleName);

  function remove(e: DB.CalendarEvent) {
    DB.deleteEvent(e.id); refresh(); toast.success('Removed');
  }

  return (
    <div className="h-full overflow-y-auto p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2"><CalendarDays className="w-6 h-6 text-primary" /><h1 className="text-xl font-black">Calendar</h1></div>
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="w-4 h-4 mr-1" />{isStaff ? 'Add event' : 'Add my birthday'}</Button>
      </div>

      <HolidayCountdown />

      {todayRoles.length > 0 && (
        <div className="mb-4 p-3 rounded-xl border border-border bg-card flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-muted-foreground">Today's roles:</span>
          {todayRoles.map(e => (
            <span key={e.id} className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: e.color, backgroundColor: e.color + '22', border: `1px solid ${e.color}55` }}>
              {e.emoji} {e.roleName}{e.targetEmail ? ` → ${DB.getUser(e.targetEmail)?.name ?? ''}` : ' → everyone'}
            </span>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_300px] gap-4">
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="icon" onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft className="w-4 h-4" /></Button>
            <h2 className="font-bold">{format(month, 'MMMM yyyy')}</h2>
            <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <div className="grid grid-cols-7 text-[10px] text-muted-foreground font-semibold mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="text-center py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map(d => {
              const key = DB.toDateKey(d);
              const evs = DB.eventsOn(key);
              const hols = holidaysOn(d);
              return (
                <button key={key} onClick={() => setSelected(key)}
                  className={cn('min-h-[64px] sm:min-h-[80px] rounded-lg p-1 text-left border transition-colors flex flex-col gap-0.5',
                    selected === key ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-secondary',
                    !isSameMonth(d, month) && 'opacity-40')}>
                  <span className={cn('text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full', isToday(d) && 'bg-primary text-primary-foreground')}>{d.getDate()}</span>
                  {hols.map(h => <span key={h.key} className="text-[9px] truncate rounded px-1 font-semibold" style={{ backgroundColor: h.color + '33', color: h.color }}>{h.emoji} {h.name}</span>)}
                  {evs.slice(0, 2).map(e => (
                    <span key={e.id} className="text-[9px] truncate rounded px-1" style={{ backgroundColor: e.color + '33', color: e.color }}>{e.emoji} {e.title}</span>
                  ))}
                  {evs.length > 2 && <span className="text-[9px] text-muted-foreground">+{evs.length - 2} more</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3">
          <h3 className="font-bold text-sm mb-2">{format(new Date(selected + 'T12:00:00'), 'EEEE, MMM d')}</h3>
          {holidaysOn(new Date(selected + 'T12:00:00')).map(h => (
            <div key={h.key} className="p-2 mb-2 rounded-lg border border-border" style={{ borderLeft: `3px solid ${h.color}` }}>
              <p className="text-sm font-semibold">{h.emoji} {h.name}</p>
              <p className="text-[10px] text-muted-foreground">Holiday • every year</p>
            </div>
          ))}
          {dayEvents.length === 0 && holidaysOn(new Date(selected + 'T12:00:00')).length === 0 && <p className="text-xs text-muted-foreground">Nothing planned.</p>}
          <div className="space-y-2">
            {dayEvents.map(e => (
              <div key={e.id} className="p-2 rounded-lg border border-border" style={{ borderLeft: `3px solid ${e.color}` }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{e.emoji} {e.title}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{e.type}{e.yearly ? ' • every year' : ''}</p>
                    {e.roleName && <p className="text-[10px] mt-1" style={{ color: e.color }}>Daily role: {e.roleName}</p>}
                  </div>
                  {(isStaff || e.createdBy === profile.email) && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(e)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <EventDialog open={open} onClose={() => setOpen(false)} date={selected} isStaff={isStaff} me={profile} onSaved={refresh} />
    </div>
  );
}
