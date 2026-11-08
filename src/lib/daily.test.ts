import { describe, expect, it } from 'vitest';
import { selectNewWords } from './daily';
import { makeState, POOL, TODAY } from '../test/fixtures';

describe('selectNewWords', () => {
  it('picks the most frequent unseen words in the chosen levels', () => {
    expect(selectNewWords(POOL, makeState(), TODAY, 3)).toEqual(['了', '书', '进']);
  });
  it('skips known words, carded words and today’s words', () => {
    const s = makeState({
      known: ['了'],
      cards: { 书: { box: 0, due: TODAY, seen: 0, correct: 0 } },
      days: { [TODAY]: { words: ['进'] } },
    });
    expect(selectNewWords(POOL, s, TODAY, 2)).toEqual(['汽车', '爱好']);
  });
  it('respects levels and returns [] for n <= 0', () => {
    expect(selectNewWords(POOL, makeState({}, { levels: [5, 7] }), TODAY, 5)).toEqual(['犹豫', '一帆风顺']);
    expect(selectNewWords(POOL, makeState(), TODAY, 0)).toEqual([]);
  });
});
