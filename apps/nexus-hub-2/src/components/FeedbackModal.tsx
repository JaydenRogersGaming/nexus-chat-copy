import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Textarea } from '@project/components/ui/textarea';
import { Label } from '@project/components/ui/label';
import { Bug, Lightbulb, ThumbsUp, Plus, CheckCircle, Clock, Circle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { toast } from 'sonner';
import { cn } from '@project/components/lib/utils';

type Props = { open: boolean; onClose: () => void; defaultTab?: 'bugs' | 'suggestions' };

const STATUS_META: Record<DB.Bug['status'], { label: string; icon: React.ReactNode; color: string }> = {
  open:        { label: 'Open',        icon: <Circle className="w-3 h-3" />,        color: 'text-yellow-400' },
  'in-progress': { label: 'In Progress', icon: <Clock className="w-3 h-3" />,         color: 'text-blue-400' },
  resolved:    { label: 'Resolved',    icon: <CheckCircle className="w-3 h-3" />,    color: 'text-green-400' },
};

export default function FeedbackModal({ open, onClose, defaultTab = 'bugs' }: Props) {
  const { profile, updateProfile, checkAchievements } = useApp();

  // Bug state
  const [bugTitle, setBugTitle] = useState('');
  const [bugDesc, setBugDesc] = useState('');
  const [showBugForm, setShowBugForm] = useState(false);
  const [bugs, setBugs] = useState<DB.Bug[]>([]);

  // Suggestion state
  const [sugTitle, setSugTitle] = useState('');
  const [sugDesc, setSugDesc] = useState('');
  const [showSugForm, setShowSugForm] = useState(false);
  const [suggestions, setSuggestions] = useState<DB.Suggestion[]>([]);

  useEffect(() => {
    if (open) {
      setBugs(DB.getBugs());
      setSuggestions(DB.getSuggestions().sort((a, b) => b.upvotes - a.upvotes));
    }
  }, [open]);

  function submitBug() {
    if (!profile || !bugTitle.trim() || !bugDesc.trim()) { toast.error('Fill in all fields'); return; }
    const bug: DB.Bug = { id: crypto.randomUUID(), title: bugTitle.trim(), description: bugDesc.trim(), reporterEmail: profile.email, reporterName: profile.name, status: 'open', timestamp: Date.now() };
    DB.addBug(bug);
    const updated = { ...profile, bugCount: profile.bugCount + 1 };
    DB.saveUser(updated); updateProfile(updated);
    toast.success('Bug reported! Thanks 🐛');
    setTimeout(checkAchievements, 200);
    setBugTitle(''); setBugDesc(''); setShowBugForm(false);
    setBugs(DB.getBugs());
  }

  function submitSuggestion() {
    if (!profile || !sugTitle.trim() || !sugDesc.trim()) { toast.error('Fill in all fields'); return; }
    const sug: DB.Suggestion = { id: crypto.randomUUID(), title: sugTitle.trim(), description: sugDesc.trim(), submitterEmail: profile.email, upvotes: 0, upvoters: [], timestamp: Date.now() };
    DB.addSuggestion(sug);
    const updated = { ...profile, suggestionCount: profile.suggestionCount + 1 };
    DB.saveUser(updated); updateProfile(updated);
    toast.success('Suggestion submitted! 💡');
    setTimeout(checkAchievements, 200);
    setSugTitle(''); setSugDesc(''); setShowSugForm(false);
    setSuggestions(DB.getSuggestions().sort((a, b) => b.upvotes - a.upvotes));
  }

  function upvote(id: string) {
    if (!profile) return;
    DB.upvoteSuggestion(id, profile.email);
    setSuggestions(DB.getSuggestions().sort((a, b) => b.upvotes - a.upvotes));
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="w-4 h-4 text-orange-400" />
            Bugs & Suggestions
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full">
            <TabsTrigger value="bugs" className="flex-1 gap-1.5">
              <Bug className="w-3.5 h-3.5" /> Bugs
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex-1 gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" /> Suggestions
            </TabsTrigger>
          </TabsList>

          {/* ── Bugs Tab ── */}
          <TabsContent value="bugs" className="flex-1 overflow-y-auto mt-3 space-y-3">
            <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => setShowBugForm(v => !v)}>
              <Plus className="w-3.5 h-3.5" />{showBugForm ? 'Cancel' : 'Report a Bug'}
            </Button>

            {showBugForm && (
              <div className="space-y-3 p-3 bg-secondary/30 border border-border rounded-xl">
                <div><Label>Bug Title</Label><Input value={bugTitle} onChange={e => setBugTitle(e.target.value)} placeholder="What went wrong?" className="mt-1" /></div>
                <div><Label>Description</Label><Textarea value={bugDesc} onChange={e => setBugDesc(e.target.value)} placeholder="Describe the issue in detail…" rows={3} className="mt-1 resize-none" /></div>
                <Button onClick={submitBug} size="sm" className="w-full">Submit Bug 🐛</Button>
              </div>
            )}

            <div className="space-y-2">
              {bugs.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No bugs reported yet!</p>}
              {bugs.map(bug => {
                const s = STATUS_META[bug.status];
                return (
                  <div key={bug.id} className="p-3 rounded-xl border border-border bg-secondary/20 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm leading-tight">{bug.title}</p>
                      <span className={cn('flex items-center gap-1 text-[10px] font-bold flex-shrink-0', s.color)}>
                        {s.icon}{s.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{bug.description}</p>
                    <p className="text-[10px] text-muted-foreground">by {bug.reporterName}</p>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Suggestions Tab ── */}
          <TabsContent value="suggestions" className="flex-1 overflow-y-auto mt-3 space-y-3">
            <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => setShowSugForm(v => !v)}>
              <Plus className="w-3.5 h-3.5" />{showSugForm ? 'Cancel' : 'New Suggestion'}
            </Button>

            {showSugForm && (
              <div className="space-y-3 p-3 bg-secondary/30 border border-border rounded-xl">
                <div><Label>Title</Label><Input value={sugTitle} onChange={e => setSugTitle(e.target.value)} className="mt-1" /></div>
                <div><Label>Description</Label><Textarea value={sugDesc} onChange={e => setSugDesc(e.target.value)} rows={3} className="mt-1 resize-none" /></div>
                <Button onClick={submitSuggestion} size="sm" className="w-full">Submit 💡</Button>
              </div>
            )}

            <div className="space-y-2">
              {suggestions.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No suggestions yet. Be the first!</p>}
              {suggestions.map(s => (
                <div key={s.id} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-secondary/20">
                  <button
                    onClick={() => upvote(s.id)}
                    className={cn('flex flex-col items-center gap-0.5 flex-shrink-0 p-1.5 rounded-lg transition-colors',
                      s.upvoters.includes(profile?.email || '') ? 'bg-primary/30 text-primary' : 'hover:bg-secondary text-muted-foreground')}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-xs font-bold">{s.upvotes}</span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
