import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { auditLog, AuditLogOutputType } from 'zitejs/api';
import { Input } from '@project/components/ui/input';
import { Badge } from '@project/components/ui/badge';
import { Skeleton } from '@project/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@project/components/ui/table';
import { errMsg, when } from '../../hooks/usePermissions';

type A = AuditLogOutputType['entries'][number];

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return <div className="relative max-w-sm"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} /></div>;
}

export function AuditTab() {
  const [items, setItems] = useState<A[] | null>(null);
  const [q, setQ] = useState('');
  const search = useDebouncedCallback((s: string) => auditLog({ q: s }).then(r => setItems(r.entries)).catch(e => toast.error(errMsg(e))), 300);
  useEffect(() => { search(''); }, []);
  return (
    <div className="space-y-3">
      <SearchBox value={q} onChange={v => { setQ(v); search(v); }} placeholder="Search action, person or target" />
      {!items ? <Skeleton className="h-48" /> : (
        <div className="border border-border rounded-lg overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Action</TableHead><TableHead>By</TableHead><TableHead>Target</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
          <TableBody>{items.map(a => (
            <TableRow key={a.id}>
              <TableCell className="text-xs whitespace-nowrap">{when(a.loggedAt)}</TableCell>
              <TableCell><Badge variant="outline" className="font-mono text-[10px]">{a.action}</Badge></TableCell>
              <TableCell className="text-xs">{a.actorEmail}</TableCell><TableCell className="text-xs font-mono">{a.target}</TableCell>
              <TableCell className="text-xs max-w-xs truncate" title={a.details}>{a.details}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>{!items.length && <p className="text-sm text-muted-foreground py-8 text-center">No actions logged yet.</p>}</div>
      )}
    </div>
  );
}
