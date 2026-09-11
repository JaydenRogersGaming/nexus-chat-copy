import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Hash, MessageCircle } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Label } from '@project/components/ui/label';
import ChatRoom from '../components/ChatRoom';
import OnlinePanel from '../components/OnlinePanel';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { cn } from '@project/components/lib/utils';
import { toast } from 'sonner';

export default function ChatPage() {
  const { profile, unreadCount, setUnreadCount, setActiveRoomId } = useApp();
  const [rooms, setRooms] = useState<DB.ChatRoom[]>([]);
  const [activeRoom, _setActiveRoom] = useState<DB.ChatRoom | null>(null);
  const activeRoomRef = useRef<DB.ChatRoom | null>(null);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [dmEmail, setDmEmail] = useState('');

  // Keep ref in sync with state so interval callbacks always see latest room
  function setActiveRoom(room: DB.ChatRoom | null) {
    activeRoomRef.current = room;
    _setActiveRoom(room);
  }

  const loadRooms = useCallback(() => {
    if (!profile) return;
    const all = DB.getChatRooms();
    const accessible = all.filter(r => r.type === 'global' || r.members.includes(profile.email));
    setRooms(accessible);

    const currentId = activeRoomRef.current?.id;
    if (currentId) {
      // Re-sync the active room object with the fresh list (keeps DMs/groups selected)
      const fresh = accessible.find(r => r.id === currentId);
      if (fresh) {
        setActiveRoom(fresh);
      } else {
        // Room was deleted or user removed — fall back to global
        const global = accessible.find(r => r.id === 'global');
        if (global) { setActiveRoom(global); setActiveRoomId('global'); }
      }
    } else {
      // No room selected yet — default to global
      const global = accessible.find(r => r.id === 'global');
      if (global) { setActiveRoom(global); setActiveRoomId('global'); }
    }
  }, [profile?.email, setActiveRoomId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadRooms();
    const t = setInterval(loadRooms, 3000);
    return () => clearInterval(t);
  }, [loadRooms]);

  function selectRoom(room: DB.ChatRoom) {
    setActiveRoom(room); setActiveRoomId(room.id);
    if (room.type === 'dm') { DB.markNotificationsRead(profile!.email); setUnreadCount(0); }
  }

  function createGroup() {
    if (!profile || !groupName.trim()) { toast.error('Enter a group name'); return; }
    const room: DB.ChatRoom = { id: crypto.randomUUID(), name: `# ${groupName.trim()}`, type: 'group', members: [profile.email], createdBy: profile.email };
    DB.addChatRoom(room);
    const up = { ...profile, groupCount: profile.groupCount + 1 }; DB.saveUser(up);
    setGroupName(''); setShowNewGroup(false); loadRooms(); toast.success('Group created!');
  }

  function createDM() {
    if (!profile || !dmEmail.trim()) { toast.error('Enter an email'); return; }
    startDMWith(dmEmail.trim());
    setDmEmail(''); setShowNewDM(false);
  }

  function startDMWith(targetEmail: string) {
    if (!profile) return;
    if (targetEmail === profile.email) { toast.error("Can't DM yourself"); return; }
    const existing = rooms.find(r => r.type === 'dm' && r.members.includes(targetEmail) && r.members.includes(profile.email));
    if (existing) { selectRoom(existing); return; }
    const targetUser = DB.getUser(targetEmail);
    const name = targetUser ? targetUser.name : targetEmail;
    const room: DB.ChatRoom = { id: crypto.randomUUID(), name: `💬 ${name}`, type: 'dm', members: [profile.email, targetEmail], createdBy: profile.email };
    DB.addChatRoom(room); loadRooms(); selectRoom(room); toast.success('DM started!');
  }

  const globalRoom = rooms.find(r => r.id === 'global');
  const groupRooms = rooms.filter(r => r.type === 'group');
  const dmRooms = rooms.filter(r => r.type === 'dm');

  return (
    <div className="flex h-full">
      {/* Room List */}
      <div className="w-52 flex-shrink-0 bg-card/50 border-r border-border flex flex-col overflow-y-auto">
        <div className="p-2 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-1">Global</p>
          {globalRoom && <RoomItem room={globalRoom} active={activeRoom?.id === globalRoom.id} onClick={() => selectRoom(globalRoom)} />}
        </div>
        <div className="p-2">
          <div className="flex items-center justify-between px-2 mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Groups</p>
            <button onClick={() => setShowNewGroup(true)} className="text-muted-foreground hover:text-foreground"><Plus className="w-3.5 h-3.5" /></button>
          </div>
          {groupRooms.map(r => <RoomItem key={r.id} room={r} active={activeRoom?.id === r.id} onClick={() => selectRoom(r)} />)}
        </div>
        <div className="p-2 flex-1">
          <div className="flex items-center justify-between px-2 mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Direct Messages</p>
            <button onClick={() => setShowNewDM(true)} className="text-muted-foreground hover:text-foreground"><Plus className="w-3.5 h-3.5" /></button>
          </div>
          {dmRooms.map(r => <RoomItem key={r.id} room={r} active={activeRoom?.id === r.id} onClick={() => selectRoom(r)} unread={unreadCount > 0} />)}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 min-w-0">
        {activeRoom
          ? <ChatRoom room={activeRoom} onStartDM={startDMWith} />
          : <div className="flex items-center justify-center h-full text-muted-foreground">Select a chat to get started 💬</div>}
      </div>

      {/* Online Users Panel */}
      <OnlinePanel currentUserEmail={profile?.email} onStartDM={startDMWith} />

      <Dialog open={showNewGroup} onOpenChange={setShowNewGroup}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle>Create Group Chat</DialogTitle></DialogHeader>
          <div className="space-y-3"><Label>Group Name</Label><Input value={groupName} onChange={e => setGroupName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createGroup()} placeholder="My Group" /><Button onClick={createGroup} className="w-full">Create</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewDM} onOpenChange={setShowNewDM}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle>New Direct Message</DialogTitle></DialogHeader>
          <div className="space-y-3"><Label>User Email</Label><Input value={dmEmail} onChange={e => setDmEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && createDM()} placeholder="friend@email.com" /><Button onClick={createDM} className="w-full">Start DM</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoomItem({ room, active, onClick, unread }: { room: DB.ChatRoom; active: boolean; onClick: () => void; unread?: boolean }) {
  return (
    <button onClick={onClick} className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors text-left', active ? 'bg-primary/20 text-foreground font-medium' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}>
      {room.type === 'dm' ? <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" /> : <Hash className="w-3.5 h-3.5 flex-shrink-0" />}
      <span className="truncate text-xs">{room.name}</span>
      {unread && room.type === 'dm' && <span className="ml-auto w-2 h-2 rounded-full bg-red-500 flex-shrink-0 badge-pulse" />}
    </button>
  );
}
