import { useState } from 'react';
import { Lightbulb, Palette, ArrowLeftRight } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import SuggestionsModal from './SuggestionsModal';
import PersonalizeSettings from './PersonalizeSettings';
import ItemSwitcher from './ItemSwitcher';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { toast } from 'sonner';

export const COSMETICS_EVENT = 'nexus-cosmetics';

// Extra settings: idea box, personal matrix color, switch between owned (original + limited) items
export default function SettingsExtras() {
  const { profile } = useApp();
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [matrix, setMatrix] = useState(DB.getMyMatrixColor() || DB.getAppSettings().matrixColor);
  if (!profile) return null;

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

      <ItemSwitcher />
      <p className="text-[11px] text-muted-foreground flex items-center gap-1"><ArrowLeftRight className="w-3 h-3" />Use the Trade button (bottom-right) to trade items with others.</p>

      <PersonalizeSettings />
      <SuggestionsModal open={ideasOpen} onClose={() => setIdeasOpen(false)} />
    </div>
  );
}
