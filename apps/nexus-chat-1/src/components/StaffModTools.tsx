import { useState } from 'react';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { staffTools } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@project/components/ui/alert-dialog';
import { toast } from 'sonner';

const QUICK = ['Spamming', 'Be respectful', 'Inappropriate language', 'Off-topic'];

export default function StaffModTools({ email, name }: { email: string; name: string }) {
  const [reason, setReason] = useState('');
  const [hours, setHours] = useState('24');
  const [busy, setBusy] = useState<'warn' | 'del' | null>(null);
  const [confirm, setConfirm] = useState(false);

  async function warn(r: string) {
    if (!r.trim()) return;
    setBusy('warn');
    try {
      await staffTools({ action: 'warn', email, reason: r.trim() });
      toast.success(`Warned ${name}`);
      setReason('');
    } catch (e) { toast.error((e as Error).message || 'Could not warn'); }
    setBusy(null);
  }

  async function bulkDelete() {
    setBusy('del');
    try {
      const res = await staffTools({ action: 'bulkDelete', email, hours: Number(hours) });
      toast.success(`Deleted ${res.deleted} message${res.deleted === 1 ? '' : 's'} from ${name}`);
    } catch (e) { toast.error((e as Error).message || 'Could not delete'); }
    setBusy(null);
  }

  return (
    <div className="space-y-2 pt-1 border-t border-primary/20">
      <div className="flex flex-wrap gap-1">
        {QUICK.map(q => (
          <button key={q} disabled={!!busy} onClick={() => warn(q)}
            className="text-[10px] px-2 py-1 rounded-full border border-border hover:bg-secondary disabled:opacity-50">⚠ {q}</button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input value={reason} onChange={e => setReason(e.target.value)} onKeyDown={e => e.key === 'Enter' && warn(reason)}
          placeholder="Custom warning…" maxLength={500} className="h-8 text-xs" />
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1" disabled={!reason.trim() || !!busy} onClick={() => warn(reason)}>
          {busy === 'warn' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}Warn
        </Button>
      </div>
      <div className="flex gap-1.5">
        <Select value={hours} onValueChange={setHours}>
          <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Last hour</SelectItem>
            <SelectItem value="24">Last 24 hours</SelectItem>
            <SelectItem value="168">Last 7 days</SelectItem>
            <SelectItem value="720">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="destructive" className="h-8 text-xs gap-1" disabled={!!busy} onClick={() => setConfirm(true)}>
          {busy === 'del' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}Delete msgs
        </Button>
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {name}'s recent messages?</AlertDialogTitle>
            <AlertDialogDescription>All their chat messages from the selected time range will be removed for everyone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={bulkDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
