import { describe, expect, it } from 'vitest';
import { convertCedict, convertHsk } from './convert.ts';

describe('convertHsk', () => {
  it('keeps new-HSK words, takes the lowest new level and first form, dedupes', () => {
    const raw = [
      { s: '爱好', l: ['t2', 'n1', 'o3'], q: 4902, f: [{ t: '愛好', i: { y: 'ài hào', n: 'ai4 hao4' }, m: ['to like'], c: ['个'] }] },
      { s: '旧词', l: ['o5'], q: 1, f: [{ t: '舊詞', i: { y: 'jiù cí', n: 'jiu4 ci2' }, m: ['x'], c: [] }] },
      { s: '爱好', l: ['n2'], q: 1, f: [{ t: '愛好', i: { y: 'x', n: 'x' }, m: ['dup'], c: [] }] },
      { s: '啊', l: ['n7', 'n3'], q: 10, f: [
        { t: '啊', i: { y: 'a', n: 'a5' }, m: ['ah'], c: [] },
        { t: '啊', i: { y: 'á', n: 'a2' }, m: ['eh?'], c: [] },
      ] },
    ];
    expect(convertHsk(raw)).toEqual([
      { s: '爱好', t: '愛好', p: 'ài hào', n: 'ai4 hao4', m: ['to like'], l: 1, q: 4902, c: ['个'], poly: false },
      { s: '啊', t: '啊', p: 'a', n: 'a5', m: ['ah'], l: 3, q: 10, c: [], poly: true },
    ]);
  });

  it('prefers the first lowercase (non-surname) reading', () => {
    const raw = [{ s: '查', l: ['n2'], q: 5, f: [
      { t: '查', i: { y: 'Zhā', n: 'Zha1' }, m: ['surname Zha'], c: [] },
      { t: '查', i: { y: 'chá', n: 'cha2' }, m: ['to check'], c: [] },
    ] }];
    expect(convertHsk(raw)[0]).toMatchObject({ p: 'chá', n: 'cha2', m: ['to check'], poly: true });
  });

  it('rebuilds tone marks from numeric pinyin (fixes "lu:è", "Aò")', () => {
    const raw = [
      { s: '略', l: ['n5'], q: 5, f: [{ t: '略', i: { y: 'lu:è', n: 'lüe4' }, m: ['brief'], c: [] }] },
      { s: '奥运会', l: ['n4'], q: 6, f: [{ t: '奧運會', i: { y: 'Aò yùn huì', n: 'Ao4 yun4 hui4' }, m: ['Olympics'], c: [] }] },
    ];
    expect(convertHsk(raw).map((w) => w.p)).toEqual(['lüè', 'Ào yùn huì']);
  });

  it('blanks malformed numeric pinyin and cleans the marked form', () => {
    const raw = [{ s: '不一会儿', l: ['n5'], q: 5, f: [{ t: '不一會兒', i: { y: 'bù yīhuǐr5', n: 'bu4 yīhuǐr5' }, m: ['soon'], c: [] }] }];
    expect(convertHsk(raw)[0]).toMatchObject({ p: 'bù yīhuǐr', n: '' });
  });
});

describe('convertCedict', () => {
  it('parses CRLF lines, skips comments and variant-only entries, adds marked + plain pinyin', () => {
    const text = [
      '# CC-CEDICT',
      '你好 你好 [ni3 hao3] /hello/hi/',
      '綠色 绿色 [lu:4 se4] /green/',
      '妳 你 [ni3] /variant of 你[ni3]/',
      '',
    ].join('\r\n');
    expect(convertCedict(text)).toBe(
      ['你好\t你好\tnǐ hǎo\tnihao\thello/hi', '绿色\t綠色\tlǜ sè\tluse\tgreen'].join('\n'),
    );
  });
});
