import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Pause, Play, Trash2 } from 'lucide-react';
import { listings, ListingsOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Badge } from '@project/components/ui/badge';
import { Skeleton } from '@project/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@project/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@project/components/ui/alert-dialog';
import ListingForm from './ListingForm';
import { errMsg, money } from '../../hooks/usePermissions';

type Listing = ListingsOutputType['listings'][number];

export default function MyListings() {
  const [items, setItems] = useState<Listing[] | null>(null);
  const [editing, setEditing] = useState<Listing | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [removing, setRemoving] = useState<Listing | null>(null);
  const load = () => listings({ action: 'mine' }).then(r => setItems(r.listings)).catch(e => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []);

  async function setStatus(l: Listing, status: 'Active' | 'Paused' | 'Removed') {
    const prev = items;
    setItems(it => (it ?? []).flatMap(x => x.id !== l.id ? [x] : status === 'Removed' ? [] : [{ ...x, status }]));
    try { await listings({ action: 'setStatus', id: l.id, status }); toast.success(status === 'Removed' ? 'Listing removed' : `Listing ${status.toLowerCase()}`); }
    catch (e) { setItems(prev); toast.error(errMsg(e)); }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4 mr-1" />New listing</Button></div>
      {!items ? <Skeleton className="h-40" /> : !items.length ? <p className="text-sm text-muted-foreground py-10 text-center">You haven't listed anything yet.</p> : (
        <div className="border border-border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Title</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Stock</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>{items.map(l => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.title}</TableCell>
                <TableCell className="text-right">{money(l.price)}</TableCell>
                <TableCell className="text-right">{l.inventory}</TableCell>
                <TableCell><Badge variant={l.status === 'Active' ? 'default' : 'secondary'}>{l.status}</Badge></TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(l); setFormOpen(true); }} title="Edit"><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setStatus(l, l.status === 'Active' ? 'Paused' : 'Active')} title={l.status === 'Active' ? 'Pause' : 'Resume'}>{l.status === 'Active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setRemoving(l)} title="Remove"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      )}
      {formOpen && <ListingForm open={formOpen} editing={editing} onClose={() => setFormOpen(false)} onSaved={load} />}
      <AlertDialog open={!!removing} onOpenChange={o => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove “{removing?.title}”?</AlertDialogTitle><AlertDialogDescription>Buyers won't see it anymore. Past orders are kept.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (removing) setStatus(removing, 'Removed'); setRemoving(null); }}>Remove</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
