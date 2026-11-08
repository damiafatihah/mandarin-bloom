import { describe, expect, it } from 'vitest';
import { reducer } from './reducer';
import { makeState, POOL, TODAY } from '../test/fixtures';

describe('reducer', () => {
  it('ENSURE_DAY creates today with N words and cards due tomorrow', () => {
    const s = reducer(makeState(), { type: 'ENSURE_DAY', today: TODAY, pool: POOL });
    expect(s.days[TODAY].words).toEqual(['了', '书', '进']);
    expect(s.cards['书']).toEqual({ box: 0, due: '2026-11-09', seen: 0, correct: 0 });
  });
  it('ENSURE_DAY is idempotent (same object)', () => {
    const s = reducer(makeState(), { type: 'ENSURE_DAY', today: TODAY, pool: POOL });
    expect(reducer(s, { type: 'ENSURE_DAY', today: TODAY, pool: POOL })).toBe(s);
  });
  it('ENSURE_DAY tops up after wordsPerDay increases', () => {
    let s = reducer(makeState(), { type: 'ENSURE_DAY', today: TODAY, pool: POOL });
    s = reducer(s, { type: 'UPDATE_SETTINGS', patch: { wordsPerDay: 4 } });
    s = reducer(s, { type: 'ENSURE_DAY', today: TODAY, pool: POOL });
    expect(s.days[TODAY].words).toEqual(['了', '书', '进', '汽车']);
  });
  it('MARK_KNOWN swaps the word for the next one', () => {
    let s = reducer(makeState(), { type: 'ENSURE_DAY', today: TODAY, pool: POOL });
    s = reducer(s, { type: 'MARK_KNOWN', word: '书', today: TODAY, pool: POOL });
    expect(s.days[TODAY].words).toEqual(['了', '进', '汽车']);
    expect(s.days[TODAY].skipped).toBe(1);
    expect(s.known).toEqual(['书']);
    expect(s.cards['书']).toBeUndefined();
  });
  it('GRADE: correct on an uncarded word changes nothing; wrong adds a card and un-knows it', () => {
    const s = makeState({ known: ['河'] });
    expect(reducer(s, { type: 'GRADE', word: '河', correct: true, today: TODAY })).toBe(s);
    const s2 = reducer(s, { type: 'GRADE', word: '河', correct: false, today: TODAY });
    expect(s2.cards['河']).toMatchObject({ box: 0, due: '2026-11-09' });
    expect(s2.known).toEqual([]);
  });
  it('START_CHALLENGE is fixed once set; FINISH_CHALLENGE records score', () => {
    let s = reducer(makeState(), { type: 'START_CHALLENGE', today: TODAY, words: ['书'] });
    s = reducer(s, { type: 'START_CHALLENGE', today: TODAY, words: ['河'] });
    expect(s.days[TODAY].challengeWords).toEqual(['书']);
    s = reducer(s, { type: 'FINISH_CHALLENGE', today: TODAY, score: 8, total: 10 });
    expect(s.days[TODAY].challenge).toEqual({ score: 8, total: 10 });
  });
  it('ENSURE_DAY on a new day keeps yesterday and picks fresh words', () => {
    let s = reducer(makeState(), { type: 'ENSURE_DAY', today: TODAY, pool: POOL });
    s = reducer(s, { type: 'ENSURE_DAY', today: '2026-11-09', pool: POOL });
    expect(s.days[TODAY].words).toEqual(['了', '书', '进']);
    expect(s.days['2026-11-09'].words).toEqual(['汽车', '爱好', '桌子']);
  });
  it('ENSURE_DAY with an exhausted pool still records the day (no infinite re-dispatch)', () => {
    const s = reducer(makeState({}, { levels: [5] }), { type: 'ENSURE_DAY', today: TODAY, pool: POOL });
    expect(s.days[TODAY].words).toEqual(['犹豫']);
    expect(reducer(s, { type: 'ENSURE_DAY', today: TODAY, pool: POOL })).toBe(s);
  });
  it('MARK_KNOWN on a word that is not today’s just records it as known', () => {
    const s = reducer(makeState(), { type: 'MARK_KNOWN', word: '河', today: TODAY, pool: POOL });
    expect(s.known).toEqual(['河']);
  });
  it('ADD_TO_DECK adds a due-today card once', () => {
    let s = reducer(makeState({ known: ['河'] }), { type: 'ADD_TO_DECK', word: '河', today: TODAY });
    expect(s.cards['河']).toEqual({ box: 0, due: TODAY, seen: 0, correct: 0 });
    expect(s.known).toEqual([]);
    expect(reducer(s, { type: 'ADD_TO_DECK', word: '河', today: TODAY })).toBe(s);
  });
  it('RESET clears progress, keeps settings and onboarding', () => {
    const s = reducer(makeState({ known: ['书'] }, { wordsPerDay: 9 }), { type: 'RESET' });
    expect(s.known).toEqual([]);
    expect(s.settings.wordsPerDay).toBe(9);
    expect(s.onboarded).toBe(true);
  });
});
