import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { StoreProvider } from '../state/store';
import { STORAGE_KEY } from '../state/storage';
import { dateKey, addDays } from '../lib/dates';
import { makeState } from '../test/fixtures';
import MyWords from './MyWords';

vi.mock('../data/resources', async () => {
  const { POOL } = await import('../test/fixtures');
  return { useHsk: () => ({ data: POOL, error: null }), useCedict: () => ({ data: null, error: null }) };
});

const today = dateKey();
const card = (box: number, due: string) => ({ box, due, seen: box + 1, correct: box });
function seed() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(makeState({
    cards: { 书: card(0, addDays(today, 1)), 河: card(5, addDays(today, 30)), 金: card(2, addDays(today, -1)) },
    known: ['桌子'],
    days: { [today]: { words: ['书', '桌子', '汽车'], handled: { 书: 'taught', 桌子: 'known' } } },
  })));
}
beforeEach(seed);

function Where() {
  const l = useLocation();
  return <p data-testid="where">{l.pathname}{l.search}</p>;
}
const mount = (url = '/words') => render(
  <StoreProvider><MemoryRouter initialEntries={[url]}>
    <Routes><Route path="/words" element={<><MyWords /><Where /></>} /><Route path="*" element={<Where />} /></Routes>
  </MemoryRouter></StoreProvider>,
);
const rows = () => screen.queryAllByRole('link', { name: /^[\u3400-\u9fff]/ });
const hanzi = () => rows().map((r) => r.querySelector('[lang="zh"]')!.textContent);

it('lists every learnt word with filter counts, newest first', () => {
  mount();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('我的词语');
  const filters = screen.getByRole('group', { name: 'Show' });
  expect(within(filters).getByRole('button', { name: 'All 4' })).toHaveAttribute('aria-pressed', 'true');
  expect(within(filters).getByRole('button', { name: 'Review due 1' })).toBeInTheDocument();
  expect(within(filters).getByRole('button', { name: 'In review 3' })).toBeInTheDocument();
  expect(within(filters).getByRole('button', { name: 'Mastered 1' })).toBeInTheDocument();
  expect(within(filters).getByRole('button', { name: 'Already knew 1' })).toBeInTheDocument();
  expect(hanzi()).toEqual(['书', '桌子', '河', '金']);
  expect(screen.getByRole('status')).toHaveTextContent('Showing 4 words');
});

it('each row says its status and when it comes back', () => {
  mount();
  const row = (h: string) => rows().find((r) => r.textContent!.startsWith(h))!;
  expect(row('书')).toHaveTextContent('Learning');
  expect(row('书')).toHaveTextContent('Review tomorrow');
  expect(row('金')).toHaveTextContent('Review due');
  expect(row('河')).toHaveTextContent('Mastered');
  expect(row('河')).toHaveTextContent('Review in 30 days');
  expect(row('桌子')).toHaveTextContent('Already knew');
  expect(row('书')).toHaveAttribute('href', `/word/${encodeURIComponent('书')}`);
});

it('filter, level and sort are kept in the address, so Back returns to the same view', () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'In review 3' }));
  expect(hanzi()).toEqual(['书', '河', '金']);
  fireEvent.change(screen.getByLabelText('Sort'), { target: { value: 'review' } });
  expect(hanzi()).toEqual(['金', '书', '河']);
  fireEvent.change(screen.getByLabelText('Level'), { target: { value: '1' } });
  expect(hanzi()).toEqual(['书']);
  expect(screen.getByTestId('where')).toHaveTextContent('/words?filter=review&sort=review&level=1');
});

it('opens on the filter given in the address (links from Me)', () => {
  mount('/words?filter=mastered');
  expect(screen.getByRole('button', { name: 'Mastered 1' })).toHaveAttribute('aria-pressed', 'true');
  expect(hanzi()).toEqual(['河']);
});

it('searches hanzi, pinyin and English', () => {
  mount();
  const box = screen.getByRole('searchbox', { name: /Search my words/ });
  fireEvent.change(box, { target: { value: 'river' } });
  expect(hanzi()).toEqual(['河']);
  fireEvent.change(box, { target: { value: 'shu' } });
  expect(hanzi()).toEqual(['书']);
  fireEvent.change(box, { target: { value: 'xyz' } });
  expect(rows()).toHaveLength(0);
  expect(screen.getByText(/No words match/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(rows()).toHaveLength(4);
});

it('with no words yet, points you to Today', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(makeState()));
  mount();
  expect(screen.getByText(/No learnt words yet/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Go to Today/ })).toHaveAttribute('href', '/');
});
