# In-app Browser

**Where:** sidebar → Browser (`/browser`).

## Files
- `src/pages/BrowserPage.tsx` — tabs, toolbar, shortcuts, loading bar
- `src/components/browser/*` — page/search/error views, bookmarks & history menu, research helper
- `src/lib/browserNav.ts` — pure navigation logic (URL vs search, history, tabs, errors)
- `src/lib/browserStore.ts` — bookmarks/history/engine in localStorage
- `src/api/webSearch.ts` — web search (Brave, falls back to Wikipedia without `ZITE_BRAVE_SEARCH_KEY`)

## Tests
```
cd apps/nexus-chat-1
npx tsx --test tests/browserNav.test.ts
```

## Shortcuts
Ctrl/⌘+T new tab · Ctrl/⌘+W close · Ctrl/⌘+L address bar · Ctrl/⌘+R reload · Ctrl/⌘+D bookmark · Ctrl+Tab switch · Alt+←/→ back/forward · Alt+Home home · Esc leave address bar

## Limitations
- Many sites refuse to be embedded; use "Open in a new browser tab".
- Only http(s) URLs load; site security restrictions are respected, not bypassed.
- Bookmarks/history are per-device (localStorage).
