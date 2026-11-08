import { describe, expect, it } from 'vitest';
import { selectNewWords } from './daily';
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
