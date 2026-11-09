import type { AppState, HskWord } from './types';
import { MASTERED_BOX } from './srs';
import { isCJK, normalizePinyin } from './pinyin';
import { tonedKey } from './search';

export type MyWordStatus = 'learning' | 'mastered' | 'known';
export type MyWord = {
  word: HskWord;
  status: MyWordStatus;
  due: boolean;
  nextReview?: string; // date key; absent for "already knew"
  learntOn?: string; // the day it was learnt or skipped on Today (absent for words added another way)
  order: number; // position on that day, for stable "newest" sorting
};
export type MyWordsFilter = 'all' | 'review' | 'due' | 'mastered' | 'known';
export type MyWordsSort = 'newest' | 'az' | 'review';

/** Every word you have learnt: words in review (learning or mastered) and words you already knew. */
export function listMyWords(state: AppState, pool: HskWord[], today: string): MyWord[] {
  const byS = new Map(pool.map((w) => [w.s, w]));
  const when = new Map<string, { day: string; order: number }>();
  for (const [day, rec] of Object.entries(state.days)) {
    rec.words.forEach((w, order) => {
      if (rec.handled?.[w] && !when.has(w)) when.set(w, { day, order });
    });
  }
  const out: MyWord[] = [];
  for (const [s, card] of Object.entries(state.cards)) {
    const word = byS.get(s);
    if (!word) continue;
    out.push({
      word, status: card.box >= MASTERED_BOX ? 'mastered' : 'learning', due: card.due <= today,
      nextReview: card.due, learntOn: when.get(s)?.day, order: when.get(s)?.order ?? 0,
    });
  }
  for (const s of state.known) {
    const word = byS.get(s);
    if (!word || state.cards[s]) continue;
    out.push({ word, status: 'known', due: false, learntOn: when.get(s)?.day, order: when.get(s)?.order ?? 0 });
  }
  return out;
}

export function countMyWords(list: MyWord[]): Record<MyWordsFilter, number> {
  return {
    all: list.length,
    review: list.filter((e) => e.status !== 'known').length,
    due: list.filter((e) => e.due).length,
    mastered: list.filter((e) => e.status === 'mastered').length,
    known: list.filter((e) => e.status === 'known').length,
  };
}

const az = (a: MyWord, b: MyWord) =>
  normalizePinyin(a.word.p).localeCompare(normalizePinyin(b.word.p)) || (a.word.n || a.word.p).localeCompare(b.word.n || b.word.p);

function matches(e: MyWord, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  if (isCJK(q)) return e.word.s.includes(q);
  const syllables = e.word.p.toLowerCase().normalize('NFC').split(/[\s']+/);
  // pinyin matches must start at a syllable, so "jin" finds 金/近 but not 安静 (ān jìng)
  const fromSyllable = (key: (s: string) => string, needle: string) =>
    syllables.some((_, i) => key(syllables.slice(i).join('')).startsWith(needle));
  const toned = tonedKey(q);
  if (toned) return fromSyllable((s) => s, toned);
  const plain = normalizePinyin(q);
  return (!!plain && fromSyllable(normalizePinyin, plain)) || e.word.m.some((m) => m.toLowerCase().includes(q));
}

const inFilter = (e: MyWord, f: MyWordsFilter) =>
  f === 'all' || (f === 'review' ? e.status !== 'known' : f === 'due' ? e.due : e.status === f);

export function filterMyWords(
  list: MyWord[],
  o: { filter: MyWordsFilter; sort: MyWordsSort; q?: string; level?: number },
): MyWord[] {
  const keep = list.filter((e) => inFilter(e, o.filter) && (!o.level || e.word.l === o.level) && matches(e, o.q ?? ''));
  const sorted = [...keep];
  if (o.sort === 'az') sorted.sort(az);
  else if (o.sort === 'review') {
    sorted.sort((a, b) => {
      if (!a.nextReview || !b.nextReview) return a.nextReview ? -1 : b.nextReview ? 1 : az(a, b);
      return a.nextReview.localeCompare(b.nextReview) || az(a, b);
    });
  } else {
    sorted.sort((a, b) => {
      if (!a.learntOn || !b.learntOn) return a.learntOn ? -1 : b.learntOn ? 1 : az(a, b);
      return b.learntOn.localeCompare(a.learntOn) || a.order - b.order;
    });
  }
  return sorted;
}
