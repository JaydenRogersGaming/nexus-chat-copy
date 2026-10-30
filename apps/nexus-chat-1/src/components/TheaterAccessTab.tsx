import { useEffect, useState } from 'react';
import { Clapperboard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { watchParty } from 'zitejs/api';
import { Checkbox } from '@project/components/ui/checkbox';
import { Button } from '@project/components/ui/button';

const ROLES = ['co-owner', 'admin', 'senior-mod', 'mod', 'guardian', 'helper', 'vip', 'user'];

/** Owner panel: choose which roles may start movies in the Theater. */
export default function TheaterAccessTab() {
  const [roles, setRoles] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { watchParty({ action: 'access' }).then(r => setRoles(r.allowedRoles || [])).catch(() => setRoles([])); }, []);
  const toggle = (r: string) => setRoles(cur => cur!.includes(r) ? cur!.filter(x => x !== r) : [...cur!, r]);
  async function save() {
    setSaving(true);
    try { const r = await watchParty({ action: 'setRoles', roles: roles! }); setRoles(r.allowedRoles || []); toast.success('Theater access saved'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save'); } finally { setSaving(false); }
  }
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 font-semibold"><Clapperboard className="h-4 w-4" />Who can start movies in Theater</p>
      <p className="text-xs text-muted-foreground">The owner can always start movies. Everyone else can only watch movies that are already playing.</p>
      {roles === null ? <Loader2 className="h-4 w-4 animate-spin" /> : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ROLES.map(r => (
            <label key={r} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm capitalize">
              <Checkbox checked={roles.includes(r)} onCheckedChange={() => toggle(r)} />{r.replace('-', ' ')}
            </label>
          ))}
        </div>
      )}
      <Button size="sm" onClick={save} disabled={!roles || saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save</Button>
    </div>
  );
}
