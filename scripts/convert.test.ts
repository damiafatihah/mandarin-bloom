import { describe, expect, it } from 'vitest';
import { MANUAL_MEANINGS, convertCedict, convertHsk, fillMeaningsFromCedict } from './convert.ts';

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
      { s: '爱好', t: '愛好', p: 'ài hào', n: 'ai4 hao4', m: ['to like'], l: 1, q: 4902, c: ['个'], poly: false, fn: false },
      { s: '啊', t: '啊', p: 'a', n: 'a5', m: ['ah'], l: 3, q: 10, c: [], poly: true, fn: false },
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

describe('meaning clean-up', () => {
  it('skips forms whose meanings are only "variant of", and drops variant-only meanings', () => {
    const raw = [{ s: '岸', l: ['n4'], q: 5, f: [
      { t: '岸', i: { y: 'àn', n: 'an4' }, m: ['variant of 岸[an4]'], c: [] },
      { t: '岸', i: { y: 'àn', n: 'an4' }, m: ['bank; shore', 'old variant of 岸'], c: ['个'] },
    ] }];
    expect(convertHsk(raw)[0].m).toEqual(['bank; shore']);
  });

  it('expands sth / sb', () => {
    const raw = [{ s: '帮', l: ['n2'], q: 5, f: [{ t: '幫', i: { y: 'bāng', n: 'bang1' }, m: ['to help sb do sth'], c: [] }] }];
    expect(convertHsk(raw)[0].m).toEqual(['to help someone do something']);
  });

  it('fills variant-only HSK meanings from CC-CEDICT (same reading preferred)', () => {
    const hsk = convertHsk([{ s: '宝', l: ['n3'], q: 5, f: [{ t: '寶', i: { y: 'bǎo', n: 'bao3' }, m: ['variant of 寶'], c: [] }] }]);
    const tsv = ['宝\t寶\tbǎo\tbao\tjewel; gem/treasure/precious', '宝\t宝\tbāo\tbao\tnot this one'].join('\n');
    expect(fillMeaningsFromCedict(hsk, tsv)[0].m).toEqual(['jewel; gem', 'treasure', 'precious']);
  });
});

describe('reading choice avoids junk glosses', () => {
  it('个 → gè, not the "used in 自个儿" reading', () => {
    const raw = [{ s: '个', l: ['n1'], q: 5, f: [
      { t: '個', i: { y: 'gě', n: 'ge3' }, m: ['used in 自個兒|自个儿[zi4 ge3 r5]'], c: [] },
      { t: '個', i: { y: 'gè', n: 'ge4' }, m: ['individual; this; that'], c: [] },
    ] }];
    expect(convertHsk(raw)[0]).toMatchObject({ p: 'gè', m: ['individual; this; that'] });
  });
  it('比 → bǐ, skipping "euphemistic variant of"', () => {
    const raw = [{ s: '比', l: ['n2'], q: 5, f: [
      { t: '比', i: { y: 'Bǐ', n: 'Bi3' }, m: ['Belgium'], c: [] },
      { t: '比', i: { y: 'bī', n: 'bi1' }, m: ['euphemistic variant of 屄'], c: [] },
      { t: '比', i: { y: 'bǐ', n: 'bi3' }, m: ['to compare'], c: [] },
    ] }];
    expect(convertHsk(raw)[0]).toMatchObject({ p: 'bǐ', m: ['to compare'] });
  });
  it('follows "variant of X" to X\'s meanings when X has the same length', () => {
    const hsk = convertHsk([{ s: '纯朴', l: ['n6'], q: 5, f: [{ t: '純樸', i: { y: 'chún pǔ', n: 'chun2 pu3' }, m: ['variant of 淳朴'], c: [] }] }]);
    const tsv = '淳朴\t淳樸\tchún pǔ\tchunpu\tsimple and honest/unsophisticated';
    expect(fillMeaningsFromCedict(hsk, tsv)[0].m).toEqual(['simple and honest', 'unsophisticated']);
  });
});

describe('pointer-only meanings', () => {
  it('"see X" / "abbr. for X" words take meanings from their own CEDICT entry, else from X', () => {
    const hsk = convertHsk([
      { s: '干吗', l: ['n4'], q: 5, f: [{ t: '幹嗎', i: { y: 'gàn má', n: 'gan4 ma2' }, m: ['see 干嘛'], c: [] }] },
      { s: '体检', l: ['n4'], q: 6, f: [{ t: '體檢', i: { y: 'tǐ jiǎn', n: 'ti3 jian3' }, m: ['abbr. for 体格检查'], c: [] }] },
    ]);
    const tsv = ['干嘛\t幹嘛\tgàn má\tganma\twhat are you doing?/why on earth?', '体格检查\t體格檢查\ttǐ gé jiǎn chá\ttigejiancha\tphysical examination'].join('\n');
    expect(fillMeaningsFromCedict(hsk, tsv).map((w) => w.m)).toEqual([['what are you doing?', 'why on earth?'], ['physical examination']]);
  });
  it('drops "(Note: …)" usage remarks from meanings', () => {
    const raw = [{ s: '纪录', l: ['n4'], q: 5, f: [{ t: '紀錄', i: { y: 'jì lù', n: 'ji4 lu4' }, m: ['record', '(Note: In mainland China, 纪录 is preferred)'], c: [] }] }];
    expect(convertHsk(raw)[0].m).toEqual(['record']);
  });
});

describe('manual meaning fixes', () => {
  it('never follows a pointer to a shorter word, and applies MANUAL_MEANINGS', () => {
    const hsk = convertHsk([
      { s: '无可厚非', l: ['n7'], q: 5, f: [{ t: '無可厚非', i: { y: 'wú kě hòu fēi', n: 'wu2 ke3 hou4 fei1' }, m: ['see 非'], c: [] }] },
      { s: '火暴', l: ['n7'], q: 6, f: [{ t: '火暴', i: { y: 'huǒ bào', n: 'huo3 bao4' }, m: ['variant of 爆'], c: [] }] },
    ]);
    const tsv = '非\t非\tfēi\tfei\tto not be/wrong';
    const out = fillMeaningsFromCedict(hsk, tsv);
    expect(out[0].m).toEqual(MANUAL_MEANINGS['无可厚非']);
    expect(out[1].m).toEqual(MANUAL_MEANINGS['火暴']);
  });
});

describe('function-word flag', () => {
  it('marks single-character words whose every part of speech is grammatical', () => {
    const out = convertHsk([
      { s: '却', l: ['n4'], q: 1, p: ['d'], f: [{ t: '卻', i: { y: 'què', n: 'que4' }, m: ['but'], c: [] }] },
      { s: '担心', l: ['n4'], q: 2, p: ['v'], f: [{ t: '擔心', i: { y: 'dān xīn', n: 'dan1 xin1' }, m: ['to worry'], c: [] }] },
      { s: '杀', l: ['n5'], q: 3, p: ['v'], f: [{ t: '殺', i: { y: 'shā', n: 'sha1' }, m: ['to kill'], c: [] }] },
      { s: '甚至', l: ['n4'], q: 4, p: ['d', 'c'], f: [{ t: '甚至', i: { y: 'shèn zhì', n: 'shen4 zhi4' }, m: ['even'], c: [] }] },
      { s: '岸', l: ['n4'], q: 5, f: [{ t: '岸', i: { y: 'àn', n: 'an4' }, m: ['shore'], c: [] }] },
    ]);
    expect(out.map((w) => [w.s, w.fn])).toEqual([['却', true], ['担心', false], ['杀', false], ['甚至', false], ['岸', false]]);
  });
});
