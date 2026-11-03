import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { adminUsers, AdminUsersOutputType } from 'zitejs/api';
import { Input } from '@project/components/ui/input';
import { Button } from '@project/components/ui/button';
import { Badge } from '@project/components/ui/badge';
import { Skeleton } from '@project/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@project/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Textarea } from '@project/components/ui/textarea';
import { errMsg } from '../../hooks/usePermissions';

type U = AdminUsersOutputType['users'][number];
const ROLES = ['Customer', 'Seller', 'Moderator', 'Admin'] as const;
const RESTRICTIONS = ['None', 'Muted', 'Selling Disabled', 'Suspended'] as const;

export default function UsersTab({ canAssign }: { canAssign: boolean }) {
  const [users, setUsers] = useState<U[] | null>(null);
  const [q, setQ] = useState('');
  const [restricting, setRestricting] = useState<U | null>(null);
  const [restriction, setRestriction] = useState<typeof RESTRICTIONS[number]>('None');
  const [reason, setReason] = useState('');
  const search = useDebouncedCallback((s: string) => adminUsers({ action: 'search', q: s }).then(r => setUsers(r.users)).catch(e => toast.error(errMsg(e))), 300);
  useEffect(() => { search(''); }, []);

  async function setRole(u: U, role: typeof ROLES[number]) {
    try { const r = await adminUsers({ action: 'setRole', email: u.email, marketRole: role, q }); setUsers(r.users); toast.success(`${u.name} is now ${role}`); }
    catch (e) { toast.error(errMsg(e)); }
  }
  async function saveRestriction() {
    if (!restricting) return;
    try { const r = await adminUsers({ action: 'restrict', email: restricting.email, restriction, reason: reason.trim(), q }); setUsers(r.users); toast.success('Restriction saved'); setRestricting(null); }
    catch (e) { toast.error(errMsg(e)); }
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search name or email" value={q} onChange={e => { setQ(e.target.value); search(e.target.value); }} /></div>
      {!users ? <Skeleton className="h-48" /> : (
        <div className="border border-border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Chat role</TableHead><TableHead>Market role</TableHead><TableHead>Restriction</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>{users.map(u => (
              <TableRow key={u.email}>
                <TableCell><div className="font-medium">{u.name}</div><div className="text-xs text-muted-foreground">{u.email}</div></TableCell>
                <TableCell><Badge variant="outline">{u.chatRole}</Badge></TableCell>
                <TableCell>
                  {canAssign ? (
                    <Select value={u.marketRole} onValueChange={v => setRole(u, v as typeof ROLES[number])}>
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : <Badge variant="secondary">{u.marketRole}</Badge>}
                </TableCell>
                <TableCell>{u.restriction === 'None' ? <span className="text-xs text-muted-foreground">—</span> : <Badge variant="destructive" title={u.restrictionReason}>{u.restriction}</Badge>}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => { setRestricting(u); setRestriction(u.restriction as typeof RESTRICTIONS[number]); setReason(u.restrictionReason); }}>Restrict</Button></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
          {!users.length && <p className="text-sm text-muted-foreground py-8 text-center">No users found.</p>}
        </div>
      )}
      <Dialog open={!!restricting} onOpenChange={o => !o && setRestricting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Account restriction — {restricting?.name}</DialogTitle></DialogHeader>
          <Select value={restriction} onValueChange={v => setRestriction(v as typeof RESTRICTIONS[number])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{RESTRICTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
          <Textarea rows={3} placeholder="Reason (required unless removing)" value={reason} onChange={e => setReason(e.target.value)} maxLength={500} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestricting(null)}>Cancel</Button>
            <Button onClick={saveRestriction} disabled={restriction !== 'None' && !reason.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
