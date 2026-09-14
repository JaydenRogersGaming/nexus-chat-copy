import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Button } from '@project/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { Check, X, UserMinus, MessageCircle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { toast } from 'sonner';

type Props = { open: boolean; onClose: () => void; onStartDM?: (email: string) => void };

function UserRow({ user, isOnline }: { user: DB.UserProfile; isOnline: boolean }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="relative flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
          {user.profilePic ? <img src={user.profilePic} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-primary">{(user.name[0] || '?').toUpperCase()}</span>}
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${isOnline ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: user.nameColor }}>{user.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
      </div>
    </div>
  );
}

export default function FriendsModal({ open, onClose, onStartDM }: Props) {
  const { profile } = useApp();
  const [tab, setTab] = useState('friends');
  const [, setTick] = useState(0);

  // Re-render periodically while open to reflect changes
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setTick(n => n + 1), 2000);
    return () => clearInterval(t);
  }, [open]);

  if (!profile) return null;

  const friends = DB.getFriends(profile.email);
  const incoming = DB.getPendingRequestsForUser(profile.email);
  const outgoing = DB.getOutgoingRequests(profile.email);
  const cutoff = Date.now() - 2 * 60 * 1000;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader><DialogTitle>👥 Friends</DialogTitle></DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="friends" className="flex-1 text-xs">Friends ({friends.length})</TabsTrigger>
            <TabsTrigger value="incoming" className="flex-1 text-xs relative">
              Requests
              {incoming.length > 0 && <span className="ml-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{incoming.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="outgoing" className="flex-1 text-xs">Sent ({outgoing.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-1 max-h-64 overflow-y-auto mt-3">
            {friends.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No friends yet. Click someone's name in chat to add them!</p>}
            {friends.map(email => {
              const u = DB.getUser(email);
              if (!u) return null;
              const isOnline = (u.lastSeen || 0) > cutoff;
              return (
                <div key={email} className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50">
                  <UserRow user={u} isOnline={isOnline} />
                  <div className="flex gap-1 flex-shrink-0">
                    {onStartDM && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { onStartDM(email); onClose(); }}>
                        <MessageCircle className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { DB.removeFriend(profile!.email, email); toast.success(`Removed ${u.name}`); setTick(n => n + 1); }}>
                      <UserMinus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="incoming" className="space-y-1 max-h-64 overflow-y-auto mt-3">
            {incoming.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No pending requests</p>}
            {incoming.map(req => {
              const u = DB.getUser(req.fromEmail);
              if (!u) return null;
              const isOnline = (u.lastSeen || 0) > cutoff;
              return (
                <div key={req.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50">
                  <UserRow user={u} isOnline={isOnline} />
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500 hover:text-green-500" onClick={() => { DB.acceptFriendRequest(req.id); toast.success(`You and ${u.name} are now friends! 🎉`); setTick(n => n + 1); }}>
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { DB.declineFriendRequest(req.id); toast.success('Declined'); setTick(n => n + 1); }}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="outgoing" className="space-y-1 max-h-64 overflow-y-auto mt-3">
            {outgoing.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No outgoing requests</p>}
            {outgoing.map(req => {
              const u = DB.getUser(req.toEmail);
              if (!u) return null;
              const isOnline = (u.lastSeen || 0) > cutoff;
              return (
                <div key={req.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50">
                  <UserRow user={u} isOnline={isOnline} />
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive flex-shrink-0" onClick={() => { DB.declineFriendRequest(req.id); toast.success('Cancelled'); setTick(n => n + 1); }}>
                    Cancel
                  </Button>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
