import { describe, expect, it } from 'vitest';
import { reducer } from './reducer';
import { makeState, POOL, TODAY } from '../test/fixtures';

const fresh = () => reducer(makeState(), { type: 'ENSURE_DAY', today: TODAY, pool: POOL });

describe('reducer', () => {
  it('ENSURE_DAY creates today with N words and does NOT put them in reviews yet', () => {
    const s = fresh();
    expect(s.days[TODAY].words).toHaveLength(3);
    expect(s.cards).toEqual({});
  });
  it('ENSURE_DAY is idempotent (same object)', () => {
    const s = fresh();
    expect(reducer(s, { type: 'ENSURE_DAY', today: TODAY, pool: POOL })).toBe(s);
  });
  it('ENSURE_DAY tops up after wordsPerDay increases', () => {
    let s = fresh();
    s = reducer(s, { type: 'UPDATE_SETTINGS', patch: { wordsPerDay: 4 } });
    const before = s.days[TODAY].words;
    s = reducer(s, { type: 'ENSURE_DAY', today: TODAY, pool: POOL });
    expect(s.days[TODAY].words).toHaveLength(4);
    expect(s.days[TODAY].words.slice(0, 3)).toEqual(before);
  });

  it('TEACH marks the word learned today and adds it to reviews (due tomorrow)', () => {
    let s = fresh();
    const [w] = s.days[TODAY].words;
    s = reducer(s, { type: 'TEACH', word: w, today: TODAY });
    expect(s.days[TODAY].handled).toEqual({ [w]: 'taught' });
    expect(s.cards[w]).toEqual({ box: 0, due: '2026-11-09', seen: 0, correct: 0 });
  });

  it('MARK_KNOWN keeps today’s cards fixed (no new word pops in), marks it known, no review card', () => {
    let s = fresh();
    const words = s.days[TODAY].words;
    s = reducer(s, { type: 'MARK_KNOWN', word: words[0], today: TODAY });
    expect(s.days[TODAY].words).toEqual(words);
    expect(s.days[TODAY].handled).toEqual({ [words[0]]: 'known' });
    expect(s.known).toEqual([words[0]]);
    expect(s.cards[words[0]]).toBeUndefined();
  });

  it('MARK_KNOWN never deletes review progress the word already has', () => {
    const s = reducer(makeState({ cards: { 河: { box: 3, due: TODAY, seen: 3, correct: 3 } } }), { type: 'MARK_KNOWN', word: '河', today: TODAY });
    expect(s.cards['河']).toEqual({ box: 3, due: TODAY, seen: 3, correct: 3 });
  });

  it('UNDO_DAILY reverses "I know it" and "Teach me"', () => {
    let s = fresh();
    const [a, b] = s.days[TODAY].words;
    s = reducer(s, { type: 'MARK_KNOWN', word: a, today: TODAY });
    s = reducer(s, { type: 'TEACH', word: b, today: TODAY });
    s = reducer(s, { type: 'UNDO_DAILY', word: a, today: TODAY });
    expect(s.known).toEqual([]);
    expect(s.days[TODAY].handled).toEqual({ [b]: 'taught' });
    s = reducer(s, { type: 'UNDO_DAILY', word: b, today: TODAY });
    expect(s.cards[b]).toBeUndefined();
    expect(s.days[TODAY].handled).toEqual({});
  });

  it('LEARN_MORE adds more new words to today, keeping the ones already there', () => {
    let s = fresh();
    const first = s.days[TODAY].words;
    s = reducer(s, { type: 'LEARN_MORE', today: TODAY, pool: POOL, count: 2 });
    expect(s.days[TODAY].words).toHaveLength(5);
    expect(s.days[TODAY].words.slice(0, 3)).toEqual(first);
    expect(new Set(s.days[TODAY].words).size).toBe(5);
    // and ENSURE_DAY does not trim the extra words
    expect(reducer(s, { type: 'ENSURE_DAY', today: TODAY, pool: POOL })).toBe(s);
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
  it('ENSURE_DAY on a new day keeps yesterday and picks fresh words (not yesterday’s learned/known ones)', () => {
    let s = fresh();
    const first = s.days[TODAY].words;
    s = reducer(s, { type: 'TEACH', word: first[0], today: TODAY });
    s = reducer(s, { type: 'MARK_KNOWN', word: first[1], today: TODAY });
    s = reducer(s, { type: 'ENSURE_DAY', today: '2026-11-09', pool: POOL });
    expect(s.days[TODAY].words).toEqual(first);
    expect(s.days['2026-11-09'].words).toHaveLength(3);
    expect(s.days['2026-11-09'].words).not.toContain(first[0]);
    expect(s.days['2026-11-09'].words).not.toContain(first[1]);
  });
  it('ENSURE_DAY with an exhausted pool still records the day (no infinite re-dispatch)', () => {
    const s = reducer(makeState({}, { levels: [5] }), { type: 'ENSURE_DAY', today: TODAY, pool: POOL });
    expect(s.days[TODAY].words).toEqual(['犹豫']);
    expect(reducer(s, { type: 'ENSURE_DAY', today: TODAY, pool: POOL })).toBe(s);
  });
  it('MARK_KNOWN on a word that is not today’s just records it as known', () => {
    const s = reducer(makeState(), { type: 'MARK_KNOWN', word: '河', today: TODAY });
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
