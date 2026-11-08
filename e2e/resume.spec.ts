import { expect, test } from '@playwright/test';

/** The daily challenge survives leaving the page (another app tab, or a reload) and resumes in place. */
test('challenge resumes after switching tabs and after a reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await expect(page.getByRole('article').first()).toBeVisible();

  await page.getByRole('link', { name: /Daily challenge/ }).click();
  await page.getByRole('button', { name: 'Begin' }).click();
  const q = () => page.getByRole('region', { name: /^Question \d+ of 10$/ });
  for (let i = 0; i < 3; i++) {
    await page.locator('[data-choice]').first().click();
    await page.getByRole('button', { name: 'Next question' }).click();
  }
  await expect(q()).toHaveAccessibleName('Question 4 of 10');

  // another tab in the app, then back
  await page.getByRole('link', { name: /Dictionary/ }).first().click();
  await expect(page.getByRole('searchbox')).toBeVisible();
  await expect(page.getByText(/3 of 10 answered/)).toHaveCount(0); // (Today shows it; we're on Dictionary)
  await page.getByRole('link', { name: /Challenge/ }).first().click();
  await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
  await expect(q()).toHaveAccessibleName('Question 4 of 10');

  // Today's task row says where you are
  await page.getByRole('link', { name: /Today/ }).first().click();
  await expect(page.getByText(/3 of 10 answered, tap to continue/)).toBeVisible();

  // a full reload (what phones do to background tabs) also resumes
  await page.goto('/challenge');
  await page.reload();
  await expect(q()).toHaveAccessibleName('Question 4 of 10');

  // finish: 7 more questions
  for (let i = 3; i < 10; i++) {
    await page.locator('[data-choice]').first().click();
    await page.getByRole('button', { name: i === 9 ? 'See results' : 'Next question' }).click();
  }
  await expect(page.getByRole('heading', { name: /每日挑战 complete/ })).toBeVisible();
  expect(errors).toEqual([]);
});
