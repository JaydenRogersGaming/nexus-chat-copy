import { useState } from 'react';
import { Bug, Lightbulb, ThumbsUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import * as DB from '../../lib/storage';

/** Owner panel feedback: bug reports and suggestions in one place. */
export default function FeedbackTab() {
  const [bugs, setBugs] = useState<DB.Bug[]>(() => DB.getBugs());
  const suggestions = DB.getSuggestions().sort((a, b) => b.upvotes - a.upvotes);
  const setStatus = (id: string, s: DB.Bug['status']) => { DB.updateBugStatus(id, s); setBugs(DB.getBugs()); };

  return (
    <Tabs defaultValue="bugs">
      <TabsList className="mb-3">
        <TabsTrigger value="bugs"><Bug className="w-3.5 h-3.5 mr-1" />Bugs ({bugs.length})</TabsTrigger>
        <TabsTrigger value="suggestions"><Lightbulb className="w-3.5 h-3.5 mr-1" />Suggestions ({suggestions.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="bugs" className="space-y-3">
        {bugs.length === 0 && <p className="text-muted-foreground text-center py-4 text-sm">No bug reports yet!</p>}
        {bugs.map(bug => (
          <div key={bug.id} className="p-3 bg-card border border-border rounded-xl space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div><p className="font-semibold text-sm">{bug.title}</p><p className="text-xs text-muted-foreground">by {bug.reporterName}</p></div>
              <Select value={bug.status} onValueChange={v => setStatus(bug.id, v as DB.Bug['status'])}>
                <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="in-progress">In Progress</SelectItem><SelectItem value="resolved">Resolved</SelectItem></SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">{bug.description}</p>
          </div>
        ))}
      </TabsContent>
      <TabsContent value="suggestions" className="space-y-3">
        {suggestions.length === 0 && <p className="text-muted-foreground text-center py-4 text-sm">No suggestions yet!</p>}
        {suggestions.map(s => (
          <div key={s.id} className="p-3 bg-card border border-border rounded-xl flex gap-3">
            <div className="flex flex-col items-center text-primary text-xs font-bold"><ThumbsUp className="w-4 h-4" />{s.upvotes}</div>
            <div className="min-w-0">
              <p className="font-semibold text-sm">{s.title}</p>
              {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
              <p className="text-[10px] text-muted-foreground mt-1">{s.submitterEmail} · {new Date(s.timestamp).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </TabsContent>
    </Tabs>
  );
}
