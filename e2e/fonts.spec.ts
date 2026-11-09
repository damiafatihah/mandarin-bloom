import { expect, test } from '@playwright/test';

/** Asks Chromium (via CDP) which font actually rendered the pinyin glyphs: catches silent font fallback. */
test('pinyin glyphs render in League Spartan, never a fallback face', async ({ page, browserName }, info) => {
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
  expect([...families].every((f) => f.startsWith('League Spartan')), [...families].join(', ')).toBe(true);

  const han = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: 'h1[lang="zh"]' });
  const hanFamilies = new Set<string>();
  for (const nodeId of han.nodeIds) {
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    for (const f of fonts) hanFamilies.add(f.familyName);
  }
  expect([...hanFamilies].every((f) => f.startsWith('Noto Serif SC'))).toBe(true);
});

/**
 * Draws each tone vowel between two n's in the real pinyin font, finds the ink above the x-height (the tone mark)
 * and checks it sits over its own letter. Catches fonts that place the mark beside the letter after another
 * letter: Urbanist drew tīng as ti¯ng (the ē macron landed 1.2 to 1.8 letter widths to the right).
 * Calibrated: correct fonts measure 0.1 to 0.85 (ī/ǐ: −0.3 to 1.3, the macron is wider than the i).
 */
test('every tone mark is drawn over its own letter in the pinyin font', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.goto('/welcome');
  const result = await page.evaluate(async () => {
    const family = getComputedStyle(document.documentElement).getPropertyValue('--font-pinyin').trim();
    const marked = 'āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ';
    const bad: string[] = [];
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    for (const weight of [500, 600, 700]) {
      const font = `${weight} 80px ${family}`;
      await document.fonts.load(font, `nx${marked}`);
      for (const ch of marked) {
        ctx.clearRect(0, 0, 400, 200);
        ctx.font = font;
        ctx.fillText(`n${ch}n`, 50, 160);
        const xHeight = ctx.measureText('x').actualBoundingBoxAscent;
        const adv = ctx.measureText(ch).width;
        const start = 50 + ctx.measureText(`n${ch}`).width - adv;
        const top = Math.floor(160 - xHeight - 3);
        const px = ctx.getImageData(0, 0, 400, top).data;
        let min = Infinity, max = -Infinity;
        for (let y = 0; y < top; y++) for (let x = 0; x < 400; x++) {
          if (px[(y * 400 + x) * 4 + 3] > 96) { min = Math.min(min, x); max = Math.max(max, x); }
        }
        const lo = (min - start) / adv, hi = (max - start) / adv, mid = (lo + hi) / 2;
        if (!(lo >= -0.4 && hi <= 1.4 && mid >= 0.2 && mid <= 0.8)) bad.push(`${weight}:${ch}`);
      }
    }
    return { family, bad };
  });
  expect(result.bad, `misplaced tone marks in ${result.family}`).toEqual([]);
});
