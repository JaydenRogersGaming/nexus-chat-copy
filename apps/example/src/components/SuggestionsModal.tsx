import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Textarea } from '@project/components/ui/textarea';
import { Label } from '@project/components/ui/label';
import { ThumbsUp, Plus } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { toast } from 'sonner';

type Props = { open: boolean; onClose: () => void };

export default function SuggestionsModal({ open, onClose }: Props) {
  const { profile, updateProfile, checkAchievements } = useApp();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [suggestions, setSuggestions] = useState<DB.Suggestion[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { if (open) setSuggestions(DB.getSuggestions().sort((a,b) => b.upvotes - a.upvotes)); }, [open]);

  function submit() {
    if (!profile || !title.trim() || !desc.trim()) { toast.error('Fill in all fields'); return; }
    const sug: DB.Suggestion = { id: crypto.randomUUID(), title: title.trim(), description: desc.trim(), submitterEmail: profile.email, upvotes: 0, upvoters: [], timestamp: Date.now() };
    DB.addSuggestion(sug);
    const updated = { ...profile, suggestionCount: profile.suggestionCount + 1 };
    DB.saveUser(updated); updateProfile(updated);
    toast.success('Suggestion submitted! 💡');
    setTimeout(checkAchievements, 200);
    setTitle(''); setDesc(''); setShowForm(false);
    setSuggestions(DB.getSuggestions().sort((a,b) => b.upvotes - a.upvotes));
  }

  function upvote(id: string) {
    if (!profile) return;
    DB.upvoteSuggestion(id, profile.email);
    setSuggestions(DB.getSuggestions().sort((a,b) => b.upvotes - a.upvotes));
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">💡 Suggestions <Button size="sm" variant="outline" onClick={() => setShowForm(v=>!v)}><Plus className="w-3.5 h-3.5 mr-1" />New</Button></DialogTitle>
        </DialogHeader>
        {showForm && (
          <div className="space-y-3 border border-border rounded-xl p-3 bg-secondary/30">
            <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1" /></div>
            <div><Label>Description</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} className="mt-1 resize-none" /></div>
            <Button onClick={submit} size="sm" className="w-full">Submit</Button>
          </div>
        )}
        <div className="space-y-2 mt-2">
          {suggestions.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No suggestions yet. Be the first!</p>}
          {suggestions.map(s => (
            <div key={s.id} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-secondary/20">
              <button onClick={() => upvote(s.id)} className={`flex flex-col items-center gap-0.5 flex-shrink-0 p-1.5 rounded-lg transition-colors ${s.upvoters.includes(profile?.email||'') ? 'bg-primary/30 text-primary' : 'hover:bg-secondary text-muted-foreground'}`}>
                <ThumbsUp className="w-4 h-4" /><span className="text-xs font-bold">{s.upvotes}</span>
              </button>
              <div><p className="font-semibold text-sm">{s.title}</p><p className="text-xs text-muted-foreground mt-0.5">{s.description}</p></div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
