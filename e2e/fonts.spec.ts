import { expect, test } from '@playwright/test';

/** Asks Chromium (via CDP) which font actually rendered the pinyin glyphs: catches silent font fallback. */
test('pinyin glyphs render in Urbanist, never a fallback face', async ({ page, browserName }, info) => {
  test.skip(browserName !== 'chromium' || info.project.name !== 'desktop');
  await page.goto('/');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await page.goto('/word/' + encodeURIComponent('了'));
  await expect(page.getByText('Other readings')).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '.pinyin [data-tone]' });
  expect(nodeIds.length).toBeGreaterThan(2);
  const families = new Set<string>();
  for (const nodeId of nodeIds) {
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    for (const f of fonts) families.add(f.familyName);
  }
  expect([...families]).toEqual(['Urbanist']);

  const han = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: 'h1[lang="zh"]' });
  const hanFamilies = new Set<string>();
  for (const nodeId of han.nodeIds) {
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    for (const f of fonts) hanFamilies.add(f.familyName);
  }
  expect([...hanFamilies].every((f) => f.startsWith('Noto Serif SC'))).toBe(true);
});
