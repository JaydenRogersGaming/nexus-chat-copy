import { useEffect, useState } from 'react';
import { Globe, Loader2, Copy, ExternalLink, RefreshCw, Trash2, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { sites, SitesOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { useApp } from '../../contexts/AppContext';
import { applySettings } from '../../lib/siteSettings';
import type { Project } from '../../lib/builderProjects';

export const MONTHLY_COST = 1000;
type Site = SitesOutputType['sites'][0];

/** Publish for free (first month included), then 1,000 💎/month to keep it online. */
export default function PublishPanel({ project, onLinked }: { project: Project; onLinked: (siteId: string, slug: string) => void }) {
  const { profile, addGems } = useApp();
  const [list, setList] = useState<Site[]>([]);
  const [busy, setBusy] = useState(false);
  const html = project.versions.at(-1)?.html ?? '';
  const live = list.find(s => s.id === project.siteId);
  const url = live ? `${window.location.origin}/site/${live.slug}` : '';

  useEffect(() => { sites({ action: 'mine' }).then(r => setList(r.sites)).catch(() => {}); }, []);

  const call = async (fn: () => Promise<SitesOutputType>, ok: string) => {
    setBusy(true);
    try { const r = await fn(); setList(r.sites); toast.success(ok); return r; }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Something went wrong'); return null; }
    finally { setBusy(false); }
  };
  const publish = async () => {
    const before = new Set(list.map(s => s.id));
    const r = await call(() => sites({ action: 'publish', id: live?.id, name: project.name, html: applySettings(html, project.settings), settings: JSON.stringify(project.settings) }),
      live ? 'Update published!' : '🚀 Published! Your first month is free.');
    const made = (r?.sites as Site[] | undefined)?.find((s: Site) => !before.has(s.id));
    if (made) onLinked(made.id, made.slug);
  };
  const renew = async () => {
    if (!profile || profile.gems < MONTHLY_COST) { toast.error(`You need ${MONTHLY_COST.toLocaleString()} 💎 to keep it online for another month`); return; }
    const r = await call(() => sites({ action: 'renew', id: live!.id }), '+1 month added');
    if (r) addGems(-MONTHLY_COST, { noBonus: true });
  };

  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-lg bg-primary/10 p-3 text-xs space-y-1">
        <p className="font-semibold">Publishing is free 🎉</p>
        <p className="text-muted-foreground">Your first month online is free. After that it costs <b>{MONTHLY_COST.toLocaleString()} 💎 a month</b> to keep it published.</p>
      </div>
      {live ? (
        <div className="rounded-lg border border-border p-3 space-y-2">
          <p className={`text-xs font-semibold ${live.active ? 'text-green-500' : 'text-destructive'}`}>{live.active ? '● Live' : '● Offline — renew to bring it back'}</p>
          <p className="text-xs break-all font-mono">{url}</p>
          <p className="text-[11px] text-muted-foreground">{live.active ? `Paid until ${format(new Date(live.paidUntil), 'MMM d, yyyy')} (${formatDistanceToNow(new Date(live.paidUntil))} left)` : 'Expired'} · {live.views.toLocaleString()} views</p>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast.success('Link copied'); }}><Copy className="w-3.5 h-3.5" /></Button>
            <Button size="sm" variant="outline" onClick={() => window.open(url, '_blank')}><ExternalLink className="w-3.5 h-3.5" /></Button>
            <Button size="sm" variant="outline" className="flex-1" disabled={busy} onClick={renew}><RefreshCw className="w-3.5 h-3.5 mr-1" />+1 month · {MONTHLY_COST.toLocaleString()} 💎</Button>
          </div>
        </div>
      ) : null}
      <Button className="w-full" disabled={busy || !html} onClick={publish}>
        {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : live ? <Globe className="w-4 h-4 mr-1" /> : <Rocket className="w-4 h-4 mr-1" />}{live ? 'Publish latest changes' : 'Publish for free'}
      </Button>
      {live && <Button size="sm" variant="ghost" className="w-full text-destructive" disabled={busy} onClick={() => call(() => sites({ action: 'unpublish', id: live.id }), 'Unpublished').then(r => r && onLinked('', ''))}><Trash2 className="w-3.5 h-3.5 mr-1" />Unpublish</Button>}
    </div>
  );
}
