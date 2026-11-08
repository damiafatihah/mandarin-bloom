import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, it } from 'vitest';
import { StoreProvider } from '../state/store';
import { STORAGE_KEY } from '../state/storage';
import Welcome from './Welcome';

it('saves words-per-day and levels, then goes home', () => {
  render(
    <StoreProvider>
      <MemoryRouter initialEntries={['/welcome']}>
        <Routes>
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/" element={<p>HOME</p>} />
        </Routes>
      </MemoryRouter>
    </StoreProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('button', { name: '10' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('button', { name: /HSK 6/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Start learning' }));
  expect(screen.getByText('HOME')).toBeInTheDocument();
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
  expect(saved.onboarded).toBe(true);
  expect(saved.settings.wordsPerDay).toBe(10);
  expect(saved.settings.levels).toEqual([4, 5, 6]);
});
