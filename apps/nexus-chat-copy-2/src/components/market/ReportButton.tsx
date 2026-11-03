import { useState } from 'react';
import { toast } from 'sonner';
import { Flag } from 'lucide-react';
import { reports } from 'zitejs/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@project/components/ui/dialog';
import { Button } from '@project/components/ui/button';
import { Textarea } from '@project/components/ui/textarea';
import { errMsg } from '../../hooks/usePermissions';

export default function ReportButton({ targetType, targetId, subject }: { targetType: 'User' | 'Listing'; targetId: string; subject: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    try {
      await reports({ action: 'create', targetType, targetId, subject, reason: reason.trim() });
      toast.success('Report sent to moderators'); setOpen(false); setReason('');
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)} title="Report"><Flag className="w-3.5 h-3.5" /></Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report {subject}</DialogTitle></DialogHeader>
          <Textarea rows={4} placeholder="What's wrong?" value={reason} onChange={e => setReason(e.target.value)} maxLength={2000} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={send} disabled={reason.trim().length < 5 || busy}>Send report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
