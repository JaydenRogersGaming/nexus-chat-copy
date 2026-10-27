import { useState } from 'react';
import { Type, Code2, Lock } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Textarea } from '@project/components/ui/textarea';
import { toast } from 'sonner';
import { useApp } from '../contexts/AppContext';
import { isOwnerEmail } from '../lib/gameData';
import * as P from '../lib/personalize';
import CustomBackground from './CustomBackground';

export default function PersonalizeSettings() {
  const { profile, addGems } = useApp();
  const role = profile?.role || 'user';
  const [style, setStyle] = useState(() => P.getRoleTextStyle(role));
  const [css, setCss] = useState(() => (profile ? P.getCustomCss(profile.email) : ''));
  const [, bump] = useState(0);
  if (!profile) return null;
  const unlocked = isOwnerEmail(profile.email) || P.hasCustomCss(profile.email);

  function update(patch: Partial<P.TextStyle>) {
    const next = { ...style, ...patch };
    setStyle(next);
    P.setRoleTextStyle(role, next);
  }
  function buy() {
    if (profile!.gems < P.CUSTOM_CSS_PRICE) { toast.error(`You need ${P.CUSTOM_CSS_PRICE} gems`); return; }
    addGems(-P.CUSTOM_CSS_PRICE);
    P.unlockCustomCss(profile!.email);
    bump(n => n + 1);
    toast.success('Custom CSS unlocked forever!');
  }
  const toggle = (on: boolean) => `px-2.5 py-1 rounded-lg border text-[11px] ${on ? 'border-primary bg-primary/15 font-semibold' : 'border-border text-muted-foreground hover:bg-secondary'}`;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-1"><Type className="w-4 h-4" />Text Style for <span className="capitalize">{role}</span></h3>
        <p className="text-[11px] text-muted-foreground mb-2">Your chat messages use this style for your role.</p>
        <div className="flex items-center gap-2 mb-2">
          <input type="color" value={style.color || '#ffffff'} onChange={e => update({ color: e.target.value })} className="w-10 h-8 rounded cursor-pointer bg-transparent" />
          <select value={style.font} onChange={e => update({ font: e.target.value })} className="flex-1 h-8 text-xs bg-background border border-border rounded-lg px-2">
            {P.TEXT_FONTS.map(f => <option key={f.name} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button className={toggle(style.bold)} onClick={() => update({ bold: !style.bold })}>Bold</button>
          <button className={toggle(style.italic)} onClick={() => update({ italic: !style.italic })}>Italic</button>
          <button className={toggle(style.glow)} onClick={() => update({ glow: !style.glow })}>Glow</button>
          <button className={toggle(false)} onClick={() => { setStyle(P.DEFAULT_TEXT_STYLE); P.setRoleTextStyle(role, P.DEFAULT_TEXT_STYLE); }}>Reset</button>
        </div>
        <div className="mt-2 px-3 py-2 rounded-lg bg-secondary text-sm" style={P.textStyleCss(style)}>Preview: hey everyone 👋</div>
      </div>

      <CustomBackground />

      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-1"><Code2 className="w-4 h-4" />Custom CSS</h3>
        {unlocked ? (
          <>
            <Textarea value={css} onChange={e => setCss(e.target.value)} placeholder=".msg-bubble { border: 1px solid hotpink; }" className="font-mono text-xs h-28" />
            <div className="flex gap-2 mt-2">
              <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => { P.setCustomCss(profile.email, css); toast.success('CSS applied'); }}>Apply</Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setCss(''); P.setCustomCss(profile.email, ''); }}>Clear</Button>
            </div>
          </>
        ) : (
          <div className="p-3 rounded-xl border border-border bg-secondary/30 text-center">
            <Lock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground mb-2">Style the whole app your way. Pay once, keep it forever.</p>
            <Button size="sm" className="h-8 text-xs" onClick={buy}>Unlock for 💎 {P.CUSTOM_CSS_PRICE}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
