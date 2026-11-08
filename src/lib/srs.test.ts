import { describe, expect, it } from 'vitest';
import { gradeCard, newCard } from './srs';

describe('srs', () => {
  const today = '2026-11-08';
  it('moves up a box on correct', () => {
    expect(gradeCard(newCard(today), true, today)).toEqual({ box: 1, due: '2026-11-10', seen: 1, correct: 1 });
  });
  it('drops to box 0, due tomorrow, on wrong', () => {
    expect(gradeCard({ box: 4, due: today, seen: 5, correct: 5 }, false, today)).toEqual({ box: 0, due: '2026-11-09', seen: 6, correct: 5 });
  });
  it('caps at the last box (60 days)', () => {
    expect(gradeCard({ box: 6, due: today, seen: 9, correct: 9 }, true, today).due).toBe('2027-01-07');
  });
});
