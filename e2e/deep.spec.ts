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

test('daily goal: both choices count, cards stay put, goal panel, optional learn-more, survives reload', async ({ page }, info) => {
  const errors = watchErrors(page);
  await onboard(page, '5');
  const cards = page.getByRole('article');
  const bar = page.getByRole('progressbar', { name: 'Today’s words' });
  await expect(cards).toHaveCount(5);
  await expect(bar).toHaveAttribute('aria-valuenow', '0');
  const before = await cards.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));

  // Teach me → stays open, labelled Learned, counts 1
  await cards.nth(0).getByRole('button', { name: 'Teach me' }).click();
  await expect(cards.nth(0).getByText('Learned')).toBeVisible();
  await expect(cards.nth(0).getByRole('link', { name: /More about/ })).toBeVisible();
  await expect(bar).toHaveAttribute('aria-valuenow', '1');

  // I know it → stays, labelled Already knew, counts 2; nothing new pops in
  await cards.nth(1).getByRole('button', { name: 'I know it' }).click();
  await expect(cards.nth(1).getByText('Already knew')).toBeVisible();
  await expect(bar).toHaveAttribute('aria-valuenow', '2');
  expect(await cards.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))).toEqual(before);
  await expect(page.getByText(/words done today/)).toHaveText('2 of 5 words done today');
  await shot(page, info.project.name, 'deep-today-progress');

  // Undo a misclick
  await cards.nth(1).getByRole('button', { name: /^Undo/ }).click();
  await expect(bar).toHaveAttribute('aria-valuenow', '1');
  await cards.nth(1).getByRole('button', { name: 'I know it' }).click();

  // Finish the rest (scrolling the phone carousel as needed)
  for (const i of [2, 3, 4]) await cards.nth(i).getByRole('button', { name: i % 2 ? 'I know it' : 'Teach me' }).click();
  const done = page.getByRole('region', { name: /Daily goal done/ });
  await expect(done).toBeVisible();
  await expect(done).toContainText('5 words today');
  await expect(done).toContainText('3 learned · 2 already knew');
  await expect(done).toContainText('optional');
  await noOverflow(page);
  await shot(page, info.project.name, 'deep-today-goal');

  // Reload keeps everything
  await page.reload();
  await expect(page.getByRole('progressbar', { name: 'Today’s words' })).toHaveAttribute('aria-valuenow', '5');
  await expect(page.getByRole('region', { name: /Daily goal done/ })).toBeVisible();

  // Optional extra words
  await page.getByRole('button', { name: 'Learn 5 more' }).click();
  await expect(cards).toHaveCount(10);
  await expect(page.getByText(/words done today/)).toHaveText('5 of 10 words done today');
  await expect(page.getByText(/Daily goal of 5 done/)).toBeVisible();
  await noOverflow(page);

  // Me: only the 3 "Teach me" words are in review; the 2 "I know it" words are under Already knew
  await page.getByRole('link', { name: /Me/ }).first().click();
  await expect(page.locator('dd').nth(1)).toHaveText('3');
  await expect(page.locator('dd').nth(3)).toHaveText('2');
  expect(errors).toEqual([]);
});

test('phone: after a choice the carousel glides to the next undecided card', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone');
  await onboard(page, '5');
  const list = page.locator('[data-carousel]');
  const scrollX = () => list.evaluate((el) => el.scrollLeft);
  expect(await scrollX()).toBe(0);
  await page.getByRole('article').first().getByRole('button', { name: 'Teach me' }).click();
  await expect.poll(scrollX).toBeGreaterThan(100);
  const second = page.getByRole('article').nth(1);
  await expect(second).toBeInViewport({ ratio: 0.9 });
});

test('me: info buttons explain each number', async ({ page }, info) => {
  await onboard(page);
  await page.goto('/me');
  for (const label of ['Day streak', 'Words in review', 'Mastered', 'Already knew']) {
    const btn = page.getByRole('button', { name: `What does “${label}” mean?` });
    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('region', { name: label })).toBeVisible();
  }
  await noOverflow(page);
  await shot(page, info.project.name, 'deep-me-info');
  await page.getByRole('button', { name: 'What does “Already knew” mean?' }).click();
  await expect(page.getByRole('region', { name: 'Already knew' })).toBeHidden();
});

test('full daily challenge: 10 questions → seal → Today shows done + calendar seal', async ({ page }, info) => {
  const errors = watchErrors(page);
  await onboard(page);
  await page.getByRole('link', { name: /Daily challenge/ }).click();
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
  await expect(page.getByText(/done \d+\/10/)).toBeVisible();
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

test('lowering words-per-day mid-day keeps done words and drops untouched ones (5 → 3 after 3 done)', async ({ page }) => {
  await onboard(page, '5');
  const cards = page.getByRole('article');
  const names = await cards.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  for (const i of [0, 1, 2]) await cards.nth(i).getByRole('button', { name: i === 2 ? 'I know it' : 'Teach me' }).click();

  await page.getByRole('link', { name: /Me/ }).first().click();
  const goal = page.getByRole('region', { name: /Today’s goal/ });
  await page.getByRole('button', { name: 'Fewer words' }).click();
  await page.getByRole('button', { name: 'Fewer words' }).click();
  await expect(goal).toContainText('3 / 3 words done today');
  await expect(goal).toContainText('Goal reached');

  await page.getByRole('link', { name: /Today/ }).first().click();
  await expect(cards).toHaveCount(3);
  expect(await cards.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))).toEqual(names.slice(0, 3));
  await expect(page.getByRole('region', { name: /Daily goal done/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Learn 3 more' })).toBeVisible();
});

test('5 → 15 → 5 on Me: Today shows 5 again, the same cards, done one kept', async ({ page }) => {
  await onboard(page, '5');
  const cards = page.getByRole('article');
  const original = await cards.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  await cards.nth(1).getByRole('button', { name: 'Teach me' }).click();

  await page.getByRole('link', { name: /Me/ }).first().click();
  await page.getByRole('button', { name: '15', exact: true }).click();
  await expect(page.getByRole('region', { name: /Today’s goal/ })).toContainText('1 / 15 words done today');
  await page.getByRole('link', { name: /Today/ }).first().click();
  await expect(cards).toHaveCount(15);

  await page.getByRole('link', { name: /Me/ }).first().click();
  await page.getByRole('button', { name: '5', exact: true }).click();
  await expect(page.getByRole('region', { name: /Today’s goal/ })).toContainText('1 / 5 words done today');
  await page.getByRole('link', { name: /Today/ }).first().click();
  await expect(cards).toHaveCount(5);
  expect(await cards.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))).toEqual(original);
  await expect(cards.nth(1).getByText('Learned')).toBeVisible();
  await expect(page.getByText(/words done today/)).toHaveText('1 of 5 words done today');

  // stepping down one at a time with the − button behaves the same
  await page.getByRole('link', { name: /Me/ }).first().click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'More words' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Fewer words' }).click();
  await page.getByRole('link', { name: /Today/ }).first().click();
  await expect(cards).toHaveCount(5);
  await page.reload();
  await expect(cards).toHaveCount(5);
});

test('raising words-per-day on Me updates the goal ring immediately', async ({ page }) => {
  await onboard(page, '5');
  await page.getByRole('article').first().getByRole('button', { name: 'Teach me' }).click();
  await page.getByRole('link', { name: /Me/ }).first().click();
  const goal = page.getByRole('region', { name: /Today’s goal/ });
  await expect(goal).toContainText('1 / 5 words done today');
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'More words' }).click();
  await expect(goal).toContainText('1 / 10 words done today');
  await expect(goal).toContainText('Learn or skip 9 more words on Today.');
  await page.getByRole('link', { name: /Today/ }).first().click();
  await expect(page.getByRole('article')).toHaveCount(10);
  await expect(page.getByText(/words done today/)).toHaveText('1 of 10 words done today');
});

test('changing levels on Me swaps today’s untouched words for new-level words; done words stay', async ({ page }) => {
  await onboard(page, '5'); // default HSK 4–5
  const cards = page.getByRole('article');
  const doneWord = await cards.nth(0).getAttribute('aria-label');
  await cards.nth(0).getByRole('button', { name: 'Teach me' }).click();
  await page.getByRole('link', { name: /Me/ }).first().click();
  await page.getByRole('button', { name: /HSK 6/ }).click(); // add 6
  await page.getByRole('button', { name: /HSK 4 / }).click(); // remove 4
  await page.getByRole('button', { name: /HSK 5/ }).click(); // remove 5
  await page.getByRole('link', { name: /Today/ }).first().click();
  await expect(cards).toHaveCount(5);
  await expect(cards.nth(0)).toHaveAttribute('aria-label', doneWord!);
  for (const i of [1, 2, 3, 4]) await expect(cards.nth(i).getByText(/HSK 6/)).toBeVisible();
  await expect(page.getByText(/words done today/)).toHaveText('1 of 5 words done today');
});
