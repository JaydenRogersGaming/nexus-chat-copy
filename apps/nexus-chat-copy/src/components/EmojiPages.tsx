import { useState } from 'react';

const PAGES: { name: string; icon: string; emojis: string[] }[] = [
  { name: 'Popular', icon: '🔥', emojis: ['🔥','⚡','👑','💎','🌟','✨','💀','😎','🏆','🚀','💯','⭐','🌈','💥','🎯','🗿'] },
  { name: 'Faces', icon: '😀', emojis: ['😀','😂','🤣','😍','🥰','😘','😜','🤪','🤓','😏','😈','👿','🥶','🥵','🤯','😤','🤡','🥳','😇','🤠','🫠','😴','🤑','🙃'] },
  { name: 'Animals', icon: '🐉', emojis: ['🐉','🦊','🐺','🦁','🐯','🐼','🐸','🐍','🦅','🦈','🐙','🦄','🐝','🦋','🐧','🐢','🦖','🐲','🐱','🐶','🦇','🕷️','🐬','🦉'] },
  { name: 'Fantasy', icon: '🗡️', emojis: ['🗡️','🛡️','⚔️','🏹','🔮','🪄','🧙','🧛','🧟','🧜','🧚','🥷','👻','🤖','👽','👾','☠️','🪦','🕯️','📜','🏰','🐦‍🔥','🌀','🧿'] },
  { name: 'Nature', icon: '🌙', emojis: ['🌙','☀️','❄️','🌊','🌪️','🌋','🌸','🌹','🍀','🌵','🍁','🌴','⛈️','🌑','🪐','☄️','🌌','💧','🔆','🌻','🍄','🌿','🌺','⛰️'] },
  { name: 'Food', icon: '🍕', emojis: ['🍕','🍔','🍟','🌮','🍣','🍩','🍪','🍰','🍦','🍫','🍿','🥤','☕','🧋','🍓','🍉','🍒','🥑','🌶️','🍜','🧁','🍭','🍬','🥨'] },
  { name: 'Fun', icon: '🎮', emojis: ['🎮','🕹️','🎲','🎵','🎧','🎸','🥁','🎤','🎨','📸','⚽','🏀','🏈','⚾','🎾','🏓','🛹','🏎️','✈️','🛸','🎪','🎭','🎬','🎃'] },
  { name: 'Hearts', icon: '💜', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💖','💗','💓','💞','💕','💘','💝','❤️‍🔥','💔','♾️','☯️','✝️','☮️','♠️','♦️'] },
];

export default function EmojiPages({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  const [page, setPage] = useState(0);
  return (
    <div className="rounded-lg border border-border p-2 space-y-2">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {PAGES.map((p, i) => (
          <button key={p.name} type="button" onClick={() => setPage(i)} title={p.name}
            className={`shrink-0 h-7 px-2 rounded-md text-[11px] flex items-center gap-1 border ${page === i ? 'border-primary bg-primary/15 font-semibold' : 'border-transparent text-muted-foreground hover:bg-secondary'}`}>
            <span className="text-sm">{p.icon}</span>{p.name}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        <button type="button" onClick={() => onChange('')} className={`h-8 px-2 rounded-md border text-[11px] ${!value ? 'border-primary bg-primary/15' : 'border-border text-muted-foreground'}`}>None</button>
        {PAGES[page].emojis.map(e => (
          <button key={e} type="button" onClick={() => onChange(e)} className={`h-8 w-8 rounded-md border text-base ${value === e ? 'border-primary bg-primary/15' : 'border-border hover:bg-secondary'}`}>{e}</button>
        ))}
      </div>
    </div>
  );
}
