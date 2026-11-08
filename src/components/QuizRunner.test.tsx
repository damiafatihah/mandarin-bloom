import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, it, vi } from 'vitest';
import { QuizRunner } from './QuizRunner';
import type { Question } from '../lib/quiz';

const qs: Question[] = [
  { kind: 'hanzi-to-meaning', word: '书', instruction: 'What does this mean?', prompt: '书', choices: ['car', 'book', 'river', 'green'], answer: 1, reveal: '书 · shū · book' },
  { kind: 'meaning-to-hanzi', word: '河', instruction: 'Which word means…', prompt: 'river', choices: ['河', '书', '金', '近'], answer: 0, reveal: '河 · hé · river' },
];

it('runs through questions with mouse and keyboard and reports the result', () => {
  const onAnswer = vi.fn();
  const onFinish = vi.fn();
  render(<MemoryRouter><QuizRunner questions={qs} onAnswer={onAnswer} onFinish={onFinish} speechRate={0.9} /></MemoryRouter>);

  fireEvent.click(screen.getByRole('button', { name: 'book' }));
  expect(screen.getByText(/Correct/)).toBeInTheDocument();
  expect(onAnswer).toHaveBeenLastCalledWith(qs[0], true);

  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  expect(screen.getByRole('heading', { name: 'river' })).toBeInTheDocument();

  fireEvent.keyDown(window, { key: '2' });
  expect(screen.getByText('Answer: 河')).toBeInTheDocument();
  expect(onAnswer).toHaveBeenLastCalledWith(qs[1], false);

  fireEvent.click(screen.getByRole('button', { name: 'See results' }));
  expect(onFinish).toHaveBeenCalledWith({ score: 1, total: 2, missed: ['河'] });
});

it('tone options and the revealed pinyin use the pinyin face', () => {
  const tone: Question[] = [{ kind: 'hanzi-to-pinyin', word: '了解', instruction: 'Which tones are right?', prompt: '了解', choices: ['liǎo jiě', 'liáo jiě', 'liào jiē', 'liǎo jiè'], answer: 0, reveal: '了解 · liǎo jiě · to understand' }];
  render(<MemoryRouter><QuizRunner questions={tone} onAnswer={() => {}} onFinish={() => {}} speechRate={0.9} /></MemoryRouter>);
  for (const b of screen.getAllByRole('button').filter((x) => x.hasAttribute('data-choice'))) expect(b).toHaveClass('pinyin');
  fireEvent.click(screen.getByRole('button', { name: 'liǎo jiě' }));
  expect(screen.getByText('liǎo jiě', { selector: '.pinyin:not([data-choice])' })).toBeInTheDocument();
});
