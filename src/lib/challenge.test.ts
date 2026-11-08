import { describe, expect, it } from 'vitest';
import { buildChallengeWords, pickPracticeWords } from './challenge';
import { seededRng } from './rng';
import { makeState, POOL, TODAY } from '../test/fixtures';

const card = (due: string) => ({ box: 1, due, seen: 1, correct: 1 });

describe('buildChallengeWords', () => {
  const state = makeState(
    { days: { [TODAY]: { words: ['了', '书', '进'] } }, cards: { 汽车: card('2026-11-07'), 爱好: card('2026-11-20') } },
    { levels: [1, 2] },
  );
  it('includes today’s words and due reviews, fills to 10, no duplicates, deterministic', () => {
    const a = buildChallengeWords(POOL, state, TODAY);
    expect(a).toHaveLength(10);
    expect(new Set(a).size).toBe(10);
    for (const s of ['了', '书', '进', '汽车']) expect(a).toContain(s);
    expect(buildChallengeWords(POOL, state, TODAY)).toEqual(a);
  });
});

describe('pickPracticeWords', () => {
  const state = makeState({ cards: { 汽车: card('2026-11-07'), 河: card('2026-11-20') } });
  const base = { size: 10, today: TODAY, speech: true, rng: seededRng('p') };
  it('due → only due cards', () => {
    expect(pickPracticeWords(POOL, state, { ...base, source: 'due' })).toEqual(['汽车']);
  });
  it('deck → all cards', () => {
    expect(pickPracticeWords(POOL, state, { ...base, source: 'deck' }).sort()).toEqual(['河', '汽车'].sort());
  });
  it('levels + forced kind filters to eligible words', () => {
    const out = pickPracticeWords(POOL, state, { ...base, source: 'levels', kind: 'measure-word' });
    expect(out.sort()).toEqual(['书', '桌子', '汽车'].sort());
  });
});
