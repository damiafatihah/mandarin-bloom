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

  it('prefers words learned today, and never quizzes words marked "I know it"', () => {
    const s = makeState(
      {
        known: ['了', '河'],
        days: { [TODAY]: { words: ['了', '书', '进', '汽车', '爱好'], handled: { 了: 'known', 书: 'taught', 进: 'taught' } } },
      },
      { levels: [1, 2] },
    );
    const out = buildChallengeWords(POOL, s, TODAY);
    expect(out).toContain('书');
    expect(out).toContain('进');
    expect(out).not.toContain('了');
    expect(out).not.toContain('河');
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
  it('levels never includes words marked "I know it"', () => {
    const s = makeState({ known: ['书', '桌子'] });
    const out = pickPracticeWords(POOL, s, { ...base, source: 'levels', kind: 'measure-word' });
    expect(out).toEqual(['汽车']);
  });
  it('levels + forced kind filters to eligible words', () => {
    const out = pickPracticeWords(POOL, state, { ...base, source: 'levels', kind: 'measure-word' });
    expect(out.sort()).toEqual(['书', '桌子', '汽车'].sort());
  });
});
