import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { Example } from './Example';

// jsdom has no speech engine; a stub makes the speak buttons render.
beforeAll(() => {
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak: () => {}, cancel: () => {}, getVoices: () => [], addEventListener: () => {}, removeEventListener: () => {} } });
});
afterAll(() => { delete (window as { speechSynthesis?: unknown }).speechSynthesis; });

it('shows the sentence with the word highlighted, the English, and a speak button for the sentence', () => {
  render(<Example zh="我适应新环境很慢。" en="I'm slow to adjust to new surroundings." word="环境" rate={0.9} />);
  const zh = screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === '我适应新环境很慢。');
  expect(zh).toHaveAttribute('lang', 'zh');
  expect(zh.querySelector('mark')).toHaveTextContent('环境');
  expect(screen.getByText('I’m slow to adjust to new surroundings.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Hear the sentence' })).toBeInTheDocument();
});

it('highlights every place the word appears', () => {
  render(<Example zh="好的，好的。" en="OK, OK." word="好的" rate={0.9} />);
  expect(document.querySelectorAll('mark')).toHaveLength(2);
});
