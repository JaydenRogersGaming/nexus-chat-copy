import { useState } from 'react';
import { Trash2, Sparkles } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Textarea } from '@project/components/ui/textarea';
import { toast } from 'sonner';
import { useApp } from '../../contexts/AppContext';
import { useVip } from '../../hooks/useVip';
import * as Vip from '../../lib/vip';
import { isOwnerEmail } from '../../lib/gameData';
import { cn } from '@project/components/lib/utils';

const KIND_LABEL: Record<Vip.VipPost['kind'], string> = { early: '⚡ Early access', bts: '🎬 Behind the scenes', event: '🎉 VIP event' };

/** VIP-only feed: early announcements, behind-the-scenes and VIP events. Owner posts. */
export default function VipEarlyAccess() {
  const { profile } = useApp();
  useVip(profile?.email);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [kind, setKind] = useState<Vip.VipPost['kind']>('early');
  if (!profile) return null;
  const owner = isOwnerEmail(profile.email);
  const posts = Vip.getPosts();

  const post = () => {
    if (!title.trim()) return;
    Vip.addPost({ title: title.trim(), body: body.trim(), kind });
    setTitle(''); setBody(''); toast.success('Posted to VIPs');
  };

  return (
    <div className="space-y-4">
      {owner && (
        <div className="rounded-xl border border-dashed border-primary/50 p-4 space-y-2">
          <p className="text-sm font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Post something only VIPs can see</p>
          <div className="flex gap-2">
            {(Object.keys(KIND_LABEL) as Vip.VipPost['kind'][]).map(k => (
              <Button key={k} size="sm" variant={kind === k ? 'default' : 'outline'} onClick={() => setKind(k)}>{KIND_LABEL[k]}</Button>
            ))}
          </div>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (e.g. Halloween shop drops Friday)" />
          <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Details, sign-up info, sneak peeks…" />
          <Button onClick={post} disabled={!title.trim()}>Post</Button>
        </div>
      )}
      {posts.length === 0 && <p className="text-sm text-muted-foreground">No VIP drops yet. Early news, sneak peeks and VIP game/movie nights will show up here first.</p>}
      {posts.map(p => (
        <div key={p.id} className={cn('rounded-xl border border-border p-4 bg-card')}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-semibold text-primary">{KIND_LABEL[p.kind]}</span>
              <h4 className="font-bold">{p.title}</h4>
            </div>
            {owner && <button onClick={() => Vip.deletePost(p.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>}
          </div>
          {p.body && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{p.body}</p>}
          <p className="text-[11px] text-muted-foreground mt-2">{new Date(p.at).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
