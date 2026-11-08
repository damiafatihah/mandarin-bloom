import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, it, vi } from 'vitest';
import { StoreProvider } from '../state/store';
import Me from './Me';

vi.mock('../data/resources', async () => {
  const { POOL } = await import('../test/fixtures');
  return { useHsk: () => ({ data: POOL, error: null }), useCedict: () => ({ data: null, error: null }) };
});

function renderMe() {
  render(
    <StoreProvider>
      <MemoryRouter>
        <Me />
      </MemoryRouter>
    </StoreProvider>,
  );
}

it('each stat has an info button that explains it, one at a time', () => {
  renderMe();
  const labels = ['Day streak', 'Words in review', 'Mastered', 'Already knew'];
  for (const l of labels) {
    expect(screen.getByRole('button', { name: `What does “${l}” mean?` })).toHaveAttribute('aria-expanded', 'false');
  }

  const mastered = screen.getByRole('button', { name: 'What does “Mastered” mean?' });
  fireEvent.click(mastered);
  expect(mastered).toHaveAttribute('aria-expanded', 'true');
  const panel = screen.getByRole('region', { name: 'Mastered' });
  expect(panel).toHaveTextContent('4 times in a row');
  expect(panel).toHaveTextContent('part of Words in review');

  fireEvent.click(screen.getByRole('button', { name: 'What does “Already knew” mean?' }));
  expect(mastered).toHaveAttribute('aria-expanded', 'false');
  expect(screen.getByRole('region', { name: 'Already knew' })).toHaveTextContent('I know it');
  expect(screen.queryByRole('region', { name: 'Mastered' })).not.toBeInTheDocument();

  // tapping the same icon again closes it
  fireEvent.click(screen.getByRole('button', { name: 'What does “Already knew” mean?' }));
  expect(screen.queryByRole('region', { name: 'Already knew' })).not.toBeInTheDocument();
});

it('explanations match what the app does', () => {
  renderMe();
  const text = (label: string) => {
    fireEvent.click(screen.getByRole('button', { name: `What does “${label}” mean?` }));
    return screen.getByRole('region', { name: label }).textContent ?? '';
  };
  expect(text('Day streak')).toMatch(/daily challenge/);
  const review = text('Words in review');
  expect(review).toMatch(/Teach me/);
  expect(review).toMatch(/wrong/);
});

import { STORAGE_KEY } from '../state/storage';
import { makeState } from '../test/fixtures';
import { dateKey } from '../lib/dates';

it('lowering words-per-day mid-day removes only words not started: 5 dealt, 3 done → 3', () => {
  const today = dateKey();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(makeState(
    { days: { [today]: { words: ['书', '河', '金', '近', '进'], handled: { 书: 'taught', 河: 'taught', 金: 'known' } } } },
    { wordsPerDay: 5 },
  )));
  renderMe();
  const goal = () => screen.getByRole('region', { name: /Today’s goal/ });
  expect(goal()).toHaveTextContent('3 / 5 words done today');
  fireEvent.click(screen.getByRole('button', { name: 'Fewer words' }));
  fireEvent.click(screen.getByRole('button', { name: 'Fewer words' }));
  expect(goal()).toHaveTextContent('3 / 3 words done today');
  expect(goal()).toHaveTextContent('Goal reached');
  expect(screen.getByRole('img', { name: 'Today’s goal reached' })).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).days[today].words).toEqual(['书', '河', '金']);
});

it('15 → 5 on Me leaves 5 words for today, keeping the one already done', () => {
  const today = dateKey();
  const words = ['了', '书', '进', '汽车', '爱好', '桌子', '安静', '金', '近', '河', '机会', '绿色', '经济', '环境', '犹豫'];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(makeState(
    { days: { [today]: { words, handled: { 环境: 'taught' } } } },
    { wordsPerDay: 15, levels: [1, 2, 3, 4, 5, 7] },
  )));
  renderMe();
  fireEvent.click(screen.getByRole('button', { name: '5' }));
  const goal = screen.getByRole('region', { name: /Today’s goal/ });
  expect(goal).toHaveTextContent('1 / 5 words done today');
  const kept = JSON.parse(localStorage.getItem(STORAGE_KEY)!).days[today].words;
  expect(kept).toEqual(['了', '书', '进', '汽车', '环境']);
});

it('the words-per-day note says what really happens', () => {
  renderMe();
  expect(screen.getByText(/Changes today’s goal straight away/)).toHaveTextContent(
    'Changes today’s goal straight away. Raising it adds words now; lowering it removes words you haven’t started, never ones you’ve done.',
  );
});

it('raising words-per-day on Me updates the goal right away (no need to visit Today first)', () => {
  const today = dateKey();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(makeState(
    { days: { [today]: { words: ['书', '河', '金', '近', '进'], handled: { 书: 'taught' } } } },
    { wordsPerDay: 5, levels: [1, 2] },
  )));
  renderMe();
  const goal = () => screen.getByRole('region', { name: /Today’s goal/ });
  expect(goal()).toHaveTextContent('1 / 5 words done today');
  for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole('button', { name: 'More words' }));
  expect(goal()).toHaveTextContent('1 / 10 words done today');
  expect(goal()).toHaveTextContent('Learn or skip 9 more words on Today.');
  // the 5 extra words were really dealt for today
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).days[today].words).toHaveLength(10);
});
