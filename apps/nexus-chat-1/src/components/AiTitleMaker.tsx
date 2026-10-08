import { useState } from 'react';
import { Sparkles, Loader2, Gem } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@project/components/ui/dialog';
import { toast } from 'sonner';
import { aiTitle } from 'zitejs/api';
import { useApp } from '../contexts/AppContext';
import { EFFECT_TO_CLASS } from '../lib/gameData';
import TitleBadge from './TitleBadge';
import * as DB from '../lib/storage';

const COST = 1000;

export default function AiTitleMaker() {
  const { profile, addGems, updateProfile } = useApp();
  const [idea, setIdea] = useState('');
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<{ name: string; effect: string; color: string } | null>(null);
  if (!profile) return null;
  const canAfford = profile.gems >= COST;

  async function make() {
    if (!profile || !idea.trim()) return;
    if (!canAfford) { toast.error(`You need 💎 ${COST} gems`); return; }
    setBusy(true);
    try {
      const t = await aiTitle({ idea: idea.trim(), effects: ['none', ...Object.keys(EFFECT_TO_CLASS)] });
      addGems(-COST);
      if (!DB.getCustomTitles().some(c => c.name === t.name)) {
        DB.addCustomTitle({ id: crypto.randomUUID(), name: t.name, effect: t.effect, color: t.color, cost: COST, createdBy: profile.email, availableInShop: false });
      }
      DB.addUserTitle(profile.email, t.name);
      setMade(t); setIdea('');
      toast.success(`✨ New title "${t.name}" unlocked! (-${COST} gems)`);
    } catch {
      toast.error('The AI fumbled — no gems were taken. Try again!');
    } finally { setBusy(false); }
  }

  function equip() {
    if (!made) return;
    updateProfile({ activeTitle: made.name, activeTitleEffect: made.effect, activeTitleColor: made.color });
    toast.success('Title equipped!');
  }

  return (
    <Dialog onOpenChange={o => !o && setMade(null)}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Sparkles className="w-3.5 h-3.5 mr-1" /> AI Title</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>✨ AI Custom Title Maker</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Describe your vibe and the AI invents a one-of-a-kind title with its own color and effect.</p>
        <div className="flex items-center gap-1 text-xs font-semibold"><Gem className="w-3.5 h-3.5 text-purple-400" />Costs {COST.toLocaleString()} gems · You have {profile.gems >= 999999999 ? '∞' : profile.gems.toLocaleString()}</div>
        <Input value={idea} onChange={e => setIdea(e.target.value)} onKeyDown={e => e.key === 'Enter' && make()} placeholder="e.g. a ninja who loves pizza" maxLength={200} disabled={busy} />
        <Button onClick={make} disabled={busy || !idea.trim() || !canAfford}>
          {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
          {canAfford ? `Make title (💎 ${COST})` : 'Not enough gems'}
        </Button>
        {made && (
          <div className="p-4 rounded-xl border border-border bg-secondary/30 flex flex-col items-center gap-3">
            <TitleBadge title={made.name} effect={made.effect} color={made.color} />
            <Button size="sm" onClick={equip}>Equip now</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
