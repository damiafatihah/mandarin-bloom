import { describe, expect, it } from 'vitest';
import { levelLabel, toggleLevels } from './levels';

describe('levels', () => {
  it('toggles option groups on and off, sorted', () => {
    expect(toggleLevels([4, 5], [6])).toEqual([4, 5, 6]);
    expect(toggleLevels([1, 2, 3, 4], [1, 2, 3])).toEqual([4]);
    expect(toggleLevels([7], [1, 2, 3])).toEqual([1, 2, 3, 7]);
  });
  it('never returns an empty selection', () => expect(toggleLevels([4], [4])).toEqual([4]));
  it('labels 7 as 7–9', () => expect(levelLabel(7)).toBe('HSK 7–9'));
});
