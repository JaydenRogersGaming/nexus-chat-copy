import { useEffect, useState } from 'react';
import { Sparkles, Bug, Wrench, Rocket } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@project/components/ui/dialog';
import { CHANGELOG, APP_VERSION } from '../lib/changelog';
import { useAuth } from 'zitejs/auth';
import { isOwnerEmail } from '../lib/permissions';

const hideIdeas = (items: string[], owner: boolean) => owner ? items : items.filter(i => !/idea generator/i.test(i));

const SEEN = 'nexus_seen_version';

function Section({ icon, label, items, tone }: { icon: React.ReactNode; label: string; items: string[]; tone: string }) {
  if (!items.length) return null;
  return (
    <div>
      <p className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 mb-1 ${tone}`}>{icon}{label}</p>
      <ul className="space-y-1">{items.map(i => <li key={i} className="text-sm text-muted-foreground pl-3 border-l-2 border-border">{i}</li>)}</ul>
    </div>
  );
}

/** Sidebar version chip + changelog dialog. Auto-opens once after a new version. */
export default function WhatsNew() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const fresh = localStorage.getItem(SEEN) !== APP_VERSION;
  useEffect(() => { if (fresh) setOpen(true); }, [fresh]);
  const close = (v: boolean) => { setOpen(v); if (!v) localStorage.setItem(SEEN, APP_VERSION); };

  return (
    <>
      <button onClick={() => setOpen(true)} className="px-3 py-2 border-t border-border hover:bg-secondary transition-colors flex items-center gap-2 text-xs text-muted-foreground w-full">
        <Rocket className="w-3.5 h-3.5" /> What's new
        <span className="ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary">v{APP_VERSION}</span>
        {fresh && <span className="w-2 h-2 rounded-full bg-primary" />}
      </button>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />What's new in Nexus</DialogTitle>
          <div className="space-y-6">
            {CHANGELOG.map((r, i) => (
              <div key={r.version} className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-sm font-bold">v{r.version}</span>
                  {i === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-bold">LATEST</span>}
                  <span className="text-xs text-muted-foreground ml-auto">{r.date}</span>
                </div>
                <p className="font-semibold">{r.title}</p>
                <Section icon={<Sparkles className="w-3 h-3" />} label="New" items={hideIdeas(r.added, isOwnerEmail(user?.email))} tone="text-green-500" />
                <Section icon={<Bug className="w-3 h-3" />} label="Bug fixes" items={r.fixed} tone="text-red-500" />
                <Section icon={<Wrench className="w-3 h-3" />} label="Changes" items={r.changed} tone="text-blue-500" />
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground text-center border-t border-border pt-3">© 2026–2050 Nexus Hub. All rights reserved.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
