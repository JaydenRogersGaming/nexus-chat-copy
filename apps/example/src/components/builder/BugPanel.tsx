import { useState } from 'react';
import { Bug, CheckCircle2, ChevronUp, Wrench, X } from 'lucide-react';
import { Button } from '@project/components/ui/button';

/** Little bug tracker strip under the preview, with a one-click AI fix. */
export default function BugPanel({ bugs, busy, onFix, onClear }: { bugs: string[]; busy: boolean; onFix: () => void; onClear: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-border bg-background">
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs">
        {bugs.length ? (
          <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 font-semibold text-destructive">
            <Bug className="w-3.5 h-3.5" />{bugs.length} bug{bugs.length > 1 ? 's' : ''} found
            <ChevronUp className={`w-3.5 h-3.5 transition-transform ${open ? '' : 'rotate-180'}`} />
          </button>
        ) : <span className="flex items-center gap-1.5 text-muted-foreground"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />No bugs found</span>}
        {bugs.length > 0 && (
          <div className="ml-auto flex gap-1">
            <Button size="sm" className="h-7 text-xs" disabled={busy} onClick={onFix}><Wrench className="w-3 h-3 mr-1" />Fix bugs with AI</Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClear} aria-label="Dismiss"><X className="w-3.5 h-3.5" /></Button>
          </div>
        )}
      </div>
      {open && bugs.length > 0 && (
        <ul className="max-h-32 overflow-y-auto px-3 pb-2 space-y-1">
          {bugs.map(b => <li key={b} className="text-[11px] font-mono text-destructive/90 bg-destructive/10 rounded px-2 py-1 break-words">{b}</li>)}
        </ul>
      )}
    </div>
  );
}
