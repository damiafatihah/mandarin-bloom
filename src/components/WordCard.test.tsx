import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { WordCard, type CardStatus } from './WordCard';
import { POOL } from '../test/fixtures';

// jsdom has no speech engine; a stub makes the speak buttons render.
beforeAll(() => {
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak: () => {}, cancel: () => {}, getVoices: () => [], addEventListener: () => {}, removeEventListener: () => {} } });
});
afterAll(() => { delete (window as { speechSynthesis?: unknown }).speechSynthesis; });

const word = POOL.find((w) => w.s === '犹豫')!;
function setup(status: CardStatus) {
  const handlers = { onTeach: vi.fn(), onKnown: vi.fn(), onUndo: vi.fn() };
  render(
    <MemoryRouter>
      <WordCard word={word} status={status} {...handlers} toneColors speechRate={0.9} />
    </MemoryRouter>,
  );
  return handlers;
}

it('new: shows only the hanzi, and the two buttons report the choice', () => {
  const h = setup('new');
  expect(screen.queryByText('to hesitate')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Teach me' }));
  fireEvent.click(screen.getByRole('button', { name: 'I know it' }));
  expect(h.onTeach).toHaveBeenCalledOnce();
  expect(h.onKnown).toHaveBeenCalledOnce();
});

it('taught: stays open with the meaning and a "Learned" label, no buttons', () => {
  setup('taught');
  expect(screen.getByText('to hesitate')).toBeInTheDocument();
  expect(screen.getByText('Learnt')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Teach me' })).not.toBeInTheDocument();
  expect(screen.getByRole('article')).toHaveAttribute('data-status', 'taught');
});

it('known: shows "Already knew" with the meaning, and Undo', () => {
  const h = setup('known');
  expect(screen.getByText('Already knew')).toBeInTheDocument();
  expect(screen.getByText('to hesitate')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Undo: I don’t know 犹豫' }));
  expect(h.onUndo).toHaveBeenCalledOnce();
});

it('never shows traditional characters', () => {
  setup('taught');
  expect(screen.queryByText('猶豫')).not.toBeInTheDocument();
});

it('taught: shows an example sentence when one is given; new cards never do', () => {
  const ex: [string, string] = ['他犹豫了一下。', 'He hesitated for a moment.'];
  const { unmount } = render(
    <MemoryRouter><WordCard word={word} status="taught" example={ex} onTeach={vi.fn()} onKnown={vi.fn()} onUndo={vi.fn()} toneColors speechRate={0.9} /></MemoryRouter>,
  );
  expect(screen.getByText('He hesitated for a moment.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Hear the sentence' })).toBeInTheDocument();
  unmount();
  render(
    <MemoryRouter><WordCard word={word} status="new" example={ex} onTeach={vi.fn()} onKnown={vi.fn()} onUndo={vi.fn()} toneColors speechRate={0.9} /></MemoryRouter>,
  );
  expect(screen.queryByText('He hesitated for a moment.')).not.toBeInTheDocument();
});
