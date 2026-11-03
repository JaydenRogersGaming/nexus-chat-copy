import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Ban, ShieldAlert, Undo2 } from 'lucide-react';
import { ipBans, IpBansOutputType } from 'zitejs/api';
import { Input } from '@project/components/ui/input';
import { Button } from '@project/components/ui/button';
import { Badge } from '@project/components/ui/badge';
import { Skeleton } from '@project/components/ui/skeleton';
import { Card } from '@project/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@project/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@project/components/ui/alert-dialog';
import { errMsg, when } from '../../hooks/usePermissions';

type Data = IpBansOutputType;
const DURATIONS = [['1h', '1 hour'], ['24h', '24 hours'], ['7d', '7 days'], ['30d', '30 days'], ['permanent', 'Permanent']] as const;
type Dur = typeof DURATIONS[number][0];

export default function IpBansTab() {
  const [data, setData] = useState<Data | null>(null);
  const [ip, setIp] = useState('');
  const [duration, setDuration] = useState<Dur>('24h');
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [unbanId, setUnbanId] = useState<string | null>(null);
  const run = (p: Parameters<typeof ipBans>[0], ok?: string) => ipBans(p).then(r => { setData(r); if (ok) toast.success(ok); return true; }).catch(e => { toast.error(errMsg(e)); return false; });
  useEffect(() => { run({ action: 'list' }); }, []);

  async function doBan() {
    setConfirm(false);
    if (await run({ action: 'ban', ip: ip.trim(), duration, reason: reason.trim() }, `Banned ${ip}`)) { setIp(''); setReason(''); }
  }

  if (!data) return <Skeleton className="h-64" />;
  return (
    <div className="space-y-5">
      {!data.fullIps && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" />IP addresses are partly hidden. Only Admins can see full IPs and ban them.</p>}
      {data.canBan && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Ban an IP address</h3>
          <div className="grid gap-2 md:grid-cols-[1fr_160px]">
            <Input placeholder="e.g. 203.0.113.7" value={ip} onChange={e => setIp(e.target.value)} maxLength={45} />
            <Select value={duration} onValueChange={v => setDuration(v as Dur)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DURATIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Input placeholder="Reason (required)" value={reason} onChange={e => setReason(e.target.value)} maxLength={500} />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">Safeguard: your own IP and any IP a staff member uses can't be banned.</p>
            <Button variant="destructive" disabled={!ip.trim() || !reason.trim()} onClick={() => setConfirm(true)}><Ban className="w-4 h-4 mr-1" />Ban</Button>
          </div>
        </Card>
      )}

      <section className="space-y-2">
        <h3 className="font-semibold text-sm">IP bans</h3>
        <div className="border border-border rounded-lg overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>IP</TableHead><TableHead>Reason</TableHead><TableHead>By</TableHead><TableHead>Expires</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>{data.bans.map(b => (
            <TableRow key={b.id} className={b.active ? '' : 'opacity-50'}>
              <TableCell className="font-mono text-xs">{b.ip}</TableCell>
              <TableCell className="text-xs max-w-xs truncate">{b.reason}</TableCell>
              <TableCell className="text-xs">{b.bannedBy}</TableCell>
              <TableCell className="text-xs whitespace-nowrap">{b.expiresAt ? when(b.expiresAt) : 'Never'}{!b.active && ' (expired)'}</TableCell>
              <TableCell className="text-right">{data.canBan && <Button size="sm" variant="ghost" onClick={() => setUnbanId(b.id)}><Undo2 className="w-3.5 h-3.5 mr-1" />Remove</Button>}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>{!data.bans.length && <p className="text-sm text-muted-foreground py-6 text-center">No IP bans.</p>}</div>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-sm">Recent IP addresses</h3>
        <div className="border border-border rounded-lg overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>IP</TableHead><TableHead>Accounts</TableHead><TableHead>Last seen</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>{data.sightings.map(s => (
            <TableRow key={s.ip + s.lastSeen}>
              <TableCell className="font-mono text-xs">{s.ip} {s.staff && <Badge variant="outline" className="ml-1">staff</Badge>}{s.banned && <Badge variant="destructive" className="ml-1">banned</Badge>}</TableCell>
              <TableCell className="text-xs">{s.emails.join(', ')}</TableCell>
              <TableCell className="text-xs whitespace-nowrap">{when(s.lastSeen)}</TableCell>
              <TableCell className="text-right">{data.canBan && !s.staff && !s.banned && <Button size="sm" variant="ghost" onClick={() => setIp(s.ip)}>Use</Button>}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table></div>
      </section>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Ban {ip}?</AlertDialogTitle><AlertDialogDescription>Everyone on this IP will be blocked for {DURATIONS.find(d => d[0] === duration)?.[1].toLowerCase()}. This is logged.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={doBan}>Ban IP</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!unbanId} onOpenChange={o => !o && setUnbanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove this IP ban?</AlertDialogTitle><AlertDialogDescription>People on that IP will be able to use the app again.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (unbanId) run({ action: 'unban', banId: unbanId }, 'Ban removed'); setUnbanId(null); }}>Remove ban</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
