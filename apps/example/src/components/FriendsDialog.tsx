import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, UserMinus, UserPlus, MessageCircle, Loader2 } from 'lucide-react';
import { friends as friendsApi, FriendsOutputType } from 'zitejs/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Input } from '@project/components/ui/input';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import * as DB from '../lib/storage';

const errMsg = (e: unknown) => (e as { userFacingMessage?: string; message?: string })?.userFacingMessage || (e as Error)?.message || 'Something went wrong';
export const displayName = (email: string) => DB.getUser(email)?.name || email;

type Props = { open: boolean; onOpenChange: (o: boolean) => void; onMessage: (email: string) => void };

export default function FriendsDialog({ open, onOpenChange, onMessage }: Props) {
  const [data, setData] = useState<FriendsOutputType | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (action: 'list' | 'request' | 'accept' | 'remove', target?: string, msg?: string) => {
    setBusy(true);
    try { setData(await friendsApi({ action, email: target })); if (msg) toast.success(msg); }
    catch (e) { toast.error(errMsg(e)); }
    finally { setBusy(false); }
  };
  useEffect(() => { if (open) run('list'); }, [open]);

  const send = async () => { if (!email.trim()) return; await run('request', email.trim(), 'Friend request sent'); setEmail(''); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader><DialogTitle>Friends</DialogTitle></DialogHeader>
        <div className="flex gap-2">
          <Input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="friend@email.com" />
          <Button onClick={send} disabled={busy || !email.trim()}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}</Button>
        </div>
        {!data ? <Skeleton className="h-32" /> : (
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {data.incoming.length > 0 && <Section title="Requests">
              {data.incoming.map(e => <Row key={e} email={e}>
                <Button size="sm" onClick={() => run('accept', e, 'Friend added!')}><Check className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => run('remove', e)}>Decline</Button>
              </Row>)}
            </Section>}
            <Section title={`Friends (${data.friends.length})`}>
              {!data.friends.length && <p className="text-xs text-muted-foreground px-1">No friends yet — add someone by email.</p>}
              {data.friends.map(e => <Row key={e} email={e}>
                <Button size="sm" variant="ghost" title="Message" onClick={() => { onMessage(e); onOpenChange(false); }}><MessageCircle className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="ghost" title="Unfriend" className="text-destructive" onClick={() => run('remove', e, 'Removed')}><UserMinus className="w-3.5 h-3.5" /></Button>
              </Row>)}
            </Section>
            {data.outgoing.length > 0 && <Section title="Sent">
              {data.outgoing.map(e => <Row key={e} email={e}><Button size="sm" variant="ghost" onClick={() => run('remove', e)}>Cancel</Button></Row>)}
            </Section>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{title}</p><div className="space-y-1">{children}</div></div>;
}

function Row({ email, children }: { email: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-secondary/40">
      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">{displayName(email)[0]?.toUpperCase()}</div>
      <div className="flex-1 min-w-0"><p className="text-sm truncate">{displayName(email)}</p><p className="text-[10px] text-muted-foreground truncate">{email}</p></div>
      {children}
    </div>
  );
}
