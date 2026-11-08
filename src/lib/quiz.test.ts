import { describe, expect, it } from 'vitest';
import { availableKinds, buildQuestions, makeQuestion, shortMeaning } from './quiz';
import { normalizePinyin } from './pinyin';
import { seededRng } from './rng';
import { POOL } from '../test/fixtures';
import type { HskWord } from './types';

const get = (s: string) => POOL.find((w) => w.s === s)!;
const rng = () => seededRng('quiz-test');

describe('availableKinds', () => {
  it('excludes tone quiz for polyphones/neutral-only and measure words for 个-only', () => {
    expect(availableKinds(get('了'), true)).toEqual(['meaning-to-hanzi', 'hanzi-to-meaning', 'listen-to-hanzi']);
    expect(availableKinds(get('汽车'), false)).toEqual(['meaning-to-hanzi', 'hanzi-to-meaning', 'hanzi-to-pinyin', 'measure-word']);
    expect(availableKinds(get('爱好'), true)).not.toContain('measure-word');
  });
});

describe('makeQuestion', () => {
  const valid = (q: ReturnType<typeof makeQuestion>) => {
    expect(q.choices).toHaveLength(4);
    expect(new Set(q.choices).size).toBe(4);
    expect(q.answer).toBeGreaterThanOrEqual(0);
  };

  it('meaning → hanzi', () => {
    const q = makeQuestion('meaning-to-hanzi', get('汽车'), POOL, rng());
    valid(q);
    expect(q.prompt).toBe('car');
    expect(q.choices[q.answer]).toBe('汽车');
    for (const c of q.choices) expect(c).toHaveLength(2);
  });

  it('hanzi → meaning', () => {
    const q = makeQuestion('hanzi-to-meaning', get('犹豫'), POOL, rng());
    valid(q);
    expect(q.choices[q.answer]).toBe('to hesitate');
  });

  it('tones: all options share the syllables', () => {
    const q = makeQuestion('hanzi-to-pinyin', get('犹豫'), POOL, rng());
    valid(q);
    expect(q.choices[q.answer]).toBe('yóu yù');
    for (const c of q.choices) expect(normalizePinyin(c)).toBe('youyu');
  });

  it('listening prefers near-homophones and never exact homophones', () => {
    const q = makeQuestion('listen-to-hanzi', get('进'), POOL, rng());
    valid(q);
    expect(q.speak).toBe('进');
    expect(q.choices[q.answer]).toBe('进');
    expect(q.choices).toContain('金');
    expect(q.choices).not.toContain('近');
  });

  it('measure word', () => {
    const q = makeQuestion('measure-word', get('书'), POOL, rng());
    valid(q);
    expect(q.prompt).toBe('一 ＿ 书');
    expect(q.choices[q.answer]).toBe('本');
  });
});

describe('buildQuestions', () => {
  it('is deterministic for a seed', () => {
    const a = buildQuestions(['书', '汽车', '犹豫'], POOL, 'seed', { speech: true });
    const b = buildQuestions(['书', '汽车', '犹豫'], POOL, 'seed', { speech: true });
    expect(a).toEqual(b);
  });
  it('honours a forced kind when available', () => {
    const qs = buildQuestions(['书', '汽车'], POOL, 'seed', { speech: false, kind: 'measure-word' });
    expect(qs.map((q) => q.kind)).toEqual(['measure-word', 'measure-word']);
  });
});

describe('words with malformed numeric pinyin (n === "")', () => {
  const odd = { s: '不一会儿', t: '不一會兒', p: 'bù yīhuǐr', n: '', m: ['soon'], l: 5, q: 9000, c: [], poly: false };
  it('never gets a tone question', () => {
    expect(availableKinds(odd, true)).not.toContain('hanzi-to-pinyin');
  });
  it('listening + reveal use the clean marked pinyin', () => {
    const q = makeQuestion('listen-to-hanzi', odd, [...POOL, odd], rng());
    expect(q.reveal).toBe('不一会儿 · bù yīhuǐr · soon');
    expect(q.choices[q.answer]).toBe('不一会儿');
    expect(new Set(q.choices).size).toBe(4);
  });
});

describe('real-data invariants', () => {
  it('every question for every fixture word and kind is well-formed', () => {
    for (const w of POOL) {
      for (const kind of availableKinds(w, true)) {
        const q = makeQuestion(kind, w, POOL, seededRng(`${w.s}:${kind}`));
        expect(q.choices, `${w.s} ${kind}`).toHaveLength(4);
        expect(new Set(q.choices).size, `${w.s} ${kind}`).toBe(4);
        expect(q.choices[q.answer], `${w.s} ${kind}`).toBeDefined();
      }
    }
  });
});

describe('no ambiguous options', () => {
  const mk = (s: string, p: string, n: string, m: string[]): HskWord => ({ s, t: s, p, n, m, l: 1, q: 1, c: [], poly: false });
  const er = mk('二', 'èr', 'er4', ['two']);
  const liang = mk('两', 'liǎng', 'liang3', ['two; both', 'ounce']);
  const pool = [er, liang, ...POOL];

  it('meaning → hanzi never offers another word that also has that meaning', () => {
    for (let i = 0; i < 40; i++) {
      const q = makeQuestion('meaning-to-hanzi', er, pool, seededRng(`two-${i}`));
      expect(q.choices).not.toContain('两');
    }
  });

  it('hanzi → meaning never offers a meaning the word also has', () => {
    const hobby = mk('嗜好', 'shì hào', 'shi4 hao4', ['hobby']);
    for (let i = 0; i < 40; i++) {
      const q = makeQuestion('hanzi-to-meaning', POOL.find((w) => w.s === '爱好')!, [...pool, hobby], seededRng(`hobby-${i}`));
      expect(q.choices).not.toContain('hobby');
    }
  });
});

describe('shortMeaning (quiz prompt gloss)', () => {
  const mk = (m: string[]): HskWord => ({ s: 'x', t: 'x', p: 'x', n: 'x1', m, l: 1, q: 1, c: [], poly: false });
  it.each([
    [['(bound form) calm; peaceful'], 'calm'],
    [['(coll.) father'], 'father'],
    [['security check (abbr. for 安全检查)'], 'security check'],
    [['abbr. for 奥林匹克运动会', 'Olympic Games'], 'Olympic Games'],
    [['see 什么', 'what'], 'what'],
    [['surname An', 'peace'], 'peace'],
    [['the eight trigrams 易经'], 'the eight trigrams'],
    [['abbr. for 奥林匹克运动会'], 'abbr. for 奥林匹克运动会'],
  ])('%j → %s', (m, expected) => {
    expect(shortMeaning(mk(m))).toBe(expected);
  });
});
