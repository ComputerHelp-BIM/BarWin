// Smoke tests on the built site/ (minified, exactly what is deployed). Run: npm run test:e2e
// Each page opens from disk, draws, and reports no script errors. Beam Sections gets a few interaction checks for
// rules the user set; the homepage must list every app with the right version and a working link.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { loadApps } = require('../../scripts/build-site.js');

const SITE = path.resolve(__dirname, '..', '..', 'site');
const url = (rel) => pathToFileURL(path.join(SITE, rel)).href;

/** Opens a page and collects uncaught script errors. */
async function open(page, rel) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url(rel));
  return errors;
}

test.describe('Homepage', () => {
  test('one card per app, with its version and a link that exists', async ({ page }) => {
    const apps = loadApps();
    const errors = await open(page, 'index.html');
    await expect(page.locator('.card')).toHaveCount(apps.length);
    for (const a of apps) {
      const card = page.locator('.card', { has: page.locator(`a[href="/${a.slug}/"]`) });
      await expect(card).toHaveCount(1);
      await expect(card.locator('.chip').last()).toContainText(a.version);
      expect(fs.existsSync(path.join(SITE, a.slug, 'index.html')), `${a.slug} page built`).toBe(true);
    }
    expect(errors).toEqual([]);
  });

  test('fits a phone screen without sideways scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await open(page, 'index.html');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  });
});

test('the BarWin strip on each active tool leads back to the homepage', async ({ page }) => {
  for (const rel of ['beam-sections/index.html', 'bbs-studio/index.html']) {
    await open(page, rel);
    await expect(page.locator('.bw-bar')).toBeVisible();
    // From disk "../" opens a folder listing, so check where the link points rather than following it.
    const href = await page.locator('.bw-home').evaluate((a) => a.href);
    expect(href, `${rel} -> homepage`).toBe(pathToFileURL(SITE).href + '/');
  }
});

test.describe('Beam Sections', () => {
  const PAGE = 'beam-sections/index.html';

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

  test('settings show as tabs or collapsible groups, and the choice is kept', async ({ page }) => {
    await open(page, PAGE);
    const visible = () => page.locator('#vals .pg:visible').count();
    expect(await visible()).toBe(3);                       // Geometry: supports, sizes, cover
    await page.click('#tab-anch');
    await expect(page.locator('#f-legMin')).toBeVisible();
    await page.click('label[for="pm-groups"]');
    expect(await visible()).toBe(11);                      // every group, each one collapsible
    await page.reload();
    await expect(page.locator('#pm-groups')).toBeChecked();
    await expect(page.locator('#tabbar')).toBeHidden();
  });

  test('shortest bent leg follows the chosen rule', async ({ page }) => {
    await page.goto(url(PAGE));
    await page.evaluate(() => localStorage.setItem('bbs-beam-sections-v2', JSON.stringify({ Lanch: 'bend', tab: 'anch' })));
    await page.reload();
    await page.selectOption('#f-legMin', 'is');
    await expect(page.locator('#sheetL')).toContainText('860 + 128 LEG (MIN 8\u00D8 IS 456)');
    await page.selectOption('#f-legMin', '10d');
    await expect(page.locator('#sheetL')).toContainText('860 + 160 LEG (MIN 10\u00D8)');
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

test('SS Beam Geometry (frozen) loads and keeps its own saved values', async ({ page }) => {
  const errors = await open(page, 'ss-beam-geometry/index.html');
  await expect(page.locator('#sheetL svg')).toHaveCount(1);
  await expect(page).toHaveTitle('Simply Supported Beam Geometry');
  // On one site the two beam apps share browser storage, so they must not share a key.
  await page.locator('.sx[data-s="A"]').click();   // hiding a section saves the values
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys).toContain('bbs-ss-beam-geometry-v040');
  expect(keys).not.toContain('bbs-beam-sections-v2');
  expect(errors).toEqual([]);
});

/** A DXF must start and end exactly like the template, or AutoCAD rejects it. */
function expectWellFormedDxf(text, name) {
  expect(text.startsWith('  0\nSECTION\n'), `${name} starts with the SECTION group`).toBe(true);
  expect(text.endsWith('  0\nEOF\n'), `${name} ends with EOF`).toBe(true);
}

// BBS Studio loads SheetJS, JSZip and three.js from public CDNs, so these two need internet (CI has it).
test('BBS Studio: a blank wall through every tab, then a well-formed DXF download', async ({ page }) => {
  const errors = await open(page, 'bbs-studio/index.html');
  await page.click('button[data-act="sample"]');
  for (const tab of await page.locator('#tabs button').allInnerTexts()) {
    await page.locator('#tabs button', { hasText: tab }).first().click();
  }
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('button[data-act="x-dxf"]')]);
  const zip = fs.readFileSync(await download.path()).toString('base64');
  // The drawings come zipped; read them with the page's own JSZip.
  const files = await page.evaluate(async (b64) => {
    const z = await window.JSZip.loadAsync(b64, { base64: true });
    const out = {};
    for (const n of Object.keys(z.files)) if (n.endsWith('.dxf')) out[n] = await z.file(n).async('string');
    return out;
  }, zip);
  expect(Object.keys(files).length).toBeGreaterThan(0);
  for (const [n, t] of Object.entries(files)) expectWellFormedDxf(t, n);
  expect(errors).toEqual([]);
});

test('BBS Studio footings: input to outputs, then a well-formed DXF download', async ({ page }) => {
  const errors = await open(page, 'bbs-studio-footings/index.html');
  await page.click('header button[data-step="review"]');
  await page.click('header button[data-step="outputs"]');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#outBody button[data-act="x-dxf"]')]);
  expectWellFormedDxf(fs.readFileSync(await download.path(), 'utf8'), download.suggestedFilename());
  expect(errors).toEqual([]);
});

test('BS 8666 shape codes: every code drawn', async ({ page }) => {
  const errors = await open(page, 'shape-codes/index.html');
  await expect(page.locator('#sheet article')).toHaveCount(36);   // 35 BS 8666 codes + 51A
  expect(errors).toEqual([]);
});
