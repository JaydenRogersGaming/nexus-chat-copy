import { useState } from 'react';
import { ImageIcon, Lock, Loader2, Upload } from 'lucide-react';
import { useUpload } from 'zitejs/upload';
import { Button } from '@project/components/ui/button';
import { toast } from 'sonner';
import { useApp } from '../contexts/AppContext';
import { isOwnerEmail } from '../lib/gameData';
import * as P from '../lib/personalize';

export default function CustomBackground() {
  const { profile, addGems } = useApp();
  const { upload, isUploading } = useUpload();
  const [url, setUrl] = useState(() => (profile ? P.getCustomBg(profile.email) : ''));
  const [, bump] = useState(0);
  if (!profile) return null;
  const unlocked = isOwnerEmail(profile.email) || P.hasCustomBg(profile.email);

  function buy() {
    if (profile!.gems < P.CUSTOM_BG_PRICE) { toast.error(`You need ${P.CUSTOM_BG_PRICE} gems`); return; }
    addGems(-P.CUSTOM_BG_PRICE);
    P.unlockCustomBg(profile!.email);
    bump(n => n + 1);
    toast.success('Custom background unlocked forever!');
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Pick an image file'); return; }
    try {
      const res = await upload(file);
      setUrl(res.url);
      P.setCustomBg(profile!.email, res.url);
      toast.success('Background set!');
    } catch {
      toast.error('Upload failed, try again');
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-1"><ImageIcon className="w-4 h-4" />Custom Background</h3>
      {unlocked ? (
        <div className="space-y-2">
          {url && <div className="h-24 rounded-lg border border-border bg-cover bg-center" style={{ backgroundImage: `url(${url})` }} />}
          <div className="flex gap-2">
            <label className="flex-1">
              <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={isUploading} />
              <span className="h-8 w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium cursor-pointer">
                {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {url ? 'Change picture' : 'Upload picture'}
              </span>
            </label>
            {url && <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setUrl(''); P.setCustomBg(profile.email, ''); }}>Remove</Button>}
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl border border-border bg-secondary/30 text-center">
          <Lock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground mb-2">Use your own picture as the app background. Pay once, keep it forever.</p>
          <Button size="sm" className="h-8 text-xs" onClick={buy}>Unlock for 💎 {P.CUSTOM_BG_PRICE}</Button>
        </div>
      )}
    </div>
  );
}
