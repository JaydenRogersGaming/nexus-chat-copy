import { useState } from 'react';
import { Lightbulb, Loader2, Sparkles, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { ideas as ideasApi, IdeasOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Skeleton } from '@project/components/ui/skeleton';
import { useAuth } from 'zitejs/auth';
import { isOwnerEmail } from '../lib/gameData';

const FOCUS = ['Games', 'Chat features', 'Making money with gems', 'Staff tools', 'Customization', 'Events'];

type Kind = 'features' | 'roles' | 'events' | 'tabs' | 'future' | 'titles' | 'typing';
const KINDS: [Kind, string][] = [['features', '✨ Features'], ['roles', '🛡️ New roles'], ['tabs', '🗂️ New tabs'], ['future', '🚀 Future roadmap'], ['events', '🎃 Theme events'], ['titles', '🏷️ Titles'], ['typing', '⌨️ Typing effects']];

export default function IdeasPage() {
  const { user } = useAuth();
  const isOwner = isOwnerEmail(user?.email?.toLowerCase());
  const [kind, setKind] = useState<Kind>('features');
  const [focus, setFocus] = useState('');
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<IdeasOutputType['ideas']>([]);

  const generate = async (f = focus, k = kind) => {
    setLoading(true);
    try { setList((await ideasApi({ focus: f || undefined, kind: k })).ideas); }
    catch (e) { toast.error((e as { userFacingMessage?: string }).userFacingMessage || 'Could not get ideas — try again'); }
    finally { setLoading(false); }
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><Lightbulb className="w-6 h-6 text-yellow-400" />AI Idea Generator</h1>
          <p className="text-sm text-muted-foreground">Stuck on what to add next? Get fresh feature ideas for Nexus.</p>
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
          <Input placeholder="Optional focus, e.g. 'something for Halloween'" value={focus} onChange={e => setFocus(e.target.value)} onKeyDown={e => e.key === 'Enter' && generate()} />
          <Button onClick={() => generate()} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-1" />Generate</>}</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {FOCUS.map(f => <Button key={f} size="sm" variant="outline" disabled={loading} onClick={() => { setFocus(f); generate(f); }}>{f}</Button>)}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {loading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          {!loading && list.map((i, idx) => (
            <div key={idx} className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-2xl">{i.emoji}</span>
                <div className="flex-1"><p className="font-bold text-sm">{i.title}</p><span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{i.effort}</span></div>
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
