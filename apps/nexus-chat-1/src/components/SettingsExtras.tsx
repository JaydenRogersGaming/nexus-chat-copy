import { useEffect, useState } from 'react';
import { Lightbulb, Palette, Sparkles, Tag, ArrowLeftRight } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import SuggestionsModal from './SuggestionsModal';
import PersonalizeSettings from './PersonalizeSettings';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { getInventory } from '../lib/inventory';
import { toast } from 'sonner';

export const COSMETICS_EVENT = 'nexus-cosmetics';

// Extra settings: idea box, personal matrix color, switch between owned (original + limited) items
export default function SettingsExtras() {
  const { profile, updateProfile } = useApp();
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [matrix, setMatrix] = useState(DB.getMyMatrixColor() || DB.getAppSettings().matrixColor);
  const [, bump] = useState(0);
  useEffect(() => {
    const f = () => bump(n => n + 1);
    window.addEventListener(COSMETICS_EVENT, f);
    return () => window.removeEventListener(COSMETICS_EVENT, f);
  }, []);
  if (!profile) return null;
  const inv = getInventory(profile.email);
  const eq = DB.getEquipped(profile.email);

  function equip(patch: Partial<{ bg: string; typing: string }>) {
    DB.setEquipped(profile!.email, patch);
    window.dispatchEvent(new Event(COSMETICS_EVENT));
    bump(n => n + 1);
  }

  const chip = (active: boolean) => `px-2.5 py-1 rounded-lg border text-[11px] transition-colors ${active ? 'border-primary bg-primary/15 text-foreground font-semibold' : 'border-border text-muted-foreground hover:bg-secondary'}`;
  const Row = ({ kind, active, onPick }: { kind: 'theme' | 'typing' | 'title'; active: string; onPick: (id: string) => void }) => (
    <div className="flex flex-wrap gap-1.5">
      <button className={chip(!active)} onClick={() => onPick('')}>Default</button>
      {inv.filter(i => i.kind === kind).map(i => (
        <button key={i.id} className={chip(active === i.id)} onClick={() => onPick(i.id)}>
          {i.name}{i.limited && <span className="ml-1 text-[9px] px-1 rounded bg-primary/20 text-primary">LIMITED</span>}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl border border-primary/30 bg-primary/5">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Lightbulb className="w-4 h-4 text-yellow-400" />Got an idea?</h3>
        <p className="text-[11px] text-muted-foreground mt-1 mb-2">Suggest something to add — everyone can upvote ideas.</p>
        <Button size="sm" className="w-full h-8 text-xs" onClick={() => setIdeasOpen(true)}>💡 Suggest an idea</Button>
      </div>

      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-2"><Palette className="w-4 h-4" />Sign-in Matrix Color</h3>
        <div className="flex items-center gap-2">
          <input type="color" value={matrix} onChange={e => { setMatrix(e.target.value); DB.setMyMatrixColor(e.target.value); }} className="w-10 h-9 rounded cursor-pointer bg-transparent" />
          <div className="flex-1 h-9 rounded-lg border border-border bg-black flex items-center justify-center font-mono text-xs" style={{ color: matrix, textShadow: `0 0 8px ${matrix}` }}>01101 NEXUS 10110</div>
          <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => { DB.setMyMatrixColor(''); setMatrix(DB.getAppSettings().matrixColor); toast.success('Reset to default'); }}>Reset</Button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4" />My Items <span className="text-[11px] font-normal text-muted-foreground">original + limited</span></h3>
        <div><p className="text-xs font-medium mb-1.5">Theme</p><Row kind="theme" active={eq.bg} onPick={id => equip({ bg: id })} /></div>
        <div><p className="text-xs font-medium mb-1.5">Typing effect</p><Row kind="typing" active={eq.typing} onPick={id => equip({ typing: id })} /></div>
        <div><p className="text-xs font-medium mb-1.5 flex items-center gap-1"><Tag className="w-3 h-3" />Title</p>
          <Row kind="title" active={profile.activeTitle} onPick={id => { updateProfile({ activeTitle: id }); toast.success(id ? `Wearing "${id}"` : 'Title removed'); }} />
        </div>
        {inv.length === 0 && <p className="text-[11px] text-muted-foreground">Buy items in the Shop or the limited event shop.</p>}
        <p className="text-[11px] text-muted-foreground flex items-center gap-1"><ArrowLeftRight className="w-3 h-3" />Use the Trade button (bottom-right) to trade items with others.</p>
      </div>

      <PersonalizeSettings />
      <SuggestionsModal open={ideasOpen} onClose={() => setIdeasOpen(false)} />
    </div>
  );
}
