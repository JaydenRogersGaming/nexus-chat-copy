import { useState } from 'react';
import { Flag } from 'lucide-react';
import { toast } from 'sonner';
import { reports } from 'zitejs/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@project/components/ui/dialog';
import { Button } from '@project/components/ui/button';
import { Textarea } from '@project/components/ui/textarea';

const CATEGORIES = ['Harassment / bullying', 'Spam', 'Hate speech', 'Inappropriate content', 'Scam', 'Other'];

/** Flag button on a chat message that files an incident report for staff. */
export default function ReportMessageButton({ messageId, senderEmail, content }: { messageId: string; senderEmail: string; content: string }) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    try {
      await reports({
        action: 'create', targetType: 'Chat Message', targetId: messageId,
        subject: `${cat} — message from ${senderEmail}`.slice(0, 150),
        reason: `Category: ${cat}\nSender: ${senderEmail}\nMessage: "${content.slice(0, 500)}"\n\nDetails: ${details.trim() || '(none)'}`,
      });
      toast.success('Thanks — staff will review this incident.');
      setOpen(false); setCat(''); setDetails('');
    } catch (e) { toast.error((e as { userFacingMessage?: string }).userFacingMessage || 'Could not send report'); }
    finally { setBusy(false); }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors" title="Report">
        <Flag className="w-3.5 h-3.5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>🚩 Report incident</DialogTitle>
            <DialogDescription>Help keep Nexus safe. Staff will review this message.</DialogDescription>
          </DialogHeader>
          <p className="text-xs rounded-lg bg-secondary p-2 line-clamp-3">"{content}"</p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => <button key={c} onClick={() => setCat(c)} className={`px-2.5 py-1 rounded-lg border text-xs transition ${cat === c ? 'border-destructive bg-destructive/15 font-semibold' : 'border-border text-muted-foreground hover:bg-secondary'}`}>{c}</button>)}
          </div>
          <Textarea placeholder="What happened? (optional)" value={details} onChange={e => setDetails(e.target.value)} maxLength={1000} />
          <DialogFooter><Button variant="destructive" disabled={!cat || busy} onClick={send}>Send report</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
