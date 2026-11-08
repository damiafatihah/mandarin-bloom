import type { AppState, HskWord } from './types';

export function selectNewWords(pool: HskWord[], state: AppState, today: string, n: number): string[] {
  if (n <= 0) return [];
  const levels = new Set(state.settings.levels);
  const taken = new Set([...state.known, ...Object.keys(state.cards), ...(state.days[today]?.words ?? [])]);
  return pool
    .filter((w) => levels.has(w.l) && !taken.has(w.s))
    .sort((a, b) => a.q - b.q || a.s.localeCompare(b.s))
    .slice(0, n)
    .map((w) => w.s);
}
