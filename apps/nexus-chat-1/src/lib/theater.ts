/** Detects which streaming service a movie link is from. */
export const PLATFORMS = ['YouTube', 'Netflix', 'Plex', 'Disney+', 'Prime Video', 'Max', 'Hulu', 'Twitch', 'Video file', 'Other'] as const;
export type Platform = typeof PLATFORMS[number];

export function platformOf(url: string): Platform {
  const u = url.toLowerCase();
  if (/youtu\.?be/.test(u)) return 'YouTube';
  if (u.includes('netflix.')) return 'Netflix';
  if (u.includes('plex.') || u.includes('plex.tv')) return 'Plex';
  if (u.includes('disneyplus.')) return 'Disney+';
  if (u.includes('primevideo.') || u.includes('amazon.')) return 'Prime Video';
  if (u.includes('max.com') || u.includes('hbomax.')) return 'Max';
  if (u.includes('hulu.')) return 'Hulu';
  if (u.includes('twitch.tv')) return 'Twitch';
  if (/\.(mp4|webm|ogg|m3u8)(\?|$)/.test(u)) return 'Video file';
  return 'Other';
}

/** Services that won't play inside another app — everyone opens them in their own account. */
export const opensExternally = (p: Platform) => ['Netflix', 'Plex', 'Disney+', 'Prime Video', 'Max', 'Hulu'].includes(p);
