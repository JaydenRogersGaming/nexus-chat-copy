import { useEffect, useState } from 'react';
import { friends as friendsApi } from 'zitejs/api';
import { UserPlus, UserCheck, Clock, Loader2 } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { toast } from 'sonner';
import { useApp } from '../contexts/AppContext';

type Status = 'none' | 'friends' | 'outgoing' | 'incoming';

export default function FriendButton({ email }: { email: string }) {
  const { profile } = useApp();
  const target = email.toLowerCase();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = (r: { friends: string[]; incoming: string[]; outgoing: string[] }) =>
    setStatus(r.friends.includes(target) ? 'friends' : r.outgoing.includes(target) ? 'outgoing' : r.incoming.includes(target) ? 'incoming' : 'none');

  useEffect(() => { friendsApi({ action: 'list' }).then(apply).catch(() => setStatus('none')); }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  if (profile?.email.toLowerCase() === target) return null;

  async function run(action: 'request' | 'accept' | 'remove', msg: string) {
    setBusy(true);
    try { apply(await friendsApi({ action, email: target })); toast.success(msg); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Something went wrong'); }
    finally { setBusy(false); }
  }

  if (status === null) return <Button variant="outline" className="w-full" disabled><Loader2 className="w-4 h-4 animate-spin" /></Button>;
  if (status === 'friends') return (
    <Button variant="outline" className="w-full gap-2" disabled={busy} onClick={() => run('remove', 'Removed friend')}>
      <UserCheck className="w-4 h-4 text-green-500" /> Friends · Unfriend
    </Button>
  );
  if (status === 'outgoing') return (
    <Button variant="outline" className="w-full gap-2" disabled={busy} onClick={() => run('remove', 'Request cancelled')}>
      <Clock className="w-4 h-4" /> Request sent · Cancel
    </Button>
  );
  if (status === 'incoming') return (
    <Button className="w-full gap-2" disabled={busy} onClick={() => run('accept', 'Friend added!')}>
      <UserCheck className="w-4 h-4" /> Accept friend request
    </Button>
  );
  return (
    <Button variant="secondary" className="w-full gap-2" disabled={busy} onClick={() => run('request', 'Friend request sent!')}>
      <UserPlus className="w-4 h-4" /> Add Friend
    </Button>
  );
}
