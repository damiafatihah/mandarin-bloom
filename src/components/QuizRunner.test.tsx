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
  expect(onAnswer).toHaveBeenLastCalledWith(qs[0], true, 0, 1);

  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  expect(screen.getByRole('heading', { name: 'river' })).toBeInTheDocument();

  fireEvent.keyDown(window, { key: '2' });
  expect(screen.getByText('Answer: 河')).toBeInTheDocument();
  expect(onAnswer).toHaveBeenLastCalledWith(qs[1], false, 1, 1);

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

it('resumes at a saved question with earlier answers counted in the result', () => {
  const onFinish = vi.fn();
  const onAnswer = vi.fn();
  const onAdvance = vi.fn();
  // question 1 was answered wrong earlier (picked 0, answer 1); we come back on question 2
  render(<MemoryRouter><QuizRunner questions={qs} startIndex={1} startAnswers={[0]} onAnswer={onAnswer} onAdvance={onAdvance} onFinish={onFinish} speechRate={0.9} /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'river' })).toBeInTheDocument();
  expect(screen.getByLabelText('Question 2 of 2')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '河' }));
  expect(onAnswer).toHaveBeenLastCalledWith(qs[1], true, 1, 0);
  fireEvent.click(screen.getByRole('button', { name: 'See results' }));
  expect(onFinish).toHaveBeenCalledWith({ score: 1, total: 2, missed: ['书'] });
});

it('a resumed question that was already answered shows its feedback, and cannot be answered twice', () => {
  const onAnswer = vi.fn();
  render(<MemoryRouter><QuizRunner questions={qs} startIndex={0} startAnswers={[1]} onAnswer={onAnswer} onFinish={() => {}} speechRate={0.9} /></MemoryRouter>);
  expect(screen.getByText(/Correct/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'car' }));
  expect(onAnswer).not.toHaveBeenCalled();
});

it('reports moving to the next question', () => {
  const onAdvance = vi.fn();
  render(<MemoryRouter><QuizRunner questions={qs} onAnswer={() => {}} onAdvance={onAdvance} onFinish={() => {}} speechRate={0.9} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'book' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  expect(onAdvance).toHaveBeenCalledWith(1);
});
