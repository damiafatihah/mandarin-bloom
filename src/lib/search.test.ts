import { describe, expect, it } from 'vitest';
import { parseDictTsv, searchDict } from './search';

const TSV = [
  '你好\t你好\tnǐ hǎo\tnihao\thello/hi',
  '犹豫\t猶豫\tyóu yù\tyouyu\tto hesitate/hesitant/hesitation',
  '爱\t愛\tài\tai\tto love/to be fond of/love',
  '可爱\t可愛\tkě ài\tkeai\tadorable/cute/lovely',
  '爱好\t愛好\tài hào\taihao\tto like/hobby',
].join('\n');
const entries = parseDictTsv(TSV);
const find = (q: string) => searchDict(entries, q).map((e) => e.s);

describe('search', () => {
  it('parses TSV', () => {
    expect(entries).toHaveLength(5);
    expect(entries[1]).toMatchObject({ s: '犹豫', t: '猶豫', p: 'yóu yù', plain: 'youyu', m: ['to hesitate', 'hesitant', 'hesitation'] });
  });
  it('hanzi: exact, prefix, contains', () => expect(find('爱')).toEqual(['爱', '爱好', '可爱']));
  it('pinyin with or without tones', () => {
    expect(find('youyu')[0]).toBe('犹豫');
    expect(find('yóu yù')[0]).toBe('犹豫');
    expect(find('you2 yu4')[0]).toBe('犹豫');
    expect(find('ai')).toEqual(['爱', '爱好']);
  });
  it('english: exact meaning beats substring', () => expect(find('love')).toEqual(['爱', '可爱']));
  it('empty query → nothing', () => expect(find('  ')).toEqual([]));
});

describe('ranking details', () => {
  const more = parseDictTsv([
    '好\t好\thǎo\thao\tgood/all right!/(interj.) hello; hi',
    '你好\t你好\tnǐ hǎo\tnihao\thello; hi',
    '由于\t由於\tyóu yú\tyouyu\tdue to/as a result of',
    '犹豫\t猶豫\tyóu yù\tyouyu\tto hesitate',
  ].join('\n'));
  const freq = new Map([['好', 1], ['由于', 2], ['你好', 50], ['犹豫', 60]]);
  const top = (q: string) => searchDict(more, q, freq).map((e) => e.s);

  it('an exact meaning inside a ";" list counts as exact', () => {
    expect(top('hello')[0]).toBe('你好');
  });
  it('typed tones win over a more frequent word with other tones', () => {
    expect(top('yóu yù')[0]).toBe('犹豫');
    expect(top('you2 yu4')[0]).toBe('犹豫');
    expect(top('you2yu4')[0]).toBe('犹豫');
  });
  it('toneless pinyin ranks by frequency', () => {
    expect(top('youyu')).toEqual(['由于', '犹豫']);
  });
});
