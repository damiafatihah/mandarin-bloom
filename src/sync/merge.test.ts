import { describe, expect, it } from 'vitest';
import { mergeStates } from './merge';
import { makeState } from '../test/fixtures';
import type { AppState } from '../lib/types';

const card = (box: number, due: string, seen: number) => ({ box, due, seen, correct: seen });
const D1 = '2026-11-08', D2 = '2026-11-09';

describe('mergeStates: combine two devices without losing progress', () => {
  it('merging a state with itself changes nothing', () => {
    const s = makeState({ cards: { 书: card(1, D2, 1) }, known: ['河'], days: { [D1]: { words: ['书', '河'], handled: { 书: 'taught', 河: 'known' } } } });
    expect(mergeStates(s, s)).toEqual(s);
  });

  it('words in review: union of both; for the same word, the copy with more reviews wins', () => {
    const phone = makeState({ cards: { 书: card(2, '2026-11-12', 3), 河: card(0, D2, 0) } });
    const laptop = makeState({ cards: { 书: card(0, D2, 4), 金: card(1, '2026-11-10', 1) } });
    const m = mergeStates(phone, laptop);
    expect(Object.keys(m.cards).sort()).toEqual(['书', '河', '金'].sort());
    expect(m.cards['书']).toEqual(card(0, D2, 4)); // reviewed 4 times beats 3
    expect(mergeStates(laptop, phone).cards).toEqual(m.cards); // same result either way round
  });

  it('already-known words: union, no duplicates', () => {
    const m = mergeStates(makeState({ known: ['河', '金'] }), makeState({ known: ['金', '近'] }));
    expect(m.known).toEqual(['河', '金', '近']);
  });

  it('settings: the most recently changed side wins', () => {
    const a = { ...makeState({}, { wordsPerDay: 5 }), settingsAt: 100 };
    const b = { ...makeState({}, { wordsPerDay: 10 }), settingsAt: 200 };
    expect(mergeStates(a, b).settings.wordsPerDay).toBe(10);
    expect(mergeStates(b, a).settings.wordsPerDay).toBe(10);
    expect(mergeStates(b, a).settingsAt).toBe(200);
  });

  it('onboarded on either device means onboarded', () => {
    expect(mergeStates({ ...makeState(), onboarded: false }, makeState()).onboarded).toBe(true);
  });

  it('days only on one side are kept', () => {
    const m = mergeStates(
      makeState({ days: { [D1]: { words: ['书'], handled: { 书: 'taught' } } } }),
      makeState({ days: { [D2]: { words: ['河'], handled: {} } } }),
    );
    expect(Object.keys(m.days).sort()).toEqual([D1, D2]);
  });

  it('the same day on both: done words from both, untouched extras only from the side that did more', () => {
    const phone = makeState({ days: { [D2]: { words: ['书', '河', '金'], handled: { 书: 'taught', 河: 'known' } } } });
    const laptop = makeState({ days: { [D2]: { words: ['书', '河', '金', '近', '进'], handled: { 近: 'taught' } } } });
    const m = mergeStates(phone, laptop);
    expect(m.days[D2].handled).toEqual({ 书: 'taught', 河: 'known', 近: 'taught' });
    // phone did more (2 vs 1), so its list is the base; laptop's done word 近 is added; laptop's untouched 进 is not
    expect(m.days[D2].words).toEqual(['书', '河', '金', '近']);
  });

  it('challenge: a finished challenge wins; otherwise the one further along, with its own words', () => {
    const done = makeState({ days: { [D2]: { words: [], challengeWords: ['a', 'b'], challengeRun: { index: 1, answers: [0, 1] }, challenge: { score: 2, total: 2 } } } });
    const half = makeState({ days: { [D2]: { words: [], challengeWords: ['x', 'y'], challengeRun: { index: 1, answers: [0, null] } } } });
    const fresh = makeState({ days: { [D2]: { words: [], challengeWords: ['p', 'q'], challengeRun: { index: 0, answers: [] } } } });
    expect(mergeStates(half, done).days[D2]).toMatchObject({ challenge: { score: 2, total: 2 }, challengeWords: ['a', 'b'] });
    expect(mergeStates(fresh, half).days[D2]).toMatchObject({ challengeWords: ['x', 'y'], challengeRun: { index: 1, answers: [0, null] } });
    expect(mergeStates(half, fresh).days[D2].challengeWords).toEqual(['x', 'y']);
  });

  it('a practice session in progress on this device stays; otherwise the other device’s is used', () => {
    const run = { seed: 's', words: ['书'], source: 'levels' as const, size: 10, index: 0, answers: [] };
    expect(mergeStates(makeState(), { ...makeState(), practice: run }).practice).toEqual(run);
    const mine = { ...run, seed: 'mine' };
    expect(mergeStates({ ...makeState(), practice: mine }, { ...makeState(), practice: run }).practice).toEqual(mine);
  });

  it('after "Reset all progress" on one device, that reset wins over older progress elsewhere', () => {
    const wiped: AppState = { ...makeState(), cards: {}, known: [], days: {}, epoch: 1 };
    const old = makeState({ cards: { 书: card(3, D2, 5) }, known: ['河'] });
    expect(mergeStates(old, wiped)).toEqual(wiped);
    expect(mergeStates(wiped, old)).toEqual(wiped);
    const newer = { ...wiped, cards: { 金: card(0, D2, 0) } };
    expect(mergeStates(wiped, newer).cards).toEqual({ 金: card(0, D2, 0) }); // same epoch: normal merge
  });
});
