import { useState } from 'react';
import { Award, LogIn } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { toast } from 'sonner';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';

const TITLE_GIVERS = ['owner', 'co-owner', 'admin'];

export default function StaffUserActions({ email, name, onDone }: { email: string; name: string; onDone: () => void }) {
  const { profile, isRealOwner, impersonate } = useApp();
  const [title, setTitle] = useState('');
  const canGive = isRealOwner || TITLE_GIVERS.includes(profile?.role || '');
  if (!canGive || email === profile?.email) return null;

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
      <div className="flex gap-1.5">
        <Input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && give()} placeholder="Title to give…" maxLength={30} className="h-8 text-xs" />
        <Button size="sm" className="h-8 text-xs gap-1" disabled={!title.trim()} onClick={give}><Award className="w-3.5 h-3.5" />Give</Button>
      </div>
      {isRealOwner && (
        <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1.5" onClick={() => { impersonate(email); toast.success(`Now signed in as ${name}`); onDone(); }}>
          <LogIn className="w-3.5 h-3.5" /> Sign in as {name}
        </Button>
      )}
    </div>
  );
}
