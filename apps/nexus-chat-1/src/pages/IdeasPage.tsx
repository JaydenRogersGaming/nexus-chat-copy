import { useState } from 'react';
import { Lightbulb, Loader2, Sparkles, Copy, Repeat, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ideas as ideasApi, IdeasOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Skeleton } from '@project/components/ui/skeleton';
import { useAuth } from 'zitejs/auth';
import { isOwnerEmail } from '../lib/gameData';

const FOCUS = ['Games', 'Chat features', 'Making money with gems', 'Staff tools', 'Customization', 'Events'];
const SECTIONS = ['Chat', 'DMs & Groups', 'Shop', 'Limited Shop', 'Casino', 'HP Clicker', 'Art', 'Video Rooms', 'Watch Party', 'Marketplace', 'Tournaments', 'VIP', 'Profile', 'Leaderboard', 'Staff Tools', 'Browser', 'Calendar'];

type Kind = 'features' | 'site' | 'roles' | 'events' | 'tabs' | 'future' | 'titles' | 'typing';
const KINDS: [Kind, string][] = [['features', '✨ Features'], ['site', '🧭 Every part of the site'], ['roles', '🛡️ New roles'], ['tabs', '🗂️ New tabs'], ['future', '🚀 Future roadmap'], ['events', '🎃 Theme events'], ['titles', '🏷️ Titles'], ['typing', '⌨️ Typing effects']];
type Idea = IdeasOutputType['ideas'][0] & { repeat?: boolean };

const HIST = 'nexus_idea_history';
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
const loadHist = (): string[] => { try { return JSON.parse(localStorage.getItem(HIST) || '[]'); } catch { return []; } };
const saveHist = (h: string[]) => localStorage.setItem(HIST, JSON.stringify(h.slice(-300)));
const ACTION_STYLE: Record<string, string> = { Add: 'bg-green-500/15 text-green-500', Change: 'bg-blue-500/15 text-blue-500', Delete: 'bg-red-500/15 text-red-500' };

export default function IdeasPage() {
  const { user } = useAuth();
  const isOwner = isOwnerEmail(user?.email?.toLowerCase());
  const [kind, setKind] = useState<Kind>('features');
  const [focus, setFocus] = useState('');
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<Idea[]>([]);
  const [histCount, setHistCount] = useState(() => loadHist().length);

  const generate = async (f = focus, k = kind) => {
    setLoading(true);
    try {
      const hist = loadHist();
      const seen = new Set(hist.map(norm));
      const res = (await ideasApi({ focus: f || undefined, kind: k, avoid: hist.slice(-150) })).ideas;
      setList(res.map(i => ({ ...i, repeat: seen.has(norm(i.title)) })));
      const next = [...hist, ...res.filter(i => !seen.has(norm(i.title))).map(i => i.title)];
      saveHist(next); setHistCount(next.length);
    } catch (e) { toast.error((e as { userFacingMessage?: string }).userFacingMessage || 'Could not get ideas — try again'); }
    finally { setLoading(false); }
  };
  const toggleRepeat = (idx: number) => setList(l => l.map((i, n) => n === idx ? { ...i, repeat: !i.repeat } : i));
  const clearHist = () => { saveHist([]); setHistCount(0); toast.success('Idea memory cleared'); };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2"><Lightbulb className="w-6 h-6 text-yellow-400" />AI Idea Generator</h1>
            <p className="text-sm text-muted-foreground">Fresh ideas every time — it remembers {histCount} past idea{histCount === 1 ? '' : 's'} and won't repeat them.</p>
          </div>
          {histCount > 0 && <Button size="sm" variant="ghost" onClick={clearHist}><Trash2 className="w-3.5 h-3.5 mr-1" />Reset memory</Button>}
        </div>
        {isOwner && (
          <div className="flex flex-wrap gap-1.5 p-1 bg-secondary rounded-lg w-fit">
            {KINDS.map(([k, label]) => (
              <button key={k} disabled={loading} onClick={() => { setKind(k); generate(focus, k); }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${kind === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{label}</button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input placeholder={kind === 'site' ? "Optional part, e.g. 'Shop'" : "Optional focus, e.g. 'something for Halloween'"} value={focus} onChange={e => setFocus(e.target.value)} onKeyDown={e => e.key === 'Enter' && generate()} />
          <Button onClick={() => generate()} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-1" />Generate</>}</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(kind === 'site' ? SECTIONS : FOCUS).map(f => <Button key={f} size="sm" variant="outline" disabled={loading} onClick={() => { setFocus(f); generate(f); }}>{f}</Button>)}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {loading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          {!loading && list.map((i, idx) => (
            <div key={idx} className={`bg-card border rounded-xl p-4 space-y-2 ${i.repeat ? 'border-orange-500/60 opacity-75' : 'border-border'}`}>
              <div className="flex items-start gap-2">
                <span className="text-2xl">{i.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{i.title}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{i.section}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${ACTION_STYLE[i.action] || 'bg-secondary'}`}>{i.action}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{i.effort}</span>
                    {i.repeat && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-500 font-semibold">Repeat</span>}
                  </div>
                </div>
                <button title={i.repeat ? 'Unmark repeat' : 'Mark as repeated'} onClick={() => toggleRepeat(idx)} className={i.repeat ? 'text-orange-500' : 'text-muted-foreground hover:text-foreground'}><Repeat className="w-4 h-4" /></button>
                <button onClick={() => { navigator.clipboard.writeText(`${i.title}: ${i.description}`); toast.success('Copied'); }} className="text-muted-foreground hover:text-foreground"><Copy className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-muted-foreground">{i.description}</p>
            </div>
          ))}
          {!loading && list.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-10">Hit Generate to get 6 ideas.</p>}
        </div>
      </div>
    </div>
  );
}
