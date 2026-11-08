import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ToneText } from './ToneText';

it('tags each syllable with its tone', () => {
  const { container } = render(<ToneText pinyin="nǐ hǎo ma" />);
  const tones = [...container.querySelectorAll('[data-tone]')].map((e) => e.getAttribute('data-tone'));
  expect(tones).toEqual(['3', '3', '5']);
  expect(container.querySelectorAll('.tone')).toHaveLength(3);
});

it('can render uncoloured', () => {
  const { container } = render(<ToneText pinyin="nǐ" colored={false} />);
  expect(container.querySelectorAll('.tone')).toHaveLength(0);
});

it('renders in the dedicated pinyin face (full caron/ü coverage)', () => {
  const { container } = render(<ToneText pinyin="liǎo" className="big" />);
  expect(container.firstElementChild).toHaveClass('pinyin', 'big');
});
