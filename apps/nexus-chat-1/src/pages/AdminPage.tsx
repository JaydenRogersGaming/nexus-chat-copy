import { formatGems, INFINITE_GEMS } from '../lib/formatGems';
import { useState, useEffect } from 'react';
import ServerBanPanel from '../components/ServerBanPanel';
import OwnerThemesTab from '../components/OwnerThemesTab';
import OwnerEventsTab from '../components/OwnerEventsTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Gem, Shield, Crown, Bug, Users, Star, Trash2, Plus, Dices, Settings, Ban, AlertTriangle, UserX, Megaphone, Pin, Tag, VolumeX, Clock, BadgeCheck } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { OWNER_EMAIL, EFFECT_TO_CLASS, TITLE_FONTS } from '../lib/gameData';
import TitleBadge from '../components/TitleBadge';
import RoleChip from '../components/RoleChip';
import { toast } from 'sonner';
import { roles as rolesApi, RolesOutputType } from 'zitejs/api';

const ROLE_META: Record<string, { color: string; label: string }> = {
  owner:      { color: 'text-yellow-400',  label: 'Owner' },
  'co-owner': { color: 'text-orange-400',  label: 'Co-Owner' },
  admin:      { color: 'text-red-400',     label: 'Admin' },
  'senior-mod': { color: 'text-purple-400', label: 'Senior Mod' },
  mod:        { color: 'text-blue-400',    label: 'Mod' },
  helper:     { color: 'text-green-400',   label: 'Helper' },
  vip:        { color: 'text-pink-400',    label: 'VIP' },
  user:       { color: 'text-muted-foreground', label: 'User' },
};

export default function AdminPage() {
  const { profile } = useApp();
  const [users, setUsers]           = useState<DB.UserProfile[]>([]);
  const [bugs, setBugs]             = useState<DB.Bug[]>([]);
  const [customRoles, setCustomRoles] = useState<DB.CustomRole[]>([]);
  const [targetEmail, setTargetEmail] = useState('');
  const [gemAmount, setGemAmount]   = useState('');
  const [newRole, setNewRole]       = useState('');
  const [signedUp, setSignedUp]     = useState<RolesOutputType['users']>([]);
  const [roleSearch, setRoleSearch] = useState('');
  const [roleTarget, setRoleTarget] = useState('');
  const [settingRole, setSettingRole] = useState(false);
  useEffect(() => { rolesApi({ action: 'list' }).then(r => setSignedUp(r.users)).catch(() => {}); }, []);
  const [titleToGive, setTitleToGive] = useState('');

  // Custom title form
  const [ctName, setCtName]   = useState('');
  const [ctEmoji, setCtEmoji] = useState('');
  const [ctFont, setCtFont]   = useState('default');
  const [titleReqs, setTitleReqs] = useState<DB.TitleRequest[]>(DB.getTitleRequests());
  const [ctEffect, setCtEffect] = useState('none');
  const [ctColor, setCtColor] = useState('#ffffff');
  const [ctCost, setCtCost]   = useState('100');
  const [ctShop, setCtShop]   = useState(false);

  // Custom role form
  const [crName, setCrName]   = useState('');
  const [crColor, setCrColor] = useState('#ffffff');
  const [crColor2, setCrColor2] = useState('');
  const [crIcon, setCrIcon]   = useState('⚡');
  const [crCanDelete, setCrCanDelete] = useState(false);
  const [crPerms, setCrPerms] = useState<DB.RolePerm[]>([]);
  const [crAssignEmail, setCrAssignEmail] = useState('');
  const [crAssignId, setCrAssignId] = useState('__none__');

  const [gambleRig, setGambleRigState] = useState<DB.GambleRig>(DB.getGambleRig());
  const [bans, setBans] = useState<DB.BanRecord[]>(DB.getBans());
  const [banEmail, setBanEmail] = useState('');
  const [cussReports, setCussReports] = useState<DB.CussReport[]>(DB.getCussReports());

  // App Settings
  const [appSettings, setAppSettings] = useState(DB.getAppSettings());
  const [settingsName, setSettingsName] = useState(DB.getAppSettings().appName);
  const [settingsTagline, setSettingsTagline] = useState(DB.getAppSettings().appTagline);
  const [settingsWelcome, setSettingsWelcome] = useState(DB.getAppSettings().welcomeMessage);
  const [settingsUrl, setSettingsUrl] = useState(DB.getAppSettings().customUrl || '');
  const [matrixColor, setMatrixColor] = useState(DB.getAppSettings().matrixColor || '#00ff00');
  const [matrixSpeed, setMatrixSpeed] = useState(String(DB.getAppSettings().matrixSpeed || 1));

  // Announcements
  const [announcements, setAnnouncements] = useState<DB.Announcement[]>(DB.getAnnouncements());
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  // User Tags
  const [userTags, setUserTags] = useState<DB.UserTag[]>(DB.getUserTags());
  const [tagName, setTagName] = useState('');
  const [tagIcon, setTagIcon] = useState('🎬');
  const [tagColor, setTagColor] = useState('#ff4444');
  const [tagAssignEmail, setTagAssignEmail] = useState('');
  const [tagAssignId, setTagAssignId] = useState('__none__');

  // Banned names
  const [bannedNames, setBannedNames] = useState<string[]>(DB.getBannedNames());
  const [newBannedName, setNewBannedName] = useState('');
  const [chatWordsText, setChatWordsText] = useState(() => DB.getChatWords().join('\n'));
  const [wordsSaved, setWordsSaved] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [immuneSearch, setImmuneSearch] = useState('');
  const [immune, setImmune] = useState<string[]>(() => DB.getMuteImmune());
  useEffect(() => {
    if (chatWordsText === DB.getChatWords().join('\n')) return;
    setWordsSaved('saving');
    const t = setTimeout(() => { DB.setChatWords(chatWordsText.split(/[\n,]/)); setWordsSaved('saved'); }, 700);
    return () => clearTimeout(t);
  }, [chatWordsText]);
  // Name filter: auto-add after you stop typing
  useEffect(() => {
    const w = newBannedName.trim();
    if (!w) return;
    const t = setTimeout(() => {
      if (!DB.getBannedNames().includes(w)) { DB.addBannedName(w); setBannedNames(DB.getBannedNames()); toast.success(`Auto-saved "${w}"`); }
      setNewBannedName('');
    }, 1500);
    return () => clearTimeout(t);
  }, [newBannedName]); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = () => { setUsers(DB.getAllUsers()); setBugs(DB.getBugs()); setCustomRoles(DB.getCustomRoles()); setBans(DB.getBans()); setCussReports(DB.getCussReports()); setAnnouncements(DB.getAnnouncements()); setUserTags(DB.getUserTags()); };
  useEffect(reload, []);

  // Auto-save settings whenever any value changes (must be before early return to avoid hooks order change)
  useEffect(() => {
    const timeout = setTimeout(() => {
      const updated: DB.AppSettings = { appName: settingsName.trim() || 'Nexus Hub', appTagline: settingsTagline.trim(), welcomeMessage: settingsWelcome.trim(), customUrl: settingsUrl.trim(), matrixColor: matrixColor, matrixSpeed: parseFloat(matrixSpeed) || 1 };
      const current = DB.getAppSettings();
      if (JSON.stringify(updated) !== JSON.stringify(current)) {
        DB.saveAppSettings(updated); setAppSettings(updated);
        toast.success('Settings auto-saved ✓', { duration: 1500 });
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [settingsName, settingsTagline, settingsWelcome, settingsUrl, matrixColor, matrixSpeed]);

  if (!profile || !['owner','co-owner','admin','senior-mod','mod'].includes(profile.role)) return (
    <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Access Denied 🚫</p></div>
  );

  const isOwner   = profile.email === OWNER_EMAIL || profile.role === 'owner';
  const isCoOwner = isOwner || profile.role === 'co-owner';
  const isAdmin   = isCoOwner || profile.role === 'admin';
  const isMod     = isAdmin || profile.role === 'mod' || profile.role === 'senior-mod';

  function giveGems() {
    const amount = parseInt(gemAmount); const email = targetEmail.trim();
    if (isNaN(amount) || !email) { toast.error('Enter email and amount'); return; }
    const user = email === 'self' ? profile : DB.getUser(email);
    if (!user) { toast.error('User not found'); return; }
    DB.saveUser({ ...user, gems: Math.max(0, user.gems + amount) });
    reload(); toast.success(`Gave ${amount} gems to ${user.name}!`);
  }

  function giveTitle() {
    const email = targetEmail.trim();
    if (!titleToGive.trim() || !email) { toast.error('Enter email and title'); return; }
    const user = DB.getUser(email); if (!user) { toast.error('User not found'); return; }
    DB.addUserTitle(email, titleToGive.trim()); toast.success(`Gave title "${titleToGive}" to ${user.name}!`);
  }

  async function setRole() {
    const email = roleTarget;
    if (!newRole || !email) { toast.error('Pick a user and a role'); return; }
    setSettingRole(true);
    try {
      const r = await rolesApi({ action: 'set', email, role: newRole as DB.UserProfile['role'] });
      setSignedUp(r.users);
      const local = DB.getUser(email);
      if (local) DB.saveUser({ ...local, role: newRole as DB.UserProfile['role'] });
      reload(); toast.success(`Set ${r.users.find(u => u.email === email)?.name || email} as ${newRole}!`);
    } catch (e) {
      const err = e as { userFacingMessage?: string; message?: string };
      toast.error(err.userFacingMessage || err.message || 'Could not set role');
    } finally { setSettingRole(false); }
  }

  function createCustomTitle() {
    if (!ctName.trim() || !profile) { toast.error('Enter a title name'); return; }
    const fullName = (ctEmoji.trim() ? ctEmoji.trim() + ' ' : '') + ctName.trim();
    DB.addCustomTitle({ id: crypto.randomUUID(), name: fullName, effect: ctEffect, cost: parseInt(ctCost) || 100, color: ctColor, font: ctFont, createdBy: profile.email, availableInShop: ctShop });
    setCtEmoji(''); setCtFont('default');
    toast.success(`Title "${ctName}" created!`);
    setCtName(''); setCtEffect('none'); setCtColor('#ffffff'); setCtCost('100'); setCtShop(false);
  }

  function createCustomRole() {
    if (!crName.trim() || !profile) { toast.error('Enter a role name'); return; }
    DB.addCustomRole({ id: crypto.randomUUID(), name: crName.trim(), color: crColor, color2: crColor2 || undefined, icon: crIcon, canDelete: crCanDelete || crPerms.includes('delete'), permissions: crPerms, createdBy: profile.email });
    reload(); toast.success(`Role "${crName}" created!`);
    setCrName(''); setCrColor('#ffffff'); setCrColor2(''); setCrIcon('⚡'); setCrCanDelete(false); setCrPerms([]);
  }

  async function assignCustomRole() {
    if (!crAssignEmail.trim()) { toast.error('Enter an email'); return; }
    const removing = crAssignId === '__none__';
    try {
      await DB.assignCustomRole(crAssignEmail.trim(), removing ? null : crAssignId);
      reload(); toast.success(removing ? 'Custom role removed!' : 'Custom role assigned!');
    } catch (e) {
      const err = e as { userFacingMessage?: string; message?: string };
      toast.error(err.userFacingMessage || err.message || 'Could not save custom role');
    }
  }

  function deleteCustomRole(id: string) {
    DB.deleteCustomRole(id); reload(); toast.success('Role deleted');
  }

  function updateBugStatus(id: string, status: DB.Bug['status']) {
    DB.updateBugStatus(id, status); reload();
  }

  return (
    <div className="h-full overflow-y-auto p-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        {isOwner ? <Crown className="w-7 h-7 text-yellow-400" /> : isCoOwner ? <Star className="w-7 h-7 text-orange-400" /> : isAdmin ? <Shield className="w-7 h-7 text-red-400" /> : <Shield className="w-7 h-7 text-blue-400" />}
        <div>
          <h1 className="text-xl font-black">{isOwner ? 'Owner Panel' : isCoOwner ? 'Co-Owner Panel' : isAdmin ? 'Admin Panel' : 'Mod Panel'}</h1>
          <p className="text-xs text-muted-foreground">Manage users, roles, titles, and reports</p>
        </div>
      </div>

      <Tabs defaultValue={isMod && !isAdmin ? 'cussreports' : 'gems'}>
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          {isAdmin && <TabsTrigger value="gems"><Gem className="w-3.5 h-3.5 mr-1" />Gems</TabsTrigger>}
          {isAdmin && <TabsTrigger value="roles"><Shield className="w-3.5 h-3.5 mr-1" />Roles</TabsTrigger>}
          {isAdmin && <TabsTrigger value="titles">🎖️ Titles</TabsTrigger>}
          {isAdmin && <TabsTrigger value="custom">✨ Custom Title</TabsTrigger>}
          {isOwner && (
            <TabsTrigger value="titlereqs" className="relative">
              📨 Title Requests
              {titleReqs.filter(r => r.status === 'pending').length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">{titleReqs.filter(r => r.status === 'pending').length}</span>
              )}
            </TabsTrigger>
          )}
          {isOwner && <TabsTrigger value="customroles">⚡ Custom Roles</TabsTrigger>}
          {isOwner && <TabsTrigger value="themes">🎨 Badges & Themes</TabsTrigger>}
          {isOwner && <TabsTrigger value="events">🎃 Holiday Events</TabsTrigger>}
          {isOwner && <TabsTrigger value="casino"><Dices className="w-3.5 h-3.5 mr-1" />Casino Rig</TabsTrigger>}
          {isOwner && <TabsTrigger value="appsettings"><Settings className="w-3.5 h-3.5 mr-1" />Edit App</TabsTrigger>}
          {isCoOwner && <TabsTrigger value="tags"><Tag className="w-3.5 h-3.5 mr-1" />User Tags</TabsTrigger>}
          {isCoOwner && <TabsTrigger value="announcements"><Megaphone className="w-3.5 h-3.5 mr-1" />Announcements</TabsTrigger>}
          {isCoOwner && <TabsTrigger value="bannednames"><UserX className="w-3.5 h-3.5 mr-1" />Word Filter</TabsTrigger>}
          {isOwner && <TabsTrigger value="bans"><Ban className="w-3.5 h-3.5 mr-1" />Bans</TabsTrigger>}
          {isMod && (
            <TabsTrigger value="cussreports" className="relative">
              <AlertTriangle className="w-3.5 h-3.5 mr-1" />Reports
              {cussReports.filter(r => !r.resolved).length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                  {cussReports.filter(r => !r.resolved).length}
                </span>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="bugs"><Bug className="w-3.5 h-3.5 mr-1" />Bugs</TabsTrigger>
          <TabsTrigger value="users"><Users className="w-3.5 h-3.5 mr-1" />Users</TabsTrigger>
        </TabsList>

        {/* Gems (owner only) */}
        <TabsContent value="gems" className="space-y-4">
          {!isOwner ? (
            <div className="p-4 bg-card border border-border rounded-xl text-center">
              <p className="text-muted-foreground text-sm">🔒 Only the Owner can give/remove gems.</p>
            </div>
          ) : (
            <div className="p-4 bg-card border border-border rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Give / Remove Gems</h3>
                <span className="text-xs text-muted-foreground ml-auto">🔒 Owner only • ∞ unlimited</span>
              </div>
              <div><Label>Target Email (or "self")</Label><Input value={targetEmail} onChange={e => setTargetEmail(e.target.value)} placeholder="user@email.com or self" className="mt-1" /></div>
              <div><Label>Amount (negative to remove)</Label><Input type="number" value={gemAmount} onChange={e => setGemAmount(e.target.value)} className="mt-1" /></div>
              <div className="flex gap-2">
                <Button onClick={giveGems} className="flex-1">Give Gems</Button>
                <Button variant="outline" className="flex-1" onClick={() => {
                  const email = targetEmail.trim() || 'self';
                  const user = email === 'self' ? profile : DB.getUser(email);
                  if (!user) { toast.error('User not found'); return; }
                  DB.saveUser({ ...user, gems: INFINITE_GEMS });
                  reload(); toast.success(`♾️ Gave infinite gems to ${user.name}!`);
                }}>♾️ Infinite Gems</Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Roles */}
        <TabsContent value="roles" className="space-y-4">
          <div className="p-4 bg-card border border-border rounded-xl space-y-3">
            <h3 className="font-semibold">Set User Role</h3>
            <div className="p-3 bg-secondary/30 rounded-lg text-xs text-muted-foreground space-y-1">
              <p>🟡 <strong>Owner</strong> — Can do everything, assign any role, delete any message</p>
              <p>🟠 <strong>Co-Owner</strong> — Same as Owner except can't transfer ownership</p>
              <p>🔴 <strong>Admin</strong> — Can delete user/mod messages, give titles, manage bugs</p>
              <p>🟣 <strong>Senior Mod</strong> — Lead moderator, same powers as Mod</p>
              <p>🔵 <strong>Mod</strong> — Can delete regular user messages only</p>
              <p>🟢 <strong>Helper</strong> — Helps new people (badge only)</p>
              <p>💖 <strong>VIP</strong> — Special supporter (badge only)</p>
            </div>
            <div>
              <Label>Pick a user ({signedUp.length} signed up)</Label>
              <Input value={roleSearch} onChange={e => setRoleSearch(e.target.value)} placeholder="Search name or email…" className="mt-1" />
              <div className="mt-2 max-h-56 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                {signedUp.filter(u => { const q = roleSearch.toLowerCase(); return !q || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q); }).map(u => (
                  <button key={u.email} type="button" onClick={() => setRoleTarget(u.email)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-secondary/50 ${roleTarget === u.email ? 'bg-primary/15' : ''}`}>
                    <span><span className="font-semibold">{u.name}</span> <span className="text-muted-foreground">{u.email}</span></span>
                    <span className={ROLE_META[u.role]?.color}>{ROLE_META[u.role]?.label || u.role}</span>
                  </button>
                ))}
                {signedUp.length === 0 && <p className="px-3 py-3 text-xs text-muted-foreground">Loading users…</p>}
              </div>
            </div>
            <div><Label>Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">👤 User</SelectItem>
                  <SelectItem value="vip">💖 VIP</SelectItem>
                  <SelectItem value="helper">🟢 Helper</SelectItem>
                  <SelectItem value="mod">🔵 Mod</SelectItem>
                  <SelectItem value="senior-mod">🟣 Senior Mod</SelectItem>
                  <SelectItem value="admin">🔴 Admin</SelectItem>
                  {isCoOwner && <SelectItem value="co-owner">🟠 Co-Owner</SelectItem>}
                  {isOwner   && <SelectItem value="owner">🟡 Owner</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={setRole} disabled={settingRole || !roleTarget || !newRole} className="w-full">{settingRole ? 'Saving…' : 'Set Role'}</Button>
          </div>
        </TabsContent>

        {/* Give Title */}
        <TabsContent value="titles" className="space-y-4">
          <div className="p-4 bg-card border border-border rounded-xl space-y-3">
            <h3 className="font-semibold">Give a Title to Someone</h3>
            <div><Label>User Email</Label><Input value={targetEmail} onChange={e => setTargetEmail(e.target.value)} placeholder="user@email.com" className="mt-1" /></div>
            <div><Label>Title Name</Label><Input value={titleToGive} onChange={e => setTitleToGive(e.target.value)} placeholder="Best Friend" className="mt-1" /></div>
            <Button onClick={giveTitle} className="w-full">Give Title</Button>
          </div>
        </TabsContent>

        {/* Custom Title Creator */}
        <TabsContent value="custom" className="space-y-4">
          <div className="p-4 bg-card border border-border rounded-xl space-y-3">
            <h3 className="font-semibold">Create Custom Title</h3>
            <div className="grid grid-cols-[1fr_80px] gap-2">
              <div><Label>Title Name</Label><Input value={ctName} onChange={e => setCtName(e.target.value)} className="mt-1" /></div>
              <div><Label>Emoji</Label><Input value={ctEmoji} onChange={e => setCtEmoji(e.target.value)} placeholder="optional" maxLength={4} className="mt-1 text-center" /></div>
            </div>
            <div><Label>Font</Label>
              <Select value={ctFont} onValueChange={setCtFont}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TITLE_FONTS).map(([k, f]) => <SelectItem key={k} value={k}><span style={{ fontFamily: f.family }}>{f.label}</span></SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30 flex justify-center">
              <TitleBadge title={(ctEmoji.trim() ? ctEmoji.trim() + ' ' : '') + (ctName.trim() || 'Preview')} effect={ctEffect} color={ctColor} font={ctFont} size="md" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Effect</Label>
                <Select value={ctEffect} onValueChange={setCtEffect}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="rainbow">Rainbow</SelectItem>
                    <SelectItem value="pink-glow">Pink Glow</SelectItem>
                    <SelectItem value="breath-pink-blue">Breath Pink/Blue</SelectItem>
                    <SelectItem value="moon">Moon</SelectItem>
                    <SelectItem value="coin-rain">Coin Rain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Color</Label><Input type="color" value={ctColor} onChange={e => setCtColor(e.target.value)} className="mt-1 h-9 cursor-pointer" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Gem Cost</Label><Input type="number" value={ctCost} onChange={e => setCtCost(e.target.value)} className="mt-1" /></div>
              <div className="flex items-end pb-1"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={ctShop} onChange={e => setCtShop(e.target.checked)} className="w-4 h-4 accent-primary" /><span className="text-sm">Add to Shop</span></label></div>
            </div>
            <Button onClick={createCustomTitle} className="w-full">Create Title</Button>
          </div>
          <div className="space-y-2">
            {DB.getCustomTitles().map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                <TitleBadge title={t.name} effect={t.effect} color={t.color} font={t.font} />
                <span className="text-xs text-muted-foreground ml-auto">{t.availableInShop ? `Shop: ${t.cost} gems` : 'Admin only'}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* AI Title Requests (owner) */}
        {isOwner && (
          <TabsContent value="titlereqs" className="space-y-2">
            {titleReqs.filter(r => r.status === 'pending').length === 0 && <p className="text-center text-muted-foreground text-sm py-6">No pending title requests 🎉</p>}
            {titleReqs.filter(r => r.status === 'pending').map(r => (
              <div key={r.id} className="p-3 bg-card border border-border rounded-xl flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0 space-y-1">
                  <TitleBadge title={r.name} effect={r.effect} color={r.color} font={r.font} size="md" />
                  <p className="text-[11px] text-muted-foreground">{r.userName} · {r.effect} · {TITLE_FONTS[r.font]?.label ?? 'Default'} · 💎 {r.cost}{r.idea ? ` · "${r.idea}"` : ''}</p>
                </div>
                <Button size="sm" onClick={() => { DB.resolveTitleRequest(r.id, true); setTitleReqs(DB.getTitleRequests()); toast.success(`Approved "${r.name}"`); }}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => { DB.resolveTitleRequest(r.id, false); setTitleReqs(DB.getTitleRequests()); toast.success('Rejected — gems refunded'); }}>Reject</Button>
              </div>
            ))}
          </TabsContent>
        )}

        {/* Custom Roles (owner/co-owner only) */}
        {isCoOwner && (
          <TabsContent value="customroles" className="space-y-4">
            {/* Create Role */}
            <div className="p-4 bg-card border border-border rounded-xl space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><Plus className="w-4 h-4" />Create Custom Role</h3>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Role Name</Label><Input value={crName} onChange={e => setCrName(e.target.value)} placeholder="e.g. VIP" className="mt-1" /></div>
                <div><Label>Icon (emoji)</Label><Input value={crIcon} onChange={e => setCrIcon(e.target.value)} placeholder="⚡" className="mt-1" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Color 1</Label><Input type="color" value={crColor} onChange={e => setCrColor(e.target.value)} className="mt-1 h-9 cursor-pointer" /></div>
                <div><Label>Color 2 (optional gradient)</Label>
                  <div className="flex gap-1 mt-1">
                    <Input type="color" value={crColor2 || crColor} onChange={e => setCrColor2(e.target.value)} className="h-9 cursor-pointer flex-1" />
                    {crColor2 && <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setCrColor2('')}>Clear</Button>}
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-end pb-1"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={crCanDelete} onChange={e => setCrCanDelete(e.target.checked)} className="w-4 h-4 accent-primary" /><span className="text-sm">Can delete messages</span></label></div>
              </div>
              <div className="space-y-1.5">
                <Label>What can this role do?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DB.ROLE_PERMS.map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50">
                      <input type="checkbox" checked={crPerms.includes(p.id)} onChange={e => setCrPerms(prev => e.target.checked ? [...prev, p.id] : prev.filter(x => x !== p.id))} className="w-4 h-4 accent-primary" />
                      <span className="text-xs">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
                <span className="text-xs text-muted-foreground">Preview:</span>
                <RoleChip name={crName || 'Role Name'} icon={crIcon} color={crColor} color2={crColor2 || undefined} className="text-xs" />
              </div>
              <Button onClick={createCustomRole} className="w-full">Create Custom Role</Button>
            </div>

            {/* Existing Roles */}
            {customRoles.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Existing Custom Roles</h3>
                {customRoles.map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded border"
                      style={{ color: r.color, borderColor: r.color + '55', backgroundColor: r.color + '18' }}>
                      {r.icon} {r.name}
                    </span>
                    {(r.permissions?.length || r.canDelete) ? <span className="text-[10px] text-muted-foreground">{[...(r.permissions || []), ...(r.canDelete && !r.permissions?.includes('delete') ? ['delete'] : [])].join(' · ')}</span> : null}
                    <button onClick={() => deleteCustomRole(r.id)} className="ml-auto text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Assign Role */}
            <div className="p-4 bg-card border border-border rounded-xl space-y-3">
              <h3 className="font-semibold">Assign Custom Role to User</h3>
              <div><Label>User Email</Label><Input value={crAssignEmail} onChange={e => setCrAssignEmail(e.target.value)} placeholder="user@email.com" className="mt-1" /></div>
              <div><Label>Custom Role</Label>
                <Select value={crAssignId} onValueChange={setCrAssignId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select a role (or remove)" /></SelectTrigger>
                  <SelectContent>
                    {customRoles.map(r => <SelectItem key={r.id} value={r.id}>{r.icon} {r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={assignCustomRole} className="w-full">Assign Role</Button>
            </div>
          </TabsContent>
        )}

        {/* Casino Rig (owner only) */}
        {isOwner && (
          <TabsContent value="themes" className="space-y-4">
            <OwnerThemesTab />
          </TabsContent>
        )}
        {isOwner && (
          <TabsContent value="events" className="space-y-4">
            <OwnerEventsTab />
          </TabsContent>
        )}

        {isOwner && (
          <TabsContent value="casino" className="space-y-4">
            <div className="p-4 bg-card border border-border rounded-xl space-y-4">
              <div className="flex items-center gap-2">
                <Dices className="w-5 h-5 text-yellow-400" />
                <h3 className="font-semibold">Rig the Casino</h3>
                <span className="text-xs text-muted-foreground ml-auto">🔒 Owner only</span>
              </div>
              <p className="text-xs text-muted-foreground">Control the outcome of ALL gambling — affects every player globally until reset.</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: 'normal',  label: '🎲 Fair (Random)',       desc: 'Normal odds for everyone',        cls: 'border-border' },
                  { value: 'win',     label: '✅ Always Win',          desc: 'Everyone wins every spin/flip',   cls: 'border-green-500/60 bg-green-500/5' },
                  { value: 'jackpot', label: '🏆 Always Jackpot',      desc: 'Everyone hits 10x every time',    cls: 'border-yellow-500/60 bg-yellow-500/5' },
                  { value: 'lose',    label: '❌ Always Lose',         desc: 'Nobody wins — house takes all',   cls: 'border-destructive/60 bg-destructive/5' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { DB.setGambleRig(opt.value); setGambleRigState(opt.value); toast.success(`Casino set to: ${opt.label}`); }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${gambleRig === opt.value ? opt.cls + ' ring-2 ring-primary/50' : 'border-border hover:border-border/80'}`}
                  >
                    <p className="font-bold text-sm">{opt.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</p>
                    {gambleRig === opt.value && <p className="text-[10px] text-primary font-bold mt-1">● ACTIVE</p>}
                  </button>
                ))}
              </div>
              <div className={`p-3 rounded-lg border text-xs font-semibold text-center ${gambleRig === 'normal' ? 'border-border text-muted-foreground' : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400'}`}>
                Current mode: {gambleRig === 'normal' ? '🎲 Fair — Random outcomes' : gambleRig === 'win' ? '✅ Rigged — Always Win' : gambleRig === 'jackpot' ? '🏆 Rigged — Always Jackpot' : '❌ Rigged — Always Lose'}
              </div>
            </div>
          </TabsContent>
        )}

        {/* App Settings (owner only) */}
        {isOwner && (
          <TabsContent value="appsettings" className="space-y-4">
            <div className="p-4 bg-card border border-border rounded-xl space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Edit App</h3>
                <span className="text-xs text-muted-foreground ml-auto">🔒 Owner only</span>
              </div>
              <p className="text-xs text-muted-foreground">Customize how the app looks and feels for everyone.</p>
              <div className="space-y-3">
                <div>
                  <Label>App Name</Label>
                  <Input value={settingsName} onChange={e => setSettingsName(e.target.value)} placeholder="Nexus Hub" className="mt-1" />
                </div>
                <div>
                  <Label>Tagline</Label>
                  <Input value={settingsTagline} onChange={e => setSettingsTagline(e.target.value)} placeholder="Unblocked Hub" className="mt-1" />
                </div>
                <div>
                  <Label>Welcome Message <span className="text-muted-foreground text-xs">(shown in global chat when empty)</span></Label>
                  <Input value={settingsWelcome} onChange={e => setSettingsWelcome(e.target.value)} placeholder="Welcome to the hub! 👋" className="mt-1" />
                </div>
                <div>
                  <Label>Custom URL / Link <span className="text-muted-foreground text-xs">(e.g. browser tab, embed, or redirect)</span></Label>
                  <Input value={settingsUrl} onChange={e => setSettingsUrl(e.target.value)} placeholder="https://example.com" className="mt-1" />
                </div>
              </div>

              {/* Matrix Background Settings */}
              <div className="p-3 rounded-xl border border-border bg-secondary/20 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">🟢 Matrix Rain Background</h4>
                <p className="text-[11px] text-muted-foreground">Customize the loading screen Matrix rain effect.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Rain Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input type="color" value={matrixColor} onChange={e => setMatrixColor(e.target.value)} className="w-12 h-9 p-1 cursor-pointer" />
                      <Input value={matrixColor} onChange={e => setMatrixColor(e.target.value)} className="flex-1 font-mono text-xs" />
                    </div>
                  </div>
                  <div>
                    <Label>Speed (0.5–3)</Label>
                    <Input type="number" value={matrixSpeed} onChange={e => setMatrixSpeed(e.target.value)} min="0.5" max="3" step="0.5" className="mt-1" />
                  </div>
                </div>
                <div className="flex gap-2">
                  {[
                    { label: '🟢 Green', color: '#00ff00' },
                    { label: '🔵 Blue', color: '#00aaff' },
                    { label: '🟣 Purple', color: '#aa44ff' },
                    { label: '🔴 Red', color: '#ff3333' },
                    { label: '🟡 Gold', color: '#ffd700' },
                  ].map(p => (
                    <button key={p.color} onClick={() => setMatrixColor(p.color)}
                      className={`text-[10px] px-2 py-1 rounded-lg border transition-colors ${matrixColor === p.color ? 'border-primary bg-primary/20' : 'border-border hover:bg-secondary'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-secondary/40 border border-border text-xs">
                <p className="text-muted-foreground mb-1">Preview:</p>
                <p className="font-black text-base bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  🌐 {settingsName || 'Nexus Hub'}
                </p>
                <p className="text-muted-foreground text-[10px]">{settingsTagline || 'Unblocked Hub'}</p>
              </div>
              <p className="text-xs text-center text-muted-foreground">✓ Changes auto-save as you type</p>
            </div>
            <div className="p-4 bg-card border border-border rounded-xl space-y-3">
              <h3 className="font-semibold text-sm">Current Settings</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-secondary/30 rounded-lg p-2"><p className="text-muted-foreground">App Name</p><p className="font-semibold mt-0.5">{appSettings.appName}</p></div>
                <div className="bg-secondary/30 rounded-lg p-2"><p className="text-muted-foreground">Tagline</p><p className="font-semibold mt-0.5">{appSettings.appTagline || '—'}</p></div>
              </div>
              {appSettings.welcomeMessage && (
                <div className="bg-secondary/30 rounded-lg p-2 text-xs"><p className="text-muted-foreground">Welcome Message</p><p className="font-semibold mt-0.5">{appSettings.welcomeMessage}</p></div>
              )}
              {appSettings.customUrl && (
                <div className="bg-secondary/30 rounded-lg p-2 text-xs"><p className="text-muted-foreground">Custom URL</p><p className="font-semibold mt-0.5 truncate">{appSettings.customUrl}</p></div>
              )}
            </div>
          </TabsContent>
        )}

        {/* User Tags */}
        {isCoOwner && (
          <TabsContent value="tags" className="space-y-4">
            {/* Create Tag */}
            <div className="p-4 bg-card border border-border rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Create User Tag</h3>
              </div>
              <p className="text-xs text-muted-foreground">Tags appear next to usernames in chat (e.g. YouTuber, Streamer, Developer, Artist).</p>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Tag Name</Label><Input value={tagName} onChange={e => setTagName(e.target.value)} placeholder="YouTuber" className="mt-1" /></div>
                <div><Label>Icon (emoji)</Label><Input value={tagIcon} onChange={e => setTagIcon(e.target.value)} placeholder="🎬" className="mt-1" /></div>
                <div><Label>Color</Label><Input type="color" value={tagColor} onChange={e => setTagColor(e.target.value)} className="mt-1 h-9 cursor-pointer" /></div>
              </div>
              {/* Quick presets */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: 'YouTuber', icon: '🎬', color: '#ff0000' },
                  { name: 'Streamer', icon: '🎮', color: '#9146ff' },
                  { name: 'Developer', icon: '💻', color: '#00d4ff' },
                  { name: 'Artist', icon: '🎨', color: '#ff69b4' },
                  { name: 'Music', icon: '🎵', color: '#1db954' },
                  { name: 'OG', icon: '👑', color: '#ffd700' },
                  { name: 'VIP', icon: '⭐', color: '#ffaa00' },
                  { name: 'Helper', icon: '🤝', color: '#00cc88' },
                ].map(p => (
                  <button key={p.name} onClick={() => { setTagName(p.name); setTagIcon(p.icon); setTagColor(p.color); }}
                    className="text-[10px] px-2 py-1 rounded-lg border border-border hover:bg-secondary transition-colors">
                    {p.icon} {p.name}
                  </button>
                ))}
              </div>
              {/* Preview */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
                <span className="text-xs text-muted-foreground">Preview:</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ color: tagColor, backgroundColor: tagColor + '18', border: `1px solid ${tagColor}55` }}>
                  {tagIcon} {tagName || 'Tag'}
                </span>
              </div>
              <Button className="w-full" onClick={() => {
                if (!tagName.trim()) { toast.error('Enter a tag name'); return; }
                DB.addUserTag({ id: crypto.randomUUID(), name: tagName.trim(), icon: tagIcon, color: tagColor, createdBy: profile?.email || '' });
                reload(); setTagName(''); setTagIcon('🎬'); setTagColor('#ff4444'); toast.success(`Tag "${tagName}" created!`);
              }}>Create Tag</Button>
            </div>

            {/* Existing Tags */}
            {userTags.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Existing Tags ({userTags.length})</h3>
                {userTags.map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ color: t.color, backgroundColor: t.color + '18', border: `1px solid ${t.color}55` }}>
                      {t.icon} {t.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {users.filter(u => u.tag === t.id).length} users
                    </span>
                    <button onClick={() => { DB.deleteUserTag(t.id); reload(); toast.success('Tag deleted'); }} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Assign Tag */}
            <div className="p-4 bg-card border border-border rounded-xl space-y-3">
              <h3 className="font-semibold">Assign Tag to User</h3>
              <div><Label>User Email</Label><Input value={tagAssignEmail} onChange={e => setTagAssignEmail(e.target.value)} placeholder="user@email.com" className="mt-1" /></div>
              <div><Label>Tag</Label>
                <Select value={tagAssignId} onValueChange={setTagAssignId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select tag (or remove)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">❌ Remove Tag</SelectItem>
                    {userTags.map(t => <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => {
                if (!tagAssignEmail.trim()) { toast.error('Enter an email'); return; }
                DB.assignUserTag(tagAssignEmail.trim(), tagAssignId === '__none__' ? null : tagAssignId);
                reload(); toast.success(tagAssignId === '__none__' ? 'Tag removed!' : 'Tag assigned!');
              }}>Assign Tag</Button>
            </div>
          </TabsContent>
        )}

        {/* Announcements */}
        {isCoOwner && (
          <TabsContent value="announcements" className="space-y-4">
            <div className="p-4 bg-card border border-border rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Post Announcement</h3>
              </div>
              <p className="text-xs text-muted-foreground">Announcements are shown as a banner at the top of the app for all users.</p>
              <div><Label>Title</Label><Input value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder="Important update!" className="mt-1" /></div>
              <div><Label>Content</Label><Input value={annContent} onChange={e => setAnnContent(e.target.value)} placeholder="Details about the announcement..." className="mt-1" /></div>
              <Button className="w-full" onClick={() => {
                if (!annTitle.trim()) { toast.error('Enter a title'); return; }
                DB.addAnnouncement({ id: crypto.randomUUID(), title: annTitle.trim(), content: annContent.trim(), authorName: profile?.name || 'Admin', authorEmail: profile?.email || '', pinned: false, timestamp: Date.now() });
                reload(); setAnnTitle(''); setAnnContent(''); toast.success('Announcement posted! 📢');
              }}>
                <Megaphone className="w-4 h-4 mr-2" />Post Announcement
              </Button>
            </div>
            {announcements.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">All Announcements ({announcements.length})</h3>
                {announcements.map(a => (
                  <div key={a.id} className="p-3 bg-card border border-border rounded-xl space-y-1">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {a.pinned && <Pin className="w-3 h-3 text-primary flex-shrink-0" />}
                          <p className="text-sm font-semibold">{a.title}</p>
                        </div>
                        {a.content && <p className="text-xs text-muted-foreground mt-0.5">{a.content}</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">by {a.authorName} • {new Date(a.timestamp).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { DB.togglePinAnnouncement(a.id); reload(); }} className="text-muted-foreground hover:text-primary transition-colors" title={a.pinned ? 'Unpin' : 'Pin'}>
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { DB.deleteAnnouncement(a.id); reload(); toast.success('Deleted'); }} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {announcements.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No announcements yet</p>}
          </TabsContent>
        )}

        {/* Banned Names */}
        {isCoOwner && (
          <TabsContent value="bannednames" className="space-y-4">
            <div className="p-4 bg-card border border-border rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">💬 Chat Word Filter</h3>
                <span className="text-[10px] text-muted-foreground">{wordsSaved === 'saving' ? 'Saving…' : wordsSaved === 'saved' ? '✓ Auto-saved' : 'Auto-saves as you type'}</span>
              </div>
              <p className="text-xs text-muted-foreground">Extra words blocked in chat (one per line or comma-separated). Saying one censors it and auto-mutes for 10 min.</p>
              <textarea value={chatWordsText} onChange={e => setChatWordsText(e.target.value)} rows={4} placeholder={'word1\nword2'}
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            {isOwner && (
              <div className="p-4 bg-card border border-border rounded-xl space-y-2">
                <h3 className="font-semibold">🛡️ Auto-Mute Immunity</h3>
                <p className="text-xs text-muted-foreground">Immune people skip the word filter completely — no censoring and no auto-mute. The owner is always immune.</p>
                <Input value={immuneSearch} onChange={e => setImmuneSearch(e.target.value)} placeholder="Search name or email…" />
                <div className="max-h-56 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                  {signedUp.filter(u => { const q = immuneSearch.toLowerCase(); return !q || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q); }).map(u => {
                    const on = immune.includes(u.email);
                    return (
                      <button key={u.email} type="button" onClick={() => { const now = DB.toggleMuteImmune(u.email); setImmune(DB.getMuteImmune()); toast.success(now ? `🛡️ ${u.name} is now immune` : `${u.name} is no longer immune`); }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-secondary/50 ${on ? 'bg-primary/10' : ''}`}>
                        <span><span className="font-semibold">{u.name}</span> <span className="text-muted-foreground">{u.email}</span></span>
                        <span className={on ? 'text-primary font-bold' : 'text-muted-foreground'}>{on ? '🛡️ Immune' : 'Not immune'}</span>
                      </button>
                    );
                  })}
                  {signedUp.length === 0 && <p className="px-3 py-3 text-xs text-muted-foreground">Loading users…</p>}
                </div>
              </div>
            )}
            <div className="p-4 bg-card border border-border rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <UserX className="w-5 h-5 text-orange-400" />
                <h3 className="font-semibold">Inappropriate Name Filter</h3>
              </div>
              <p className="text-xs text-muted-foreground">Add words/names that are not allowed as display names. Type a word and it auto-saves after a second.</p>
              <div className="flex gap-2">
                <Input value={newBannedName} onChange={e => setNewBannedName(e.target.value)} placeholder="Enter word or name to ban..." className="flex-1"
                  onKeyDown={e => { if (e.key === 'Enter') { if (newBannedName.trim()) { DB.addBannedName(newBannedName.trim()); setBannedNames(DB.getBannedNames()); setNewBannedName(''); toast.success('Added to filter!'); } } }} />
                <Button onClick={() => { if (!newBannedName.trim()) { toast.error('Enter a name'); return; } DB.addBannedName(newBannedName.trim()); setBannedNames(DB.getBannedNames()); setNewBannedName(''); toast.success('Added to filter!'); }}>
                  <Plus className="w-4 h-4 mr-1" />Add
                </Button>
              </div>
            </div>
            {bannedNames.length > 0 ? (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Filtered Words ({bannedNames.length})</h3>
                {bannedNames.map(name => (
                  <div key={name} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                    <span className="text-sm font-mono flex-1">{name}</span>
                    <button onClick={() => { DB.removeBannedName(name); setBannedNames(DB.getBannedNames()); toast.success('Removed from filter'); }} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground text-sm py-4">No filtered names yet</p>
            )}
            {/* Flagged Users */}
            {bannedNames.length > 0 && (() => {
              const flagged = users.filter(u => DB.isNameBanned(u.name));
              return flagged.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-destructive">⚠️ Flagged Users ({flagged.length})</h3>
                  {flagged.map(u => (
                    <div key={u.email} className="flex items-center gap-3 p-3 bg-destructive/5 border border-destructive/20 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{u.name}</p>
                        <p className="text-[10px] text-muted-foreground">{u.email}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => { const forced = u.email.split('@')[0]; DB.saveUser({ ...u, name: forced }); reload(); toast.success(`Reset name to "${forced}"`); }}>
                        Reset Name
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null;
            })()}
          </TabsContent>
        )}

        {/* Bans */}
        {isMod && (
          <TabsContent value="bans" className="space-y-4">
            <ServerBanPanel staffName={profile?.name || 'Staff'} />
            <h3 className="font-semibold text-sm pt-2 text-muted-foreground">Old device-only bans</h3>
            <div className="p-4 bg-card border border-border rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold">Ban a User</h3>
              </div>
              <p className="text-xs text-muted-foreground">Ban a user from the app. They will see a black screen with a ban message. You can also use <code className="bg-secondary px-1 rounded">/ban email</code> in chat.</p>
              <div><Label>User Email</Label><Input value={banEmail} onChange={e => setBanEmail(e.target.value)} placeholder="user@email.com" className="mt-1" /></div>
              <Button variant="destructive" className="w-full" onClick={() => {
                const email = banEmail.trim();
                if (!email) { toast.error('Enter an email'); return; }
                if (email === OWNER_EMAIL) { toast.error("Can't ban the owner!"); return; }
                DB.banUser(email, profile?.name || 'Admin', `Banned by ${profile?.name || 'Admin'}`);
                reload(); setBanEmail(''); toast.success(`🔨 Banned ${email}`);
              }}>
                <Ban className="w-4 h-4 mr-2" />Ban User
              </Button>
            </div>
            {bans.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Banned Users ({bans.length})</h3>
                {bans.map(b => {
                  const u = DB.getUser(b.email);
                  return (
                    <div key={b.email} className="flex items-center gap-3 p-3 bg-card border border-destructive/30 rounded-xl">
                      <Ban className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{u?.name || b.email}</p>
                        <p className="text-[10px] text-muted-foreground">{b.email} • Banned by {b.bannedBy}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => { DB.unbanUser(b.email); reload(); toast.success(`Unbanned ${b.email}`); }}>
                        Unban
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            {bans.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No banned users</p>}
          </TabsContent>
        )}

        {/* Cuss Reports */}
        {isMod && (
          <TabsContent value="cussreports" className="space-y-3">
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl">
              <p className="text-xs text-destructive font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Profanity reports — users are auto-muted for 10 minutes when caught. You can ban them here.
              </p>
            </div>
            {cussReports.filter(r => !r.resolved).length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">No unresolved reports 🎉</p>
            )}
            {cussReports.filter(r => !r.resolved).map(report => (
              <div key={report.id} className="p-3 bg-card border border-destructive/20 rounded-xl space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{report.name}</p>
                    <p className="text-[10px] text-muted-foreground">{report.email} • {new Date(report.timestamp).toLocaleString()}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/20 text-destructive flex-shrink-0">PROFANITY</span>
                </div>
                <div className="p-2 bg-secondary/30 rounded-lg space-y-1">
                  <p className="text-[10px] text-muted-foreground font-semibold">Original message:</p>
                  <p className="text-xs font-mono bg-destructive/10 px-2 py-1 rounded text-destructive">{report.originalMessage}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-1">Censored:</p>
                  <p className="text-xs font-mono px-2 py-1 rounded bg-secondary">{report.censoredMessage}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                    DB.resolveCussReport(report.id);
                    reload();
                    toast.success('Report dismissed');
                  }}>
                    ✅ Dismiss
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => {
                    if (report.email === OWNER_EMAIL) { toast.error("Can't ban the owner!"); return; }
                    DB.banUser(report.email, profile?.name || 'Owner', 'Banned for profanity');
                    DB.resolveCussReport(report.id);
                    reload();
                    toast.success(`🔨 Banned ${report.name} for profanity`);
                  }}>
                    <Ban className="w-3.5 h-3.5 mr-1" />Ban User
                  </Button>
                </div>
              </div>
            ))}
            {cussReports.filter(r => r.resolved).length > 0 && (
              <div className="space-y-2 mt-4">
                <h3 className="text-xs font-semibold text-muted-foreground">Resolved ({cussReports.filter(r => r.resolved).length})</h3>
                {cussReports.filter(r => r.resolved).slice(0, 10).map(report => (
                  <div key={report.id} className="p-2 bg-card/50 border border-border rounded-lg flex items-center gap-2 opacity-60">
                    <span className="text-[10px] text-muted-foreground flex-1">{report.name} — "{report.censoredMessage}"</span>
                    <span className="text-[9px] text-muted-foreground">{new Date(report.timestamp).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* Bugs */}
        <TabsContent value="bugs" className="space-y-3">
          {bugs.length === 0 && <p className="text-muted-foreground text-center py-4">No bug reports yet!</p>}
          {bugs.map(bug => (
            <div key={bug.id} className="p-3 bg-card border border-border rounded-xl space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-semibold text-sm">{bug.title}</p><p className="text-xs text-muted-foreground">by {bug.reporterName}</p></div>
                <Select value={bug.status} onValueChange={v => updateBugStatus(bug.id, v as DB.Bug['status'])}>
                  <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="in-progress">In Progress</SelectItem><SelectItem value="resolved">Resolved</SelectItem></SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">{bug.description}</p>
            </div>
          ))}
        </TabsContent>

        {/* Users */}
        <TabsContent value="users" className="space-y-2">
          {users.map(u => (
            <div key={u.email} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                {u.profilePic ? <img src={u.profilePic} alt="" className="w-full h-full object-cover" /> : <span className="font-bold text-primary text-sm">{u.name[0]?.toUpperCase()}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={
                  u.nameColor2
                    ? { backgroundImage: `linear-gradient(90deg, ${u.nameColor}, ${u.nameColor2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
                    : { color: u.nameColor }
                }>{u.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{u.email} • {formatGems(u.gems)} gems</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary ${ROLE_META[u.role]?.color || 'text-muted-foreground'}`}>{ROLE_META[u.role]?.label || u.role}</span>
                {u.customRole && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border" style={{ color: u.customRoleColor, borderColor: (u.customRoleColor || '#aaa') + '55' }}>{u.customRole}</span>}
                {u.tag && (() => { const t = DB.getUserTags().find(tag => tag.id === u.tag); return t ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: t.color, backgroundColor: t.color + '18', border: `1px solid ${t.color}55` }}>{t.icon} {t.name}</span> : null; })()}
                {(() => { const mute = DB.isUserMuted(u.email); return mute ? <span className="text-[9px] text-orange-400 font-bold flex items-center gap-0.5"><VolumeX className="w-3 h-3" />Muted</span> : null; })()}
                {u.verified && <span className="text-[9px] text-blue-400 font-bold flex items-center gap-0.5"><BadgeCheck className="w-3 h-3" />Verified</span>}
              </div>
              {u.email !== OWNER_EMAIL && u.email !== profile.email && (
                <div className="flex gap-1 ml-2 flex-shrink-0">
                  {isOwner && (
                    <button onClick={() => { DB.saveUser({ ...u, verified: !u.verified }); reload(); toast.success(u.verified ? `Unverified ${u.name}` : `✅ Verified ${u.name}`); }}
                      className={`p-1.5 rounded-lg border border-border transition-colors ${u.verified ? 'text-blue-400 hover:bg-blue-400/10' : 'text-muted-foreground hover:bg-secondary'}`} title={u.verified ? 'Remove verification' : 'Verify user'}>
                      <BadgeCheck className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {!DB.isUserMuted(u.email) ? (
                    <button onClick={() => { DB.muteUser(u.email, 10 * 60 * 1000, `Muted by ${profile.name}`); reload(); toast.success(`🔇 Muted ${u.name} for 10 min`); }}
                      className="p-1.5 rounded-lg border border-border text-orange-400 hover:bg-orange-400/10 transition-colors" title="Mute 10 min">
                      <VolumeX className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button onClick={() => { DB.unmuteUser(u.email); reload(); toast.success(`🔊 Unmuted ${u.name}`); }}
                      className="p-1.5 rounded-lg border border-border text-green-400 hover:bg-green-400/10 transition-colors" title="Unmute">
                      <VolumeX className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {!DB.isUserBanned(u.email) ? (
                    <button onClick={() => { DB.banUser(u.email, profile.name, `Banned by ${profile.name}`); reload(); toast.success(`🔨 Banned ${u.name}`); }}
                      className="p-1.5 rounded-lg border border-border text-destructive hover:bg-destructive/10 transition-colors" title="Ban user">
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button onClick={() => { DB.unbanUser(u.email); reload(); toast.success(`Unbanned ${u.name}`); }}
                      className="p-1.5 rounded-lg border border-border text-green-400 hover:bg-green-400/10 transition-colors" title="Unban user">
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
