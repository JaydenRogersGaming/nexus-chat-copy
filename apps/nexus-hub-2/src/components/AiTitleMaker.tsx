import { formatGems } from '../lib/formatGems';
import { useState } from 'react';
import { Sparkles, Loader2, Gem } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@project/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { toast } from 'sonner';
import { aiTitle, AiTitleOutputType } from 'zitejs/api';
import { useApp } from '../contexts/AppContext';
import { EFFECT_TO_CLASS, TITLE_FONTS } from '../lib/gameData';
import TitleBadge from './TitleBadge';
import * as DB from '../lib/storage';

const COST = 1000;
import EmojiPages from './EmojiPages';
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
  const [keepName, setKeepName] = useState(true);
  const [options, setOptions] = useState<AiTitleOutputType['options']>([]);
  const [picked, setPicked] = useState(0);
  if (!profile) return null;
  const canAfford = profile.gems >= COST;
  const effects = ['none', ...Object.keys(EFFECT_TO_CLASS)];
  const withEmoji = (n: string) => (emoji.trim() ? `${emoji.trim()} ${n}` : n);
  const previewText = withEmoji(name.trim() || idea.trim() || 'Your Title');

  async function generate() {
    if (!profile || (!idea.trim() && !name.trim())) return;
    setBusy(true);
    try {
      const { options } = await aiTitle({
        idea: idea.trim() || name.trim(), effects,
        name: name.trim() || undefined, keepName,
        color: useColor ? color : undefined,
        effect: effect === AUTO ? undefined : effect,
      });
      setOptions(options); setPicked(0);
    } catch {
      toast.error('The AI fumbled — try again!');
    } finally { setBusy(false); }
  }

  function submit() {
    const t = options[picked];
    if (!profile || !t) return;
    if (!canAfford) { toast.error(`You need 💎 ${COST} gems`); return; }
    addGems(-COST);
    const req: DB.TitleRequest = {
      id: crypto.randomUUID(), email: profile.email, userName: profile.name, idea: idea.trim(),
      name: withEmoji(t.name), effect: t.effect, color: t.color, font, cost: COST, status: 'pending', timestamp: Date.now(),
    };
    DB.addTitleRequest(req);
    setSent(req); setOptions([]);
    toast.success('📨 Sent to the owner for approval!');
  }

  return (
    <Dialog onOpenChange={o => { if (!o) { setSent(null); setOptions([]); } }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Sparkles className="w-3.5 h-3.5 mr-1" /> AI Title</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>✨ AI Custom Title Maker</DialogTitle></DialogHeader>
        <div className="flex items-center gap-1 text-xs font-semibold"><Gem className="w-3.5 h-3.5 text-purple-400" />Costs {COST.toLocaleString()} gems · You have {formatGems(profile.gems)} · Needs owner approval</div>

        <div className="p-4 rounded-xl border border-border bg-secondary/30 flex justify-center">
          <TitleBadge title={sent ? sent.name : options[picked] ? withEmoji(options[picked].name) : previewText} effect={sent ? sent.effect : options[picked]?.effect ?? (effect === AUTO ? 'none' : effect)} color={sent ? sent.color : options[picked]?.color ?? (useColor ? color : '#a78bfa')} font={sent ? sent.font : font} size="md" />
        </div>

        {sent ? (
          <p className="text-sm text-center text-muted-foreground">⏳ Waiting for the owner to approve. If they say no, you get your 💎 {COST} back.</p>
        ) : (
          <div className="space-y-3">
            <div><Label>Describe your vibe</Label><Input value={idea} onChange={e => setIdea(e.target.value)} placeholder="e.g. a ninja who loves pizza" maxLength={200} className="mt-1" /></div>
            <div className="grid grid-cols-[1fr_80px] gap-2">
              <div><Label>Title text (optional)</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Leave blank for AI" maxLength={20} className="mt-1" />
                {name.trim() && (
                  <div className="flex gap-1 mt-1.5">
                    <button type="button" onClick={() => setKeepName(true)} className={`flex-1 text-[11px] py-1 rounded-md border ${keepName ? 'border-primary bg-primary/15 font-semibold' : 'border-border text-muted-foreground'}`}>🔒 Keep my words</button>
                    <button type="button" onClick={() => setKeepName(false)} className={`flex-1 text-[11px] py-1 rounded-md border ${!keepName ? 'border-primary bg-primary/15 font-semibold' : 'border-border text-muted-foreground'}`}>🤖 AI rewrites it</button>
                  </div>
                )}
              </div>
              <div><Label>Emoji</Label><Input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="🔥" maxLength={4} className="mt-1 text-center" /></div>
            </div>
            <EmojiPages value={emoji} onChange={setEmoji} />
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
            {options.length > 0 && (
              <div className="space-y-1.5">
                <Label>Pick your favorite</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {options.map((o, i) => (
                    <button key={i} type="button" onClick={() => setPicked(i)} className={`p-2 rounded-lg border flex justify-center ${picked === i ? 'border-primary bg-primary/10' : 'border-border hover:bg-secondary'}`}>
                      <TitleBadge title={withEmoji(o.name)} effect={o.effect} color={o.color} font={font} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={generate} disabled={busy || (!idea.trim() && !name.trim())}>
                {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                {options.length ? 'New ideas' : 'Generate ideas'}
              </Button>
              {options.length > 0 && (
                <Button className="flex-1" onClick={submit} disabled={!canAfford}>
                  {canAfford ? `Request (💎 ${COST})` : 'Not enough gems'}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
