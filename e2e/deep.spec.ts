import { expect, test, type Page } from '@playwright/test';

/** Deep end-to-end flows. Each test fails on any uncaught page error or console error. */

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  return errors;
}

async function onboard(page: Page, perDay = '5') {
  await page.goto('/');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: perDay, exact: true }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await expect(page.getByRole('heading', { name: /Today’s words/ })).toBeVisible();
}

async function noOverflow(page: Page) {
  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, window.innerWidth) - window.screen.width);
  expect(overflow, 'horizontal overflow').toBeLessThanOrEqual(0);
}

const shot = (page: Page, project: string, name: string) =>
  page.screenshot({ path: `e2e/screens/${project}-${name}.png`, fullPage: false });

test('word cards: teach me reveals, I know it refills, progress survives reload', async ({ page }, info) => {
  const errors = watchErrors(page);
  await onboard(page, '5');
  const cards = page.getByRole('article');
  await expect(cards).toHaveCount(5);
  const before = await cards.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));

  // Reveal the first card
  await cards.first().getByRole('button', { name: 'Teach me' }).click();
  await expect(cards.first().getByRole('link', { name: /More about/ })).toBeVisible();
  await expect(cards.first().locator('[data-tone]').first()).toBeVisible();

  // Mark the second as known → it disappears and a new word takes the 5th slot
  await cards.nth(1).getByRole('button', { name: 'I know it' }).click();
  await expect(cards).toHaveCount(5);
  const after = await cards.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  expect(after).not.toContain(before[1]);
  expect(new Set(after).size).toBe(5);

  // Reload: same words (persisted), still 5
  await page.reload();
  await expect(page.getByRole('article')).toHaveCount(5);
  const reloaded = await page.getByRole('article').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  expect(reloaded).toEqual(after);
  await noOverflow(page);
  await shot(page, info.project.name, 'deep-today');
  expect(errors).toEqual([]);
});

test('full daily challenge: 10 questions → seal → Today shows done + calendar seal', async ({ page }, info) => {
  const errors = watchErrors(page);
  await onboard(page);
  await page.getByRole('link', { name: 'Start the challenge' }).click();
  await page.getByRole('button', { name: 'Begin' }).click();

  for (let i = 0; i < 10; i++) {
    await expect(page.locator('[data-choice]')).toHaveCount(4);
    // keyboard path on even questions, mouse on odd ones
    if (i % 2 === 0) await page.keyboard.press(String((i % 4) + 1));
    else await page.locator('[data-choice]').nth(i % 4).click();
    await expect(page.getByText(/Correct|Answer:/)).toBeVisible();
    if (i === 3) await shot(page, info.project.name, 'deep-question');
    await page.getByRole('button', { name: i === 9 ? 'See results' : 'Next question' }).click();
  }
  await expect(page.getByRole('heading', { name: /每日挑战 complete/ })).toBeVisible();
  const scoreText = await page.locator('p', { hasText: '/ 10' }).first().innerText();
  expect(scoreText).toMatch(/^\d+\s*\/\s*10$/);
  await shot(page, info.project.name, 'deep-result');

  // Revisiting /challenge the same day shows the result, not a new run
  await page.goto('/challenge');
  await expect(page.getByRole('heading', { name: /每日挑战 complete/ })).toBeVisible();

  await page.goto('/');
  await expect(page.getByText(/Done: \d+\/10/)).toBeVisible();
  await expect(page.getByRole('img', { name: /challenge done/ })).toHaveCount(1);
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test('practice: tones-only run, then due reviews from misses', async ({ page }, info) => {
  const errors = watchErrors(page);
  await onboard(page);
  await page.getByRole('link', { name: /Practice/ }).first().click();
  await page.getByRole('button', { name: 'Tones' }).click();
  await page.getByRole('button', { name: '10 questions' }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText('Which tones are right?')).toBeVisible();
  // every option in a tone question is pinyin (no hanzi)
  const choices = await page.locator('[data-choice]').allInnerTexts();
  for (const c of choices) expect(c).not.toMatch(/[\u3400-\u9fff]/);
  await shot(page, info.project.name, 'deep-tones');
  for (let i = 0; i < 10; i++) {
    await page.locator('[data-choice]').first().click();
    await page.getByRole('button', { name: i === 9 ? 'See results' : 'Next question' }).click();
  }
  await expect(page.getByRole('heading', { name: /练习 done/ })).toBeVisible();
  await page.getByRole('button', { name: 'Change settings' }).click();
  await expect(page.getByRole('heading', { name: /Practice/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('dictionary: hanzi, toned pinyin, english; word page; characters link', async ({ page }, info) => {
  const errors = watchErrors(page);
  await onboard(page);
  await page.goto('/dictionary');
  const box = page.getByRole('searchbox');
  // wait until the full dictionary is in
  await expect(page.getByText(/Loading the full dictionary/)).toBeHidden({ timeout: 30_000 });

  const firstResult = page.locator('ul li a').first();
  for (const [q, want] of [['犹豫', '犹豫'], ['you2 yu4', '犹豫'], ['hesitate', '犹豫'], ['lvse', '绿色'], ['hello', '你好']]) {
    await box.fill(q);
    await expect(firstResult).toContainText(want);
  }
  await box.fill('zzzzqqq');
  await expect(page.getByText(/No matches/)).toBeVisible();

  // URL keeps the query (shareable / back button)
  await box.fill('经济');
  await expect(page).toHaveURL(/q=/);
  await firstResult.click();
  await expect(page.getByRole('heading', { name: '经济' })).toBeVisible();
  await page.getByRole('button', { name: 'Add to my reviews' }).click();
  await expect(page.getByText(/In your reviews/)).toBeVisible();
  await page.getByRole('link', { name: '济' }).click();
  await expect(page.getByRole('heading', { name: '济' })).toBeVisible();
  await noOverflow(page);
  await shot(page, info.project.name, 'deep-word');
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('heading', { name: '经济' })).toBeVisible();

  // A non-HSK word still opens from CEDICT
  await page.goto('/word/' + encodeURIComponent('电脑'));
  await expect(page.getByRole('heading', { name: '电脑' })).toBeVisible({ timeout: 30_000 });
  // An unknown string shows a friendly message
  await page.goto('/word/' + encodeURIComponent('ㄅㄆ'));
  await expect(page.getByText(/Not found/)).toBeVisible({ timeout: 30_000 });
  expect(errors).toEqual([]);
});

test('me: settings persist and change today; reset keeps settings', async ({ page }, info) => {
  const errors = watchErrors(page);
  await onboard(page, '3');
  await expect(page.getByRole('article')).toHaveCount(3);
  await page.getByRole('link', { name: /Me/ }).first().click();
  await page.getByRole('button', { name: 'More words' }).click();
  await page.getByRole('button', { name: 'More words' }).click();
  await page.getByLabel('Colour pinyin by tone').uncheck();
  // Voices load asynchronously and add the voice picker; the page must still fit the screen afterwards.
  await page.waitForFunction(() => speechSynthesis.getVoices().length > 0 || performance.now() > 4000);
  await page.waitForTimeout(300);
  await shot(page, info.project.name, 'deep-me');
  await noOverflow(page);
  await page.getByRole('link', { name: /Today/ }).first().click();
  await expect(page.getByRole('article')).toHaveCount(5);
  await page.getByRole('article').first().getByRole('button', { name: 'Teach me' }).click();
  await expect(page.getByRole('article').first().locator('.tone')).toHaveCount(0);

  await page.reload();
  await page.goto('/me');
  await expect(page.getByLabel('Colour pinyin by tone')).not.toBeChecked();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Reset progress' }).click();
  await expect(page.locator('dd').nth(1)).toHaveText('0');
  await expect(page.getByLabel('Colour pinyin by tone')).not.toBeChecked();
  expect(errors).toEqual([]);
});

test('routing: unknown paths go home, deep links work after onboarding', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/dictionary');
  await expect(page).toHaveURL(/\/welcome$/);
  await onboard(page);
  await page.goto('/no/such/page');
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/dictionary?q=' + encodeURIComponent('书'));
  await expect(page.getByRole('searchbox')).toHaveValue('书');
  expect(errors).toEqual([]);
});
