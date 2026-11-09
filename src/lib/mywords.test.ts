import { describe, expect, it } from 'vitest';
import { listMyWords, filterMyWords, countMyWords } from './mywords';
import { makeState, POOL, TODAY } from '../test/fixtures';

const card = (box: number, due: string, seen = 1) => ({ box, due, seen, correct: seen });
const state = makeState({
  cards: {
    书: card(0, '2026-11-09', 0), // learning, due tomorrow, learnt today
    河: card(5, '2026-12-20', 6), // mastered
    金: card(2, '2026-11-07', 3), // learning, due (overdue)
    近: card(4, TODAY, 4), // mastered, due today
  },
  known: ['桌子', '安静'],
  days: {
    '2026-11-06': { words: ['金', '桌子'], handled: { 金: 'taught', 桌子: 'known' } },
    [TODAY]: { words: ['书', '安静', '汽车'], handled: { 书: 'taught', 安静: 'known' } },
  },
});

describe('listMyWords', () => {
  const list = listMyWords(state, POOL, TODAY);
  const by = (s: string) => list.find((e) => e.word.s === s)!;

  it('includes every word in review and every already-known word, nothing else', () => {
    expect(list.map((e) => e.word.s).sort()).toEqual(['书', '安静', '桌子', '近', '河', '金'].sort());
  });
  it('gives each word a status, due flag and the day it was learnt (when known)', () => {
    expect(by('书')).toMatchObject({ status: 'learning', due: false, learntOn: TODAY, nextReview: '2026-11-09' });
    expect(by('金')).toMatchObject({ status: 'learning', due: true, learntOn: '2026-11-06' });
    expect(by('河')).toMatchObject({ status: 'mastered', due: false, learntOn: undefined });
    expect(by('近')).toMatchObject({ status: 'mastered', due: true });
    expect(by('桌子')).toMatchObject({ status: 'known', due: false, learntOn: '2026-11-06' });
    expect(by('桌子').nextReview).toBeUndefined();
  });
});

describe('filterMyWords / countMyWords', () => {
  const list = listMyWords(state, POOL, TODAY);
  const words = (o: Parameters<typeof filterMyWords>[1]) => filterMyWords(list, o).map((e) => e.word.s);

  it('filters by HSK level as well', () => {
    expect(words({ filter: 'all', sort: 'az', level: 2 })).toEqual(['安静', '河', '金', '近']);
    expect(words({ filter: 'mastered', sort: 'az', level: 1 })).toEqual([]);
  });
  it('counts each filter', () => {
    expect(countMyWords(list)).toEqual({ all: 6, review: 4, due: 2, mastered: 2, known: 2 });
  });
  it('filters by status and due', () => {
    expect(words({ filter: 'mastered', sort: 'az' })).toEqual(['河', '近']);
    expect(words({ filter: 'due', sort: 'az' })).toEqual(['金', '近']);
    expect(words({ filter: 'known', sort: 'az' })).toEqual(['安静', '桌子']);
    expect(words({ filter: 'review', sort: 'az' })).toEqual(['河', '金', '近', '书']); // learning + mastered
  });
  it('sorts newest first (undated last), A–Z by pinyin, or by next review', () => {
    expect(words({ filter: 'all', sort: 'newest' })).toEqual(['书', '安静', '金', '桌子', '河', '近']);
    expect(words({ filter: 'all', sort: 'az' })).toEqual(['安静', '河', '金', '近', '书', '桌子']); // jīn before jìn
    expect(words({ filter: 'all', sort: 'review' })).toEqual(['金', '近', '书', '河', '安静', '桌子']);
  });
  it('searches hanzi, pinyin (with or without tones) and English', () => {
    expect(words({ filter: 'all', sort: 'az', q: '河' })).toEqual(['河']);
    expect(words({ filter: 'all', sort: 'az', q: 'jin' })).toEqual(['安静', '金', '近']); // jin… is the start of jìng too
    expect(words({ filter: 'all', sort: 'az', q: 'ing' })).toEqual([]); // matches start at a syllable, never mid-syllable
    expect(words({ filter: 'all', sort: 'az', q: 'jìn' })).toEqual(['安静', '近']); // tone-aware: not jīn
    expect(words({ filter: 'all', sort: 'az', q: 'river' })).toEqual(['河']);
    expect(words({ filter: 'all', sort: 'az', q: 'anjing' })).toEqual(['安静']); // whole word, no spaces
    expect(words({ filter: 'all', sort: 'az', q: 'jing' })).toEqual(['安静']); // a later syllable
    expect(words({ filter: 'all', sort: 'az', q: '  ' })).toHaveLength(6);
  });
});
