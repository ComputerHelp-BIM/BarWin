#!/usr/bin/env node
/**
 * Build the BarWin website into site/ (git-ignored), ready for Vercel.
 *
 *   site/index.html            homepage: one card per app, generated from each app's app.json
 *   site/<app>/index.html      each app, minified (served at /<app>/)
 *   site/404.html              branded not-found page
 *   site/brand/*.svg           mark and icons (favicon)
 *
 * Every folder in apps/ with an app.json becomes a card. app.json:
 *   name      shown on the card
 *   status    "active" | "reference" (Tools section) or "frozen" (Archive section)
 *   order     sort order, low first
 *   summary   one or two sentences
 *   features  short tags (optional)
 *   entry     the page to publish, relative to the app folder (run `npm run build` first for dist/ entries)
 *   version   { file, pattern, label? }: the version is read from the source with this regex, so it never drifts
 * The card glyph is the app's icon.svg (optional).
 *
 * Usage: node scripts/build-site.js [--no-minify]
 *   --no-minify  publish the pages as they are (for debugging a minifier problem)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const APPS = path.join(ROOT, 'apps');
const OUT = path.join(ROOT, 'site');
const SRC = path.join(ROOT, 'site-src');
const BRAND = path.join(ROOT, 'packages', 'brand');
const STATUSES = ['active', 'reference', 'frozen'];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Options for html-minifier-terser. Script blocks of other types (the DXF template is text/plain) are left byte for byte. */
const MINIFY = {
  collapseWhitespace: true,
  conservativeCollapse: true,      // keep one space where whitespace was, so inline text never runs together
  removeComments: true,
  minifyCSS: true,
  minifyJS: { compress: { passes: 2 }, mangle: true, format: { comments: false } },
  keepClosingSlash: true,
  decodeEntities: false,
  processScripts: []               // never touch text/plain, application/json and the like
};

/**
 * Script blocks that are data, not code (type="text/plain", application/json, ...). The minifier trims their edges under
 * collapseWhitespace, which breaks byte-exact templates such as BBS Studio's DXF header. They are wrapped in the
 * minifier's ignore markers so they pass through untouched.
 */
const DATA_SCRIPT = /<script\b[^>]*\btype\s*=\s*["']?(?!(?:text\/javascript|application\/javascript|module)\b)[^"'\s>]+["']?[^>]*>[\s\S]*?<\/script>/gi;
const IGNORE = '<!-- htmlmin:ignore -->';
const protectData = (html) => html.replace(DATA_SCRIPT, (m) => IGNORE + m + IGNORE);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Reads, checks and returns every app manifest, sorted. Throws with every problem listed at once.
 * requireEntry: false skips the check that each built page exists (manifest checks before a build, e.g. in npm test).
 */
function loadApps({ requireEntry = true } = {}) {
  const problems = [];
  const apps = [];
  for (const slug of fs.readdirSync(APPS).sort()) {
    const dir = path.join(APPS, slug);
    const file = path.join(dir, 'app.json');
    if (!fs.statSync(dir).isDirectory() || !fs.existsSync(file)) continue;
    let m;
    try { m = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { problems.push(`${slug}/app.json: ${e.message}`); continue; }
    const where = `${slug}/app.json`;
    if (!SLUG.test(slug)) problems.push(`${slug}: folder name must be lowercase words joined by hyphens (it becomes the URL)`);
    for (const k of ['name', 'status', 'summary', 'entry']) if (!m[k] || typeof m[k] !== 'string') problems.push(`${where}: "${k}" is required`);
    if (m.status && !STATUSES.includes(m.status)) problems.push(`${where}: status must be one of ${STATUSES.join(', ')}`);
    const entry = path.join(dir, m.entry || '');
    if (requireEntry && m.entry && !fs.existsSync(entry)) problems.push(`${where}: entry ${m.entry} not found (run npm run build first?)`);
    let version = null;
    if (!m.version || !m.version.file || !m.version.pattern) problems.push(`${where}: "version" needs file and pattern`);
    else {
      const vf = path.join(dir, m.version.file);
      const hit = fs.existsSync(vf) && new RegExp(m.version.pattern).exec(fs.readFileSync(vf, 'utf8'));
      if (!hit) problems.push(`${where}: version pattern not found in ${m.version.file}`);
      else if (!/^\d+\.\d+\.\d+$/.test(hit[1])) problems.push(`${where}: "${hit[1]}" is not a semantic version`);
      else version = hit[1];
    }
    const iconFile = path.join(dir, 'icon.svg');
    apps.push({
      slug, name: m.name, status: m.status, order: Number.isFinite(m.order) ? m.order : 999,
      summary: m.summary, features: Array.isArray(m.features) ? m.features : [],
      entry, version, versionLabel: (m.version && m.version.label) || '',
      icon: fs.existsSync(iconFile) ? fs.readFileSync(iconFile, 'utf8').trim() : ''
    });
  }
  if (!apps.length) problems.push('no apps found (apps/*/app.json)');
  if (problems.length) throw new Error('\n  - ' + problems.join('\n  - '));
  return apps.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

/** One card. The icon comes from our own repo (trusted markup); every other field is escaped. */
function card(a) {
  const ver = (a.versionLabel ? a.versionLabel + ' ' : 'v') + a.version;
  const feats = a.features.length ? `\n        <ul class="feat">${a.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : '';
  return `      <li><article class="card">
        <div class="head"><div class="glyph">${a.icon}</div><div class="chips"><span class="chip ${a.status}">${esc(a.status)}</span><span class="chip">${esc(ver)}</span></div></div>
        <h3><a href="/${a.slug}/">${esc(a.name)}</a></h3>
        <p class="sum">${esc(a.summary)}</p>${feats}
        <span class="go" aria-hidden="true">Open</span>
      </article></li>`;
}

/** Short commit and date for the homepage, from CI or the local checkout. */
function buildInfo() {
  let sha = (process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7);
  if (!sha) { try { sha = execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { sha = 'local'; } }
  const date = new Date().toISOString().slice(0, 10);
  return { sha, date };
}

async function main() {
  const minify = !process.argv.includes('--no-minify');
  const { minify: htmlMinify } = minify ? require('html-minifier-terser') : { minify: null };
  const tokens = fs.readFileSync(path.join(BRAND, 'tokens.css'), 'utf8');
  const apps = loadApps();

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'brand'), { recursive: true });

  const report = [];
  for (const a of apps) {
    const html = fs.readFileSync(a.entry, 'utf8');
    const out = minify ? await htmlMinify(protectData(html), MINIFY) : html;
    fs.mkdirSync(path.join(OUT, a.slug), { recursive: true });
    fs.writeFileSync(path.join(OUT, a.slug, 'index.html'), out);
    report.push(`${a.slug} ${a.version}: ${(html.length / 1024).toFixed(0)} KB -> ${(out.length / 1024).toFixed(0)} KB`);
  }

  const info = buildInfo();
  const tools = apps.filter((a) => a.status !== 'frozen');
  const archive = apps.filter((a) => a.status === 'frozen');
  const meta = `${apps.length} tools · build ${info.sha} · ${info.date}`;
  let home = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8')
    .replace('/*__TOKENS__*/', () => tokens)
    .replace('{{META}}', () => esc(meta))
    .replace('{{CARDS}}', () => tools.map(card).join('\n'))
    .replace('{{ARCHIVE}}', () => archive.map(card).join('\n'));
  if (!archive.length) home = home.replace(/<section class="archive"[\s\S]*?<\/section>/, '');
  const notFound = fs.readFileSync(path.join(SRC, '404.html'), 'utf8').replace('/*__TOKENS__*/', () => tokens);
  fs.writeFileSync(path.join(OUT, 'index.html'), minify ? await htmlMinify(home, MINIFY) : home);
  fs.writeFileSync(path.join(OUT, '404.html'), minify ? await htmlMinify(notFound, MINIFY) : notFound);

  for (const f of fs.readdirSync(path.join(BRAND, 'assets'))) {
    if (f.endsWith('.svg')) fs.copyFileSync(path.join(BRAND, 'assets', f), path.join(OUT, 'brand', f));
  }

  console.log(`site/ built (${minify ? 'minified' : 'not minified'}), ${meta}\n  ${report.join('\n  ')}`);
}

if (require.main === module) {
  main().catch((e) => { console.error(`site build failed: ${e.message}`); process.exit(1); });
}

module.exports = { loadApps, protectData, MINIFY };
