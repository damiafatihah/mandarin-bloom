import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, it, vi } from 'vitest';
import { WordCard } from './WordCard';
import { POOL } from '../test/fixtures';

const word = POOL.find((w) => w.s === '犹豫')!;
const setup = (onKnown = vi.fn()) =>
  render(<MemoryRouter><WordCard word={word} onKnown={onKnown} toneColors speechRate={0.9} /></MemoryRouter>);

it('hides the answer until "Teach me"', () => {
  setup();
  expect(screen.queryByText('to hesitate')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Teach me' }));
  expect(screen.getByText('to hesitate')).toBeInTheDocument();
  expect(screen.queryByText('猶豫')).not.toBeInTheDocument();
});

it('calls onKnown', () => {
  const onKnown = vi.fn();
  setup(onKnown);
  fireEvent.click(screen.getByRole('button', { name: 'I know it' }));
  expect(onKnown).toHaveBeenCalledOnce();
});
