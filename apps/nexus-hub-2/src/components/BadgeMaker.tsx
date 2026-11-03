import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Loader2, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { aiBadge } from 'zitejs/api';
import ProBadge, { BADGE_ICONS } from './ProBadge';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { cn } from '@project/components/lib/utils';

export default function BadgeMaker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile } = useApp();
  const [idea, setIdea] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<string>('Award');
  const [color, setColor] = useState('#f6d365');
  const [color2, setColor2] = useState('#c8901a');
  const [awardTo, setAwardTo] = useState('');
  const [designing, setDesigning] = useState(false);
  const [, bump] = useState(0);
  if (!profile) return null;
  const isStaff = ['owner', 'co-owner', 'admin'].includes(profile.role);
  const mine = DB.getCustomBadges().filter(b => isStaff || b.createdBy === profile.email);

  async function design() {
    if (!idea.trim()) { toast.error('Describe your badge idea first'); return; }
    setDesigning(true);
    try {
      const d = await aiBadge({ idea: idea.trim() });
      setName(d.name); setDescription(d.description); setIcon(d.icon); setColor(d.color); setColor2(d.color2);
    } catch { toast.error('AI design failed'); } finally { setDesigning(false); }
  }

  function create() {
    if (!name.trim()) { toast.error('Give the badge a name'); return; }
    if (DB.isNameBanned(name)) { toast.error('That name is not allowed'); return; }
    const id = `custom_${crypto.randomUUID().slice(0, 8)}`;
    DB.addCustomBadge({ id, name: name.trim(), description: description.trim(), icon, color, color2, createdBy: profile!.email });
    const target = isStaff && awardTo.trim() ? awardTo.trim() : profile!.email;
    if (DB.awardBadge(target, id)) toast.success(`🏅 "${name}" created and given to ${target === profile!.email ? 'you' : target}`);
    else toast.success(`🏅 "${name}" created (couldn't find ${target} on this device)`);
    setName(''); setDescription(''); setIdea(''); bump(n => n + 1);
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>🏅 Badge Maker</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input value={idea} onChange={e => setIdea(e.target.value)} onKeyDown={e => e.key === 'Enter' && design()} placeholder="Idea, e.g. 'won the chess tournament'" />
            <Button variant="outline" onClick={design} disabled={designing}>{designing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-1" />AI design</>}</Button>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-secondary/30">
            <ProBadge icon={icon} color={color} color2={color2} size={72} />
            <div className="min-w-0">
              <p className="font-bold">{name || 'Badge name'}</p>
              <p className="text-xs text-muted-foreground">{description || 'Short description'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} maxLength={30} className="mt-1" /></div>
            <div><Label>Description</Label><Input value={description} onChange={e => setDescription(e.target.value)} maxLength={80} className="mt-1" /></div>
          </div>
          <div>
            <Label>Colors</Label>
            <div className="flex gap-2 mt-1">
              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-12 h-9 rounded cursor-pointer bg-transparent" />
              <input type="color" value={color2} onChange={e => setColor2(e.target.value)} className="w-12 h-9 rounded cursor-pointer bg-transparent" />
            </div>
          </div>
          <div>
            <Label>Icon</Label>
            <div className="grid grid-cols-7 gap-1.5 mt-1">
              {BADGE_ICONS.map(i => (
                <button key={i} onClick={() => setIcon(i)} className={cn('p-1 rounded-lg border flex justify-center', icon === i ? 'border-primary bg-primary/15' : 'border-transparent hover:bg-secondary')}>
                  <ProBadge icon={i} color={color} color2={color2} size={30} />
                </button>
              ))}
            </div>
          </div>
          {isStaff && <div><Label>Give to (email, optional)</Label><Input value={awardTo} onChange={e => setAwardTo(e.target.value)} placeholder="Leave empty to give to yourself" className="mt-1" /></div>}
          <Button className="w-full" onClick={create}>Create badge</Button>

          {mine.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">Created badges</p>
              {mine.map(b => (
                <div key={b.id} className="flex items-center gap-3 p-2 rounded-lg border border-border">
                  <ProBadge icon={b.icon} color={b.color} color2={b.color2} size={28} />
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{b.name}</p><p className="text-[10px] text-muted-foreground truncate">{b.description}</p></div>
                  {isStaff && awardTo.trim() && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast[DB.awardBadge(awardTo.trim(), b.id) ? 'success' : 'error'](DB.getUser(awardTo.trim()) ? `Given to ${awardTo}` : 'User not found on this device')}>Give</Button>}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { DB.deleteCustomBadge(b.id); bump(n => n + 1); }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
