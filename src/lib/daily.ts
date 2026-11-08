import type { AppState, DayRecord, HskWord } from './types';
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

export type DayProgress = { goal: number; total: number; done: number; learned: number; known: number; goalMet: boolean };

/** Both "Teach me" (learned) and "I know it" (known) count toward the daily goal. */
export function dayProgress(day: DayRecord | undefined, goal: number): DayProgress {
  const words = day?.words ?? [];
  const handled = day?.handled ?? {};
  const learned = words.filter((w) => handled[w] === 'taught').length;
  const known = words.filter((w) => handled[w] === 'known').length;
  const done = learned + known;
  return { goal, total: words.length, done, learned, known, goalMet: words.length > 0 && done >= Math.min(goal, words.length) };
}

export type GoalSummary = {
  target: number; // the goal for today (never more than the words available)
  towardGoal: number; // done, capped at the target
  ratio: number; // 0–1, for the ring
  optionalLeft: number; // undone words beyond the goal
  extraDone: number; // words done beyond the goal
  met: boolean;
};

/** Progress toward the daily goal itself (not toward every card dealt today). */
export function goalSummary(p: DayProgress): GoalSummary {
  const target = p.total > 0 ? Math.min(p.goal, p.total) : p.goal;
  const towardGoal = Math.min(p.done, target);
  return {
    target,
    towardGoal,
    ratio: target ? towardGoal / target : 0,
    optionalLeft: Math.max(0, p.total - Math.max(p.done, target)),
    extraDone: Math.max(0, p.done - target),
    met: p.goalMet,
  };
}
