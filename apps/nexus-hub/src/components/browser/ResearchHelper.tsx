import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { researchSummary } from 'zitejs/api';
import { Markdown } from '@project/components/markdown';
import type { Result } from './SearchViews';

export default function ResearchHelper({ query, results }: { query: string; results: Result[] }) {
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (results.length === 0) return null;
  async function run() {
    setBusy(true); setErr('');
    try { setSummary((await researchSummary({ query, results })).summary); }
    catch { setErr('Couldn\'t summarize right now. Try again.'); }
    finally { setBusy(false); }
  }
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-primary" />Research helper</p>
        {!summary && <Button size="sm" onClick={run} disabled={busy}>{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}Summarize results</Button>}
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
      {summary ? <>
        <div className="text-sm prose prose-sm dark:prose-invert max-w-none"><Markdown>{summary}</Markdown></div>
        <ol className="text-[11px] text-muted-foreground list-decimal pl-4">
          {results.slice(0, 8).map(r => <li key={r.url}><a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{r.title}</a></li>)}
        </ol>
      </> : !busy && <p className="text-xs text-muted-foreground">Get key facts from these results with numbered sources you can cite.</p>}
    </div>
  );
}
