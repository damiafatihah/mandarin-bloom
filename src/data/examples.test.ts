import { expect, it } from 'vitest';
import { examplesFor } from './resources';

it('examplesFor looks up a word’s sentences, empty when it has none', () => {
  const data = { s: [['我喜欢书。', 'I like books.'], ['这是书。', 'This is a book.']] as [string, string][], w: { 书: [1, 0] } };
  expect(examplesFor(data, '书')).toEqual([['这是书。', 'This is a book.'], ['我喜欢书。', 'I like books.']]);
  expect(examplesFor(data, '河')).toEqual([]);
  expect(examplesFor(null, '书')).toEqual([]);
});
