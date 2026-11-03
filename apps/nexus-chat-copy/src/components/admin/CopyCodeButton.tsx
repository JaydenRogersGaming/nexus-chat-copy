import { useState } from 'react';
import { Button } from '@project/components/ui/button';
import { Copy, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Served as a static file, so it only downloads when the owner clicks.
const fetchCode = async () => {
  const res = await fetch(`/ALL_CODE.txt?t=${Date.now()}`);
  if (!res.ok) throw new Error('missing');
  return res.text();
};

export default function CopyCodeButton() {
  const [busy, setBusy] = useState(false);

  const copy = async () => {
    setBusy(true);
    try {
      // Passing a promise keeps the click "fresh" so browsers allow the copy after the download
      if (window.ClipboardItem) {
        const blob = fetchCode().then(t => new Blob([t], { type: 'text/plain' }));
        await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
      } else {
        await navigator.clipboard.writeText(await fetchCode());
      }
      toast.success('All code copied to your clipboard!');
    } catch {
      toast.error("Your browser blocked copying — use the download button instead");
    } finally { setBusy(false); }
  };

  const download = async () => {
    setBusy(true);
    try {
      const url = URL.createObjectURL(new Blob([await fetchCode()], { type: 'text/plain' }));
      const a = document.createElement('a');
      a.href = url; a.download = 'nexus-chat-code.txt';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success('Download started');
    } catch {
      toast.error("Couldn't load the code file");
    } finally { setBusy(false); }
  };

  return (
    <div className="ml-auto flex gap-2">
      <Button size="sm" variant="outline" onClick={copy} disabled={busy}>
        {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Copy className="w-3.5 h-3.5 mr-1" />}Copy all code
      </Button>
      <Button size="sm" variant="outline" onClick={download} disabled={busy}><Download className="w-3.5 h-3.5 mr-1" />Download</Button>
    </div>
  );
}
