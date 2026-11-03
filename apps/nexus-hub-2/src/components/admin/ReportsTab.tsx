import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { reports, ReportsOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Badge } from '@project/components/ui/badge';
import { Skeleton } from '@project/components/ui/skeleton';
import { Card } from '@project/components/ui/card';
import { Input } from '@project/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { errMsg, when } from '../../hooks/usePermissions';

type R = ReportsOutputType['reports'][number];

export default function ReportsTab() {
  const [items, setItems] = useState<R[] | null>(null);
  const [filter, setFilter] = useState('Open');
  const [notes, setNotes] = useState<Record<string, string>>({});
  useEffect(() => { reports({ action: 'list' }).then(r => setItems(r.reports)).catch(e => toast.error(errMsg(e))); }, []);

  async function review(r: R, status: 'Resolved' | 'Dismissed' | 'Open') {
    try { const res = await reports({ action: 'review', id: r.id, status, note: notes[r.id] || '' }); setItems(res.reports); toast.success(`Report ${status.toLowerCase()}`); }
    catch (e) { toast.error(errMsg(e)); }
  }

  if (!items) return <Skeleton className="h-48" />;
  const shown = items.filter(r => filter === 'All' || r.status === filter);
  return (
    <div className="space-y-3">
      <Tabs value={filter} onValueChange={setFilter}><TabsList>
        {['Open', 'Resolved', 'Dismissed', 'All'].map(s => <TabsTrigger key={s} value={s}>{s}{s === 'Open' && ` (${items.filter(r => r.status === 'Open').length})`}</TabsTrigger>)}
      </TabsList></Tabs>
      {!shown.length && <p className="text-sm text-muted-foreground py-10 text-center">Nothing here.</p>}
      {shown.map(r => (
        <Card key={r.id} className="p-4 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{r.targetType}</Badge>
            <span className="font-semibold">{r.subject}</span>
            <Badge variant={r.status === 'Open' ? 'destructive' : 'secondary'} className="ml-auto">{r.status}</Badge>
          </div>
          <p className="text-sm whitespace-pre-wrap">{r.reason}</p>
          <p className="text-xs text-muted-foreground">From {r.reporterEmail} · {when(r.reportedAt)}{r.reviewedBy && ` · reviewed by ${r.reviewedBy}`}</p>
          {r.resolutionNote && <p className="text-xs border-l-2 border-border pl-2">{r.resolutionNote}</p>}
          {r.status === 'Open' ? (
            <div className="flex gap-2 flex-wrap">
              <Input className="flex-1 min-w-[180px] h-8" placeholder="Note (optional)" value={notes[r.id] || ''} onChange={e => setNotes({ ...notes, [r.id]: e.target.value })} maxLength={1000} />
              <Button size="sm" onClick={() => review(r, 'Resolved')}>Resolve</Button>
              <Button size="sm" variant="outline" onClick={() => review(r, 'Dismissed')}>Dismiss</Button>
            </div>
          ) : <Button size="sm" variant="ghost" onClick={() => review(r, 'Open')}>Reopen</Button>}
        </Card>
      ))}
    </div>
  );
}
