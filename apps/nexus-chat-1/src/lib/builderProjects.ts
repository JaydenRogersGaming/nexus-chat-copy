import { DEFAULT_SETTINGS, type SiteSettings } from './siteSettings';

export interface Version { prompt: string; html: string }
export interface Project { id: string; name: string; kind: string; versions: Version[]; settings: SiteSettings; siteId?: string; slug?: string; updatedAt: number }

const key = (email: string) => `nexus_builder_projects_${email.toLowerCase()}`;

export function loadProjects(email: string): Project[] {
  try { return JSON.parse(localStorage.getItem(key(email)) || '[]'); } catch { return []; }
}
export function saveProjects(email: string, list: Project[]) {
  try { localStorage.setItem(key(email), JSON.stringify(list.slice(0, 30))); }
  catch { /* storage full — keep only the latest versions */
    localStorage.setItem(key(email), JSON.stringify(list.slice(0, 30).map(p => ({ ...p, versions: p.versions.slice(-3) }))));
  }
}
export const newProject = (kind: string, name = 'Untitled app'): Project =>
  ({ id: crypto.randomUUID(), name, kind, versions: [], settings: { ...DEFAULT_SETTINGS }, updatedAt: Date.now() });
