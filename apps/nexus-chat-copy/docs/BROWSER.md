# Custom Browser Feature

A fully functional browser built within the application sidebar workspace, managing tabs, navigation logic, shortcuts, and global state sync.

**Where:** Sidebar — Browser (`/browser`).

## Files
- `src/pages/BrowserPage.tsx` — tabs, toolbar, shortcuts, loading bar
- `src/components/browser/*` — page/search/error views, bookmarks & history menu, research helper
- `src/lib/browserNav.ts` — pure navigation logic (URL vs search, history, tabs, errors)
- `src/lib/browserStore.ts` — bookmarks/history/engine in localStorage
- `src/api/webSearch.ts` — web search (Brave, falls back to Wikipedia without `ZITE_BRAVE_SEARCH_KEY`)

## Tests
```bash
cd apps/nexus-chat-1
npx tsx --test tests/browserNav.test.ts
```

## Shortcuts
- `Ctrl`+`T` new tab
- `Ctrl`+`W` close
- `Ctrl`+`L` address bar
- `Ctrl`+`R` reload
- `Ctrl`+`D` bookmark
- `Ctrl`+`Tab` switch
- `Alt`+`←`/`→` back/forward
- `Alt`+`Home` home
- `Esc` leave address bar

## Limitations
- **Embed Restrictions:** Many sites refuse to be embedded (due to `X-Frame-Options` or `CSP` policies); use "Open in a new browser tab" as a fallback.
- **Protocol Limits:** Only `http(s)` URLs load; native browser site security restrictions are fully respected, not bypassed.
- **Storage Isolation:** Bookmarks and history data are strictly per-device (`localStorage`).
