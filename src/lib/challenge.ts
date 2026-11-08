import type { AppState, HskWord } from './types';
import { availableKinds, type QuestionKind } from './quiz';
import { seededRng, shuffle } from './rng';

export const CHALLENGE_SIZE = 10;

/** Up to 4 of today's words, then due reviews (oldest first) up to 8, then random words from the chosen levels. */
export function buildChallengeWords(pool: HskWord[], state: AppState, today: string, size = CHALLENGE_SIZE): string[] {
  const rng = seededRng(`challenge-words:${today}`);
  const picked = new Set<string>(shuffle(state.days[today]?.words ?? [], rng).slice(0, 4));
  const due = Object.entries(state.cards)
    .filter(([s, c]) => c.due <= today && !picked.has(s))
    .sort(([, a], [, b]) => a.due.localeCompare(b.due) || a.box - b.box)
    .map(([s]) => s);
  for (const s of due) {
    if (picked.size >= 8) break;
    picked.add(s);
  }
  const levels = new Set(state.settings.levels);
  for (const w of shuffle(pool.filter((x) => levels.has(x.l)), rng)) {
    if (picked.size >= size) break;
    picked.add(w.s);
  }
  return shuffle([...picked], rng);
}

export type PracticeSource = 'due' | 'levels' | 'deck';
export type PracticeOptions = {
  source: PracticeSource; size: number; today: string; speech: boolean; rng: () => number; kind?: QuestionKind;
};

export function pickPracticeWords(pool: HskWord[], state: AppState, o: PracticeOptions): string[] {
  const byS = new Map(pool.map((w) => [w.s, w]));
  const fromCards = (keep: (due: string) => boolean) =>
    Object.entries(state.cards)
      .filter(([, c]) => keep(c.due))
      .map(([s]) => byS.get(s))
      .filter((w): w is HskWord => !!w);
  const levels = new Set(state.settings.levels);
  let candidates =
    o.source === 'due' ? fromCards((d) => d <= o.today)
    : o.source === 'deck' ? fromCards(() => true)
    : pool.filter((w) => levels.has(w.l));
  if (o.kind) {
    const kind = o.kind;
    candidates = candidates.filter((w) => availableKinds(w, o.speech).includes(kind));
  }
  return shuffle(candidates, o.rng).slice(0, o.size).map((w) => w.s);
}
