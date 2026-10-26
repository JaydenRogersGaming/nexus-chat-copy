import { useState } from 'react';
import { Lightbulb, Palette, Sparkles } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import SuggestionsModal from './SuggestionsModal';
import PersonalizeSettings from './PersonalizeSettings';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { getAllBgThemes, getAllTypingStyles } from '../lib/cosmetics';
import { toast } from 'sonner';

export const COSMETICS_EVENT = 'nexus-cosmetics';

// Extra settings: idea box, personal matrix color, owned background + typing style
export default function SettingsExtras() {
  const { profile } = useApp();
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [matrix, setMatrix] = useState(DB.getMyMatrixColor() || DB.getAppSettings().matrixColor);
  const [, bump] = useState(0);
  if (!profile) return null;
  const owned = DB.getUserItems(profile.email);
  const eq = DB.getEquipped(profile.email);

  function equip(patch: Partial<{ bg: string; typing: string }>) {
    DB.setEquipped(profile!.email, patch);
    window.dispatchEvent(new Event(COSMETICS_EVENT));
    bump(n => n + 1);
  }

  const chip = (active: boolean) => `px-2.5 py-1 rounded-lg border text-[11px] transition-colors ${active ? 'border-primary bg-primary/15 text-foreground font-semibold' : 'border-border text-muted-foreground hover:bg-secondary'}`;

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

      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4" />My Background</h3>
        <div className="flex flex-wrap gap-1.5">
          <button className={chip(!eq.bg)} onClick={() => equip({ bg: '' })}>Default</button>
          {getAllBgThemes().filter(b => owned.includes(b.id)).map(b => <button key={b.id} className={chip(eq.bg === b.id)} onClick={() => equip({ bg: b.id })}>{b.name}</button>)}
        </div>
        <h3 className="text-sm font-semibold mt-3 mb-2">My Typing Style</h3>
        <div className="flex flex-wrap gap-1.5">
          <button className={chip(!eq.typing)} onClick={() => equip({ typing: '' })}>Default</button>
          {getAllTypingStyles().filter(t => owned.includes(t.id)).map(t => <button key={t.id} className={chip(eq.typing === t.id)} onClick={() => equip({ typing: t.id })}>{t.name}</button>)}
        </div>
        {owned.length === 0 && <p className="text-[11px] text-muted-foreground mt-2">Buy backgrounds and typing styles in the Shop.</p>}
      </div>

      <PersonalizeSettings />
      <SuggestionsModal open={ideasOpen} onClose={() => setIdeasOpen(false)} />
    </div>
  );
}
