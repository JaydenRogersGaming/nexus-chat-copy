import { useState } from 'react';
import { Wand2, Download, Loader2, Sparkles, ImageIcon } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { toast } from 'sonner';
import { generateArt } from 'zitejs/api';

const STYLE_PRESETS = [
  { label: '🎨 Realistic', suffix: ', photorealistic, 8k, highly detailed' },
  { label: '🖌️ Anime', suffix: ', anime style, manga, vibrant colors' },
  { label: '🌌 Fantasy', suffix: ', fantasy art, magical, ethereal lighting' },
  { label: '🤖 Cyberpunk', suffix: ', cyberpunk, neon, futuristic city' },
  { label: '🎮 Pixel Art', suffix: ', pixel art, retro game style, 16-bit' },
  { label: '🖼️ Oil Paint', suffix: ', oil painting, classical, textured brushstrokes' },
];

type GeneratedImage = { prompt: string; dataUrl: string; timestamp: number };

export default function AiArtPage() {
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<number | null>(null);

  async function generate() {
    if (!prompt.trim()) { toast.error('Enter a prompt!'); return; }
    setLoading(true);

    try {
      const finalPrompt = prompt.trim() + (selectedStyle !== null ? STYLE_PRESETS[selectedStyle].suffix : '');
      const result = await generateArt({ prompt: finalPrompt });
      const dataUrl = `data:image/png;base64,${result.imageBase64}`;
      const newImage: GeneratedImage = { prompt: prompt.trim(), dataUrl, timestamp: Date.now() };
      setImages(prev => [newImage, ...prev].slice(0, 20));
      toast.success('🎨 Image generated!');
    } catch (err) {
      const errorMsg = String(err);
      if (errorMsg.includes('safety') || errorMsg.includes('rejected') || errorMsg.includes('400')) {
        toast.error('⚠️ OpenAI blocked this prompt — try rephrasing with more artistic language');
      } else {
        toast.error('Failed to generate image. Try again!');
      }
    } finally {
      setLoading(false);
    }
  }

  function downloadImage(img: GeneratedImage) {
    const a = document.createElement('a');
    a.href = img.dataUrl;
    a.download = `ai-art-${img.timestamp}.png`;
    a.click();
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-black flex items-center justify-center gap-2">
            <Wand2 className="w-7 h-7 text-primary" />
            AI Art Generator
          </h1>
          <p className="text-muted-foreground text-sm">Describe anything and watch AI create it!</p>
        </div>

        {/* Prompt Input */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex gap-2">
            <Input
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !loading) generate(); }}
              placeholder="A cat wearing a space suit on Mars..."
              className="flex-1"
            />
            <Button onClick={generate} disabled={loading || !prompt.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span className="ml-1.5 hidden sm:inline">{loading ? 'Creating...' : 'Generate'}</span>
            </Button>
          </div>

          {/* Style presets */}
          <div className="flex flex-wrap gap-1.5">
            {STYLE_PRESETS.map((s, i) => (
              <button
                key={i}
                onClick={() => setSelectedStyle(selectedStyle === i ? null : i)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                  selectedStyle === i
                    ? 'border-primary bg-primary/20 text-primary'
                    : 'border-border hover:bg-secondary text-muted-foreground'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
              <Wand2 className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-sm text-muted-foreground">Creating your masterpiece...</p>
            <p className="text-[10px] text-muted-foreground/60">This can take up to 30 seconds</p>
          </div>
        )}

        {/* Empty state */}
        {images.length === 0 && !loading && (
          <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center gap-3 text-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">Your generated images will appear here</p>
            <p className="text-muted-foreground text-xs">Try: &quot;A dragon made of crystals flying over a sunset ocean&quot;</p>
          </div>
        )}

        {/* Gallery */}
        <div className="grid grid-cols-1 gap-4">
          {images.map((img, i) => (
            <div key={`${img.timestamp}-${i}`} className="bg-card border border-border rounded-xl overflow-hidden group">
              <div className="relative bg-secondary">
                <img
                  src={img.dataUrl}
                  alt={img.prompt}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button size="sm" variant="secondary" onClick={() => downloadImage(img)}>
                    <Download className="w-4 h-4 mr-1" /> Download
                  </Button>
                </div>
              </div>
              <div className="p-2.5">
                <p className="text-xs text-muted-foreground line-clamp-2">{img.prompt}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{new Date(img.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
