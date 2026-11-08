import { describe, expect, it } from 'vitest';
import { seededRng, shuffle } from './rng';

describe('seededRng', () => {
  it('is deterministic per seed', () => {
    const a = seededRng('2026-11-08');
    const b = seededRng('2026-11-08');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('differs across seeds and stays in [0,1)', () => {
    const x = seededRng('a')();
    const y = seededRng('b')();
    expect(x).not.toBe(y);
    for (const v of [x, y]) expect(v >= 0 && v < 1).toBe(true);
  });
});

describe('shuffle', () => {
  it('keeps every element and does not mutate input', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, seededRng('s'));
    expect(out.slice().sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});
