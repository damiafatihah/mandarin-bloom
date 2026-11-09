import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { StoreProvider } from '../state/store';
import { STORAGE_KEY } from '../state/storage';
import { makeState } from '../test/fixtures';
import Today from './Today';

vi.mock('../data/resources', async (importOriginal) => {
  const { POOL } = await import('../test/fixtures');
  return {
    ...(await importOriginal<typeof import('../data/resources')>()),
    useHsk: () => ({ data: POOL, error: null }),
    useCedict: () => ({ data: null, error: null }),
    useExamples: () => ({ data: null, error: null }),
  };
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
  expect(within(cards()[0]).getByText('Learnt')).toBeInTheDocument();
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
  expect(done).toHaveTextContent('3 words done · daily goal of 3 reached');
  expect(done).toHaveTextContent('2 learnt · 1 already knew');
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
  expect(within(cards()[0]).getByText('Learnt')).toBeInTheDocument();
});

it('finished 5, then the goal was lowered to 3: all 5 stay, and the new goal is obvious', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(makeState({}, { wordsPerDay: 5, levels: [1, 2] })));
  renderToday();
  for (const c of cards()) fireEvent.click(within(c).getByRole('button', { name: 'Teach me' }));
  const s = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
  s.settings.wordsPerDay = 3; // lowered on the Me page
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  document.body.innerHTML = '';
  renderToday();
  expect(cards()).toHaveLength(5);
  const done = screen.getByRole('region', { name: /Daily goal done/ });
  expect(done).toHaveTextContent('5 words done · daily goal of 3 reached, +2 extra');
  expect(done).toHaveTextContent('5 learnt · 0 already knew');
  expect(screen.getByRole('button', { name: 'Learn 3 more' })).toBeInTheDocument();
  const segs = progress().querySelectorAll('span');
  expect(segs[2]).toHaveAttribute('data-goal-end', 'true'); // the bar marks where the goal ends
});

it('past the goal but not finished: the hint says how many extra and that the rest are optional', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(makeState({}, { wordsPerDay: 5, levels: [1, 2] })));
  renderToday();
  for (const c of cards().slice(0, 4)) fireEvent.click(within(c).getByRole('button', { name: 'I know it' }));
  const s = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
  s.settings.wordsPerDay = 3;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  document.body.innerHTML = '';
  renderToday();
  expect(screen.getByText(/Daily goal of 3 done/)).toHaveTextContent('Daily goal of 3 done · +1 extra · the rest are optional');
});

it('a choice does not jump away from the card; "Next word" goes to the next undecided card', () => {
  const scroll = vi.fn();
  Element.prototype.scrollIntoView = scroll;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(makeState({}, { wordsPerDay: 3, levels: [1, 2] })));
  renderToday();
  const [a, b, c] = cards();
  fireEvent.click(within(a).getByRole('button', { name: 'Teach me' }));
  expect(scroll).not.toHaveBeenCalled();
  fireEvent.click(within(c).getByRole('button', { name: 'I know it' }));
  fireEvent.click(within(a).getByRole('button', { name: 'Next word' }));
  expect(scroll).toHaveBeenCalledTimes(1);
  expect(scroll.mock.contexts[0]).toBe(b); // skips nothing undecided: b is next
  fireEvent.click(within(c).getByRole('button', { name: 'Next word' }));
  expect(scroll.mock.contexts[1]).toBe(b); // wraps around to the one still waiting
  fireEvent.click(within(b).getByRole('button', { name: 'Teach me' }));
  expect(screen.queryAllByRole('button', { name: 'Next word' })).toHaveLength(0); // nothing left to go to
});
