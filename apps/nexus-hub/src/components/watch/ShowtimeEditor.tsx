import { useState } from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { DateTimePicker } from '@project/components/ui/date-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@project/components/ui/popover';

type Props = { party: { scheduledFor: string; endsAt: string }; onSave: (start: string, end?: string) => void };

/** Host/owner-only control to change a movie's start and end time. */
export default function ShowtimeEditor({ party, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<Date | undefined>(party.scheduledFor ? new Date(party.scheduledFor) : undefined);
  const [end, setEnd] = useState<Date | undefined>(party.endsAt ? new Date(party.endsAt) : undefined);
  const bad = !!end && !!start && end <= start;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button size="sm" variant="outline"><Clock className="mr-1 h-4 w-4" />Showtimes</Button></PopoverTrigger>
      <PopoverContent className="w-72 space-y-2">
        <p className="text-xs font-medium">Start time</p>
        <DateTimePicker value={start} onChange={setStart} />
        <p className="text-xs font-medium">End time</p>
        <DateTimePicker value={end} onChange={setEnd} />
        {bad && <p className="text-xs text-destructive">End must be after start.</p>}
        <Button size="sm" className="w-full" disabled={bad || !start} onClick={() => { onSave(start!.toISOString(), end?.toISOString()); setOpen(false); }}>Save showtimes</Button>
      </PopoverContent>
    </Popover>
  );
}
