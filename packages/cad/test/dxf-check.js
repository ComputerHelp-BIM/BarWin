/**
 * Structural checks on DXF text that every CAD program relies on, without needing one: group codes in pairs, every
 * handle unique and below $HANDSEED, sections closed, no template token left over, one anonymous block per dimension.
 * Returns the parsed counts so tests can assert on them; throws with a reason on the first problem.
 */
'use strict';

function checkDXF(text) {
  if (/\{\{[A-Z0-9_]+\}\}/.test(text)) throw new Error('a template token was left in the DXF');
  if (!text.startsWith('  0\nSECTION\n')) throw new Error('the DXF does not start with a SECTION');
  if (!/  0\nEOF\n?$/.test(text)) throw new Error('the DXF does not end with EOF');
  const lines = text.replace(/\n$/, '').split('\n');
  if (lines.length % 2) throw new Error('odd number of lines: group codes and values are out of step');
  const count = {}, handles = new Set(), blocks = [], dimBlocks = [];
  let seed = null, open = 0, inHandSeed = false, prev0 = null;
  for (let i = 0; i < lines.length; i += 2) {
    const code = lines[i].trim(), value = lines[i + 1];
    if (!/^-?\d+$/.test(code)) throw new Error(`line ${i + 1}: "${lines[i]}" is not a group code`);
    if (lines[i].length !== 3 && lines[i].length !== code.length) throw new Error(`line ${i + 1}: group code not right-aligned`);
    if (code === '0') {
      count[value] = (count[value] || 0) + 1; prev0 = value;
      if (value === 'SECTION') open++;
      if (value === 'ENDSEC') open--;
    }
    if (code === '9') inHandSeed = value === '$HANDSEED';
    else if (code === '5' && inHandSeed) { seed = parseInt(value, 16); inHandSeed = false; }
    else if (code === '5' || code === '105') {
      if (!/^[0-9A-F]+$/.test(value)) throw new Error(`line ${i + 2}: bad handle "${value}"`);
      if (handles.has(value)) throw new Error(`handle ${value} is used twice`);
      handles.add(value);
    }
    if (code === '2' && prev0 === 'BLOCK') blocks.push(value);
    if (code === '2' && prev0 === 'DIMENSION') dimBlocks.push(value);
  }
  if (open !== 0) throw new Error('a SECTION is not closed');
  const max = Math.max(...[...handles].map((h) => parseInt(h, 16)));
  if (seed === null || seed <= max) throw new Error(`$HANDSEED ${seed && seed.toString(16)} is not above the highest handle ${max.toString(16)}`);
  dimBlocks.forEach((b) => { if (!blocks.includes(b)) throw new Error(`dimension block ${b} is missing`); });
  if (new Set(dimBlocks).size !== dimBlocks.length) throw new Error('two dimensions share a block');
  return { count, handles: handles.size, blocks, dimBlocks };
}

module.exports = { checkDXF };
