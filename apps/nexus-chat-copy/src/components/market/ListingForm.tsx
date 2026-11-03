import { useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { listings, ListingsOutputType } from 'zitejs/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@project/components/ui/dialog';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Textarea } from '@project/components/ui/textarea';
import { Label } from '@project/components/ui/label';
import { errMsg } from '../../hooks/usePermissions';

type Listing = ListingsOutputType['listings'][number];

const schema = z.object({
  title: z.string().trim().min(3, 'At least 3 characters').max(100),
  description: z.string().trim().max(2000),
  price: z.number({ invalid_type_error: 'Enter a price' }).min(0, "Can't be negative").max(1_000_000),
  inventory: z.number({ invalid_type_error: 'Enter a number' }).int('Whole numbers only').min(0).max(100_000),
  imageUrl: z.string().url('Must be a link').or(z.literal('')),
});

export default function ListingForm({ open, onClose, editing, onSaved }: { open: boolean; onClose: () => void; editing: Listing | null; onSaved: () => void }) {
  const [f, setF] = useState({ title: editing?.title ?? '', description: editing?.description ?? '', price: String(editing?.price ?? ''), inventory: String(editing?.inventory ?? '1'), imageUrl: editing?.imageUrl ?? '' });
  const [saving, setSaving] = useState(false);
  const parsed = schema.safeParse({ ...f, price: f.price === '' ? NaN : Number(f.price), inventory: f.inventory === '' ? NaN : Number(f.inventory) });
  const errors = parsed.success ? {} : Object.fromEntries(parsed.error.issues.map(i => [i.path[0], i.message]));

  async function save() {
    if (!parsed.success) return;
    setSaving(true);
    try {
      await listings(editing ? { action: 'update', id: editing.id, data: parsed.data } : { action: 'create', data: parsed.data });
      toast.success(editing ? 'Listing updated' : 'Listing created');
      onSaved(); onClose();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  }

  const field = (k: keyof typeof f, label: string, el: React.ReactNode) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>{el}
      {f[k] !== '' && errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? 'Edit listing' : 'New listing'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {field('title', 'Title', <Input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />)}
          {field('description', 'Description', <Textarea rows={3} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />)}
          <div className="grid grid-cols-2 gap-3">
            {field('price', 'Price ($)', <Input type="number" min={0} step="0.01" value={f.price} onChange={e => setF({ ...f, price: e.target.value })} />)}
            {field('inventory', 'In stock', <Input type="number" min={0} step="1" value={f.inventory} onChange={e => setF({ ...f, inventory: e.target.value })} />)}
          </div>
          {field('imageUrl', 'Image link (optional)', <Input value={f.imageUrl} placeholder="https://…" onChange={e => setF({ ...f, imageUrl: e.target.value })} />)}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!parsed.success || saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
