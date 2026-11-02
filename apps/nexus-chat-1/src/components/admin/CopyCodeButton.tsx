import { useState } from 'react';
import { Button } from '@project/components/ui/button';
import { Copy, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Loaded only when clicked, so normal visitors never download the code file.
const loadCode = async () => (await import('../../../ALL_CODE.txt?raw')).default as string;

export default function CopyCodeButton() {
  const [busy, setBusy] = useState(false);

  const copy = async () => {
    setBusy(true);
    try {
      await navigator.clipboard.writeText(await loadCode());
      toast.success('All code copied to your clipboard!');
    } catch {
      toast.error("Couldn't copy — try Download instead");
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    const url = URL.createObjectURL(new Blob([await loadCode()], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'nexus-chat-code.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ml-auto flex gap-2">
      <Button size="sm" variant="outline" onClick={copy} disabled={busy}>
        {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Copy className="w-3.5 h-3.5 mr-1" />}Copy all code
      </Button>
      <Button size="sm" variant="ghost" onClick={download}><Download className="w-3.5 h-3.5" /></Button>
    </div>
  );
}
