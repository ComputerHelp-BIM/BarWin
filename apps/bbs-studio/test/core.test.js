/**
 * Logic tests for the BBS Studio core (no browser). The core is assembled from src/core/*.js the same way the page is,
 * so these run straight from the sources, before any build.
 * Run: npm test
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { assemble } = require('../../../scripts/build.js');

/** The core as Node sees it: the assembled script run with a module object, so it exports its API. */
function loadCore() {
  const src = assemble(path.join(__dirname, '..', 'src', 'core.js'));
  const mod = { exports: {} };
  new Function('module', 'exports', src).call(globalThis, mod, mod.exports);
  return mod.exports;
}
const BBS = loadCore();
const project = (standard) => Object.assign(BBS.newProject(), { standard });

test('core loads and carries a semantic version', () => {
  assert.match(BBS.VERSION, /^\d+\.\d+\.\d+$/);
  assert.equal(typeof BBS.compute, 'function');
});

// Seven rows of a CADS RC bar schedule (BS 8666), as listed on the shape-code reference sheet: same inputs, same lengths.
const CADS_RC = [
  { code: '11', d: 25, dims: { A: 900, B: 1350 }, len: 2200 },
  { code: '21', d: 12, dims: { A: 800, B: 250, C: 800 }, len: 1825 },
  { code: '22', d: 10, dims: { A: 130, B: 1315, C: 60, D: 120 }, len: 1575 },
  { code: '26', d: 25, dims: { A: 4000, B: 600, C: 1400, D: 60 }, len: 6000 },
  { code: '31', d: 10, dims: { A: 600, B: 1315, C: 615, D: 900 }, len: 3375 },
  { code: '46', d: 16, dims: { A: 1175, B: 500, C: 2650, D: 50, E: 1175 }, len: 6000 },
  { code: '51', d: 10, dims: { A: 1055, B: 1040, C: 130, D: 130 }, len: 4350 }
];
test('BS 8666 cut lengths match the CADS RC schedule rows', () => {
  const p = project('BS');
  for (const r of CADS_RC) assert.equal(BBS.shapeLength(p, r.code, r.dims, r.d), r.len, `shape ${r.code}`);
});

test('BS lengths round up to 25 mm, IS lengths to 5 mm', () => {
  const dims = { A: 1003 };
  assert.equal(BBS.shapeLength(project('BS'), '00', dims, 12), 1025);
  assert.equal(BBS.shapeLength(project('IS'), '00', dims, 12), 1005);
});

/**
 * A made-up sheet in the layout of the user's "COLUMN STEEL QTY" workbook: rows of cell values, 0-based columns.
 * Column J (9) says "Member" where a block starts; the next row has no., height, length, width (J to M);
 * bar rows have the description in C (2), shape code in D (3), per-set count J (9), bars K (10), spacing L (11), size M (12).
 */
function sampleBook() {
  const row = (cells) => { const r = []; for (const [c, v] of Object.entries(cells)) r[+c] = v; return r; };
  const sheet = [
    row({ 9: 'Sample Consultants', 26: 3000 }), row({ 9: 'Sample Client', 26: 3000 }), row({ 9: 'Sample Tower', 26: 3200 }), row({ 9: 'Walls, level 1 to 2' }),
    row({ 1: 'SW1', 9: 'Member' }), row({ 9: 2, 10: 3000, 11: 1500, 12: 230 }),
    row({ 2: 'Vertical bars', 3: '26', 10: 12, 12: 16 }),
    row({ 2: 'Box ring', 3: '51', 9: 1, 11: 150, 12: 8, 15: 1400 }),
    row({ 2: 'General hook', 3: '99', 9: 4, 11: 300, 12: 8 }),
    row({ 13: 'Total steel (kg)', 22: 412.5 }),
    row({ 1: 'SW2', 9: 'Member' }), row({ 9: 1, 10: 3000, 11: 2000, 12: 230 }),
    row({ 2: 'Vertical bars', 3: '26', 10: 16, 12: 12 }),
    row({ 13: 'Total steel (kg)', 22: 300 })
  ];
  const formula = [];
  formula[2] = row({ 4: 'LAP', 5: 50 }); formula[3] = row({ 4: 'HOOK', 5: 10 }); formula[4] = row({ 4: 'COL COVER', 5: 40 });
  return { FORMULA: formula, 'LEVEL 1': sheet };
}
test('workbook import reads members, bars, rules and the sheet’s own total', () => {
  const res = BBS.importColumnBook(sampleBook());
  assert.equal(res.found, true);
  assert.equal(res.levels.length, 1);
  const [sw1, sw2] = res.levels[0].members;
  assert.equal(sw1.mark, 'SW1'); assert.equal(sw1.qty, 2); assert.equal(sw1.L, 1500); assert.equal(sw1.W, 230);
  assert.deepEqual(sw1.vert.map((v) => [v.n, v.dia]), [[12, 16]]);
  assert.deepEqual(sw1.links.map((l) => [l.type, l.dia, l.spc]), [['box', 8, 150], ['gen', 8, 300]]);
  assert.equal(sw2.mark, 'SW2'); assert.deepEqual(sw2.vert.map((v) => [v.n, v.dia]), [[16, 12]]);
  assert.equal(res.rules.lap, 50); assert.equal(res.rules.hook, 10); assert.equal(res.rules.cover, 40);
  assert.equal(res.workbookKg, 712.5, 'the sheet’s totals are summed, to check the engine against');
  assert.equal(res.meta.project, 'Sample Tower');
});

test('an imported project computes: every bar row has a mark, a length and a weight', () => {
  const res = BBS.importColumnBook(sampleBook());
  const p = BBS.newProject(); p.levels = res.levels; p.rules.wall = Object.assign(BBS.wallRules(), res.rules);   // as the page does on import
  BBS.normalise(p);
  const out = BBS.compute(p);
  assert.ok(out.rows.length > 0);
  for (const r of out.rows) {
    assert.match(String(r.mark), /^\d{2}$/);
    assert.ok(r.len > 0 && r.wt > 0, `row ${r.mark}: length ${r.len}, weight ${r.wt}`);
  }
  const total = out.rows.reduce((a, r) => a + r.wt, 0);
  assert.ok(Math.abs(total - out.total.wt) < 0.5, `row weights ${total} add up to the total ${out.total.wt}`);
});
