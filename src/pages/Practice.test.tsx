import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { StoreProvider } from '../state/store';
import { STORAGE_KEY } from '../state/storage';
import { makeState } from '../test/fixtures';
import Practice from './Practice';

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(makeState({}, { levels: [1, 2, 3, 4, 5, 7] })));
});

const mount = () => render(<StoreProvider><MemoryRouter><Practice /></MemoryRouter></StoreProvider>);
const question = () => screen.getByRole('region', { name: /^Question \d+ of \d+$/ });
const choices = () => question().querySelectorAll<HTMLButtonElement>('[data-choice]');
const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!);
const seenTotal = () => Object.values(saved().cards as Record<string, { seen: number }>).reduce((n, c) => n + c.seen, 0);

it('leaving mid-practice and coming back resumes on the same question, nothing graded twice', () => {
  const first = mount();
  fireEvent.click(screen.getByRole('button', { name: /^Start/ }));
  fireEvent.click(choices()[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  fireEvent.click(choices()[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  const promptBefore = question().textContent;
  const seen = seenTotal();
  first.unmount();
  mount();
  expect(question()).toHaveAccessibleName(/^Question 3 of/);
  expect(question().textContent).toBe(promptBefore);
  expect(seenTotal()).toBe(seen);
});

it('End practice goes back to the settings and forgets the session', () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: /^Start/ }));
  fireEvent.click(screen.getByRole('button', { name: 'End practice' }));
  expect(screen.getByRole('button', { name: /^Start/ })).toBeInTheDocument();
  expect(saved().practice).toBeUndefined();
});

it('a finished practice keeps showing its result until a new one starts', () => {
  const first = mount();
  fireEvent.click(screen.getByRole('button', { name: /^Start/ }));
  const total = Number(question().getAttribute('aria-label')!.match(/of (\d+)/)![1]);
  for (let i = 0; i < total; i++) {
    fireEvent.click(choices()[0]);
    fireEvent.click(screen.getByRole('button', { name: i === total - 1 ? 'See results' : 'Next question' }));
  }
  const score = screen.getByText(/\/ \d+$/).textContent;
  first.unmount();
  mount();
  expect(screen.getByRole('heading', { name: /练习 done/ })).toBeInTheDocument();
  expect(screen.getByText(/\/ \d+$/).textContent).toBe(score);
  act(() => fireEvent.click(screen.getByRole('button', { name: 'Change settings' })));
  expect(screen.getByRole('button', { name: /^Start/ })).toBeInTheDocument();
});

it('the chosen question type is kept when resuming', () => {
  const first = mount();
  fireEvent.click(screen.getByRole('button', { name: 'Tones' }));
  fireEvent.click(screen.getByRole('button', { name: /^Start/ }));
  expect(screen.getByText('Which tones are right?')).toBeInTheDocument();
  first.unmount();
  mount();
  expect(screen.getByText('Which tones are right?')).toBeInTheDocument();
});
