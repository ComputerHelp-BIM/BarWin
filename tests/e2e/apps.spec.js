// Smoke tests: each app opens from disk, draws, and reports no script errors.
// Beam Sections gets a few interaction checks for rules the user set; the others just have to load cleanly.
const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '..', '..');
const url = (rel) => pathToFileURL(path.join(root, rel)).href;

/** Opens a page and collects uncaught script errors. */
async function open(page, rel) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url(rel));
  return errors;
}

test.describe('Beam Sections', () => {
  const PAGE = 'apps/beam-sections/dist/beam-sections.html';

  test('draws the L-section and the shown sections, light and dark', async ({ page }) => {
    for (const scheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: scheme });
      const errors = await open(page, PAGE);
      await expect(page.locator('#sheetL svg')).toHaveCount(1);
      await expect(page.locator('#secs svg')).not.toHaveCount(0);
      expect(errors, `script errors in ${scheme} mode`).toEqual([]);
    }
  });

  test('Labels off hides bar labels in one click', async ({ page }) => {
    await open(page, PAGE);
    const texts = () => page.locator('#sheetL text').count();
    const before = await texts();
    await page.uncheck('#vLabels');
    expect(await texts()).toBeLessThan(before);
    await page.check('#vLabels');
    expect(await texts()).toBe(before);
  });

  test('Auto layer never raises a layer alert', async ({ page }) => {
    await page.goto(url(PAGE));
    await page.evaluate(() => localStorage.setItem('bbs-beam-sections-v2', JSON.stringify({ topN: 4, bxN: 3 })));
    await page.reload();
    const alert = page.locator('#lkAlert');
    const text = (await alert.isHidden()) ? '' : await alert.innerText();
    expect(text).not.toMatch(/layer/i);
  });
});

test('SS beam geometry (frozen v0.4.0) loads', async ({ page }) => {
  const errors = await open(page, 'apps/ss-beam-geometry/dist/ss-beam-geometry.html');
  await expect(page.locator('#sheetL svg')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('BS 8666 shape codes: every code drawn', async ({ page }) => {
  const errors = await open(page, 'apps/shape-codes/index.html');
  await expect(page.locator('#sheet article')).toHaveCount(36);   // 35 BS 8666 codes + 51A
  expect(errors).toEqual([]);
});
