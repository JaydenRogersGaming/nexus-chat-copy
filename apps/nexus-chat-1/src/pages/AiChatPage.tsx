import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, Loader2, Trash2, Plus, ImageIcon, Paperclip, X, Award } from 'lucide-react';
import { useUpload } from 'zitejs/upload';
import BadgeMaker from '../components/BadgeMaker';
import { Button } from '@project/components/ui/button';
import { Markdown } from '@project/components/markdown';
import { toast } from 'sonner';
import { chat, generateArt } from 'zitejs/api';
import { useAuth } from 'zitejs/auth';
import { OWNER_EMAIL } from '../lib/gameData';
import AiTitleMaker from '../components/AiTitleMaker';

type Message = { role: 'user' | 'assistant'; content: string; imageUrl?: string; attachUrl?: string };

export default function AiChatPage() {
  const { user } = useAuth();
  const isOwner = user?.email === OWNER_EMAIL;
  const [conversations, setConversations] = useState<Message[][]>([[]]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [attach, setAttach] = useState<string | null>(null);
  const [badgeOpen, setBadgeOpen] = useState(false);
  const { upload, isUploading } = useUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messages = conversations[activeIdx] || [];

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages.length, streamText, scrollToBottom]);
  useEffect(() => { inputRef.current?.focus(); }, [activeIdx]);

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && !attach) || streaming || generatingImage || isUploading) return;

    const userMsg: Message = { role: 'user', content: text, attachUrl: attach || undefined };
    setAttach(null);
    const updated = [...messages, userMsg];
    setConversations(prev => prev.map((c, i) => i === activeIdx ? updated : c));
    setInput('');
    setStreaming(true);
    setStreamText('');

    try {
      const stream = chat({ messages: updated.map(m => ({ role: m.role, content: m.content, ...(m.attachUrl ? { imageUrl: m.attachUrl } : {}) })) });
      let full = '';
      for await (const chunk of stream) {
        full += chunk;
        setStreamText(full);
      }
      const assistantMsg: Message = { role: 'assistant', content: full };
      setConversations(prev => prev.map((c, i) => i === activeIdx ? [...updated, assistantMsg] : c));
    } catch {
      toast.error('Failed to get AI response');
    } finally {
      setStreaming(false);
      setStreamText('');
    }
  };

  const handleGenerateImage = async () => {
    const text = input.trim();
    if (!text || streaming || generatingImage) return;
    if (!isOwner) { toast.error('🔒 Only the owner can generate images'); return; }

    const userMsg: Message = { role: 'user', content: `🎨 Generate image: ${text}` };
    const updated = [...messages, userMsg];
    setConversations(prev => prev.map((c, i) => i === activeIdx ? updated : c));
    setInput('');
    setGeneratingImage(true);

    try {
      const result = await generateArt({ prompt: text, relaxed: localStorage.getItem('hub:artFilterOff') === '1' });
      const dataUrl = `data:image/png;base64,${result.imageBase64}`;
      const assistantMsg: Message = { role: 'assistant', content: `Here's your generated image for: "${text}"`, imageUrl: dataUrl };
      setConversations(prev => prev.map((c, i) => i === activeIdx ? [...updated, assistantMsg] : c));
      toast.success('🎨 Image generated!');
    } catch (err) {
      const errorMsg = String(err);
      if (errorMsg.includes('safety') || errorMsg.includes('rejected') || errorMsg.includes('400')) {
        const failMsg: Message = { role: 'assistant', content: '⚠️ OpenAI blocked this prompt due to their safety filter. Try rephrasing with more general/artistic language.' };
        setConversations(prev => prev.map((c, i) => i === activeIdx ? [...updated, failMsg] : c));
        toast.error('Prompt blocked by safety filter — try rephrasing');
      } else {
        toast.error('Failed to generate image');
      }
    } finally {
      setGeneratingImage(false);
    }
  };

  const newChat = () => {
    setConversations(prev => [...prev, []]);
    setActiveIdx(conversations.length);
    setInput('');
  };

  const clearChat = () => {
    setConversations(prev => prev.map((c, i) => i === activeIdx ? [] : c));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isBusy = streaming || generatingImage;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h1 className="font-bold text-lg">AI Assistant</h1>
          <span className="text-xs text-muted-foreground">Chat + Image Gen</span>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setBadgeOpen(true)}><Award className="w-3.5 h-3.5 mr-1" />Badge Maker</Button>
          <AiTitleMaker />
          <Button size="sm" variant="outline" onClick={newChat}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New
          </Button>
          <Button size="sm" variant="ghost" onClick={clearChat} disabled={messages.length === 0}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 && !isBusy && <EmptyState isOwner={isOwner} />}

          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}

          {streaming && streamText && (
            <MessageBubble message={{ role: 'assistant', content: streamText }} isStreaming />
          )}

          {streaming && !streamText && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm pl-10">
              <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
            </div>
          )}

          {generatingImage && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm pl-10">
              <Loader2 className="w-4 h-4 animate-spin" /> Generating image...
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border p-4 shrink-0">
        {attach && (
          <div className="max-w-3xl mx-auto mb-2 flex items-center gap-2">
            <div className="relative">
              <img src={attach} alt="attachment" className="h-16 w-16 object-cover rounded-lg border border-border" />
              <button onClick={() => setAttach(null)} className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"><X className="w-3 h-3" /></button>
            </div>
            <span className="text-xs text-muted-foreground">Picture attached — ask anything about it</span>
          </div>
        )}
        <div className="max-w-3xl mx-auto flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async e => {
            const f = e.target.files?.[0]; e.target.value = '';
            if (!f) return;
            try { const { url } = await upload(f); setAttach(url); } catch { toast.error('Upload failed'); }
          }} />
          <Button onClick={() => fileRef.current?.click()} disabled={isBusy || isUploading} size="icon" variant="outline" className="rounded-xl h-11 w-11 shrink-0" title="Upload a picture">
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
          </Button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything or describe an image..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            style={{ minHeight: 44, maxHeight: 160 }}
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 160) + 'px';
            }}
          />
          {isOwner && (
            <Button onClick={handleGenerateImage} disabled={!input.trim() || isBusy} size="icon" variant="outline" className="rounded-xl h-11 w-11 shrink-0" title="Generate Image (Owner Only)">
              <ImageIcon className="w-4 h-4" />
            </Button>
          )}
          <Button onClick={handleSend} disabled={(!input.trim() && !attach) || isBusy || isUploading} size="icon" className="rounded-xl h-11 w-11 shrink-0" title="Send Message">
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5 max-w-3xl mx-auto">
          Press Enter to chat • 📎 upload a picture (homework, screenshots, anything){isOwner ? ' • Click 🖼️ to generate an image' : ''}
        </p>
      </div>
      <BadgeMaker open={badgeOpen} onClose={() => setBadgeOpen(false)} />
    </div>
  );
}

function EmptyState({ isOwner }: { isOwner: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Bot className="w-8 h-8 text-primary" />
      </div>
      <div>
        <h2 className="font-bold text-lg">AI Assistant</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          {isOwner
            ? 'Chat about anything or generate images! Use the 🖼️ button to create AI art.'
            : 'Ask me anything — write code, solve math, brainstorm ideas, get explanations, and more.'}
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message, isStreaming }: { message: Message; isStreaming?: boolean }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
        isUser
          ? 'bg-primary text-primary-foreground'
          : 'bg-card border border-border'
      }`}>
        {isUser ? (
          <div className="space-y-2">
            {message.attachUrl && <img src={message.attachUrl} alt="uploaded" className="max-h-56 rounded-lg" />}
            {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <Markdown>{message.content}</Markdown>
              {isStreaming && <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-middle rounded-sm" />}
            </div>
            {message.imageUrl && (
              <div className="rounded-xl overflow-hidden border border-border">
                <img src={message.imageUrl} alt="Generated" className="w-full max-w-md" />
                <a href={message.imageUrl} download={`ai-image-${Date.now()}.png`} className="block text-center text-xs text-primary hover:underline py-2 bg-secondary/50">
                  Download Image
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
