import { describe, expect, it } from 'vitest';
import { reducer, rootReducer } from './reducer';
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

describe('challenge progress is saved and resumable', () => {
  const start = () => reducer(makeState(), { type: 'START_CHALLENGE', today: TODAY, words: ['书', '河', '金'] });

  it('START_CHALLENGE begins at question 1 with no answers', () => {
    expect(start().days[TODAY].challengeRun).toEqual({ index: 0, answers: [] });
  });

  it('ANSWER_CHALLENGE records the choice and grades the word exactly once', () => {
    let s = start();
    s = reducer(s, { type: 'ANSWER_CHALLENGE', today: TODAY, index: 0, choice: 2, word: '书', correct: false });
    expect(s.days[TODAY].challengeRun).toEqual({ index: 0, answers: [2] });
    expect(s.cards['书']).toMatchObject({ seen: 1, correct: 0 });
    // answering the same question again (e.g. after coming back) changes nothing
    const again = reducer(s, { type: 'ANSWER_CHALLENGE', today: TODAY, index: 0, choice: 1, word: '书', correct: true });
    expect(again).toBe(s);
  });

  it('ADVANCE_CHALLENGE moves to the next question and keeps earlier answers', () => {
    let s = start();
    s = reducer(s, { type: 'ANSWER_CHALLENGE', today: TODAY, index: 0, choice: 1, word: '书', correct: true });
    s = reducer(s, { type: 'ADVANCE_CHALLENGE', today: TODAY, index: 1 });
    s = reducer(s, { type: 'ANSWER_CHALLENGE', today: TODAY, index: 1, choice: 3, word: '河', correct: false });
    expect(s.days[TODAY].challengeRun).toEqual({ index: 1, answers: [1, 3] });
  });

  it('works for a challenge started before progress was saved (no run yet)', () => {
    const s0 = makeState({ days: { [TODAY]: { words: [], challengeWords: ['书'] } } });
    const s = reducer(s0, { type: 'ANSWER_CHALLENGE', today: TODAY, index: 0, choice: 0, word: '书', correct: false });
    expect(s.days[TODAY].challengeRun).toEqual({ index: 0, answers: [0] });
  });
});

describe('SET_WORDS_PER_DAY: lowering trims words you have not started', () => {
  const ALL = [1, 2, 3, 4, 5, 7];
  const dealt = (n: number) => {
    let s = reducer(makeState({}, { levels: ALL, wordsPerDay: n }), { type: 'ENSURE_DAY', today: TODAY, pool: POOL });
    return s;
  };

  it('15 → 5 with 1 done: today has 5 cards, the done one kept, order kept', () => {
    let s = dealt(15);
    const words = s.days[TODAY].words;
    expect(words).toHaveLength(15);
    s = reducer(s, { type: 'TEACH', word: words[7], today: TODAY });
    s = reducer(s, { type: 'SET_WORDS_PER_DAY', n: 5, today: TODAY });
    expect(s.settings.wordsPerDay).toBe(5);
    const after = s.days[TODAY].words;
    expect(after).toHaveLength(5);
    expect(after).toContain(words[7]);
    expect(after).toEqual(words.filter((w) => after.includes(w))); // original order
    expect(s.cards[words[7]]).toBeDefined(); // its review card is untouched
  });

  it('never removes words already done, even below the new goal', () => {
    let s = dealt(5);
    const words = s.days[TODAY].words;
    for (const w of words.slice(0, 4)) s = reducer(s, { type: 'MARK_KNOWN', word: w, today: TODAY });
    s = reducer(s, { type: 'SET_WORDS_PER_DAY', n: 2, today: TODAY });
    expect(s.days[TODAY].words).toEqual(words.slice(0, 4));
    expect(s.days[TODAY].handled).toEqual(Object.fromEntries(words.slice(0, 4).map((w) => [w, 'known'])));
  });

  it('5 dealt, 3 done → 3: only the 3 done words remain', () => {
    let s = dealt(5);
    const words = s.days[TODAY].words;
    for (const w of words.slice(0, 3)) s = reducer(s, { type: 'TEACH', word: w, today: TODAY });
    s = reducer(s, { type: 'SET_WORDS_PER_DAY', n: 3, today: TODAY });
    expect(s.days[TODAY].words).toEqual(words.slice(0, 3));
  });

  it('raising only changes the setting; the next ENSURE_DAY deals the extra words', () => {
    let s = dealt(5);
    s = reducer(s, { type: 'SET_WORDS_PER_DAY', n: 10, today: TODAY });
    expect(s.days[TODAY].words).toHaveLength(5);
    s = reducer(s, { type: 'ENSURE_DAY', today: TODAY, pool: POOL });
    expect(s.days[TODAY].words).toHaveLength(10);
  });

  it('up then straight back down returns to the original set', () => {
    let s = dealt(5);
    const original = s.days[TODAY].words;
    s = reducer(s, { type: 'SET_WORDS_PER_DAY', n: 15, today: TODAY });
    s = reducer(s, { type: 'ENSURE_DAY', today: TODAY, pool: POOL });
    s = reducer(s, { type: 'SET_WORDS_PER_DAY', n: 5, today: TODAY });
    expect(s.days[TODAY].words).toEqual(original);
  });

  it('no words dealt yet today: just the setting changes', () => {
    const s = reducer(makeState(), { type: 'SET_WORDS_PER_DAY', n: 7, today: TODAY });
    expect(s.settings.wordsPerDay).toBe(7);
    expect(s.days[TODAY]).toBeUndefined();
  });
});

describe('SET_LEVELS: untouched words from levels you turned off are swapped for new-level words', () => {
  it('done words stay; untouched off-level words are replaced to keep the daily count', () => {
    let s = reducer(makeState({}, { levels: [1], wordsPerDay: 3 }), { type: 'ENSURE_DAY', today: TODAY, pool: POOL });
    const [a, b, c] = s.days[TODAY].words;
    s = reducer(s, { type: 'TEACH', word: a, today: TODAY });
    s = reducer(s, { type: 'SET_LEVELS', levels: [2], today: TODAY, pool: POOL });
    expect(s.settings.levels).toEqual([2]);
    const words = s.days[TODAY].words;
    expect(words).toHaveLength(3);
    expect(words[0]).toBe(a); // done word kept, in place
    expect(words).not.toContain(b);
    expect(words).not.toContain(c);
    const level = new Map(POOL.map((w) => [w.s, w.l]));
    for (const w of words.slice(1)) expect(level.get(w)).toBe(2);
  });
  it('adding a level keeps today’s words (they are still in your levels)', () => {
    let s = reducer(makeState({}, { levels: [1], wordsPerDay: 3 }), { type: 'ENSURE_DAY', today: TODAY, pool: POOL });
    const before = s.days[TODAY].words;
    s = reducer(s, { type: 'SET_LEVELS', levels: [1, 2], today: TODAY, pool: POOL });
    expect(s.days[TODAY].words).toEqual(before);
  });
  it('no words dealt yet: only the setting changes', () => {
    const s = reducer(makeState(), { type: 'SET_LEVELS', levels: [4], today: TODAY, pool: POOL });
    expect(s.settings.levels).toEqual([4]);
    expect(s.days[TODAY]).toBeUndefined();
  });
});

describe('practice sessions are saved and resumable', () => {
  const begin = () => reducer(makeState(), { type: 'START_PRACTICE', seed: 'p1', words: ['书', '河', '金'], source: 'levels', size: 10 });

  it('START_PRACTICE saves the session at question 1', () => {
    expect(begin().practice).toEqual({ seed: 'p1', words: ['书', '河', '金'], source: 'levels', size: 10, index: 0, answers: [] });
  });
  it('ANSWER_PRACTICE records and grades exactly once', () => {
    let s = begin();
    s = reducer(s, { type: 'ANSWER_PRACTICE', index: 0, choice: 2, word: '书', correct: false, today: TODAY });
    expect(s.practice!.answers).toEqual([2]);
    expect(s.cards['书']).toMatchObject({ seen: 1 });
    expect(reducer(s, { type: 'ANSWER_PRACTICE', index: 0, choice: 1, word: '书', correct: true, today: TODAY })).toBe(s);
  });
  it('ADVANCE_PRACTICE, FINISH_PRACTICE and END_PRACTICE', () => {
    let s = begin();
    s = reducer(s, { type: 'ADVANCE_PRACTICE', index: 1 });
    expect(s.practice!.index).toBe(1);
    s = reducer(s, { type: 'FINISH_PRACTICE' });
    expect(s.practice!.finished).toBe(true);
    s = reducer(s, { type: 'END_PRACTICE' });
    expect(s.practice).toBeUndefined();
  });
  it('a new START_PRACTICE replaces the old session', () => {
    let s = begin();
    s = reducer(s, { type: 'ANSWER_PRACTICE', index: 0, choice: 2, word: '书', correct: false, today: TODAY });
    s = reducer(s, { type: 'START_PRACTICE', seed: 'p2', words: ['近'], source: 'due', size: 10, kind: 'hanzi-to-pinyin' });
    expect(s.practice).toEqual({ seed: 'p2', words: ['近'], source: 'due', size: 10, kind: 'hanzi-to-pinyin', index: 0, answers: [] });
  });
  it('answers without a session are ignored', () => {
    const s = makeState();
    expect(reducer(s, { type: 'ANSWER_PRACTICE', index: 0, choice: 0, word: '书', correct: false, today: TODAY })).toBe(s);
  });
});

describe('rootReducer: stamps that let syncing pick the newest settings and resets', () => {
  it('a settings change records when it happened; other changes don’t', () => {
    const before = Date.now();
    const s = rootReducer(makeState(), { type: 'UPDATE_SETTINGS', patch: { toneColors: false } });
    expect(s.settingsAt).toBeGreaterThanOrEqual(before);
    const t = rootReducer({ ...s, settingsAt: 5 }, { type: 'TEACH', word: '书', today: TODAY });
    expect(t.settingsAt).toBe(5);
  });
  it('Reset all progress moves the epoch on and keeps settings', () => {
    const s = rootReducer({ ...makeState({ known: ['河'] }), settingsAt: 7, epoch: 2 }, { type: 'RESET' });
    expect(s.epoch).toBe(3);
    expect(s.settingsAt).toBe(7);
    expect(s.known).toEqual([]);
  });
  it('MERGE_REMOTE adds the other device’s words, and returns the same object when nothing is new', () => {
    const s = makeState({ known: ['河'] });
    const m = rootReducer(s, { type: 'MERGE_REMOTE', remote: makeState({ known: ['金'] }) });
    expect(m.known).toEqual(['河', '金']);
    expect(m.settingsAt).toBeUndefined(); // merging is not a settings change
    expect(rootReducer(m, { type: 'MERGE_REMOTE', remote: makeState({ known: ['金'] }) })).toBe(m);
  });
});
