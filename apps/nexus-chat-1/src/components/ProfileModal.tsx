import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Switch } from '@project/components/ui/switch';
import { useApp } from '../contexts/AppContext';
import { useUpload } from 'zitejs/upload';
import TitleBadge from './TitleBadge';
import * as DB from '../lib/storage';
import { Camera, ShoppingBag, Globe } from 'lucide-react';
import { toast } from 'sonner';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
  { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ru', label: 'Русский' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' },
  { code: 'sv', label: 'Svenska' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'th', label: 'ไทย' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'fil', label: 'Filipino' },
];

type Props = { open: boolean; onClose: () => void; onOpenShop: () => void };

export default function ProfileModal({ open, onClose, onOpenShop }: Props) {
  const { profile, updateProfile } = useApp();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#e0e0ff');
  const [color2, setColor2] = useState('');
  const [useGradient, setUseGradient] = useState(false);
  const [bio, setBio] = useState('');
  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedTitleEffect, setSelectedTitleEffect] = useState('');
  const [selectedTitleColor, setSelectedTitleColor] = useState('');
  const [language, setLanguage] = useState('en');
  const { upload, isUploading } = useUpload();
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync local state when modal opens
  useEffect(() => {
    if (open && profile) {
      setName(profile.name);
      setColor(profile.nameColor || '#e0e0ff');
      setColor2(profile.nameColor2 || '#ff69b4');
      setUseGradient(!!profile.nameColor2);
      setBio(profile.bio || '');
      setSelectedTitle(profile.activeTitle || '');
      setSelectedTitleEffect(profile.activeTitleEffect || '');
      setSelectedTitleColor(profile.activeTitleColor || '');
      setLanguage(profile.language || 'en');
    }
  }, [open, profile]);

  if (!profile) return null;

  const ownedTitles = DB.getUserTitles(profile.email);

  const allTitles = [
    ...(profile.role === 'admin' ? [{ name: 'Admin', effect: 'none', color: '#ff4444' }] : []),
    ...(profile.role === 'mod' ? [{ name: 'Mod', effect: 'none', color: '#44aaff' }] : []),
    ...ownedTitles.filter(t => !['Owner','Admin','Mod','Best Friend'].includes(t)).map(t => {
      const shop = DB.getCustomTitles().find(c => c.name === t);
      return { name: t, effect: shop?.effect || 'none', color: shop?.color || '#aaaaaa' };
    }),
    ...(ownedTitles.includes('Best Friend') ? [{ name: 'Best Friend', effect: 'rainbow', color: '#ff69b4' }] : []),
  ];

  async function handlePicUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const { url } = await upload(file);
      updateProfile({ profilePic: url });
      toast.success('Profile picture updated!');
    } catch { toast.error('Upload failed'); }
  }

  function save() {
    if (DB.isNameBanned(name)) { toast.error('That name contains inappropriate content and is not allowed.'); return; }
    updateProfile({
      name,
      nameColor: color,
      nameColor2: useGradient ? color2 : '',
      bio,
      activeTitle: selectedTitle,
      activeTitleEffect: selectedTitleEffect,
      activeTitleColor: selectedTitleColor,
      language,
    });
    toast.success('Profile saved!');
    onClose();
  }

  const previewStyle = useGradient
    ? { backgroundImage: `linear-gradient(90deg, ${color}, ${color2})`, WebkitBackgroundClip: 'text' as const, WebkitTextFillColor: 'transparent', backgroundClip: 'text' as const }
    : { color };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>My Profile</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Avatar + info */}
          <div className="flex items-center gap-4">
            <div className="relative cursor-pointer group" onClick={() => fileRef.current?.click()}>
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border-2 border-primary">
                {profile.profilePic ? <img src={profile.profilePic} alt="pfp" className="w-full h-full object-cover" /> : <span className="text-2xl font-bold text-primary">{profile.name[0]?.toUpperCase()}</span>}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center"><Camera className="w-5 h-5 text-white" /></div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePicUpload} />
            </div>
            <div>
              <p className="font-bold text-sm" style={previewStyle}>{name || profile.name}</p>
              <p className="text-xs text-muted-foreground">{profile.email}</p>
              <p className="text-xs text-muted-foreground capitalize">Role: {profile.role}</p>
            </div>
          </div>

          {/* Display Name */}
          <div><Label>Display Name</Label><Input value={name} onChange={e => setName(e.target.value)} className="mt-1" /></div>

          {/* Bio */}
          <div><Label>Bio</Label><Input value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us about yourself..." className="mt-1" maxLength={150} /><p className="text-[10px] text-muted-foreground mt-0.5">{bio.length}/150</p></div>

          {/* Name Colors */}
          <div>
            <div className="flex items-center justify-between">
              <Label>Name Color</Label>
              <div className="flex items-center gap-2">
                <Label className="text-[10px] text-muted-foreground">Gradient</Label>
                <Switch checked={useGradient} onCheckedChange={setUseGradient} />
              </div>
            </div>
            <div className="flex gap-2 mt-1">
              <Input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-12 h-9 p-1 cursor-pointer" />
              {useGradient && (
                <>
                  <span className="text-muted-foreground self-center text-xs">→</span>
                  <Input type="color" value={color2} onChange={e => setColor2(e.target.value)} className="w-12 h-9 p-1 cursor-pointer" />
                </>
              )}
              <Input value={color} onChange={e => setColor(e.target.value)} className="flex-1" placeholder="#hex" />
            </div>
            {useGradient && (
              <p className="text-[10px] mt-1 font-bold" style={previewStyle}>Preview: {name || 'Your Name'}</p>
            )}
          </div>

          {/* Active Title — now local state, saved on Save */}
          <div>
            <Label>Active Title</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              <button onClick={() => { setSelectedTitle(''); setSelectedTitleEffect(''); setSelectedTitleColor(''); }} className={`px-2 py-1 rounded text-xs border ${!selectedTitle ? 'border-primary bg-primary/20' : 'border-border'}`}>None</button>
              {allTitles.map(t => (
                <button key={t.name} onClick={() => { setSelectedTitle(t.name); setSelectedTitleEffect(t.effect); setSelectedTitleColor(t.color); }} className={`rounded border p-0.5 ${selectedTitle === t.name ? 'border-primary bg-primary/20' : 'border-border'}`}>
                  <TitleBadge title={t.name} effect={t.effect} color={t.color} />
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <Label className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />Language</Label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground mt-0.5">Changes how the app's text appears for you</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={save} className="flex-1">{isUploading ? 'Uploading…' : 'Save'}</Button>
            <Button variant="outline" onClick={onOpenShop} className="flex items-center gap-1"><ShoppingBag className="w-4 h-4" />Shop</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
