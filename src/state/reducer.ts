import type { AppState, DailyChoice, DayRecord, HskWord, PracticeRun, Settings } from '../lib/types';
import { mergeStates } from '../sync/merge';
import { addDays } from '../lib/dates';
import { gradeCard, newCard } from '../lib/srs';
import { selectNewWords } from '../lib/daily';
import { initialState } from './defaults';

export type Action =
  | { type: 'COMPLETE_ONBOARDING'; settings: Partial<Settings> }
  | { type: 'UPDATE_SETTINGS'; patch: Partial<Settings> }
  | { type: 'SET_WORDS_PER_DAY'; n: number; today: string }
  | { type: 'SET_LEVELS'; levels: number[]; today: string; pool: HskWord[] }
  | { type: 'ENSURE_DAY'; today: string; pool: HskWord[] }
  | { type: 'TEACH'; word: string; today: string }
  | { type: 'MARK_KNOWN'; word: string; today: string }
  | { type: 'UNDO_DAILY'; word: string; today: string }
  | { type: 'LEARN_MORE'; today: string; pool: HskWord[]; count: number }
  | { type: 'ADD_TO_DECK'; word: string; today: string }
  | { type: 'START_CHALLENGE'; today: string; words: string[] }
  | { type: 'ANSWER_CHALLENGE'; today: string; index: number; choice: number; word: string; correct: boolean }
  | { type: 'ADVANCE_CHALLENGE'; today: string; index: number }
  | { type: 'GRADE'; word: string; correct: boolean; today: string }
  | { type: 'FINISH_CHALLENGE'; today: string; score: number; total: number }
  | { type: 'START_PRACTICE'; seed: string; words: string[]; source: PracticeRun['source']; size: number; kind?: string }
  | { type: 'ANSWER_PRACTICE'; index: number; choice: number; word: string; correct: boolean; today: string }
  | { type: 'ADVANCE_PRACTICE'; index: number }
  | { type: 'FINISH_PRACTICE' }
  | { type: 'END_PRACTICE' }
  | { type: 'MERGE_REMOTE'; remote: AppState }
  | { type: 'RESET' };

/** Saved answers with `choice` at `index`, or null if that question was already answered (score once). */
function withAnswer(answers: (number | null)[], index: number, choice: number): (number | null)[] | null {
  if (answers[index] != null) return null;
  const next = Array.from({ length: Math.max(answers.length, index + 1) }, (_, i) => answers[i] ?? null);
  next[index] = choice;
  return next;
}

function withDay(s: AppState, today: string, patch: Partial<DayRecord>): AppState {
  const day = s.days[today] ?? { words: [] };
  return { ...s, days: { ...s.days, [today]: { ...day, ...patch } } };
}

/** Record (or clear) the learner's choice for one of today's cards. Other words are left alone. */
function setChoice(s: AppState, today: string, word: string, choice: DailyChoice | null): AppState {
  const day = s.days[today];
  if (!day?.words.includes(word)) return s;
  const handled = { ...(day.handled ?? {}) };
  if (choice) handled[word] = choice;
  else delete handled[word];
  return withDay(s, today, { handled });
}

/** Remove a review card only if it has no progress yet (never destroy real review history). */
function dropFreshCard(cards: AppState['cards'], word: string): AppState['cards'] {
  if (!cards[word] || cards[word].seen > 0) return cards;
  const next = { ...cards };
  delete next[word];
  return next;
}

export function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'COMPLETE_ONBOARDING':
      return { ...s, onboarded: true, settings: { ...s.settings, ...a.settings } };
    case 'UPDATE_SETTINGS':
      return { ...s, settings: { ...s.settings, ...a.patch } };
    case 'SET_WORDS_PER_DAY': {
      const next = { ...s, settings: { ...s.settings, wordsPerDay: a.n } };
      const day = s.days[a.today];
      if (!day || day.words.length <= a.n) return next; // raising: the next ENSURE_DAY deals the extra words
      // Lowering: drop words not started yet (no review card was made for them); keep every word already done.
      const handled = day.handled ?? {};
      const done = day.words.filter((w) => handled[w]).length;
      let room = Math.max(0, a.n - done);
      const words = day.words.filter((w) => {
        if (handled[w]) return true;
        if (room > 0) {
          room--;
          return true;
        }
        return false;
      });
      return withDay(next, a.today, { words });
    }
    case 'SET_LEVELS': {
      const next = { ...s, settings: { ...s.settings, levels: a.levels } };
      const day = s.days[a.today];
      if (!day) return next;
      // Untouched words from levels you turned off make way for words from your new levels; done words stay.
      const levelOf = new Map(a.pool.map((w) => [w.s, w.l]));
      const on = new Set(a.levels);
      const handled = day.handled ?? {};
      const words = day.words.filter((w) => handled[w] || on.has(levelOf.get(w) ?? -1));
      return reducer(withDay(next, a.today, { words }), { type: 'ENSURE_DAY', today: a.today, pool: a.pool });
    }
    case 'ENSURE_DAY': {
      const exists = !!s.days[a.today];
      const current = s.days[a.today]?.words ?? [];
      const add = selectNewWords(a.pool, s, a.today, s.settings.wordsPerDay - current.length);
      if (exists && add.length === 0) return s;
      // Words enter reviews only when the learner taps "Teach me" (TEACH), not when they are dealt.
      return withDay(s, a.today, { words: [...current, ...add] });
    }
    case 'TEACH': {
      const next = setChoice(s, a.today, a.word, 'taught');
      return {
        ...next,
        known: next.known.filter((k) => k !== a.word),
        cards: next.cards[a.word] ? next.cards : { ...next.cards, [a.word]: newCard(addDays(a.today, 1)) },
      };
    }
    case 'MARK_KNOWN': {
      const next = setChoice(s, a.today, a.word, 'known');
      return {
        ...next,
        known: next.known.includes(a.word) ? next.known : [...next.known, a.word],
        cards: dropFreshCard(next.cards, a.word),
      };
    }
    case 'UNDO_DAILY': {
      const prev = s.days[a.today]?.handled?.[a.word];
      if (!prev) return s;
      const next = setChoice(s, a.today, a.word, null);
      return prev === 'known'
        ? { ...next, known: next.known.filter((k) => k !== a.word) }
        : { ...next, cards: dropFreshCard(next.cards, a.word) };
    }
    case 'LEARN_MORE': {
      const day = s.days[a.today] ?? { words: [] };
      const add = selectNewWords(a.pool, s, a.today, a.count);
      if (!add.length) return s;
      return withDay(s, a.today, { words: [...day.words, ...add] });
    }
    case 'ADD_TO_DECK':
      if (s.cards[a.word]) return s;
      return { ...s, known: s.known.filter((k) => k !== a.word), cards: { ...s.cards, [a.word]: newCard(a.today) } };
    case 'START_CHALLENGE':
      if (s.days[a.today]?.challengeWords) return s;
      return withDay(s, a.today, { challengeWords: a.words, challengeRun: { index: 0, answers: [] } });
    case 'ANSWER_CHALLENGE': {
      const run = s.days[a.today]?.challengeRun ?? { index: a.index, answers: [] };
      const answers = withAnswer(run.answers, a.index, a.choice);
      if (!answers) return s; // each question is scored exactly once
      const next = withDay(s, a.today, { challengeRun: { ...run, answers } });
      return reducer(next, { type: 'GRADE', word: a.word, correct: a.correct, today: a.today });
    }
    case 'ADVANCE_CHALLENGE': {
      const run = s.days[a.today]?.challengeRun ?? { index: 0, answers: [] };
      return withDay(s, a.today, { challengeRun: { ...run, index: a.index } });
    }
    case 'GRADE': {
      const card = s.cards[a.word];
      if (!card && a.correct) return s;
      return {
        ...s,
        known: a.correct ? s.known : s.known.filter((k) => k !== a.word),
        cards: { ...s.cards, [a.word]: gradeCard(card ?? newCard(a.today), a.correct, a.today) },
      };
    }
    case 'FINISH_CHALLENGE':
      return withDay(s, a.today, { challenge: { score: a.score, total: a.total } });
    case 'START_PRACTICE': {
      const { seed, words, source, size, kind } = a;
      return { ...s, practice: { seed, words, source, size, ...(kind ? { kind } : {}), index: 0, answers: [] } };
    }
    case 'ANSWER_PRACTICE': {
      if (!s.practice) return s;
      const answers = withAnswer(s.practice.answers, a.index, a.choice);
      if (!answers) return s;
      return reducer({ ...s, practice: { ...s.practice, answers } }, { type: 'GRADE', word: a.word, correct: a.correct, today: a.today });
    }
    case 'ADVANCE_PRACTICE':
      return s.practice ? { ...s, practice: { ...s.practice, index: a.index } } : s;
    case 'FINISH_PRACTICE':
      return s.practice ? { ...s, practice: { ...s.practice, finished: true } } : s;
    case 'END_PRACTICE': {
      if (!s.practice) return s;
      const next = { ...s };
      delete next.practice;
      return next;
    }
    case 'MERGE_REMOTE': {
      const merged = mergeStates(s, a.remote);
      return JSON.stringify(merged) === JSON.stringify(s) ? s : merged;
    }
    case 'RESET':
      return { ...initialState, settings: s.settings, onboarded: s.onboarded };
  }
}

/**
 * The reducer the app uses: `reducer` plus the two stamps syncing needs: when settings last changed,
 * and a counter that goes up on "Reset all progress" (so a reset wins over older progress on other devices).
 */
export function rootReducer(s: AppState, a: Action): AppState {
  const next = reducer(s, a);
  if (next === s || a.type === 'MERGE_REMOTE') return next;
  let out = next;
  if (a.type === 'RESET') {
    out = { ...out, epoch: (s.epoch ?? 0) + 1 };
    if (s.settingsAt) out.settingsAt = s.settingsAt;
  } else if (next.settings !== s.settings) {
    out = { ...out, settingsAt: Date.now() };
  }
  return out;
}
