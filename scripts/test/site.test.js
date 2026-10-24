/**
 * Tests for the site build: app manifests and the minifier guard.
 * Run: npm test
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadApps, protectData, MINIFY } = require('../build-site.js');

const ROOT = path.resolve(__dirname, '..', '..');

test('every app manifest is valid, with a semantic version read from its source', () => {
  const apps = loadApps({ requireEntry: false });   // npm test runs before any build
  assert.ok(apps.length >= 5);
  for (const a of apps) {
    assert.match(a.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.match(a.version, /^\d+\.\d+\.\d+$/, `${a.slug} version`);
    assert.ok(['active', 'reference', 'frozen'].includes(a.status), `${a.slug} status`);
  }
  assert.equal(new Set(apps.map((a) => a.slug)).size, apps.length, 'slugs are unique');
});

test('assembled pages: every include resolves, nothing is left unreplaced', () => {
  const { assemble, appsWithBuild } = require('../build.js');
  for (const slug of appsWithBuild()) {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'apps', slug, 'app.json'), 'utf8'));
    for (const shell of Object.values(j.build.outputs)) assert.doesNotMatch(assemble(path.join(ROOT, 'apps', slug, shell)), /@@include/, `${slug}/${shell}`);
  }
});

test('active apps carry the BarWin strip, linking back to the homepage; frozen apps stay as published', () => {
  const { assemble } = require('../build.js');
  const page = (slug, shell) => assemble(path.join(ROOT, 'apps', slug, 'src', shell));
  for (const [slug, shell] of [['beam-sections', 'index.html'], ['bbs-studio', 'index.html']]) {
    const html = page(slug, shell);
    assert.match(html, /<nav class="bw-bar"[^>]*>\s*<a class="bw-home" href="\.\.\/"/, `${slug} has the strip`);
    assert.match(html, /--bw-steel:/, `${slug} has the brand tokens`);
    assert.equal((html.match(/class="bw-bar"/g) || []).length, 1, `${slug} has one strip`);
  }
  assert.doesNotMatch(page('ss-beam-geometry', 'index.html'), /bw-bar/, 'SS Beam Geometry is frozen');
});

test('versions on the cards match the apps', () => {
  const v = Object.fromEntries(loadApps({ requireEntry: false }).map((a) => [a.slug, a.version]));
  const B = require('../../apps/beam-sections/src/beams.js');
  assert.equal(v['beam-sections'], B.VERSION);
});

test('data script blocks are protected from the minifier; code blocks are not', () => {
  const html = '<script>var a = 1;</script><script type="text/plain" id="t">\n  0\nEOF\n</script><script type="module">x()</script>';
  const out = protectData(html);
  assert.equal((out.match(/htmlmin:ignore/g) || []).length, 2, 'only the text/plain block is wrapped');
  assert.ok(out.includes('<!-- htmlmin:ignore --><script type="text/plain"'));
});

test('the BBS Studio DXF template survives minification byte for byte', async () => {
  const { minify } = require('html-minifier-terser');
  const { assemble } = require('../build.js');
  const pick = (s) => s.match(/<script type="text\/plain" id="dxf-template"[^>]*>([\s\S]*?)<\/script>/)[1];
  const page = { 'bbs-studio': () => assemble(path.join(ROOT, 'apps', 'bbs-studio', 'src', 'index.html')), 'bbs-studio-footings': () => fs.readFileSync(path.join(ROOT, 'apps', 'bbs-studio-footings', 'index.html'), 'utf8') };
  for (const app of Object.keys(page)) {
    const src = page[app]();
    const out = await minify(protectData(src), MINIFY);
    assert.equal(pick(out), pick(src), `${app}: DXF template changed`);
    assert.ok(!out.includes('htmlmin:ignore'), `${app}: ignore markers left in the output`);
  }
});
