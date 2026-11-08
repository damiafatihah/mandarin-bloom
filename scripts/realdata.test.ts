/**
 * Deep tests against the real generated data (public/data). Slow-ish (~seconds); catches data edge cases
 * that hand-written fixtures miss.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { HskWord } from '../src/lib/types.ts';
import { availableKinds, makeQuestion, shortMeaning, type QuestionKind } from '../src/lib/quiz.ts';
import { normalizePinyin } from '../src/lib/pinyin.ts';
import { seededRng } from '../src/lib/rng.ts';
import { parseDictTsv, searchDict } from '../src/lib/search.ts';
import { buildChallengeWords } from '../src/lib/challenge.ts';
import { selectNewWords } from '../src/lib/daily.ts';
import { initialState } from '../src/state/defaults.ts';

const POOL: HskWord[] = JSON.parse(readFileSync('public/data/hsk.json', 'utf8'));
const DICT = parseDictTsv(readFileSync('public/data/cedict.txt', 'utf8'));
const FREQ = new Map(POOL.map((w) => [w.s, w.q]));
const BY_S = new Map(POOL.map((w) => [w.s, w]));

describe('real HSK data', () => {
  it('has unique ids, levels 1–7, non-empty meanings and pinyin', () => {
    expect(new Set(POOL.map((w) => w.s)).size).toBe(POOL.length);
    for (const w of POOL) {
      expect(w.l, w.s).toBeGreaterThanOrEqual(1);
      expect(w.l, w.s).toBeLessThanOrEqual(7);
      expect(w.m.length, w.s).toBeGreaterThan(0);
      expect(w.p.trim().length, w.s).toBeGreaterThan(0);
      expect(w.p, w.s).not.toMatch(/[0-9:˙]/);
    }
  });

  it('every word × every available question kind yields a valid, fair question', () => {
    const problems: string[] = [];
    for (const w of POOL) {
      for (const kind of availableKinds(w, true) as QuestionKind[]) {
        const q = makeQuestion(kind, w, POOL, seededRng(`${w.s}:${kind}`));
        const tag = `${w.s} ${kind}`;
        if (q.choices.length !== 4) problems.push(`${tag}: ${q.choices.length} choices`);
        if (new Set(q.choices).size !== q.choices.length) problems.push(`${tag}: duplicate choices ${q.choices}`);
        if (q.answer < 0) problems.push(`${tag}: answer missing`);
        if (q.choices.some((c) => !c.trim())) problems.push(`${tag}: blank choice`);
        if (kind === 'hanzi-to-pinyin') {
          const base = normalizePinyin(w.p);
          if (q.choices.some((c) => normalizePinyin(c) !== base)) problems.push(`${tag}: tone options differ in syllables ${q.choices}`);
          if (q.choices[q.answer] !== w.p) problems.push(`${tag}: correct ${q.choices[q.answer]} != ${w.p}`);
        }
        if (kind === 'listen-to-hanzi') {
          const sound = w.p.toLowerCase();
          for (const c of q.choices) {
            if (c !== w.s && BY_S.get(c)?.p.toLowerCase() === sound) problems.push(`${tag}: homophone distractor ${c}`);
          }
        }
        if (kind === 'hanzi-to-meaning') {
          const correct = q.choices[q.answer];
          if (q.choices.filter((c) => c.toLowerCase() === correct.toLowerCase()).length > 1) problems.push(`${tag}: meaning dup`);
        }
      }
    }
    expect(problems.slice(0, 25), `${problems.length} problems`).toEqual([]);
  }, 120_000);

  it('meaning → hanzi questions are not ambiguous (no distractor shares the prompt meaning)', () => {
    const problems: string[] = [];
    for (const w of POOL) {
      const q = makeQuestion('meaning-to-hanzi', w, POOL, seededRng(`amb:${w.s}`));
      for (const c of q.choices) {
        if (c === w.s) continue;
        const other = BY_S.get(c)!;
        const om = other.m.join('; ').toLowerCase().split(/[;/]/).map((x) => x.trim());
        if (om.includes(q.prompt.toLowerCase())) problems.push(`${w.s} "${q.prompt}" also fits ${c}`);
      }
    }
    expect(problems.slice(0, 25), `${problems.length} ambiguous`).toEqual([]);
  }, 60_000);

  it('every quiz prompt gloss is clean English (no hanzi, no "see X" / "variant of" pointers)', () => {
    const bad = POOL.filter((w) => /[\u3400-\u9fff]/.test(shortMeaning(w)) || /^(see\b|abbr|(\S+ )?variant of|surname|used in|\(note)/i.test(shortMeaning(w)));
    expect(bad.map((w) => `${w.s}=${shortMeaning(w)}`)).toEqual([]);
  });

  it('common words get their everyday reading', () => {
    const p = (s: string) => BY_S.get(s)?.p;
    expect([p('个'), p('比'), p('查'), p('藏'), p('区'), p('了'), p('得'), p('长')]).toEqual(['gè', 'bǐ', 'chá', 'cáng', 'qū', 'le', 'dé', 'cháng']);
  });

  it('daily selection + challenge work for every level and fill to size', () => {
    for (const levels of [[1, 2, 3], [4], [5], [6], [7], [4, 5]]) {
      const state = { ...initialState, onboarded: true, settings: { ...initialState.settings, levels, wordsPerDay: 15 } };
      const words = selectNewWords(POOL, state, '2026-11-08', 15);
      expect(words).toHaveLength(15);
      const ch = buildChallengeWords(POOL, { ...state, days: { '2026-11-08': { words } } }, '2026-11-08');
      expect(ch).toHaveLength(10);
      expect(new Set(ch).size).toBe(10);
    }
  });
});

describe('real dictionary search', () => {
  const top = (q: string) => searchDict(DICT, q, FREQ)[0]?.s;
  it.each([
    ['犹豫', '犹豫'],
    ['yóu yù', '犹豫'],
    ['you2 yu4', '犹豫'],
    ['hesitate', '犹豫'],
    ['ni hao', '你好'],
    ['nǐhǎo', '你好'],
    ['hello', '你好'],
    ['lüse', '绿色'],
    ['lvse', '绿色'],
    ['green', '绿色'],
    ['book', '书'],
    ['economy', '经济'],
    ['一帆风顺', '一帆风顺'],
    ['猶豫', '犹豫'],
  ])('%s → %s first', (q, expected) => {
    expect(top(q)).toBe(expected);
  });

  it('toneless pinyin lists every reading, most frequent first', () => {
    const r = searchDict(DICT, 'youyu', FREQ).map((e) => e.s);
    expect(r[0]).toBe('由于');
    expect(r.slice(0, 5)).toContain('犹豫');
  });

  it('is fast enough for typing (< 120ms per query on 120k entries)', () => {
    const qs = ['a', 'ai', 'love', 'zhong', '中', 'the', 'to be', 'xue'];
    const t0 = performance.now();
    for (const q of qs) searchDict(DICT, q, FREQ);
    const per = (performance.now() - t0) / qs.length;
    expect(per).toBeLessThan(120);
  });

  it('handles odd input without throwing', () => {
    for (const q of ['(', '[a-z]', '.*', '\\', '?', '😀', '   x  ', 'ü', "xi'an"]) {
      expect(() => searchDict(DICT, q, FREQ)).not.toThrow();
    }
  });
});
