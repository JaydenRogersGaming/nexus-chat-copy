import { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Slider } from '@project/components/ui/slider';
import { toast } from 'sonner';
import { useApp } from '../contexts/AppContext';
import { CUSTOM_CURSOR_PRICE, addOwned, emojiCursorCss, equip, getCustom, getOwned, saveCustom } from '../lib/cursors';
import { isInfiniteGems } from '../lib/formatGems';
import { useVip } from '../hooks/useVip';

/** Lets a player design their own cursor from any emoji or symbol. */
export default function CustomCursorMaker({ onChange }: { onChange: () => void }) {
  const { profile, addGems } = useApp();
  const email = profile?.email || '';
  const { active: vip } = useVip(email);
  const saved = getCustom(email);
  const [emoji, setEmoji] = useState(saved?.emoji || '🦊');
  const [size, setSize] = useState(saved?.size || 24);
  if (!profile) return null;
  const owns = vip || getOwned(email).includes('custom');
  const glyph = [...emoji.trim()].slice(0, 2).join('');

  function save() {
    if (!glyph) { toast.error('Type an emoji or symbol first'); return; }
    if (!owns) {
      if (!isInfiniteGems(profile!.gems) && profile!.gems < CUSTOM_CURSOR_PRICE) { toast.error(`You need 💎 ${CUSTOM_CURSOR_PRICE}`); return; }
      addGems(-CUSTOM_CURSOR_PRICE); addOwned(email, 'custom');
    }
    saveCustom(email, { emoji: glyph, size }); equip(email, 'custom'); onChange();
    toast.success(`${glyph} Custom cursor equipped!`);
  }

  return (
    <div className="rounded-xl border border-dashed border-primary/50 p-3 space-y-2">
      <div className="flex items-center gap-2 font-semibold text-sm"><Wand2 className="w-4 h-4 text-primary" /> Make your own cursor</div>
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-lg bg-muted grid place-items-center" style={{ cursor: glyph ? emojiCursorCss(glyph, size) : undefined, fontSize: size }}>{glyph || '?'}</div>
        <div className="flex-1 space-y-2">
          <Input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="Type any emoji, e.g. 🦊" maxLength={8} />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">Size <Slider min={16} max={40} step={2} value={[size]} onValueChange={v => setSize(v[0])} className="flex-1" /> {size}px</div>
        </div>
      </div>
      <Button size="sm" className="w-full" onClick={save}>{owns ? (vip ? 'Save & equip · free for VIP' : 'Save & equip') : `Create · 💎 ${CUSTOM_CURSOR_PRICE}`}</Button>
    </div>
  );
}
