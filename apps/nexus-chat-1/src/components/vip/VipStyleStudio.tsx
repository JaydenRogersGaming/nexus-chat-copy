import { useEffect, useState } from 'react';
import { Save, Wand2, Loader2 } from 'lucide-react';
import { aiVipStyle } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Switch } from '@project/components/ui/switch';
import { Textarea } from '@project/components/ui/textarea';
import { toast } from 'sonner';
import { useApp } from '../../contexts/AppContext';
import * as Vip from '../../lib/vip';
import { cn } from '@project/components/lib/utils';

const PRESETS: [string, string, string][] = [
  ['Royal', '#f5c542', '#ff5fa2'], ['Aurora', '#3cf0c5', '#7b5cff'], ['Inferno', '#ff4d2e', '#ffc93c'],
  ['Ocean', '#2ec5ff', '#1b5cff'], ['Toxic', '#a8ff3e', '#00c27a'], ['Midnight', '#9aa8ff', '#ff6ad5'],
];
const ANIMS: Vip.VipStyle['animation'][] = ['none', 'shimmer', 'pulse', 'rainbow'];

export default function VipStyleStudio() {
  const { profile, updateProfile } = useApp();
  const [s, setS] = useState<Vip.VipStyle>(Vip.DEFAULT_STYLE);
  useEffect(() => { if (profile) setS(Vip.getStyle(profile.email)); }, [profile?.email]);
  if (!profile) return null;
  const set = <K extends keyof Vip.VipStyle>(key: K, v: Vip.VipStyle[K]) => setS(p => ({ ...p, [key]: v }));

  const save = () => {
    Vip.saveStyle(profile.email, s);
    const isPlainVip = profile.role === 'vip' || profile.role === 'user';
    updateProfile({
      nameColor: s.color1, nameColor2: s.color2,
      ...(isPlainVip ? { customRole: `${s.icon} ${s.roleName || 'VIP'}`, customRoleColor: s.color1, customRoleColor2: s.color2 } : {}),
    });
    toast.success('VIP style saved');
  };

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-5">
        <AiDesigner onApply={v => setS(p => ({ ...p, ...v }))} />
        <div>
          <Label>Color presets</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {PRESETS.map(([n, a, b]) => (
              <button key={n} onClick={() => setS(p => ({ ...p, color1: a, color2: b }))}
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-white border border-white/10"
                style={{ background: `linear-gradient(90deg,${a},${b})` }}>{n}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Color 1</Label><Input type="color" value={s.color1} onChange={e => set('color1', e.target.value)} className="h-10 p-1" /></div>
          <div><Label>Color 2</Label><Input type="color" value={s.color2} onChange={e => set('color2', e.target.value)} className="h-10 p-1" /></div>
        </div>
        <div>
          <Label>Animation</Label>
          <div className="flex gap-2 mt-2">
            {ANIMS.map(a => (
              <Button key={a} size="sm" variant={s.animation === a ? 'default' : 'outline'} onClick={() => set('animation', a)} className="capitalize">{a}</Button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm"><Switch checked={s.glow} onCheckedChange={v => set('glow', v)} /> Neon glow</label>
        <div>
          <Label>Role icon</Label>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Vip.VIP_ICONS.map(i => (
              <button key={i} onClick={() => set('icon', i)}
                className={cn('w-9 h-9 rounded-lg text-lg border', s.icon === i ? 'border-primary bg-primary/15' : 'border-border')}>{i}</button>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Role name</Label><Input maxLength={20} value={s.roleName} onChange={e => set('roleName', e.target.value)} /></div>
          <div><Label>Server nickname</Label><Input maxLength={24} value={s.nickname} placeholder={profile.name} onChange={e => set('nickname', e.target.value)} /></div>
          <div><Label>Profile flair</Label>
            <select value={s.flair} onChange={e => set('flair', e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm">
              {Vip.VIP_FLAIRS.map(f => <option key={f} value={f}>{f || 'None'}</option>)}
            </select>
          </div>
          <div><Label>Custom status</Label><Input maxLength={40} value={s.status} placeholder="Vibing in the lounge" onChange={e => set('status', e.target.value)} /></div>
        </div>
        <div><Label>Personal welcome message</Label><Textarea maxLength={160} value={s.welcome} placeholder="Shown when you enter the VIP Lounge" onChange={e => set('welcome', e.target.value)} /></div>
        <Button onClick={save} className="gap-2"><Save className="w-4 h-4" /> Save style</Button>
      </div>
      <Preview s={s} name={s.nickname || profile.name} pic={profile.profilePic} />
    </div>
  );
}

function AiDesigner({ onApply }: { onApply: (v: Partial<Vip.VipStyle>) => void }) {
  const [vibe, setVibe] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { onApply(await aiVipStyle({ vibe })); toast.success('AI look applied — tweak it, then Save'); }
    catch { toast.error('AI designer failed, try again'); }
    finally { setBusy(false); }
  };
  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-3">
      <Label className="flex items-center gap-1.5"><Wand2 className="w-4 h-4 text-primary" /> AI style designer</Label>
      <div className="flex gap-2 mt-2">
        <Input value={vibe} maxLength={200} onChange={e => setVibe(e.target.value)} onKeyDown={e => e.key === 'Enter' && !busy && run()} placeholder="e.g. cyberpunk dragon, cozy autumn, galaxy queen" />
        <Button onClick={run} disabled={busy} className="gap-1.5">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Design</Button>
      </div>
    </div>
  );
}

function Preview({ s, name, pic }: { s: Vip.VipStyle; name: string; pic: string }) {
  const season = Vip.seasonalVariant();
  return (
    <div className="rounded-2xl border border-border p-5 h-fit sticky top-4"
      style={{ background: `radial-gradient(circle at top, ${s.color1}33, transparent 70%)` }}>
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Live preview</p>
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full p-[2px]" style={{ background: `linear-gradient(135deg,${s.color1},${s.color2})` }}>
          <div className="w-full h-full rounded-full bg-card overflow-hidden flex items-center justify-center text-xl">
            {pic ? <img src={pic} className="w-full h-full object-cover" /> : s.icon}
          </div>
        </div>
        <div className="min-w-0">
          <div className="font-black text-lg truncate" style={Vip.nameStyle(s)}>{name}</div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
            style={{ background: `linear-gradient(90deg,${s.color1},${s.color2})`, boxShadow: s.glow ? `0 0 12px ${s.color1}88` : undefined }}>
            {s.icon} {s.roleName || 'VIP'}
          </span>
        </div>
      </div>
      {s.flair && <p className="text-xs mt-3">{s.flair}</p>}
      {s.status && <p className="text-xs text-muted-foreground mt-1 italic">“{s.status}”</p>}
      <p className="text-[11px] text-muted-foreground mt-3">{season.emoji} Seasonal variant: {season.label}</p>
    </div>
  );
}
