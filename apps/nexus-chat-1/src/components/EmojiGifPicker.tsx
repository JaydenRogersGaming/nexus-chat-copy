import { useEffect, useState } from 'react';
import { Smile, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@project/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { Input } from '@project/components/ui/input';
import { Button } from '@project/components/ui/button';
import { useDebounce } from 'use-debounce';
import { gifs as gifsApi, GifsOutputType } from 'zitejs/api';
import { Link } from 'react-router-dom';
import { getMyEmojis, MY_EMOJIS_EVENT } from '../lib/emojiParts';

const EMOJIS = '😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😋 😛 😜 🤪 😎 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤯 😳 🥵 🥶 😱 😨 🤔 🤭 🤫 🙄 😬 😴 🤤 😷 🤒 🤠 🤡 👻 💀 👽 🤖 🎃 😺 👍 👎 👏 🙌 🙏 🤝 💪 👀 ✌️ 🤞 👋 ❤️ 🧡 💛 💚 💙 💜 🖤 💔 💯 🔥 ✨ ⭐ 🎉 🎊 💎 👑 🏆 🎮 🍕 🍔 🍟 🍩 ☕ 🚀 💤 💬'.split(' ');

type Props = { onEmoji: (e: string) => void; onGif: (url: string) => void };

export default function EmojiGifPicker({ onEmoji, onGif }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced] = useDebounce(query, 400);
  const [results, setResults] = useState<GifsOutputType['gifs']>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('emoji');
  const [mine, setMine] = useState(getMyEmojis);
  useEffect(() => { const s = () => setMine(getMyEmojis()); s(); window.addEventListener(MY_EMOJIS_EVENT, s); return () => window.removeEventListener(MY_EMOJIS_EVENT, s); }, [open]);

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
            <div className="max-h-60 overflow-y-auto space-y-2">
            <div>
              <div className="flex items-center justify-between px-1 mb-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your emoji collection</p>
                <Link to="/emoji-maker" onClick={() => setOpen(false)} className="text-[10px] font-semibold text-primary hover:underline">+ Make one</Link>
              </div>
              {mine.length === 0 ? <p className="text-[11px] text-muted-foreground italic px-1">No custom emojis yet.</p> : (
                <div className="grid grid-cols-6 gap-1">
                  {mine.map(m => (
                    <button key={m.id} onClick={() => { onGif(m.url); setOpen(false); }} className="p-0.5 rounded hover:bg-secondary transition-transform hover:scale-110">
                      <img src={m.url} alt="custom emoji" className="w-full aspect-square object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Emojis</p>
            <div className="grid grid-cols-8 gap-1">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => onEmoji(e)} className="text-xl p-1 rounded hover:bg-secondary transition-transform hover:scale-110">{e}</button>
              ))}
            </div>
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
