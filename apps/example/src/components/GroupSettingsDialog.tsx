import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Globe, Lock, UserPlus, X } from 'lucide-react';
import { groups as groupsApi, friends as friendsApi, GroupsOutputType } from 'zitejs/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Input } from '@project/components/ui/input';
import { Button } from '@project/components/ui/button';
import { Switch } from '@project/components/ui/switch';
import { Label } from '@project/components/ui/label';
import { displayName } from './FriendsDialog';

export type Group = GroupsOutputType['groups'][number];
const errMsg = (e: unknown) => (e as { userFacingMessage?: string; message?: string })?.userFacingMessage || (e as Error)?.message || 'Something went wrong';

type Props = { group: Group | null; me: string; onClose: () => void; onChanged: (g: Group[]) => void };

export default function GroupSettingsDialog({ group, me, onClose, onChanged }: Props) {
  const [email, setEmail] = useState('');
  const [friendList, setFriendList] = useState<string[]>([]);
  useEffect(() => { if (group) friendsApi({ action: 'list' }).then(r => setFriendList(r.friends)).catch(() => {}); }, [group?.id]);
  if (!group) return null;
  const isOwner = group.ownerEmail === me.toLowerCase();

  const act = async (input: Parameters<typeof groupsApi>[0], msg?: string) => {
    try { const r = await groupsApi(input); onChanged(r.groups); if (msg) toast.success(msg); return true; }
    catch (e) { toast.error(errMsg(e)); return false; }
  };
  const add = async (who: string) => { if (await act({ action: 'addMember', id: group.id, email: who }, `Added ${displayName(who)}`)) setEmail(''); };
  const addable = friendList.filter(f => !group.members.includes(f));

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader><DialogTitle>{group.name}</DialogTitle></DialogHeader>
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div className="flex items-center gap-2">
            {group.visibility === 'Public' ? <Globe className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
            <div><Label>{group.visibility === 'Public' ? 'Public' : 'Private'}</Label>
              <p className="text-[11px] text-muted-foreground">{group.visibility === 'Public' ? 'Anyone can find and join' : 'Only people added can see it'}</p></div>
          </div>
          <Switch checked={group.visibility === 'Public'} disabled={!isOwner}
            onCheckedChange={v => act({ action: 'setVisibility', id: group.id, visibility: v ? 'Public' : 'Private' }, v ? 'Group is now public' : 'Group is now private')} />
        </div>
        <div className="flex gap-2">
          <Input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && email.trim() && add(email.trim())} placeholder="Add by email" />
          <Button onClick={() => add(email.trim())} disabled={!email.trim()}><UserPlus className="w-4 h-4" /></Button>
        </div>
        {addable.length > 0 && <div className="flex flex-wrap gap-1.5">
          {addable.map(f => <Button key={f} size="sm" variant="outline" className="h-7 text-xs" onClick={() => add(f)}>+ {displayName(f)}</Button>)}
        </div>}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Members ({group.members.length})</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {group.members.map(m => (
              <div key={m} className="flex items-center gap-2 px-2 py-1 rounded-md bg-secondary/40 text-sm">
                <span className="flex-1 truncate">{displayName(m)}{m === group.ownerEmail && <span className="text-[10px] text-amber-400 ml-1">owner</span>}</span>
                {isOwner && m !== group.ownerEmail && <button onClick={() => act({ action: 'removeMember', id: group.id, email: m })} className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>}
              </div>
            ))}
          </div>
        </div>
        {isOwner
          ? <Button variant="destructive" onClick={async () => { if (await act({ action: 'delete', id: group.id }, 'Group deleted')) onClose(); }}>Delete group</Button>
          : <Button variant="outline" onClick={async () => { if (await act({ action: 'leave', id: group.id }, 'Left group')) onClose(); }}>Leave group</Button>}
      </DialogContent>
    </Dialog>
  );
}
