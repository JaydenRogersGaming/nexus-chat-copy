import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Textarea } from '@project/components/ui/textarea';
import { Label } from '@project/components/ui/label';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { toast } from 'sonner';

type Props = { open: boolean; onClose: () => void };

export default function BugReporterModal({ open, onClose }: Props) {
  const { profile, updateProfile, checkAchievements } = useApp();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  function submit() {
    if (!profile || !title.trim() || !desc.trim()) { toast.error('Please fill in all fields'); return; }
    const bug: DB.Bug = { id: crypto.randomUUID(), title: title.trim(), description: desc.trim(), reporterEmail: profile.email, reporterName: profile.name, status: 'open', timestamp: Date.now() };
    DB.addBug(bug);
    const updated = { ...profile, bugCount: profile.bugCount + 1 };
    DB.saveUser(updated); updateProfile(updated);
    toast.success('Bug reported! Thanks 🐛');
    setTimeout(checkAchievements, 200);
    setTitle(''); setDesc(''); onClose();
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader><DialogTitle>🐛 Report a Bug</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div><Label>Bug Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="What went wrong?" className="mt-1" /></div>
          <div><Label>Description</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe the bug in detail…" rows={4} className="mt-1 resize-none" /></div>
          <div className="flex gap-2">
            <Button onClick={submit} className="flex-1">Submit Bug</Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
