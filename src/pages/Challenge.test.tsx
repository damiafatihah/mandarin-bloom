import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { StoreProvider } from '../state/store';
import { STORAGE_KEY } from '../state/storage';
import { makeState } from '../test/fixtures';
import Challenge from './Challenge';

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(makeState({}, { levels: [1, 2] })));
});

const mount = () =>
  render(
    <StoreProvider>
      <MemoryRouter>
        <Challenge />
      </MemoryRouter>
    </StoreProvider>,
  );

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!);
const question = () => screen.getByRole('region', { name: /^Question \d+ of \d+$/ });
const choices = () => question().querySelectorAll<HTMLButtonElement>('[data-choice]');

it('leaving mid-challenge and coming back resumes on the same question', () => {
  const first = mount();
  fireEvent.click(screen.getByRole('button', { name: 'Begin' }));
  expect(question()).toHaveAccessibleName(/^Question 1 of/);

  // answer questions 1 and 2, then answer 3 but don't press Next
  fireEvent.click(choices()[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  fireEvent.click(choices()[1]);
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  fireEvent.click(choices()[2]);
  const graded = Object.values(saved().cards as Record<string, { seen: number }>).reduce((n, c) => n + c.seen, 0);

  // go to another tab (unmount) and come back (fresh mount from saved state)
  first.unmount();
  mount();
  expect(screen.queryByRole('button', { name: 'Begin' })).not.toBeInTheDocument();
  expect(question()).toHaveAccessibleName(/^Question 3 of/);
  expect(screen.getByRole('status')).toBeInTheDocument(); // question 3's feedback is still shown

  // nothing was graded twice
  const after = Object.values(saved().cards as Record<string, { seen: number }>).reduce((n, c) => n + c.seen, 0);
  expect(after).toBe(graded);

  act(() => fireEvent.click(screen.getByRole('button', { name: 'Next question' })));
  expect(question()).toHaveAccessibleName(/^Question 4 of/);
});

it('the finished result shows the same score and missed words when revisited', () => {
  const first = mount();
  fireEvent.click(screen.getByRole('button', { name: 'Begin' }));
  const total = Number(question().getAttribute('aria-label')!.match(/of (\d+)/)![1]);
  for (let i = 0; i < total; i++) {
    fireEvent.click(choices()[0]);
    fireEvent.click(screen.getByRole('button', { name: i === total - 1 ? 'See results' : 'Next question' }));
  }
  const score = screen.getByText(/\/ \d+$/).textContent;
  const missed = screen.queryAllByRole('link').map((a) => a.textContent).filter((t) => t && /[\u3400-\u9fff]/.test(t));
  first.unmount();
  mount();
  expect(screen.getByText(/\/ \d+$/).textContent).toBe(score);
  const missedAgain = screen.queryAllByRole('link').map((a) => a.textContent).filter((t) => t && /[\u3400-\u9fff]/.test(t));
  expect(missedAgain).toEqual(missed);
});
