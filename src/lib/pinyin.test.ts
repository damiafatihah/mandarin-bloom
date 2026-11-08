import { describe, expect, it } from 'vitest';
import { isCJK, normalizePinyin, numericToMarks, toneOfSyllable, toneVariants } from './pinyin';
import { seededRng } from './rng';

describe('numericToMarks', () => {
  it.each([
    ['ni3 hao3', 'nǐ hǎo'],
    ['lu:4', 'lǜ'],
    ['lü4 se4', 'lǜ sè'],
    ['lv4', 'lǜ'],
    ['nü3', 'nǚ'],
    ['lüe4', 'lüè'],
    ['Bei3 jing1', 'Běi jīng'],
    ['A1 la1 bo2 yu3', 'Ā lā bó yǔ'],
    ['xiong2', 'xióng'],
    ['liu2', 'liú'],
    ['gui4', 'guì'],
    ['er2', 'ér'],
    ['zhuo1 zi5', 'zhuō zi'],
    ['r5', 'r'],
    ['D V D', 'D V D'],
  ])('%s → %s', (input, expected) => {
    expect(numericToMarks(input)).toBe(expected);
  });
});

describe('normalizePinyin', () => {
  it.each([
    ['nǐ hǎo', 'nihao'],
    ['ni3 hao3', 'nihao'],
    ['NiHao', 'nihao'],
    ['lǜ', 'lu'],
    ['lv4', 'lu'],
    ['lu:4', 'lu'],
  ])('%s → %s', (input, expected) => {
    expect(normalizePinyin(input)).toBe(expected);
  });
});

describe('toneOfSyllable', () => {
  it.each([
    ['mā', 1], ['má', 2], ['mǎ', 3], ['mà', 4], ['ma', 5], ['lǚ', 3], ['Ā', 1],
  ] as const)('%s → %i', (syl, tone) => {
    expect(toneOfSyllable(syl)).toBe(tone);
  });
});

describe('isCJK', () => {
  it('detects hanzi', () => {
    expect(isCJK('犹豫')).toBe(true);
    expect(isCJK('youyu')).toBe(false);
    expect(isCJK('yóu yù')).toBe(false);
  });
});

describe('toneVariants', () => {
  it('returns distinct wrong-tone versions of the same syllables', () => {
    const out = toneVariants('you2 yu4', 3, seededRng('t'));
    expect(out).toHaveLength(3);
    expect(new Set(out).size).toBe(3);
    expect(out).not.toContain('yóu yù');
    for (const v of out) expect(normalizePinyin(v)).toBe('youyu');
  });

  it('finds all three other tones for a single syllable', () => {
    const out = toneVariants('shu1', 3, seededRng('x'));
    expect(out.sort()).toEqual(['shù', 'shú', 'shǔ'].sort());
  });
});
