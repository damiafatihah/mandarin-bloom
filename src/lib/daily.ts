import type { AppState, HskWord } from './types';
import { seededRng, shuffle } from './rng';

/**
 * New words for the day: a varied, date-seeded mix from the chosen levels (not strictly most-frequent first,
 * because a speaker already knows the most frequent words). Single-character grammar words come last.
 * Deterministic for a given day + state, so refills after "I know it" are stable.
 */
export function selectNewWords(pool: HskWord[], state: AppState, today: string, n: number): string[] {
  if (n <= 0) return [];
  const levels = new Set(state.settings.levels);
  const taken = new Set([...state.known, ...Object.keys(state.cards), ...(state.days[today]?.words ?? [])]);
  const eligible = pool.filter((w) => levels.has(w.l) && !taken.has(w.s)).sort((a, b) => a.q - b.q || a.s.localeCompare(b.s));
  const rng = seededRng(`daily:${today}`);
  const content = shuffle(eligible.filter((w) => !w.fn), rng);
  const grammar = shuffle(eligible.filter((w) => w.fn), rng);
  return [...content, ...grammar].slice(0, n).map((w) => w.s);
}
