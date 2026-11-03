import { useState } from 'react';
import { BookMarked, Star, History, Trash2 } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@project/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { getBookmarks, getHistory, clearHistory, toggleBookmark, SavedLink } from '../../lib/browserStore';

function Row({ l, onOpen, onRemove }: { l: SavedLink; onOpen: (u: string) => void; onRemove?: () => void }) {
  return (
    <div className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
      <button onClick={() => onOpen(l.url)} className="flex-1 text-left min-w-0">
        <p className="text-xs font-medium truncate">{l.title}</p>
        <p className="text-[10px] text-muted-foreground truncate">{l.url.replace('nexus:search?q=', 'Search: ')}</p>
      </button>
      {onRemove && <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>}
    </div>
  );
}

export default function LibraryMenu({ onOpen }: { onOpen: (url: string) => void }) {
  const [, force] = useState(0);
  const [open, setOpen] = useState(false);
  const go = (u: string) => { setOpen(false); onOpen(u); };
  const bookmarks = open ? getBookmarks() : [];
  const history = open ? getHistory() : [];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Bookmarks & history"><BookMarked className="w-4 h-4" /></Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <Tabs defaultValue="bookmarks">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="bookmarks"><Star className="w-3.5 h-3.5 mr-1" />Bookmarks</TabsTrigger>
            <TabsTrigger value="history"><History className="w-3.5 h-3.5 mr-1" />History</TabsTrigger>
          </TabsList>
          <TabsContent value="bookmarks" className="max-h-72 overflow-y-auto">
            {bookmarks.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Tap the ☆ in the address bar to save a page.</p>}
            {bookmarks.map(b => <Row key={b.url} l={b} onOpen={go} onRemove={() => { toggleBookmark(b.url, b.title); force(n => n + 1); }} />)}
          </TabsContent>
          <TabsContent value="history" className="max-h-72 overflow-y-auto">
            {history.length === 0 ? <p className="text-xs text-muted-foreground text-center py-6">No history yet.</p> :
              <Button variant="ghost" size="sm" className="w-full text-xs mb-1" onClick={() => { clearHistory(); force(n => n + 1); }}>Clear history</Button>}
            {history.map(h => <Row key={h.url} l={h} onOpen={go} />)}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
