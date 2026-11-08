import type { Card } from './types';
import { addDays } from './dates';

export const INTERVALS = [1, 2, 4, 7, 15, 30, 60] as const;
export const MASTERED_BOX = 4;

export const newCard = (due: string): Card => ({ box: 0, due, seen: 0, correct: 0 });

export function gradeCard(card: Card, correct: boolean, today: string): Card {
  const box = correct ? Math.min(card.box + 1, INTERVALS.length - 1) : 0;
  return {
    box,
    due: addDays(today, INTERVALS[box]),
    seen: card.seen + 1,
    correct: card.correct + (correct ? 1 : 0),
  };
}
