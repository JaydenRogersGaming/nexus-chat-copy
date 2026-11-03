import { useState } from 'react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { tournaments } from 'zitejs/api';
import { toast } from 'sonner';

type Game = 'Reaction' | 'Click Frenzy' | 'Speed Typing';

export default function CreateTournament({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [game, setGame] = useState<Game>('Reaction');
  const [prize, setPrize] = useState('500');
  const [hours, setHours] = useState('24');
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      await tournaments({ action: 'create', title, game, prizeGems: Number(prize) || 0, hours: Number(hours) });
      toast.success('Tournament started!');
      setTitle('');
      onOpenChange(false);
      onCreated();
    } catch (e) { toast.error((e as Error).message || 'Could not create'); }
    setBusy(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>New tournament</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tournament name" maxLength={60} />
          <Select value={game} onValueChange={v => setGame(v as Game)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Reaction">⚡ Reaction</SelectItem>
              <SelectItem value="Click Frenzy">👆 Click Frenzy</SelectItem>
              <SelectItem value="Speed Typing">⌨️ Speed Typing</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input type="number" min={0} value={prize} onChange={e => setPrize(e.target.value)} placeholder="Prize gems" />
            <Select value={hours} onValueChange={setHours}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 hour</SelectItem>
                <SelectItem value="24">1 day</SelectItem>
                <SelectItem value="72">3 days</SelectItem>
                <SelectItem value="168">1 week</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" disabled={!title.trim() || busy} onClick={create}>Start tournament</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
