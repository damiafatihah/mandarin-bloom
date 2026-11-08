import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, it } from 'vitest';
import { StoreProvider } from '../state/store';
import Me from './Me';

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
