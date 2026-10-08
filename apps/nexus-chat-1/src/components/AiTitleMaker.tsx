import { useState } from 'react';
import { Sparkles, Loader2, Gem } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@project/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { toast } from 'sonner';
import { aiTitle } from 'zitejs/api';
import { useApp } from '../contexts/AppContext';
import { EFFECT_TO_CLASS, TITLE_FONTS } from '../lib/gameData';
import TitleBadge from './TitleBadge';
import * as DB from '../lib/storage';

const COST = 1000;
const AUTO = '__ai__';

export default function AiTitleMaker() {
  const { profile, addGems } = useApp();
  const [idea, setIdea] = useState('');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [color, setColor] = useState('#a78bfa');
  const [useColor, setUseColor] = useState(false);
  const [effect, setEffect] = useState(AUTO);
  const [font, setFont] = useState('default');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<DB.TitleRequest | null>(null);
  if (!profile) return null;
  const canAfford = profile.gems >= COST;
  const effects = ['none', ...Object.keys(EFFECT_TO_CLASS)];
  const withEmoji = (n: string) => (emoji.trim() ? `${emoji.trim()} ${n}` : n);
  const previewText = withEmoji(name.trim() || idea.trim() || 'Your Title');

  async function submit() {
    if (!profile || (!idea.trim() && !name.trim())) return;
    if (!canAfford) { toast.error(`You need 💎 ${COST} gems`); return; }
    setBusy(true);
    try {
      const t = await aiTitle({
        idea: idea.trim() || name.trim(), effects,
        name: name.trim() || undefined,
        color: useColor ? color : undefined,
        effect: effect === AUTO ? undefined : effect,
      });
      addGems(-COST);
      const req: DB.TitleRequest = {
        id: crypto.randomUUID(), email: profile.email, userName: profile.name, idea: idea.trim(),
        name: withEmoji(t.name), effect: t.effect, color: t.color, font, cost: COST, status: 'pending', timestamp: Date.now(),
      };
      DB.addTitleRequest(req);
      setSent(req);
      toast.success('📨 Sent to the owner for approval!');
    } catch {
      toast.error('The AI fumbled — no gems were taken. Try again!');
    } finally { setBusy(false); }
  }

  return (
    <Dialog onOpenChange={o => !o && setSent(null)}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Sparkles className="w-3.5 h-3.5 mr-1" /> AI Title</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>✨ AI Custom Title Maker</DialogTitle></DialogHeader>
        <div className="flex items-center gap-1 text-xs font-semibold"><Gem className="w-3.5 h-3.5 text-purple-400" />Costs {COST.toLocaleString()} gems · You have {profile.gems >= 999999999 ? '∞' : profile.gems.toLocaleString()} · Needs owner approval</div>

        <div className="p-4 rounded-xl border border-border bg-secondary/30 flex justify-center">
          <TitleBadge title={sent ? sent.name : previewText} effect={sent ? sent.effect : effect === AUTO ? 'none' : effect} color={sent ? sent.color : useColor ? color : '#a78bfa'} font={sent ? sent.font : font} size="md" />
        </div>

        {sent ? (
          <p className="text-sm text-center text-muted-foreground">⏳ Waiting for the owner to approve. If they say no, you get your 💎 {COST} back.</p>
        ) : (
          <div className="space-y-3">
            <div><Label>Describe your vibe</Label><Input value={idea} onChange={e => setIdea(e.target.value)} placeholder="e.g. a ninja who loves pizza" maxLength={200} className="mt-1" /></div>
            <div className="grid grid-cols-[1fr_80px] gap-2">
              <div><Label>Title text (optional)</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Leave blank for AI" maxLength={20} className="mt-1" /></div>
              <div><Label>Emoji</Label><Input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="🔥" maxLength={4} className="mt-1 text-center" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Effect</Label>
                <Select value={effect} onValueChange={setEffect}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AUTO}>🤖 Let AI pick</SelectItem>
                    {effects.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Font</Label>
                <Select value={font} onValueChange={setFont}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TITLE_FONTS).map(([k, f]) => <SelectItem key={k} value={k}><span style={{ fontFamily: f.family }}>{f.label}</span></SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="usecolor" checked={useColor} onChange={e => setUseColor(e.target.checked)} className="w-4 h-4 accent-primary" />
              <Label htmlFor="usecolor">Pick my own color</Label>
              {useColor ? <input type="color" value={color} onChange={e => setColor(e.target.value)} className="ml-auto w-10 h-8 rounded cursor-pointer bg-transparent" /> : <span className="ml-auto text-xs text-muted-foreground">AI picks</span>}
            </div>
            <Button className="w-full" onClick={submit} disabled={busy || (!idea.trim() && !name.trim()) || !canAfford}>
              {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
              {canAfford ? `Request title (💎 ${COST})` : 'Not enough gems'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
