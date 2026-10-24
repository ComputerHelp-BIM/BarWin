#!/usr/bin/env node
/**
 * Build every app that has a "build" section in its app.json.
 *
 * An app's page is kept as small source files and assembled into one self-contained page:
 *   src/index.html   the shell: the page with  @@include <path>@@  lines where the pieces go
 *   src/...          the pieces (styles, markup, data templates, script sections)
 * An include line is replaced by the file's text exactly, its own line included, so the pieces join byte for byte.
 * Paths are relative to the file doing the including; a * in the file name takes every match, sorted by name
 * (number the files 00-, 10-, ... to set the order). Pieces may include pieces.
 *
 * app.json "build":
 *   "outputs": { "dist/<page>.html": "src/index.html", ... }   each output and the shell it is assembled from
 *   "svgs":    "src/beams.js"                                  (beam apps) also write the default-value SVG drawings
 *
 * Script sections share one scope: they are the parts of one script, split by topic for reading and editing,
 * not separate modules. Keep each section's top-level names unique.
 *
 * Usage: node scripts/build.js [app ...]     (no names: every app with a build section)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APPS = path.join(ROOT, 'apps');
const INCLUDE = /^[ \t]*@@include[ \t]+(\S+)[ \t]*@@[ \t]*\r?$/;
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n';

/** Files named by an include pattern, relative to dir; a * in the last segment matches any characters. Sorted by name. */
function resolve(dir, pattern) {
  const full = path.resolve(dir, pattern);
  if (!pattern.includes('*')) return [full];
  const base = path.dirname(full), re = new RegExp('^' + path.basename(full).split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base).filter((f) => re.test(f)).sort().map((f) => path.join(base, f));
}

/** The text of file, with every include line replaced by the included files' text (recursively). */
function assemble(file, seen = []) {
  if (seen.includes(file)) throw new Error('include loop: ' + seen.concat(file).map((f) => path.relative(ROOT, f)).join(' -> '));
  if (!fs.existsSync(file)) throw new Error('missing file ' + path.relative(ROOT, file) + (seen.length ? ' (included from ' + path.relative(ROOT, seen[seen.length - 1]) + ')' : ''));
  const text = fs.readFileSync(file, 'utf8'), out = [];
  // split keeping each line's own newline, so the output keeps the exact line endings of every piece
  const lines = text.match(/[^\n]*\n|[^\n]+$/g) || [];
  for (const ln of lines) {
    const m = INCLUDE.exec(ln.replace(/\n$/, ''));
    if (!m) { out.push(ln); continue; }
    const files = resolve(path.dirname(file), m[1]);
    if (!files.length) throw new Error('no file matches @@include ' + m[1] + '@@ in ' + path.relative(ROOT, file));
    for (const f of files) out.push(assemble(f, seen.concat(file)));
  }
  return out.join('');
}

/** Builds one app; returns a line for the report. */
function buildApp(slug) {
  const dir = path.join(APPS, slug), manifest = JSON.parse(fs.readFileSync(path.join(dir, 'app.json'), 'utf8')), b = manifest.build;
  if (!b || !b.outputs) throw new Error(slug + ': app.json has no build.outputs');
  const done = [];
  for (const [out, shell] of Object.entries(b.outputs)) {
    const target = path.join(dir, out);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, assemble(path.join(dir, shell)));
    done.push(out + ' (' + fs.statSync(target).size + ' B)');
  }
  if (b.svgs) {
    // the beam drawing module: also write the drawings at the default values, as standalone SVG files
    const mod = path.join(dir, b.svgs);
    delete require.cache[require.resolve(mod)];
    const B = require(mod), dist = path.join(dir, 'dist');
    fs.mkdirSync(dist, { recursive: true });
    fs.writeFileSync(path.join(dist, 'beam-l-section.svg'), XML_HEAD + B.lSection(B.DEFAULTS, { style: B.EXPORT_CSS }) + '\n');
    for (const k of ['A', 'B', 'C']) {
      const l = k.toLowerCase();
      fs.writeFileSync(path.join(dist, 'beam-section-' + l + '-' + l + '.svg'), XML_HEAD + B.xSection(B.DEFAULTS, { style: B.EXPORT_CSS, letter: k }) + '\n');
    }
    done.push('4 SVGs');
  }
  return slug + ': ' + done.join(', ');
}

function appsWithBuild() {
  return fs.readdirSync(APPS).filter((d) => {
    const f = path.join(APPS, d, 'app.json');
    return fs.existsSync(f) && JSON.parse(fs.readFileSync(f, 'utf8')).build;
  }).sort();
}

if (require.main === module) {
  try {
    const names = process.argv.slice(2);
    for (const slug of names.length ? names : appsWithBuild()) console.log(buildApp(slug));
  } catch (e) {
    console.error('build failed: ' + e.message);
    process.exit(1);
  }
}

module.exports = { assemble, buildApp, appsWithBuild };
