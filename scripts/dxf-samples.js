#!/usr/bin/env node
/**
 * Writes sample Beam Sections sheets as DXF, for checking in a real DXF reader (scripts/check_dxf.py, or AutoCAD by hand).
 * Made-up beams only. Usage: node scripts/dxf-samples.js <folder>
 */
'use strict';
const fs = require('fs');
const path = require('path');
const B = require('../apps/beam-sections/src/beams.js');
const S = require('../apps/beam-sections/src/sheet.js');
const C = require('../packages/cad/cad.js');

const out = path.resolve(process.argv[2] || '.dxf-samples');
const TPL = fs.readFileSync(path.join(__dirname, '..', 'packages', 'cad', 'template.dxf'), 'utf8');
const CASES = {
  'default-A3': [{}, { paper: 'A3' }],
  'primary-A2': [{ typeR: 'col', topN: 4, botN: 4, legs: 4 }, { paper: 'A2' }],
  'tertiary-shallow-A1': [{ typeL: 'beam', LbeamD: 600, Lunder: 'under', RbeamD: 1200, tLapStyle: 'crank', bLapStyle: 'offset', LtSame: false, LtN: 4, LtDia: 20 }, { paper: 'A1' }],
  'long-break-A2': [{ span: 12000, lEnd: 3000 }, { paper: 'A2', scaleL: '20' }],
  'bent-A4-portrait': [{ Lanch: 'bend', LxN: 0, RxN: 0, bxN: 0, faceN: 0, D: 450, span: 3000, lEnd: 900 }, { paper: 'A4', orient: 'portrait' }]
};
fs.mkdirSync(out, { recursive: true });
for (const [name, [v, o]] of Object.entries(CASES)) {
  const r = S.buildSheet(Object.assign({}, B.DEFAULTS, v), Object.assign({ fields: { firm: 'Example firm', project: 'Sample', title: name } }, o));
  fs.writeFileSync(path.join(out, name + '.dxf'), C.toDXF(r.sheet, TPL));
  console.log(name + '.dxf  L 1:' + r.scaleL + '  sections 1:' + r.scaleS + (r.issues.length ? '  (' + r.issues.join(' ') + ')' : ''));
}
