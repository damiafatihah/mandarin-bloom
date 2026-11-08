import { describe, expect, it } from 'vitest';
import { dayProgress, goalSummary, selectNewWords } from './daily';
import { makeState, POOL, TODAY } from '../test/fixtures';

const byS = new Map(POOL.map((w) => [w.s, w]));

describe('selectNewWords', () => {
  it('picks n distinct words from the chosen levels', () => {
    const out = selectNewWords(POOL, makeState(), TODAY, 3);
    expect(out).toHaveLength(3);
    expect(new Set(out).size).toBe(3);
    for (const s of out) expect(byS.get(s)!.l).toBe(1);
  });
  it('is deterministic for the same day and state, and varies across days', () => {
    const s = makeState({}, { levels: [1, 2, 3, 4] });
    expect(selectNewWords(POOL, s, TODAY, 4)).toEqual(selectNewWords(POOL, s, TODAY, 4));
    const days = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'].map((d) => selectNewWords(POOL, s, d, 4).join());
    expect(new Set(days).size).toBeGreaterThan(1);
  });
  it('keeps single-character grammar words (fn) out while other words remain', () => {
    for (const day of ['2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11']) {
      expect(selectNewWords(POOL, makeState(), day, 5)).not.toContain('了');
    }
    expect(selectNewWords(POOL, makeState(), TODAY, 6)).toContain('了'); // level 1 has only 5 content words
  });
  it('skips known words, carded words and today’s words', () => {
    const s = makeState({
      known: ['书'],
      cards: { 进: { box: 0, due: TODAY, seen: 0, correct: 0 } },
      days: { [TODAY]: { words: ['汽车'] } },
    });
    expect(selectNewWords(POOL, s, TODAY, 10).sort()).toEqual(['桌子', '爱好', '了'].sort());
  });
  it('respects levels and returns [] for n <= 0', () => {
    expect(selectNewWords(POOL, makeState({}, { levels: [5, 7] }), TODAY, 5).sort()).toEqual(['一帆风顺', '犹豫'].sort());
    expect(selectNewWords(POOL, makeState(), TODAY, 0)).toEqual([]);
  });
});

describe('dayProgress (both "I know it" and "Teach me" count toward the daily goal)', () => {
  it('counts learned + already-known out of today’s words', () => {
    const day = { words: ['a', 'b', 'c', 'd', 'e'], handled: { a: 'taught', b: 'known', c: 'taught' } as const };
    expect(dayProgress(day, 5)).toEqual({ goal: 5, total: 5, done: 3, learned: 2, known: 1, goalMet: false });
  });
  it('goal is met when every one of today’s words is handled', () => {
    const day = { words: ['a', 'b'], handled: { a: 'taught', b: 'known' } as const };
    expect(dayProgress(day, 2).goalMet).toBe(true);
  });
  it('after "learn more", the goal stays met while extra words are optional', () => {
    const day = { words: ['a', 'b', 'c', 'd'], handled: { a: 'taught', b: 'known' } as const };
    expect(dayProgress(day, 2)).toMatchObject({ total: 4, done: 2, goalMet: true });
  });
  it('a short pool (fewer words than the goal) is met when all available words are done', () => {
    expect(dayProgress({ words: ['a'], handled: { a: 'taught' } }, 5).goalMet).toBe(true);
  });
  it('no day yet → nothing done, goal not met', () => {
    expect(dayProgress(undefined, 5)).toEqual({ goal: 5, total: 0, done: 0, learned: 0, known: 0, goalMet: false });
  });
});

describe('goalSummary (what the Me ring shows)', () => {
  const day = (n: number, done: number) => ({
    words: Array.from({ length: n }, (_, i) => `w${i}`),
    handled: Object.fromEntries(Array.from({ length: done }, (_, i) => [`w${i}`, 'taught' as const])),
  });

  it('5 dealt, 3 done, goal lowered to 3 → ring full at 3/3, 2 optional words left', () => {
    expect(goalSummary(dayProgress(day(5, 3), 3))).toEqual({ target: 3, towardGoal: 3, ratio: 1, optionalLeft: 2, extraDone: 0, met: true });
  });
  it('5 dealt, 2 done, goal 5 → 2/5', () => {
    expect(goalSummary(dayProgress(day(5, 2), 5))).toEqual({ target: 5, towardGoal: 2, ratio: 0.4, optionalLeft: 0, extraDone: 0, met: false });
  });
  it('learned more than the goal → full, with the extra counted', () => {
    expect(goalSummary(dayProgress(day(6, 5), 3))).toMatchObject({ target: 3, towardGoal: 3, ratio: 1, extraDone: 2, optionalLeft: 1, met: true });
  });
  it('no words dealt yet → 0 of the goal', () => {
    expect(goalSummary(dayProgress(undefined, 5))).toEqual({ target: 5, towardGoal: 0, ratio: 0, optionalLeft: 0, extraDone: 0, met: false });
  });
  it('fewer words available than the goal → the goal is what is available', () => {
    expect(goalSummary(dayProgress(day(2, 1), 5))).toMatchObject({ target: 2, towardGoal: 1, ratio: 0.5, met: false });
  });
});
