#!/usr/bin/env node
/**
 * Build a beam drawing app into its dist/ folder.
 *
 * Both beam apps (apps/beam-sections and apps/ss-beam-geometry) share one layout:
 *   src/beams.js   the drawing module (UMD; used by the page and by Node)
 *   src/page.html  the page shell, with a  /*__BEAMS__*\/  placeholder where beams.js is inlined
 *
 * Output (dist/ is git-ignored; rebuild any time):
 *   <app>.html                      one self-contained page, opens straight from disk
 *   beam-l-section.svg              the L-section at the default values
 *   beam-section-{a,b,c}-{a,b,c}.svg the three cross-sections at the default values
 *
 * Usage: node scripts/build-beams.js <app-dir> [<app-dir> ...]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PLACEHOLDER = '/*__BEAMS__*/';
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n';

/** Builds one app and returns the list of files written with their sizes. */
function buildApp(appDir) {
  const dir = path.resolve(appDir);
  const name = path.basename(dir);
  const src = path.join(dir, 'src');
  const out = path.join(dir, 'dist');
  const modFile = path.join(src, 'beams.js');
  const pageFile = path.join(src, 'page.html');

  for (const f of [modFile, pageFile]) {
    if (!fs.existsSync(f)) throw new Error(`${name}: missing ${path.relative(process.cwd(), f)}`);
  }
  const shell = fs.readFileSync(pageFile, 'utf8');
  if (!shell.includes(PLACEHOLDER)) throw new Error(`${name}: page.html has no ${PLACEHOLDER} placeholder`);

  // Load the module fresh, so building two apps in one run never shares a cached copy.
  delete require.cache[require.resolve(modFile)];
  const B = require(modFile);

  fs.mkdirSync(out, { recursive: true });
  const written = [];
  const write = (file, text) => { fs.writeFileSync(path.join(out, file), text); written.push(file); };

  // A replacer function, so "$" sequences in the module are never read as replacement patterns.
  write(`${name}.html`, shell.replace(PLACEHOLDER, () => fs.readFileSync(modFile, 'utf8')));
  write('beam-l-section.svg', XML_HEAD + B.lSection(B.DEFAULTS, { style: B.EXPORT_CSS }) + '\n');
  for (const k of ['A', 'B', 'C']) {
    const l = k.toLowerCase();
    write(`beam-section-${l}-${l}.svg`, XML_HEAD + B.xSection(B.DEFAULTS, { style: B.EXPORT_CSS, letter: k }) + '\n');
  }
  return { name, version: B.VERSION, out, files: written.map((f) => `${f} (${fs.statSync(path.join(out, f)).size} B)`) };
}

if (require.main === module) {
  const dirs = process.argv.slice(2);
  if (!dirs.length) {
    console.error('Usage: node scripts/build-beams.js <app-dir> [<app-dir> ...]');
    process.exit(2);
  }
  try {
    for (const d of dirs) {
      const r = buildApp(d);
      console.log(`${r.name} v${r.version} -> ${path.relative(process.cwd(), r.out)}: ${r.files.join(', ')}`);
    }
  } catch (e) {
    console.error(`build failed: ${e.message}`);
    process.exit(1);
  }
}

module.exports = { buildApp };
