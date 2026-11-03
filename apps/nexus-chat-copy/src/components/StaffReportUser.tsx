import { useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Textarea } from '@project/components/ui/textarea';
import { toast } from 'sonner';
import { reports } from 'zitejs/api';

/** Lets admins, co-owners and owners file a report against a user. */
export default function StaffReportUser({ email, name }: { email: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    if (reason.trim().length < 3) return;
    setBusy(true);
    try {
      await reports({ action: 'create', targetType: 'User', targetId: email, subject: `Staff report: ${name}`, reason: reason.trim() });
      toast.success(`Reported ${name}`);
      setReason(''); setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send report');
    } finally { setBusy(false); }
  }

  if (!open) return (
    <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1.5 text-destructive" onClick={() => setOpen(true)}>
      <Flag className="w-3.5 h-3.5" /> Report {name}
    </Button>
  );
  return (
    <div className="space-y-1.5">
      <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder={`Why are you reporting ${name}?`} maxLength={2000} className="text-xs min-h-[64px]" />
      <div className="flex gap-1.5">
        <Button size="sm" variant="ghost" className="h-8 text-xs flex-1" onClick={() => setOpen(false)}>Cancel</Button>
        <Button size="sm" variant="destructive" className="h-8 text-xs flex-1 gap-1" disabled={busy || reason.trim().length < 3} onClick={send}>
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flag className="w-3.5 h-3.5" />} Send report
        </Button>
      </div>
    </div>
  );
}
