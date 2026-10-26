import { useEffect, useState, useCallback } from 'react';
import { Bell, Megaphone, MessageCircle, UserPlus, Check, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@project/components/ui/popover';
import { Button } from '@project/components/ui/button';
import { friends as friendsApi } from 'zitejs/api';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import * as DB from '../lib/storage';
import { useApp } from '../contexts/AppContext';

const SEEN_KEY = 'nexus_seen_updates';
const getSeen = (): string[] => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch { return []; } };

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="py-2">
      <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">{icon}{title}</p>
      {children}
    </div>
  );
}

export default function NotificationBell() {
  const { profile } = useApp();
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<string[]>([]);
  const [msgs, setMsgs] = useState<DB.Notification[]>([]);
  const [updates, setUpdates] = useState<DB.Announcement[]>([]);
  const [seen, setSeen] = useState<string[]>(getSeen);

  const refresh = useCallback(() => {
    if (!profile) return;
    setMsgs(DB.getNotifications(profile.email).slice(0, 15));
    setUpdates(DB.getAnnouncements().slice(0, 10));
    friendsApi({ action: 'list' }).then(r => setRequests(r.incoming)).catch(() => {});
  }, [profile?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { refresh(); const t = setInterval(refresh, 15000); return () => clearInterval(t); }, [refresh]);

  const unreadMsgs = msgs.filter(m => !m.read).length;
  const newUpdates = updates.filter(u => !seen.includes(u.id)).length;
  const total = requests.length + unreadMsgs + newUpdates;

  function onOpenChange(v: boolean) {
    setOpen(v);
    if (!v && profile) {
      DB.markNotificationsRead(profile.email);
      const next = updates.map(u => u.id);
      localStorage.setItem(SEEN_KEY, JSON.stringify(next));
      setSeen(next);
      refresh();
    }
  }

  async function respond(email: string, action: 'accept' | 'remove') {
    try { const r = await friendsApi({ action, email }); setRequests(r.incoming); toast.success(action === 'accept' ? 'Friend added!' : 'Request declined'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Something went wrong'); }
  }

  const empty = <p className="px-3 py-1 text-xs text-muted-foreground italic">Nothing here</p>;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button title="Notifications" className="relative h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors">
          <Bell className="w-4 h-4" />
          {total > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">{total > 9 ? '9+' : total}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 max-h-[70vh] overflow-y-auto divide-y divide-border">
        <p className="px-3 py-2.5 font-bold text-sm">Notifications</p>
        <Section icon={<UserPlus className="w-3 h-3" />} title="Friend requests">
          {requests.length === 0 ? empty : requests.map(e => (
            <div key={e} className="px-3 py-1.5 flex items-center gap-2 text-xs">
              <span className="flex-1 truncate font-medium">{DB.getUser(e)?.name || e}</span>
              <Button size="icon" className="h-6 w-6" onClick={() => respond(e, 'accept')}><Check className="w-3 h-3" /></Button>
              <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => respond(e, 'remove')}><X className="w-3 h-3" /></Button>
            </div>
          ))}
        </Section>
        <Section icon={<MessageCircle className="w-3 h-3" />} title="Messages">
          {msgs.length === 0 ? empty : msgs.map(m => (
            <div key={m.id} className={`px-3 py-1.5 text-xs ${m.read ? 'opacity-60' : ''}`}>
              <p><span className="font-semibold">{m.senderName}</span> <span className="text-muted-foreground">in {m.roomName} · {formatDistanceToNow(m.timestamp, { addSuffix: true })}</span></p>
              <p className="truncate text-muted-foreground">{m.messagePreview}</p>
            </div>
          ))}
        </Section>
        <Section icon={<Megaphone className="w-3 h-3" />} title="Updates & announcements">
          {updates.length === 0 ? empty : updates.map(u => (
            <div key={u.id} className="px-3 py-1.5 text-xs">
              <p className="font-semibold flex items-center gap-1.5">{!seen.includes(u.id) && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}{u.title}</p>
              {u.content && <p className="text-muted-foreground line-clamp-2 whitespace-pre-wrap">{u.content}</p>}
              <p className="text-[10px] text-muted-foreground mt-0.5">{formatDistanceToNow(u.timestamp, { addSuffix: true })}</p>
            </div>
          ))}
        </Section>
      </PopoverContent>
    </Popover>
  );
}
