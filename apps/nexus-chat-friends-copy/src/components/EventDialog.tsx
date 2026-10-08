import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@project/components/ui/dialog';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Switch } from '@project/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { toast } from 'sonner';
import * as DB from '../lib/storage';

type Props = { open: boolean; onClose: () => void; date: string; isStaff: boolean; me: DB.UserProfile; onSaved: () => void };

const PRESETS = {
  holiday: { emoji: '🎉', color: '#f59e0b', role: 'Holiday Spirit' },
  event: { emoji: '📣', color: '#22d3ee', role: 'Event Guest' },
  birthday: { emoji: '🎂', color: '#ec4899', role: 'Birthday Star' },
};

export default function EventDialog({ open, onClose, date, isStaff, me, onSaved }: Props) {
  const [type, setType] = useState<DB.CalendarEvent['type']>(isStaff ? 'holiday' : 'birthday');
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState(PRESETS.holiday.emoji);
  const [color, setColor] = useState(PRESETS.holiday.color);
  const [roleName, setRoleName] = useState(PRESETS.holiday.role);
  const [target, setTarget] = useState(me.email);
  const [yearly, setYearly] = useState(true);
  const [day, setDay] = useState(date);

  useEffect(() => { setDay(date); }, [date]);
  useEffect(() => { const p = PRESETS[type]; setEmoji(p.emoji); setColor(p.color); setRoleName(p.role); setYearly(type !== 'event'); }, [type]);

  function save() {
    const t = title.trim() || (type === 'birthday' ? `${DB.getUser(target)?.name || 'Someone'}'s Birthday` : '');
    if (!t) { toast.error('Give it a title'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) { toast.error('Pick a valid date'); return; }
    DB.addEvent({ id: crypto.randomUUID(), date: day, title: t, type, emoji, color, roleName: roleName.trim(), targetEmail: type === 'birthday' ? target : undefined, yearly, createdBy: me.email });
    toast.success(`${emoji} Added "${t}"`);
    setTitle(''); onSaved(); onClose();
  }

  const users = DB.getAllUsers();
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add to calendar</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label>
              <Select value={type} onValueChange={v => setType(v as DB.CalendarEvent['type'])}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {isStaff && <SelectItem value="holiday">🎉 Holiday</SelectItem>}
                  {isStaff && <SelectItem value="event">📣 Event</SelectItem>}
                  <SelectItem value="birthday">🎂 Birthday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" value={day} onChange={e => setDay(e.target.value)} className="mt-1" /></div>
          </div>
          {type === 'birthday' && isStaff && (
            <div><Label>Whose birthday?</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{users.map(u => <SelectItem key={u.email} value={u.email}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder={type === 'birthday' ? 'Auto: "Name\'s Birthday"' : 'e.g. Halloween, Game Night'} className="mt-1" /></div>
          <div className="grid grid-cols-[70px_1fr_60px] gap-3">
            <div><Label>Emoji</Label><Input value={emoji} onChange={e => setEmoji(e.target.value)} className="mt-1 text-center" /></div>
            <div><Label>Daily role (shown all day)</Label><Input value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="Leave empty for none" className="mt-1" /></div>
            <div><Label>Color</Label><input type="color" value={color} onChange={e => setColor(e.target.value)} className="mt-1 w-full h-9 rounded cursor-pointer bg-transparent" /></div>
          </div>
          <p className="text-[11px] text-muted-foreground">{type === 'birthday' ? 'The birthday person gets this role badge on their day.' : 'Everyone gets this role badge in chat on that day.'}</p>
          <div className="flex items-center justify-between"><Label>Repeat every year</Label><Switch checked={yearly} onCheckedChange={setYearly} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
