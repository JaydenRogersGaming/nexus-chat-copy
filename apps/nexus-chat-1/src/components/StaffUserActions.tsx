import { useState } from 'react';
import { Award, LogIn, UserCog } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { toast } from 'sonner';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import StaffModTools from './StaffModTools';

const TITLE_GIVERS = ['owner', 'co-owner', 'admin'];

function EditAccount({ email, onDone }: { email: string; onDone: () => void }) {
  const u = DB.getUser(email);
  const [name, setName] = useState(u?.name || '');
  const [bio, setBio] = useState(u?.bio || '');
  const [gems, setGems] = useState(String(u?.gems ?? 0));
  const [color, setColor] = useState(u?.nameColor || '#e0e0ff');
  if (!u) return <p className="text-[11px] text-muted-foreground">This account isn't saved on this device yet.</p>;

  function save() {
    if (!name.trim()) { toast.error('Name is required'); return; }
    const g = Math.max(0, Math.floor(Number(gems) || 0));
    DB.saveUser({ ...DB.getUser(email)!, name: name.trim(), bio, gems: g, nameColor: color });
    toast.success('Account updated');
    onDone();
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name" maxLength={30} className="h-8 text-xs" />
        <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-9 h-8 rounded cursor-pointer bg-transparent" />
      </div>
      <Input value={bio} onChange={e => setBio(e.target.value)} placeholder="Bio" maxLength={200} className="h-8 text-xs" />
      <Input value={gems} onChange={e => setGems(e.target.value)} type="number" min={0} placeholder="Gems" className="h-8 text-xs" />
      <Button size="sm" className="w-full h-8 text-xs" onClick={save}>Save changes</Button>
    </div>
  );
}

export default function StaffUserActions({ email, name, onDone }: { email: string; name: string; onDone: () => void }) {
  const { profile, isRealOwner, impersonate } = useApp();
  const [title, setTitle] = useState('');
  const [editing, setEditing] = useState(false);
  const canGive = isRealOwner || TITLE_GIVERS.includes(profile?.role || '');
  const canEdit = isRealOwner || profile?.role === 'owner' || DB.hasPerm(profile, 'editusers');
  const canMod = isRealOwner || ['owner', 'co-owner', 'admin', 'senior-mod', 'mod'].includes(profile?.role || '');
  if ((!canGive && !canEdit && !canMod) || email === profile?.email) return null;

  function give() {
    const t = title.trim();
    if (!t) return;
    DB.addUserTitle(email, t);
    toast.success(`Gave "${t}" to ${name}`);
    setTitle('');
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
      <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Staff tools</p>
      {canGive && (
        <div className="flex gap-1.5">
          <Input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && give()} placeholder="Title to give…" maxLength={30} className="h-8 text-xs" />
          <Button size="sm" className="h-8 text-xs gap-1" disabled={!title.trim()} onClick={give}><Award className="w-3.5 h-3.5" />Give</Button>
        </div>
      )}
      {canEdit && (editing
        ? <EditAccount email={email} onDone={onDone} />
        : <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1.5" onClick={() => setEditing(true)}><UserCog className="w-3.5 h-3.5" /> Edit account</Button>
      )}
      {(isRealOwner || ['owner', 'co-owner', 'admin', 'senior-mod', 'mod'].includes(profile?.role || '')) && <StaffModTools email={email} name={name} />}
      {isRealOwner && (
        <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1.5" onClick={() => { impersonate(email); toast.success(`Now signed in as ${name}`); onDone(); }}>
          <LogIn className="w-3.5 h-3.5" /> Sign in as {name}
        </Button>
      )}
    </div>
  );
}
