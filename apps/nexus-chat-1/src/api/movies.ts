import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';

const API = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/';
const REGION = 'US';
// Official TMDB / JustWatch provider ids
const SERVICES = [
  { id: 8, name: 'Netflix' }, { id: 538, name: 'Plex' }, { id: 73, name: 'Tubi' }, { id: 9, name: 'Prime Video' },
  { id: 337, name: 'Disney+' }, { id: 15, name: 'Hulu' }, { id: 1899, name: 'Max' }, { id: 386, name: 'Peacock' },
  { id: 531, name: 'Paramount+' }, { id: 300, name: 'Pluto TV' },
];
const ROWS: { key: string; title: string; params: Record<string, string> }[] = [
  { key: 'trending', title: 'Trending', params: { sort_by: 'popularity.desc' } },
  { key: 'new', title: 'New Releases', params: { sort_by: 'primary_release_date.desc', 'vote_count.gte': '50' } },
  { key: 'action', title: 'Action', params: { with_genres: '28', sort_by: 'popularity.desc' } },
  { key: 'comedy', title: 'Comedy', params: { with_genres: '35', sort_by: 'popularity.desc' } },
  { key: 'family', title: 'Family', params: { with_genres: '10751', sort_by: 'popularity.desc' } },
];

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(API + path);
  for (const [k, v] of Object.entries({ language: 'en-US', ...params })) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.ZITE_TMDB_TOKEN}`, accept: 'application/json' } });
  if (!res.ok) {
    console.error('TMDB', res.status, await res.text());
    throw new ZiteError("Couldn't load movies right now. Try again in a moment.");
  }
  return res.json() as Promise<T>;
}

type Raw = { id: number; title: string; poster_path: string | null; backdrop_path: string | null; release_date?: string; genre_ids?: number[]; vote_average: number; overview: string };
const movie = z.object({ id: z.number(), title: z.string(), poster: z.string(), backdrop: z.string(), year: z.string(), genres: z.array(z.string()), rating: z.number(), description: z.string() });
const provider = z.object({ id: z.number(), link: z.string(), services: z.array(z.object({ name: z.string(), logo: z.string(), type: z.string() })) });

export default createEndpoint({
  description: 'Finds movies and where to stream them, using licensed TMDB / JustWatch data',
  authenticated: true,
  inputSchema: z.object({
    action: z.enum(['browse', 'providers']),
    query: z.string().trim().max(100).optional(),
    genreId: z.number().optional(),
    serviceId: z.number().optional(),
    ids: z.array(z.number()).max(20).optional(),
  }),
  outputSchema: z.object({
    rows: z.array(z.object({ key: z.string(), title: z.string(), movies: z.array(movie) })),
    genres: z.array(z.object({ id: z.number(), name: z.string() })),
    services: z.array(z.object({ id: z.number(), name: z.string() })),
    providers: z.array(provider),
  }),
  execute: async ({ input }) => {
    const out = { rows: [] as { key: string; title: string; movies: z.infer<typeof movie>[] }[], genres: [] as { id: number; name: string }[], services: SERVICES, providers: [] as z.infer<typeof provider>[] };

    if (input.action === 'providers') {
      out.providers = await Promise.all((input.ids ?? []).map(async id => {
        const r = await tmdb<{ results: Record<string, { link: string; flatrate?: P[]; free?: P[]; ads?: P[]; rent?: P[]; buy?: P[] }> }>(`/movie/${id}/watch/providers`).catch(() => ({ results: {} }));
        type P = { provider_name: string; logo_path: string };
        const us = r.results[REGION];
        const list = (arr: P[] | undefined, type: string) => (arr ?? []).map(p => ({ name: p.provider_name, logo: p.logo_path ? `${IMG}w92${p.logo_path}` : '', type }));
        const services = us ? [...list(us.flatrate, 'Stream'), ...list(us.free, 'Free'), ...list(us.ads, 'Free with ads'), ...list(us.rent, 'Rent')] : [];
        const seen = new Set<string>();
        return { id, link: us?.link ?? `https://www.themoviedb.org/movie/${id}/watch?locale=${REGION}`, services: services.filter(s => !seen.has(s.name) && seen.add(s.name)) };
      }));
      return out;
    }

    const { genres } = await tmdb<{ genres: { id: number; name: string }[] }>('/genre/movie/list');
    out.genres = genres;
    const names = new Map(genres.map(g => [g.id, g.name]));
    const map = (m: Raw) => ({
      id: m.id, title: m.title, poster: m.poster_path ? `${IMG}w342${m.poster_path}` : '', backdrop: m.backdrop_path ? `${IMG}w1280${m.backdrop_path}` : '',
      year: m.release_date?.slice(0, 4) ?? '', genres: (m.genre_ids ?? []).map(g => names.get(g)).filter((g): g is string => !!g).slice(0, 2),
      rating: Math.round(m.vote_average * 10) / 10, description: m.overview,
    });

    if (input.query) {
      const r = await tmdb<{ results: Raw[] }>('/search/movie', { query: input.query, include_adult: 'false' });
      out.rows = [{ key: 'search', title: `Results for “${input.query}”`, movies: r.results.filter(m => m.poster_path).slice(0, 20).map(map) }];
      return out;
    }

    const filters: Record<string, string> = { include_adult: 'false', 'release_date.lte': new Date().toISOString().slice(0, 10), watch_region: REGION };
    if (input.serviceId) { filters.with_watch_providers = String(input.serviceId); filters.with_watch_monetization_types = 'flatrate|free|ads'; }
    let rows = ROWS;
    if (input.genreId) rows = [...ROWS.slice(0, 2), { key: 'genre', title: names.get(input.genreId) ?? 'Genre', params: { with_genres: String(input.genreId), sort_by: 'popularity.desc' } }]
      .map(r => ({ ...r, params: { with_genres: String(input.genreId), ...r.params } }));
    out.rows = await Promise.all(rows.map(async row => {
      const r = row.key === 'trending' && !input.serviceId && !input.genreId
        ? await tmdb<{ results: Raw[] }>('/trending/movie/week')
        : await tmdb<{ results: Raw[] }>('/discover/movie', { ...filters, ...row.params });
      return { key: row.key, title: row.title, movies: r.results.filter(m => m.poster_path).slice(0, 18).map(map) };
    }));
    return out;
  },
});
