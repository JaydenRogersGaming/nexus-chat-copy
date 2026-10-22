import { useRef } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { useUpload } from 'zitejs/upload';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';

export default function PhotoUploadButton({ onUploaded }: { onUploaded: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const { upload, isUploading } = useUpload();

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please pick an image file'); return; }
    try {
      const { url } = await upload(file);
      onUploaded(url);
    } catch { toast.error('Upload failed'); }
  }

  return (
    <>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onChange} />
      <Button type="button" variant="ghost" size="icon" title="Upload a picture" disabled={isUploading} onClick={() => ref.current?.click()}>
        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
      </Button>
    </>
  );
}
