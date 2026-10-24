// The true-scale sheet (BACKLOG C1): real geometry, layout on paper, and the DXF it makes. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const B = require('../src/beams.js');
const S = require('../src/sheet.js');
const C = require('../../../packages/cad/cad.js');
const { checkDXF } = require('../../../packages/cad/test/dxf-check.js');

const TPL = fs.readFileSync(path.resolve(__dirname, '../../../packages/cad/template.dxf'), 'utf8');
const V = (o) => Object.assign({}, B.DEFAULTS, o || {});
const of = (ents, l, t) => ents.filter((e) => e.l === l && (!t || e.t === t));
const dimValues = (ents, s) => ents.filter((e) => e.t === 'dim').map((e) => C.dimGeometry(e, s).value);

test('L-section: true geometry, every real link, bars at their real centres', () => {
  const v = V(), L = S.lsection(v, 25), lines = of(L.ents, 'FRAMING', 'line');
  assert.ok(lines.some((e) => e.p[0][0] === 0 && e.p[1][0] === v.span && e.p[0][1] === 0), 'soffit runs the clear span');
  assert.ok(lines.some((e) => e.p[0][1] === v.D && e.p[1][1] === v.D && e.p[1][0] === v.span), 'top at the real depth');
  assert.equal(of(L.ents, 'STIRRUPS', 'line').length, B.linkLayout(v).total, 'one line per link');
  const yt = v.D - v.ctop - v.ldia - Math.max(v.topDia, v.LtDia, v.RtDia) / 2;
  assert.ok(of(L.ents, 'BEAM R', 'poly').some((e) => e.p.some((q) => Math.abs(q[1] - yt) < 1e-6)), 'a top bar on its real centre line');
});

test('L-section: a bent leg is drawn its real length, and dimensioned', () => {
  const v = V({ Lanch: 'bend', LxN: 0, RxN: 0 }), L = S.lsection(v, 25), bl = B.bendLeg(v, 'L', v.topDia);
  const yt = v.D - v.ctop - v.ldia - v.topDia / 2;
  assert.ok(of(L.ents, 'BEAM R', 'poly').some((e) => e.p.some((q) => Math.abs(q[1] - (yt - bl.leg)) < 1e-6)), 'leg reaches ' + bl.leg + ' below the bar');
  assert.ok(dimValues(L.ents, 25).includes(String(bl.leg)), 'leg dimension');
});

test('L-section dimensions measure the real sizes', () => {
  const v = V(), L = S.lsection(v, 25), vals = dimValues(L.ents, 25);
  ['5000', '6200', '900', '300', 'LD 800'].forEach((t) => assert.ok(vals.includes(t), t));
  const z = B.linkLayout(v).zones;
  assert.ok(vals.includes(String(Math.round(z[0].to))), 'end zone length from the face');
});

test('Labels off leaves the geometry and drops the notes', () => {
  const on = S.lsection(V(), 25), off = S.lsection(V({ showLabels: false }), 25);
  assert.ok(of(off.ents, 'TEXT', 'text').length < of(on.ents, 'TEXT', 'text').length);
  assert.equal(of(off.ents, 'STIRRUPS').length, of(on.ents, 'STIRRUPS').length);
});

test('section: every bar a dot of its real size, closed link with true arcs, covers dimensioned', () => {
  const v = V({ legs: 4, topN: 4, botN: 4 }), x = S.xsection(v, 'B', 10);
  const mm = B.cutX(v, 'B') * v.span / 5000, TL = B.topLayers(v, B.extrasAt(v, 'B'), B.mainsAt(v, mm)), BL = B.botLayersAt(v, mm);
  const dots = of(x.ents, 'BEAM R', 'circle').filter((e) => e.fill);
  assert.equal(dots.length, TL.row1.length + TL.row2.length + BL.row1.length + BL.row2.length + 2 * v.faceN);
  assert.ok(dots.some((d) => d.r === 25 / 2), 'an extra T25 drawn 25 across');
  const links = of(x.ents, 'STIRRUPS', 'poly');
  assert.equal(links.length, 2, 'closed link and one inner U for 4 legs');
  assert.ok(links[0].p.filter((q) => q[2]).length >= 5, 'corners and hooks as arcs');
  ['300', '900', String(v.ctop), String(v.cbot), String(v.cside)].forEach((t) => assert.ok(dimValues(x.ents, 10).includes(t), t));
});

test('sheet: auto scales on A3 put the sections beside the L-section, whole (no break); nothing to warn about', () => {
  const r = S.buildSheet(V(), { paper: 'A3' });
  assert.deepEqual([r.scaleL, r.scaleS, r.arrangement, r.broken, r.issues.length], [40, 15, 'beside', false, 0]);
  const r1 = S.buildSheet(V(), { paper: 'A1' });
  assert.ok(r1.scaleL <= 15 && r1.scaleS <= r1.scaleL && !r1.issues.length);
});

test('sheet: every view fits its viewport, and views never overlap in model space', () => {
  const r = S.buildSheet(V(), { paper: 'A2' });
  const P = r.sheet.paper, area = C.titleBlock(P, {}, S.autoNotes(V())).area;
  r.sheet.views.forEach((v) => v.parts.forEach((p) => {
    const w = (p.win.x1 - p.win.x0) / v.scale, h = (p.win.y1 - p.win.y0) / v.scale;
    assert.ok(p.at.x >= area.x0 - 1e-6 && p.at.x + w <= area.x1 + 1e-6 && p.at.y >= area.y0 - 1e-6 && p.at.y + h <= area.y1 + 1e-6, `${v.id} inside the drawing area`);
  }));
  const L = r.sheet.views[0].parts[0].win;
  r.sheet.views.slice(1).forEach((v) => assert.ok(v.parts[0].win.y1 < L.y0, `${v.id} below the L-section in model space`));
});

test('sheet: a long beam gets a break line when allowed, an alert when not, and always a drawing', () => {
  const v = V({ span: 12000, lEnd: 3000 });
  const r = S.buildSheet(v, { paper: 'A2', scaleL: '20' });
  assert.equal(r.broken, true); assert.ok(r.sheet.views[0].parts.length >= 2);
  assert.ok(r.issues.some((t) => /break line/.test(t)) && !r.issues.some((t) => /does not fit/.test(t)));
  const n = S.buildSheet(v, { paper: 'A2', scaleL: '20', brk: false });
  assert.equal(n.broken, false); assert.ok(n.issues.some((t) => /does not fit/.test(t)));
  const a4 = S.buildSheet(V(), { paper: 'A4' });
  assert.ok(a4.issues.length && a4.sheet.views.length === 4, 'too small a sheet still draws, with an alert');
});

test('sheet: the DXF is well formed, with a viewport per view part and the title block on paper', () => {
  const r = S.buildSheet(V({ span: 9000, lEnd: 2000 }), { paper: 'A3', fields: { firm: 'Example firm', project: 'Sample' } });
  const dxf = C.toDXF(r.sheet, TPL), k = checkDXF(dxf);
  const parts = r.sheet.views.reduce((a, v) => a + v.parts.length, 0);
  assert.equal(k.count.VIEWPORT, parts + 1);
  assert.ok(k.count.DIMENSION > 20);
  assert.ok(dxf.includes('EXAMPLE FIRM') && dxf.includes('L-SEC 1:' + r.scaleL));
});

test('sheet notes come from the values', () => {
  const n = S.autoNotes(V({ ctop: 30, lapF: 60, legMin: 'is' })).join(' ');
  assert.match(n, /top 30/); assert.match(n, /Lap length 60 x bar size/); assert.match(n, /8 X BAR SIZE/i);
});
