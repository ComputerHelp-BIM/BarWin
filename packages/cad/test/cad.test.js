// BarWin CAD sheets: the writers and the template. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../cad.js');
const { checkDXF } = require('./dxf-check.js');

const DIR = path.resolve(__dirname, '..');
const TPL = fs.readFileSync(path.join(DIR, 'template.dxf'), 'utf8');

/** A small sheet with one of everything, at two scales. */
function sample(paperName) {
  const p = C.paper(paperName || 'A3');
  const tb = C.titleBlock(p, { firm: 'Example firm', project: 'Sample project', title: 'Test sheet', drawingNo: 'T-1', rev: 'A', date: '01-01-2026', scale: '1:25' }, ['First note.', 'Second note.']);
  const beam = [
    { t: 'poly', l: 'FRAMING', closed: true, p: [[0, 0], [4000, 0], [4000, 500], [0, 500]] },
    { t: 'line', l: 'BEAM R', p: [[40, 40], [3960, 40]] },
    { t: 'poly', l: 'BEAM R', p: [[40, 460], [3900, 460, -0.4142], [3960, 400], [3960, 300]] },
    { t: 'poly', l: 'COVERS', closed: true, p: [[25, 25], [3975, 25], [3975, 475], [25, 475]] },
    { t: 'dim', l: 'FRAMING', p1: [0, 500], p2: [4000, 500], dir: 'h', at: 700 },
    { t: 'dim', l: 'FRAMING', p1: [4000, 0], p2: [4000, 500], dir: 'v', at: 4200, text: 'D <>' },
    { t: 'text', l: 'TEXT', p: [2000, 550], h: 2.5, s: '3-T16 TOP Ø16 ±5 90°', al: 'c' }
  ];
  const sec = [
    { t: 'poly', l: 'FRAMING', closed: true, p: [[0, -2000], [300, -2000], [300, -1500], [0, -1500]] },
    { t: 'circle', l: 'BEAM R', c: [50, -1950], r: 8, fill: true },
    { t: 'circle', l: 'STIRRUPS', c: [150, -1750], r: 30 },
    { t: 'arc', l: 'STIRRUPS', c: [150, -1750], r: 50, a0: 0, a1: 135 },
    { t: 'dim', l: 'FRAMING', p1: [0, -1950], p2: [25, -1950], dir: 'h', at: -2100, side: 'l' }
  ];
  return {
    paper: p, meta: { title: 'Test (sheet)', app: 'test' }, ents: tb.ents,
    views: [
      { id: 'L', scale: 25, ents: beam, parts: [{ win: { x0: -200, y0: -200, x1: 2000, y1: 900 }, at: { x: 30, y: 150 } }, { win: { x0: 3000, y0: -200, x1: 4400, y1: 900 }, at: { x: 130, y: 150 } }] },
      { id: 'A', scale: 10, ents: sec, parts: [{ win: { x0: -100, y0: -2200, x1: 400, y1: -1400 }, at: { x: 250, y: 90 } }] }
    ]
  };
}

test('cad.js keeps the same layers, scales and sizes as layers.json', () => {
  const json = JSON.parse(fs.readFileSync(path.join(DIR, 'layers.json'), 'utf8'));
  delete json._about;
  assert.deepEqual(JSON.parse(JSON.stringify(C.SPEC)), json);
});

test('the template holds every layer, dimension style and insert point', () => {
  for (const name of Object.keys(C.SPEC.layers)) assert.match(TPL, new RegExp('\\n  2\\n' + name + '\\n'), `layer ${name}`);
  for (const s of C.SPEC.scales) assert.match(TPL, new RegExp('\\n  2\\nBARWIN-' + s + '\\n'), `dimension style BARWIN-${s}`);
  for (const t of ['{{BLOCK_RECORDS}}', '{{BLOCKS}}', '{{ENTITIES}}', '{{HANDSEED}}', '{{PW}}', '{{PH}}', '{{PW2}}', '{{PH2}}', '{{MEDIA}}']) assert.ok(TPL.includes(t), t);
  assert.match(TPL, /\nAC1024\n/, 'AutoCAD 2010 format');
  const info = C.templateInfo(TPL);
  assert.ok(info.ms && info.ps && info.brTable && info.ms !== info.ps);
  assert.ok(info.maxHandle > 0 && info.maxHandle < 0x1000);
});

test('DXF: well formed, one viewport per view part, one block per dimension, every paper size', () => {
  for (const name of Object.keys(C.SPEC.paper)) {
    const s = sample(name), dxf = C.toDXF(s, TPL), r = checkDXF(dxf);
    assert.equal(r.count.VIEWPORT, 1 + 3, `${name}: the main viewport and three view parts`);
    assert.equal(r.count.DIMENSION, 3);
    assert.equal(r.dimBlocks.length, 3);
    const p = s.paper;
    assert.ok(dxf.includes('ISO_full_bleed_' + name + '_(' + p.w.toFixed(2) + '_x_' + p.h.toFixed(2) + '_MM)'), `${name} media name`);
    assert.match(dxf, new RegExp('\\n 44\\n' + p.w + '\\n 45\\n' + p.h + '\\n'), `${name} plot paper size`);
  }
});

test('DXF: text control codes, scaled text, dimension styles by scale', () => {
  const dxf = C.toDXF(sample(), TPL);
  assert.ok(dxf.includes('3-T16 TOP %%c16 %%p5 90%%d'), 'Ø ± ° as CAD codes');
  assert.match(dxf, /\n 40\n62\.5\n/, '2.5 mm text at 1:25 is 62.5 high in model space');
  assert.match(dxf, /\n  3\nBARWIN-25\n/);
  assert.match(dxf, /\n  3\nBARWIN-10\n/);
  assert.match(dxf, /\n  1\nD <>\n/, 'text override keeps <> for the measured value');
  assert.match(dxf, /\n 90\n16384\n/, 'viewports locked');
});

test('dimension geometry: the value, arrows outside a narrow dimension, text turned for a vertical one', () => {
  const g = C.dimGeometry({ p1: [0, 0], p2: [4000, 0], dir: 'h', at: 300 }, 25);
  assert.equal(g.value, '4000'); assert.equal(g.moved, false); assert.equal(g.arrows.length, 2);
  assert.equal(g.text.p[1], 300 + C.SPEC.dim.gap * 25);
  const n = C.dimGeometry({ p1: [0, 0], p2: [25, 0], dir: 'h', at: -100, side: 'l' }, 10);
  assert.equal(n.moved, true); assert.ok(n.text.p[0] < 0, 'text moved to the left');
  assert.ok(n.arrows[0][1][0] < 0, 'arrows outside, pointing in');
  const v = C.dimGeometry({ p1: [0, 0], p2: [0, 900], dir: 'v', at: 200, text: 'D <>' }, 20);
  assert.equal(v.text.rot, 90); assert.equal(v.value, 'D 900');
});

test('bulge arcs: a quarter circle has the right centre and radius', () => {
  const a = C.bulgeArc([0, 0], [100, 100], Math.tan(Math.PI / 8));
  assert.ok(Math.abs(a.r - 100) < 1e-6); assert.ok(Math.abs(a.c[0] - 0) < 1e-6 && Math.abs(a.c[1] - 100) < 1e-6);
});

test('SVG: paper-sized, one clip per view part, tags balanced', () => {
  const svg = C.toSVG(sample('A3'));
  assert.match(svg, /^<svg [^>]*width="420mm" height="297mm" viewBox="0 0 420 297"/);
  assert.equal((svg.match(/<clipPath /g) || []).length, 3);
  assert.equal((svg.match(/<g[ >]/g) || []).length, (svg.match(/<\/g>/g) || []).length);
  assert.ok(svg.includes('Test (sheet)'));
  assert.ok(!/NaN|undefined/.test(svg));
});

test('PDF: one page the size of the paper, cross-reference offsets exact', () => {
  const pdf = C.toPDF(sample('A1'));
  assert.ok(pdf.startsWith('%PDF-1.4'));
  assert.match(pdf, /\/MediaBox \[0 0 2383\.94 1683\.78\]/);
  const xref = +/startxref\n(\d+)/.exec(pdf)[1];
  assert.ok(pdf.slice(xref).startsWith('xref'));
  const offs = pdf.slice(xref).split('\n').slice(3).filter((l) => / n $/.test(l)).map((l) => +l.slice(0, 10));
  offs.forEach((o, i) => assert.ok(pdf.slice(o).startsWith((i + 1) + ' 0 obj'), `object ${i + 1}`));
  assert.ok(pdf.includes('(Test \\(sheet\\))'), 'title escaped');
  assert.ok(!/NaN|undefined/.test(pdf));
});

test('title block: inside the frame, values fitted to their boxes, area above it', () => {
  const p = C.paper('A4'), long = 'A project name far too long to fit the project box of a title block'.repeat(2);
  const tb = C.titleBlock(p, { project: long, title: 'T' }, ['a note']);
  tb.ents.filter((e) => e.t === 'text').forEach((e) => {
    assert.ok(e.p[0] >= C.FRAME.left && e.p[0] <= p.w - C.FRAME.right, `text inside the frame: ${e.s}`);
  });
  const proj = tb.ents.find((e) => e.t === 'text' && /^A PROJECT/.test(e.s));
  assert.ok(proj.s.endsWith('..') && C.textWidth(proj.s, 3.5) <= 110, 'shortened to fit');
  assert.ok(tb.area.y0 > C.FRAME.bottom && tb.area.y1 === p.h - C.FRAME.top);
});

test('paper sizes and fitting scales', () => {
  assert.deepEqual(C.paper('A1'), { name: 'A1', orient: 'landscape', w: 841, h: 594 });
  assert.deepEqual(C.paper('A4', 'portrait'), { name: 'A4', orient: 'portrait', w: 210, h: 297 });
  assert.throws(() => C.paper('B2'));
  assert.equal(C.fitScale(5000, 900, 250, 100), 20);   // 5000 / 20 = 250 just fits
  assert.equal(C.fitScale(5000, 900, 240, 100), 25);
  assert.equal(C.fitScale(50000, 900, 250, 100), null);
});
