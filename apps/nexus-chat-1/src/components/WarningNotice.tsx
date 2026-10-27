import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { staffTools, StaffToolsOutputType } from 'zitejs/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@project/components/ui/dialog';
import { Button } from '@project/components/ui/button';

type Warning = StaffToolsOutputType['warnings'][0];

/** Shows unacknowledged staff warnings to the signed-in user. */
export default function WarningNotice() {
  const [list, setList] = useState<Warning[]>([]);

  useEffect(() => {
    let alive = true;
    const load = () => staffTools({ action: 'myWarnings' }).then(r => alive && setList(r.warnings)).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const w = list[0];
  if (!w) return null;

  async function ack() {
    setList(l => l.slice(1));
    staffTools({ action: 'ack', warningId: w.id }).catch(() => {});
  }

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="max-w-sm [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="w-5 h-5" /> You received a warning</DialogTitle>
          <DialogDescription>A staff member flagged your behavior. Repeated warnings can lead to a mute or ban.</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">{w.reason}</div>
        <Button onClick={ack} className="w-full">I understand</Button>
      </DialogContent>
    </Dialog>
  );
}
