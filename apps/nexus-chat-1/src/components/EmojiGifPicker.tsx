import { useEffect, useState } from 'react';
import { Smile, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@project/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { Input } from '@project/components/ui/input';
import { Button } from '@project/components/ui/button';
import { useDebounce } from 'use-debounce';
import { gifs as gifsApi, GifsOutputType } from 'zitejs/api';

const EMOJIS = '😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😋 😛 😜 🤪 😎 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤯 😳 🥵 🥶 😱 😨 🤔 🤭 🤫 🙄 😬 😴 🤤 😷 🤒 🤠 🤡 👻 💀 👽 🤖 🎃 😺 👍 👎 👏 🙌 🙏 🤝 💪 👀 ✌️ 🤞 👋 ❤️ 🧡 💛 💚 💙 💜 🖤 💔 💯 🔥 ✨ ⭐ 🎉 🎊 💎 👑 🏆 🎮 🍕 🍔 🍟 🍩 ☕ 🚀 💤 💬'.split(' ');

type Props = { onEmoji: (e: string) => void; onGif: (url: string) => void };

export default function EmojiGifPicker({ onEmoji, onGif }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced] = useDebounce(query, 400);
  const [results, setResults] = useState<GifsOutputType['gifs']>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('emoji');

  useEffect(() => {
    if (!open || tab !== 'gif') return;
    setLoading(true);
    gifsApi({ query: debounced }).then(r => setResults(r.gifs)).catch(() => setResults([])).finally(() => setLoading(false));
  }, [debounced, open, tab]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="icon" variant="ghost" aria-label="Emoji and GIFs"><Smile className="w-5 h-5" /></Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-80 p-2">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-2 w-full mb-2">
            <TabsTrigger value="emoji">Emoji</TabsTrigger>
            <TabsTrigger value="gif">GIFs</TabsTrigger>
          </TabsList>
          <TabsContent value="emoji" className="mt-0">
            <div className="grid grid-cols-8 gap-1 max-h-60 overflow-y-auto">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => onEmoji(e)} className="text-xl p-1 rounded hover:bg-secondary transition-transform hover:scale-110">{e}</button>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="gif" className="mt-0 space-y-2">
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search GIFs…" className="h-8" />
            <div className="grid grid-cols-2 gap-1 h-60 overflow-y-auto">
              {loading && <div className="col-span-2 flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
              {!loading && results.length === 0 && <p className="col-span-2 text-center text-xs text-muted-foreground py-8">No GIFs found</p>}
              {!loading && results.map(g => (
                <button key={g.id} onClick={() => { onGif(g.url); setOpen(false); }} className="rounded overflow-hidden hover:ring-2 ring-primary">
                  <img src={g.preview} alt="" loading="lazy" className="w-full h-24 object-cover" />
                </button>
              ))}
            </div>
            <p className="text-[9px] text-right text-muted-foreground">Powered by GIPHY</p>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
