import { describe, expect, it } from 'vitest';
import { buildExamples, segmentations, tradOnlyChars, usable } from './examples.ts';

// simp \t trad \t pinyin \t plain \t meanings (the public/data/cedict.txt format)
const CEDICT = [
  '们\t們\tmen\tmen\tplural marker',
  '这\t這\tzhè\tzhe\tthis',
  '书\t書\tshū\tshu\tbook',
  '我\t我\twǒ\two\tI',
  '喜欢\t喜歡\txǐ huan\txihuan\tto like',
  '研究\t研究\tyán jiū\tyanjiu\tresearch',
  '研究生\t研究生\tyán jiū shēng\tyanjiusheng\tpostgraduate',
  '生命\t生命\tshēng mìng\tshengming\tlife',
  '的\t的\tde\tde\tpossessive',
  '是\t是\tshì\tshi\tto be',
  '本\t本\tběn\tben\tmeasure word for books',
  '干\t乾\tgān\tgan\tdry',
  '乾隆\t乾隆\tQián lóng\tqianlong\tQianlong emperor',
].join('\n');

describe('tradOnlyChars', () => {
  const t = tradOnlyChars(CEDICT);
  it('collects characters that only ever appear as the traditional form', () => {
    expect([...t].sort()).toEqual(['們', '書', '歡', '這'].sort());
  });
  it('keeps characters that are also used in simplified writing (乾 in 乾隆)', () => {
    expect(t.has('乾')).toBe(false);
  });
});

describe('usable', () => {
  const t = tradOnlyChars(CEDICT);
  it('accepts simplified sentences of a sensible length', () => {
    expect(usable('我喜欢这本书。', 'I like this book.', t)).toBe(true);
  });
  it('rejects anything with a traditional-only character', () => {
    expect(usable('我喜歡這本書。', 'I like this book.', t)).toBe(false);
  });
  it('rejects Latin letters, very short or very long sentences, and long translations', () => {
    expect(usable('我喜欢Tom。', 'I like Tom.', t)).toBe(false);
    expect(usable('好。', 'Good.', t)).toBe(false);
    expect(usable('我'.repeat(30) + '。', 'x', t)).toBe(false);
    expect(usable('我喜欢这本书。', 'x'.repeat(130), t)).toBe(false);
  });
  it('rejects English punctuation in the Chinese (": \" ." instead of ：“”。)', () => {
    expect(usable('他对我说: "我喜欢书".', 'He said "I like books".', t)).toBe(false);
    expect(usable('我喜欢这本书。', 'I like this book.', t)).toBe(true);
    expect(usable('我有3本书。', 'I have 3 books.', t)).toBe(true); // digits are fine
  });
});

describe('segmentations', () => {
  const dict = new Set(['我', '喜欢', '研究', '研究生', '生命', '的', '是', '这', '本', '书']);
  it('returns forward and backward longest-match word lists', () => {
    const [fwd, bwd] = segmentations('研究生命', dict);
    expect(fwd).toEqual(['研究生', '命']);
    expect(bwd).toEqual(['研究', '生命']);
  });
});

describe('buildExamples', () => {
  const hsk = [
    { s: '书', l: 1 }, { s: '喜欢', l: 1 }, { s: '生命', l: 4 }, { s: '本', l: 1 }, { s: '的', l: 1 },
    { s: '是', l: 1 }, { s: '我', l: 1 }, { s: '这', l: 1 },
  ];
  const pairs: [string, string][] = [
    ['我喜欢这本书。', 'I like this book.'],
    ['这是我的书。', 'This is my book.'],
    ['我喜歡這本書。', 'I like this book (traditional).'],
    ['这是生命。', 'This is life.'],
    ['我研究生命。', 'I study life.'],
    ['书是我的生命。', 'Books are my life.'],
    ['这是我的书。', 'This is my book (duplicate).'],
  ];
  const out = buildExamples(pairs, hsk, CEDICT, 2);
  const forWord = (w: string) => (out.w[w] ?? []).map((i) => out.s[i][0]);

  it('never includes a traditional sentence or a duplicate', () => {
    expect(out.s.map((p) => p[0])).not.toContain('我喜歡這本書。');
    expect(new Set(out.s.map((p) => p[0])).size).toBe(out.s.length);
  });
  it('gives each word at most N sentences, shortest and easiest first', () => {
    expect(forWord('书')).toEqual(['这是我的书。', '我喜欢这本书。']);
    expect(forWord('喜欢')).toEqual(['我喜欢这本书。']);
  });
  it('prefers sentences whose other words are easy', () => {
    expect(forWord('生命')).toEqual(['这是生命。', '书是我的生命。']);
  });
  it('matches whole words in either segmentation (我研究生命 → 研究/生命 counts for 生命)', () => {
    const more = buildExamples(pairs, hsk, CEDICT, 3);
    expect((more.w['生命'] ?? []).map((i) => more.s[i][0])).toContain('我研究生命。');
  });
  it('never matches part of a longer word', () => {
    const tricky: [string, string][] = [['研究生命很好。', 'x']];
    const r = buildExamples(tricky, [{ s: '究生', l: 4 }], '究生\t究生\tjiū shēng\tjiusheng\tx\n' + CEDICT, 3);
    expect(r.w['究生']).toBeUndefined();
  });
  it('skips a sentence whose English is the same as one already chosen for that word', () => {
    const near: [string, string][] = [['我喜欢书。', 'I like books.'], ['我很喜欢书。', 'I like books.'], ['这是我的书。', 'This is my book.']];
    const r = buildExamples(near, hsk, CEDICT, 3);
    expect((r.w['书'] ?? []).map((i) => r.s[i][0])).toEqual(['我喜欢书。', '这是我的书。']);
  });
  it('words with no sentence are left out', () => {
    expect(out.w['不在']).toBeUndefined();
  });
  it('stores each sentence once and only the ones that are used', () => {
    const used = new Set(Object.values(out.w).flat());
    expect(used.size).toBe(out.s.length);
  });
});
