import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Hash, MessageCircle, UserPlus, AlertTriangle, Users } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Label } from '@project/components/ui/label';
import ChatRoom from '../components/ChatRoom';
import OnlinePanel from '../components/OnlinePanel';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { OWNER_EMAIL } from '../lib/gameData';
import { cn } from '@project/components/lib/utils';
import { toast } from 'sonner';

export default function ChatPage() {
  const { profile, unreadCount, setUnreadCount, setActiveRoomId } = useApp();
  const [rooms, setRooms] = useState<DB.ChatRoom[]>([]);
  const [activeRoom, _setActiveRoom] = useState<DB.ChatRoom | null>(null);
  const activeRoomRef = useRef<DB.ChatRoom | null>(null);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [dmEmail, setDmEmail] = useState('');
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  const isOwner = profile?.email === OWNER_EMAIL || profile?.role === 'owner';

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
    const members = [profile.email, ...groupMembers.filter(m => m !== profile.email)];
    const room: DB.ChatRoom = { id: crypto.randomUUID(), name: `# ${groupName.trim()}`, type: 'group', members, createdBy: profile.email };
    DB.addChatRoom(room);
    const up = { ...profile, groupCount: profile.groupCount + 1 }; DB.saveUser(up);
    setGroupName(''); setGroupMembers([]); setMemberSearch(''); setShowNewGroup(false); loadRooms(); toast.success('Group created!');
  }

  function addMemberToRoom() {
    if (!profile || !activeRoom || !addMemberEmail.trim()) return;
    const email = addMemberEmail.trim();
    if (activeRoom.members.includes(email)) { toast.error('Already a member'); return; }
    const targetUser = DB.getUser(email);
    if (!targetUser) { toast.error('User not found'); return; }
    DB.updateChatRoom(activeRoom.id, { members: [...activeRoom.members, email] });
    toast.success(`Added ${targetUser.name} to the chat`);
    setAddMemberEmail(''); setShowAddMember(false); loadRooms();
  }

  function reportChat() {
    if (!profile || !activeRoom || !reportReason.trim()) { toast.error('Enter a reason'); return; }
    DB.addChatReport({
      id: crypto.randomUUID(),
      chatRoomId: activeRoom.id,
      reporterEmail: profile.email,
      reporterName: profile.name,
      reason: reportReason.trim(),
      timestamp: Date.now(),
      resolved: false,
    });
    // Auto-add owner to the room
    DB.ownerJoinRoom(activeRoom.id, OWNER_EMAIL);
    toast.success('Report submitted. The owner has been notified and added to this chat.');
    setReportReason(''); setShowReport(false); loadRooms();
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
        {activeRoom ? (
          <div className="flex flex-col h-full">
            {/* Room action bar for group/dm */}
            {activeRoom.type !== 'global' && (
              <div className="flex items-center gap-1 px-2 pt-1 bg-card/30">
                <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1" onClick={() => setShowAddMember(true)}>
                  <UserPlus className="w-3 h-3" /> Add Member
                </Button>
                {!isOwner && (
                  <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1 text-destructive hover:text-destructive" onClick={() => setShowReport(true)}>
                    <AlertTriangle className="w-3 h-3" /> Report
                  </Button>
                )}
                <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" /> {activeRoom.members.length} members
                </span>
              </div>
            )}
            <div className="flex-1 min-h-0">
              <ChatRoom room={activeRoom} onStartDM={startDMWith} />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">Select a chat to get started 💬</div>
        )}
      </div>

      {/* Online Users Panel */}
      <OnlinePanel roomId={activeRoom?.id || 'global'} currentUserEmail={profile?.email} />

      <Dialog open={showNewGroup} onOpenChange={setShowNewGroup}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle>Create Private Group</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Group Name</Label><Input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="My Group" className="mt-1" /></div>
            <div>
              <Label>Add Members</Label>
              <Input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Search users..." className="mt-1" />
              {memberSearch && (
                <div className="mt-1 max-h-32 overflow-y-auto border border-border rounded-lg bg-background">
                  {DB.getAllUsers()
                    .filter(u => u.email !== profile?.email && !groupMembers.includes(u.email) && (u.name.toLowerCase().includes(memberSearch.toLowerCase()) || u.email.toLowerCase().includes(memberSearch.toLowerCase())))
                    .slice(0, 5)
                    .map(u => (
                      <button key={u.email} onClick={() => { setGroupMembers(prev => [...prev, u.email]); setMemberSearch(''); }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-secondary/50 text-left">
                        <span className="text-xs font-semibold" style={{ color: u.nameColor }}>{u.name}</span>
                        <span className="text-[10px] text-muted-foreground">{u.email}</span>
                      </button>
                    ))}
                </div>
              )}
              {groupMembers.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {groupMembers.map(email => {
                    const u = DB.getUser(email);
                    return (
                      <span key={email} className="inline-flex items-center gap-1 text-[10px] bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                        {u?.name || email}
                        <button onClick={() => setGroupMembers(prev => prev.filter(e => e !== email))} className="text-destructive hover:text-destructive/80">×</button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <Button onClick={createGroup} className="w-full">Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewDM} onOpenChange={setShowNewDM}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle>New Direct Message</DialogTitle></DialogHeader>
          <div className="space-y-3"><Label>User Email</Label><Input value={dmEmail} onChange={e => setDmEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && createDM()} placeholder="friend@email.com" /><Button onClick={createDM} className="w-full">Start DM</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle>Add Member</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>User Email</Label>
            <Input value={addMemberEmail} onChange={e => setAddMemberEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMemberToRoom()} placeholder="user@email.com" />
            {addMemberEmail && (
              <div className="max-h-32 overflow-y-auto border border-border rounded-lg bg-background">
                {DB.getAllUsers()
                  .filter(u => !activeRoom?.members.includes(u.email) && (u.name.toLowerCase().includes(addMemberEmail.toLowerCase()) || u.email.toLowerCase().includes(addMemberEmail.toLowerCase())))
                  .slice(0, 5)
                  .map(u => (
                    <button key={u.email} onClick={() => { setAddMemberEmail(u.email); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-secondary/50 text-left">
                      <span className="text-xs font-semibold" style={{ color: u.nameColor }}>{u.name}</span>
                      <span className="text-[10px] text-muted-foreground">{u.email}</span>
                    </button>
                  ))}
              </div>
            )}
            <Button onClick={addMemberToRoom} className="w-full">Add</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle>⚠️ Report This Chat</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Report inappropriate behavior. The owner will be automatically added to review this chat.</p>
          <div className="space-y-3">
            <Label>Reason</Label>
            <Input value={reportReason} onChange={e => setReportReason(e.target.value)} onKeyDown={e => e.key === 'Enter' && reportChat()} placeholder="What's happening?" />
            <Button variant="destructive" onClick={reportChat} className="w-full">Submit Report</Button>
          </div>
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
