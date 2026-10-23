import { useEffect, useState } from 'react';
import { Button } from '@project/components/ui/button';
import { Palette, Store, Lock, Trash2 } from 'lucide-react';
import ThemeMaker from './ThemeMaker';
import { BG_THEMES, getCustomThemes, saveCustomThemes, THEMES_EVENT, CustomTheme } from '../lib/cosmetics';

export default function OwnerThemesTab() {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState<CustomTheme[]>(getCustomThemes());

  useEffect(() => {
    const refresh = () => setCustom(getCustomThemes());
    window.addEventListener(THEMES_EVENT, refresh);
    return () => window.removeEventListener(THEMES_EVENT, refresh);
  }, [open]);

  const update = (list: CustomTheme[]) => { saveCustomThemes(list); setCustom(list); };
  const toggleShop = (id: string) => update(custom.map(t => t.id === id ? { ...t, inShop: !t.inShop } : t));
  const remove = (id: string) => update(custom.filter(t => t.id !== id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-bold">Theme Maker</h2>
          <p className="text-xs text-muted-foreground">Create themes, sell them in the shop, or keep them owner-only to give away.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Palette className="w-4 h-4 mr-1" />New theme</Button>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Your custom themes ({custom.length})</h3>
        {custom.length === 0 && <p className="text-xs text-muted-foreground">No custom themes yet.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {custom.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-card">
              <div className="w-12 h-12 rounded-md shrink-0 border border-border" style={{ background: t.css }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{t.name}</p>
                <p className="text-[11px] text-muted-foreground">{t.inShop ? `In shop · ${t.cost} gems` : 'Owner-only (give it out)'}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => toggleShop(t.id)} title={t.inShop ? 'Make owner-only' : 'Put in shop'}>
                {t.inShop ? <Lock className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Built-in shop themes ({BG_THEMES.length})</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {BG_THEMES.map(t => (
            <div key={t.id} className="text-center">
              <div className="h-12 rounded-md border border-border" style={{ background: t.css }} />
              <p className="text-[10px] mt-1 truncate">{t.name}</p>
            </div>
          ))}
        </div>
      </div>

      <ThemeMaker open={open} onClose={() => { setOpen(false); setCustom(getCustomThemes()); }} />
    </div>
  );
}
