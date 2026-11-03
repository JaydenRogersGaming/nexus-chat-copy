import { useState } from 'react';
import { Ban, Send, CheckCircle2, Loader2, LogOut } from 'lucide-react';
import { logout } from 'zitejs/auth';
import { reports } from 'zitejs/api';
import { Textarea } from '@project/components/ui/textarea';
import type { BanRecord } from '../lib/storage';

export default function BanScreen({ ban }: { ban: BanRecord & { banType?: string } }) {
  const label = ban.banType === 'Hard Ban' ? 'HARD BANNED' : ban.banType === 'IP Ban' ? 'IP BANNED' : 'BANNED';
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [err, setErr] = useState('');

  async function send() {
    setState('sending');
    try {
      await reports({ action: 'create', targetType: 'Ban Appeal', targetId: ban.email, subject: `Ban appeal from ${ban.email}`, reason: `Banned by ${ban.bannedBy}${ban.reason ? ` for "${ban.reason}"` : ''}.\n\nAppeal: ${text.trim()}` });
      setState('sent');
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not send'); setState('error'); }
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-y-auto py-10">
      <div className="flex flex-col items-center gap-6 text-center px-8 w-full max-w-md">
        <div className="w-32 h-32 rounded-full border-4 border-red-600 flex items-center justify-center">
          <Ban className="w-20 h-20 text-red-600" />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-black text-red-500">{label}</h1>
          <p className="text-lg text-white/80">You have been banned by <span className="text-red-400 font-bold">{ban.bannedBy}</span></p>
          {ban.reason && <p className="text-sm text-white/60">Reason: {ban.reason}</p>}
          <p className="text-sm text-white/40">You no longer have access to this website.</p>
        </div>

        {state === 'sent' ? (
          <div className="w-full rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-green-300 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> Appeal sent! Staff will review it.
          </div>
        ) : open ? (
          <div className="w-full space-y-2 text-left">
            <label className="text-xs text-white/60">Think this was a mistake? Tell staff what happened.</label>
            <Textarea value={text} onChange={e => setText(e.target.value)} maxLength={1500} rows={5} placeholder="I think I was banned by mistake because…" className="bg-white/5 border-white/15 text-white placeholder:text-white/30" />
            {state === 'error' && <p className="text-xs text-red-400">{err}</p>}
            <div className="flex gap-2">
              <button onClick={() => setOpen(false)} className="flex-1 h-10 rounded-lg border border-white/15 text-white/70 text-sm hover:bg-white/5">Cancel</button>
              <button onClick={send} disabled={text.trim().length < 10 || state === 'sending'} className="flex-1 h-10 rounded-lg bg-red-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-red-500">
                {state === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send appeal
              </button>
            </div>
            <p className="text-[11px] text-white/30">At least 10 characters.</p>
          </div>
        ) : (
          <button onClick={() => setOpen(true)} className="w-full h-11 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-500 flex items-center justify-center gap-2">
            <Send className="w-4 h-4" /> Appeal — I think this was a mistake
          </button>
        )}

        <button onClick={() => logout()} className="flex items-center gap-2 text-sm text-white/50 hover:text-white">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  );
}
