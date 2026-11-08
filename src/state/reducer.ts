import type { AppState, DayRecord, HskWord, Settings } from '../lib/types';
import { addDays } from '../lib/dates';
import { gradeCard, newCard } from '../lib/srs';
import { selectNewWords } from '../lib/daily';
import { initialState } from './defaults';

export type Action =
  | { type: 'COMPLETE_ONBOARDING'; settings: Partial<Settings> }
  | { type: 'UPDATE_SETTINGS'; patch: Partial<Settings> }
  | { type: 'ENSURE_DAY'; today: string; pool: HskWord[] }
  | { type: 'MARK_KNOWN'; word: string; today: string; pool: HskWord[] }
  | { type: 'ADD_TO_DECK'; word: string; today: string }
  | { type: 'START_CHALLENGE'; today: string; words: string[] }
  | { type: 'GRADE'; word: string; correct: boolean; today: string }
  | { type: 'FINISH_CHALLENGE'; today: string; score: number; total: number }
  | { type: 'RESET' };

function withDay(s: AppState, today: string, patch: Partial<DayRecord>): AppState {
  const day = s.days[today] ?? { words: [] };
  return { ...s, days: { ...s.days, [today]: { ...day, ...patch } } };
}

function addCards(cards: AppState['cards'], words: string[], due: string): AppState['cards'] {
  const next = { ...cards };
  for (const w of words) if (!next[w]) next[w] = newCard(due);
  return next;
}

export function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'COMPLETE_ONBOARDING':
      return { ...s, onboarded: true, settings: { ...s.settings, ...a.settings } };
    case 'UPDATE_SETTINGS':
      return { ...s, settings: { ...s.settings, ...a.patch } };
    case 'ENSURE_DAY': {
      const exists = !!s.days[a.today];
      const current = s.days[a.today]?.words ?? [];
      const add = selectNewWords(a.pool, s, a.today, s.settings.wordsPerDay - current.length);
      if (exists && add.length === 0) return s;
      const next = withDay(s, a.today, { words: [...current, ...add] });
      return { ...next, cards: addCards(s.cards, add, addDays(a.today, 1)) };
    }
    case 'MARK_KNOWN': {
      const cards = { ...s.cards };
      delete cards[a.word];
      const known = s.known.includes(a.word) ? s.known : [...s.known, a.word];
      let next: AppState = { ...s, cards, known };
      const day = s.days[a.today];
      if (day?.words.includes(a.word)) {
        next = withDay(next, a.today, { words: day.words.filter((w) => w !== a.word), skipped: (day.skipped ?? 0) + 1 });
      }
      return reducer(next, { type: 'ENSURE_DAY', today: a.today, pool: a.pool });
    }
    case 'ADD_TO_DECK':
      if (s.cards[a.word]) return s;
      return { ...s, known: s.known.filter((k) => k !== a.word), cards: { ...s.cards, [a.word]: newCard(a.today) } };
    case 'START_CHALLENGE':
      if (s.days[a.today]?.challengeWords) return s;
      return withDay(s, a.today, { challengeWords: a.words });
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
    case 'RESET':
      return { ...initialState, settings: s.settings, onboarded: s.onboarded };
  }
}
