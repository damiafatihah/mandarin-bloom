import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { StoreProvider } from '../state/store';
import { STORAGE_KEY } from '../state/storage';
import { makeState } from '../test/fixtures';
import Today from './Today';

vi.mock('../data/resources', async () => {
  const { POOL } = await import('../test/fixtures');
  return { useHsk: () => ({ data: POOL, error: null }), useCedict: () => ({ data: null, error: null }) };
});

beforeEach(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(makeState({}, { wordsPerDay: 3, levels: [1] })));
});

function renderToday() {
  render(
    <StoreProvider>
      <MemoryRouter>
        <Today />
      </MemoryRouter>
    </StoreProvider>,
  );
}

const progress = () => screen.getByRole('progressbar', { name: 'Today’s words' });
const cards = () => screen.getAllByRole('article');
const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!);

it('counts both "Teach me" and "I know it" toward the daily goal, and no new words pop in', () => {
  renderToday();
  expect(cards()).toHaveLength(3);
  expect(progress()).toHaveAttribute('aria-valuenow', '0');
  expect(progress()).toHaveAttribute('aria-valuemax', '3');
  expect(screen.getByText(/words done today/)).toHaveTextContent('0 of 3 words done today');

  const [a, b] = cards();
  fireEvent.click(within(a).getByRole('button', { name: 'Teach me' }));
  expect(progress()).toHaveAttribute('aria-valuenow', '1');
  fireEvent.click(within(b).getByRole('button', { name: 'I know it' }));
  expect(progress()).toHaveAttribute('aria-valuenow', '2');
  expect(screen.getByText(/words done today/)).toHaveTextContent('2 of 3 words done today');

  // same three cards, nothing new appeared
  expect(cards()).toHaveLength(3);
  expect(within(cards()[0]).getByText('Learned')).toBeInTheDocument();
  expect(within(cards()[1]).getByText('Already knew')).toBeInTheDocument();
});

it('only "Teach me" words go into reviews; "I know it" words do not', () => {
  renderToday();
  const [a, b] = cards();
  const taught = a.getAttribute('aria-label')!;
  const known = b.getAttribute('aria-label')!;
  fireEvent.click(within(a).getByRole('button', { name: 'Teach me' }));
  fireEvent.click(within(b).getByRole('button', { name: 'I know it' }));
  expect(Object.keys(saved().cards)).toEqual([taught]);
  expect(saved().known).toEqual([known]);
});

it('Undo puts a card back to undecided', () => {
  renderToday();
  const b = cards()[1];
  fireEvent.click(within(b).getByRole('button', { name: 'I know it' }));
  fireEvent.click(within(cards()[1]).getByRole('button', { name: /^Undo/ }));
  expect(progress()).toHaveAttribute('aria-valuenow', '0');
  expect(within(cards()[1]).getByRole('button', { name: 'I know it' })).toBeInTheDocument();
  expect(saved().known).toEqual([]);
});

it('when the goal is reached it says so, with an optional "learn more"', () => {
  renderToday();
  expect(screen.queryByRole('heading', { name: /Daily goal done/ })).not.toBeInTheDocument();
  const [a, b, c] = cards();
  fireEvent.click(within(a).getByRole('button', { name: 'Teach me' }));
  fireEvent.click(within(b).getByRole('button', { name: 'I know it' }));
  fireEvent.click(within(c).getByRole('button', { name: 'Teach me' }));

  const done = screen.getByRole('region', { name: /Daily goal done/ });
  expect(done).toHaveTextContent('3 words today');
  expect(done).toHaveTextContent('2 learned · 1 already knew');
  expect(done).toHaveTextContent(/optional/i);

  act(() => fireEvent.click(within(done).getByRole('button', { name: 'Learn 3 more' })));
  expect(cards()).toHaveLength(6);
  expect(progress()).toHaveAttribute('aria-valuemax', '6');
  expect(screen.getByText(/words done today/)).toHaveTextContent('3 of 6 words done today');
  expect(screen.getByText(/Daily goal of 3 done/)).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: /Daily goal done/ })).not.toBeInTheDocument();
});

it('progress survives a reload', () => {
  renderToday();
  fireEvent.click(within(cards()[0]).getByRole('button', { name: 'Teach me' }));
  document.body.innerHTML = '';
  renderToday();
  expect(progress()).toHaveAttribute('aria-valuenow', '1');
  expect(within(cards()[0]).getByText('Learned')).toBeInTheDocument();
});
