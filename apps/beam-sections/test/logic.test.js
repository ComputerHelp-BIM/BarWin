/**
 * Logic tests for the Beam Sections drawing module (no browser needed).
 * Run: npm test   (or: node --test apps/beam-sections/test/*.test.js)
 *
 * Each test pins a rule the user agreed on; the comment names the rule.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const B = require('../src/beams.js');

/** A fresh copy of the defaults with some values changed. */
const vals = (over = {}) => Object.assign({}, B.DEFAULTS, over);
const bars = (n, dia) => Array.from({ length: n }, () => ({ dia, x: false }));

test('version is semantic (major.minor.patch)', () => {
  assert.match(B.VERSION, /^\d+\.\d+\.\d+$/);
});

test('links: first and last link sit lStart from the faces, in order, inside the span', () => {
  for (const lStart of [25, 50, 100]) {
    const v = vals({ lStart });
    const { pos } = B.linkLayout(v);
    assert.equal(pos[0], lStart);
    assert.ok(Math.abs(pos[pos.length - 1] - (v.span - lStart)) < 1e-6);
    for (let i = 1; i < pos.length; i++) assert.ok(pos[i] > pos[i - 1], `link ${i} out of order`);
  }
});

test('links: 5000 span, 1800 ends @ 100, mid @ 150 gives 19 + 9 + 19 = 47 links', () => {
  const L = B.linkLayout(vals({ lmode: 'three', span: 5000, lEnd: 1800, lsEnd: 100, lsMid: 150, lStart: 50 }));
  assert.equal(L.pos.length, 47);
  assert.equal(L.total, 47);
});

test('links: no gap is ever wider than its zone spacing', () => {
  for (const lmode of ['single', 'three', 'two', 'd2', 'l3', 'pct']) {
    const L = B.linkLayout(vals({ lmode }));
    for (const z of L.zones) {
      const typed = vals()[z.k];
      if (z.pitch && typed) assert.ok(z.pitch <= typed + 1e-6, `${lmode} ${z.k}: pitch ${z.pitch} > ${typed}`);
    }
  }
});

test('links: 2D ends reaching the span become one spacing (whole), never an error', () => {
  const v = vals({ lmode: 'd2', span: 3000, D: 900 });   // 2D + 2D = 3600 > 3000
  assert.equal(B.layoutMode(v), 'whole');
  assert.ok(B.linkLayout(v).pos.length > 2);
});

test('laps: lap length = lapF x the smaller bar; no lap when an end matches mid', () => {
  const diff = B.barChange(vals({ LtSame: false, LtN: 3, LtDia: 20, topDia: 16 }), 't', 'L');
  assert.equal(diff.ch, 'dia');
  assert.equal(diff.lap, 50 * Math.min(diff.z.d, diff.M.d));
  const same = B.barChange(vals(), 't', 'L');
  assert.equal(same.ch, 'none');
  assert.equal(same.lap, 0);
});

test('layers: Auto moves extras to layer 2 quietly; a chosen Layer 1 that does not fit is bumped and flagged', () => {
  const v = vals({ B: 230 });
  const auto = B.arrange(v, bars(3, 25), [], bars(3, 25), []);
  assert.equal(auto.second, true);
  assert.equal(auto.bumped, false, 'Auto must never raise the layer alert');

  const forced = B.arrange(v, bars(3, 25), bars(3, 25), [], []);
  assert.equal(forced.second, true);
  assert.equal(forced.bumped, true, 'Layer 1 chosen but too tight must be flagged');
});

test('layers: extras that fit stay in layer 1', () => {
  const r = B.arrange(vals({ B: 600 }), bars(3, 16), [], bars(2, 16), []);
  assert.equal(r.second, false);
  assert.equal(r.row1.length, 5);
});

test('spacer bars: at least two per run, never under 25, never wider apart than spcS', () => {
  const s = B.spacers(vals({ spcS: 1000 }), 0, 4200, 16);
  assert.ok(s.at.length >= 2);
  assert.equal(s.dia, 25);
  for (let i = 1; i < s.at.length; i++) assert.ok(s.at[i] - s.at[i - 1] <= 1000 + 1e-6);
  assert.equal(B.spacers(vals(), 0, 300, 32).dia, 32);
});

test('drawing: the L-section and the three sections render as SVG', () => {
  const v = vals();
  assert.match(B.lSection(v), /^<svg[\s\S]*<\/svg>$/);
  for (const letter of ['A', 'B', 'C']) assert.match(B.xSection(v, { letter }), /^<svg[\s\S]*<\/svg>$/);
});

test('drawing: the Labels switch removes bar labels but keeps geometry', () => {
  const count = (s) => (s.match(/<text/g) || []).length;
  const on = B.lSection(vals({ showLabels: true }));
  const off = B.lSection(vals({ showLabels: false }));
  assert.ok(count(off) < count(on), 'fewer text elements with labels off');
  assert.match(off, /L-SECTION/, 'the title stays');
});

test('freeze probe: every link mode over a range of spans draws quickly and without errors', () => {
  const slow = [];
  for (const lmode of ['single', 'three', 'two', 'd2', 'l3', 'pct']) {
    for (const span of [1000, 2500, 5000, 7000]) {
      for (let e = 50; e <= span; e += 250) {
        for (const [a, b] of [[100, 150], [100, 100], [75, 200]]) {
          const v = vals({ lmode, span, lEnd: e, lLeft: e, lsEnd: a, lsMid: b, lsL: a, lsR: b,
            lPct: Math.max(1, Math.min(50, Math.round((100 * e) / span))), lStart: [25, 50, 100][e % 3] });
          const t = Date.now();
          B.lSection(v);
          const dt = Date.now() - t;
          if (dt > 250) slow.push(`${lmode} span ${span} end ${e} @${a}/${b}: ${dt} ms`);
        }
      }
    }
  }
  assert.deepEqual(slow, []);
});

test('bent leg minimum (A7): IS 456 8 x bar, BS 8666 Table 2 P, 12 x, 10 x', () => {
  assert.equal(B.legMin(vals({ legMin: 'is' }), 16).min, 128);
  assert.equal(B.legMin(vals({ legMin: 'bs' }), 16).min, 130);   // BS 8666 Table 2
  assert.equal(B.legMin(vals({ legMin: 'bs' }), 20).min, 190);
  assert.equal(B.legMin(vals({ legMin: 'bs' }), 25).min, 240);
  assert.equal(B.legMin(vals({ legMin: '12d' }), 16).min, 192);
  assert.equal(B.legMin(vals({ legMin: '10d' }), 16).min, 160);
  assert.equal(B.legMin(vals(), 16).min, 192, 'default stays 12 x bar size');
});

test('bent leg: Ld less the straight run, lengthened to the minimum when shorter', () => {
  // 900 column, cover 40: run 860; Ld 50 x 16 = 800 < run, so a forced bend has only the minimum leg
  const v = vals({ Lanch: 'bend', legMin: '12d' });
  const bl = B.bendLeg(v, 'L', 16);
  assert.equal(bl.run, 860);
  assert.equal(bl.leg, 192);
  assert.equal(bl.minRules, true);
  // a 300 column: run 260, Ld 800, leg 540 (the minimum does not govern)
  const bl2 = B.bendLeg(vals({ LcolW: 300, Lanch: 'bend' }), 'L', 16);
  assert.equal(bl2.leg, 540);
  assert.equal(bl2.minRules, false);
});

test('L-section (A1-A4): laps and cut-offs sit outside the beam, extras get their own leg and note', () => {
  const v = vals({ LtSame: false, LtN: 3, LtDia: 20, LxN: 2, LxDia: 25, bxN: 3, LbSame: false, LbN: 2, LbDia: 20 });
  const svg = B.lSection(v);
  // every "LAP" or "CUT-OFF" label is above the beam top (y < 0) or below its soffit (y > 900)
  const re = /<text[^>]*y="(-?[\d.]+)"[^>]*>([^<]*(?:LAP \d|CUT-OFF)[^<]*)<\/text>/g;
  let m, n = 0;
  while ((m = re.exec(svg))) { n++; const y = +m[1]; assert.ok(y < 0 || y > 900, `"${m[2]}" at y=${y} is inside the beam`); }
  assert.ok(n >= 3, 'laps and cut-offs are labelled');
  assert.match(svg, /EXTRA  LD 1250/, 'the extra bars have their own Ld note in the support caption');
});
