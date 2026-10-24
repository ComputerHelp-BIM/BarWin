  /** Editing an end's own top bars (on the drawing or in the form) sets that end apart from mid; returns true when it changed. */
  function apartFromMid(k) {
    var m = /^([LR])([tb])(N|Dia)$/.exec(k); if (!m || vals[m[1] + m[2] + 'Same'] === false) return false;
    var mid = m[2] === 't' ? { N: 'topN', Dia: 'topDia' } : { N: 'botN', Dia: 'botDia' }, other = m[3] === 'N' ? 'Dia' : 'N';
    vals[m[1] + m[2] + other] = vals[mid[other]];   // the untouched number starts from mid's
    vals[m[1] + m[2] + 'Same'] = false; return true;
  }
  /** While an end follows mid, its own numbers mirror mid's, so unlinking starts from what is drawn. */
  function syncSame() {
    ['L', 'R'].forEach(function (k) {
      if (vals[k + 'tSame'] !== false) { vals[k + 'tN'] = vals.topN; vals[k + 'tDia'] = vals.topDia; }
      if (vals[k + 'bSame'] !== false) { vals[k + 'bN'] = vals.botN; vals[k + 'bDia'] = vals.botDia; }
    });
  }
  function helpFor(k) { return k === 'legs' ? 'Links have 2, 4 or 6 legs.' : k === 'lPct' ? 'Type a whole percentage of the span, for example 25.' : BS.COUNT[k] ? 'Type a whole number' + (k === 'faceN' ? ' (0 for none).' : k === 'LxN' || k === 'RxN' || k === 'bxN' ? ' (0 for no extra bars).' : ' of 1 or more.') : HELP; }
  function msg(t, err) { var m = $('#msg'); m.textContent = t || ''; m.className = err ? 'err' : ''; }
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  var KIND = { primary: ['Primary beam', 'column or wall at both ends'], secondary: ['Secondary beam', 'column or wall at one end, beam at the other'], tertiary: ['Tertiary beam', 'beams at both ends'] };
  var ENDS = { col: 'column / wall', beam: 'beam' };
  /** The form fields for the current supports: an end shows a width when it is a column or wall, a width and a depth when it is a beam. */
  function fieldList() {
    function end(k, side) { return vals['type' + k] === 'col' ? [[k + 'colW', side + ' column / wall width']] : [[k + 'beamW', side + ' support beam width'], [k + 'beamD', side + ' support beam depth', 'note' + k]]; }
    var sizes = end('L', 'Left').concat([['span', 'Clear span'], ['D', 'Beam depth', 'Shown in both views'], ['B', 'Beam width']]).concat(end('R', 'Right'));
    var covers = [['ctop', 'Beam top'], ['cbot', 'Beam bottom'], ['cside', 'Beam sides']];
    if (vals.typeL === 'col' || vals.typeR === 'col') covers.push(['ccol', 'Column / wall']);
    var lm = vals.lmode, links = [['ldia', 'Link bar size'], ['legs', 'Link legs', '2, 4 or 6']];
    if (lm === 'single') links.push(['lsOne', 'Spacing', 'rng']);
    else if (lm === 'two') links.push(['lLeft', 'Left zone length', 'rng'], ['lsL', 'Spacing, left zone', 'rng'], ['lsR', 'Spacing, right zone', 'rng']);
    else {
      if (lm === 'three') links.push(['lEnd', 'End zone length', 'rng']);
      else if (lm === 'pct') links.push(['lPct', 'End zone, % of span', 'rng'], ['=lkEnd', 'End zone length']);
      else links.push(['=lkEnd', 'End zone length']);
      links.push(['lsEnd', 'Spacing near supports', 'rng'], ['lsMid', 'Spacing at mid-span', 'rng']);
    }
    links.push(['lStart', 'First link from face', 'rng']);
    var bars = [['topN', 'Top bars, mid'], ['topDia', 'Top bar size, mid'], ['botN', 'Bottom bars'], ['botDia', 'Bottom bar size'], ['faceN', 'Face bars, each side', '0 for none'], ['faceDia', 'Face bar size'], ['ldF', 'Ld, times bar size', 'Ld = this x bar size']];
    return { sizes: sizes, covers: covers, links: links, bars: bars };
  }
  function fieldHTML(f, cover) {
    // '=id' is a worked-out value: shown, not typed
    if (f[0].charAt(0) === '=') return '<div class="field"><span class="lab">' + f[1] + '</span><output class="out" id="' + f[0].slice(1) + '"></output><small id="' + f[0].slice(1) + 'How"></small></div>';
    var note = f[2] === 'rng' ? '<small class="rng" id="rg-' + f[0] + '"></small>' : f[2] ? '<small' + (/^note/.test(f[2]) ? ' id="' + f[2] + '">' : '>' + f[2]) + '</small>' : '';
    if (/^note/.test(f[2] || '')) {
      var k = f[2].slice(4);
      note += '<div class="under" id="und' + k + '" role="radiogroup" aria-label="Where the beam ends against the ' + (k === 'L' ? 'left' : 'right') + ' support beam">' +
        '<label><input type="radio" name="' + k + 'under" value="stop"> Beam stops at its face</label>' +
        '<label><input type="radio" name="' + k + 'under" value="under"> Beam runs under it</label></div>';
    }
    var unit = f[0] === 'lPct' ? '<span class="u">%</span>' : BS.COUNT[f[0]] || f[0] === 'ldF' ? '' : '<span class="u">mm</span>';
    return '<div class="field' + (cover ? ' cvr' : '') + '"><label for="f-' + f[0] + '">' + f[1] + '</label><div class="in"><input id="f-' + f[0] + '" data-k="' + f[0] + '" inputmode="decimal" autocomplete="off">' + unit + '</div>' + note + '</div>';
  }
  function buildForm() {
    var F = fieldList();
    $('#sizes').innerHTML = F.sizes.map(function (f) { return fieldHTML(f); }).join('') + '<div class="field"><span class="lab">Overall length</span><output class="out" id="overall"></output><small>Left end + span + right end</small></div>';
    $('#covers').innerHTML = F.covers.map(function (f) { return fieldHTML(f, true); }).join('');
    var LM = [['single', 'One spacing over the span'], ['three', 'Ends and mid-span'], ['d2', 'Ends 2 \u00D7 depth'], ['l3', 'Ends L/3'], ['pct', 'Ends % of span'], ['two', 'Left and right']];
    $('#links').innerHTML = '<fieldset class="seg wide" id="lmode"><legend>Distribution</legend>' + LM.map(function (o) { return '<input type="radio" id="lm-' + o[0] + '" name="lmode" value="' + o[0] + '"' + (vals.lmode === o[0] ? ' checked' : '') + '><label for="lm-' + o[0] + '">' + o[1] + '</label>'; }).join('') + '</fieldset>' +
      F.links.map(function (f) { return fieldHTML(f); }).join('') +
      '<div class="field"><span class="lab">Links in the span</span><output class="out" id="lkTotal"></output><small id="lkHow"></small></div>';
    $('#bars').innerHTML = F.bars.map(function (f) { return fieldHTML(f); }).join('');
    // extra top bars, per end: count, size, and how far into the span (a rule of the span, or typed)
    var XO = [['l4', 'L/4 of span'], ['l3', 'L/3 of span'], ['p03', '0.3 \u00D7 span'], ['typed', 'Typed length']];
    $('#xtop').innerHTML = ['L', 'R'].map(function (k) {
      var side = k === 'L' ? 'Left' : 'Right', m = BS.XMODES.hasOwnProperty(vals[k + 'xMode']) ? vals[k + 'xMode'] : 'l4';
      return fieldHTML([k + 'xN', side + ' end: extra bars', '0 for none']) + fieldHTML([k + 'xDia', side + ' extra bar size']) +
        '<div class="field"><label for="f-' + k + 'xMode">' + side + ' extra length</label><select id="f-' + k + 'xMode" data-x="' + k + 'xMode">' +
        XO.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === m ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select><small id="xh' + k + '"></small></div>' +
        (m === 'typed' ? fieldHTML([k + 'xLen', side + ' length from face', 'rng']) : '') +
        '<div class="field"><label for="f-' + k + 'xLayer">' + side + ' extra layer</label><select id="f-' + k + 'xLayer" data-x="' + k + 'xLayer">' +
        [['auto', 'Auto'], ['1', 'Layer 1, with main bars'], ['2', 'Layer 2, on spacer bars']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === vals[k + 'xLayer'] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>';
    }).join('') + fieldHTML(['spcS', 'Spacer bars, no more than', 'rng']);
    // bars at each end, top and bottom: the same as mid, or their own count and size, lapping inside the end area where they change
    // a plain choice that only sets its value (data-opt)
    function selectHTML2(id, key, label, opts, cur, note) {
      return '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '" data-opt="' + key + '">' +
        opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' + (note ? '<small id="' + note + '"></small>' : '') + '</div>';
    }
    function selectHTML(id, key, label, opts, cur, note) {
      return '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '" data-x="' + key + '">' +
        opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' + (note ? '<small id="' + note + '"></small>' : '') + '</div>';
    }
    var STYLES = [['inline', 'Inline, ticks at lap ends'], ['offset', 'Offset, side by side'], ['crank', 'Cranked 1:6']];
    function zonesHTML(sd) {
      var word = sd === 't' ? 'top' : 'bottom', LO = sd === 't'
        ? [['x', 'At the extra bars\u2019 cut-off'], ['l4', 'L/4 (0.25L)'], ['l3', 'L/3'], ['p03', '0.3L'], ['typed', 'Typed']]
        : [['face', 'At the junction (from the face)'], ['x', 'At the bottom extras\u2019 cut-off'], ['l4', 'L/4 (0.25L)'], ['l3', 'L/3'], ['p03', '0.3L'], ['typed', 'Typed']];
      return ['L', 'R'].map(function (k) {
        var side = k === 'L' ? 'Left' : 'Right', same = vals[k + sd + 'Same'] !== false, mk = BS.zk(sd, k, 'lapMode'), lk = BS.zk(sd, k, 'lapLen'), m = vals[mk];
        return '<div class="field"><span class="lab">' + side + ' end ' + word + ' bars</span><label class="chk"><input type="checkbox" data-same="' + k + sd + '"' + (same ? ' checked' : '') + '> Same as mid</label><small id="tz' + k + sd + '"></small></div>' +
          (same ? '' : fieldHTML([k + sd + 'N', side + ' end: ' + word + ' bars']) + fieldHTML([k + sd + 'Dia', side + ' end: bar size'])) +
          selectHTML('f-' + mk, mk, side + ' ' + word + ' lap point', LO, m, 'lp' + k + sd) +
          (m === 'typed' ? fieldHTML([lk, side + ' lap point from face', 'rng']) : '');
      }).join('') + selectHTML('f-' + sd + 'LapStyle', sd + 'LapStyle', (sd === 't' ? 'Top' : 'Bottom') + ' lap style', STYLES, vals[sd + 'LapStyle']);
    }
    $('#tzones').innerHTML = zonesHTML('t') + fieldHTML(['lapF', 'Lap, times smaller bar', 'rng']);
    $('#bzones').innerHTML = zonesHTML('b');
    // bottom extras: one set over mid-span, cut off at a rule of the span (or typed) from each support face
    var BXO = [['p01', '0.1L'], ['p015', '0.15L'], ['l5', 'L/5 (0.2L)'], ['l4', 'L/4 (0.25L)'], ['l7', 'L/7'], ['typed', 'Typed']];
    $('#bxtra').innerHTML = fieldHTML(['bxN', 'Extra bottom bars', '0 for none']) + fieldHTML(['bxDia', 'Extra bottom bar size']) +
      ['L', 'R'].map(function (k) {
        var side = k === 'L' ? 'Left' : 'Right';
        return selectHTML('f-' + k + 'bxMode', k + 'bxMode', side + ' cut-off from face', BXO, vals[k + 'bxMode'], 'bxh' + k) + (vals[k + 'bxMode'] === 'typed' ? fieldHTML([k + 'bxLen', side + ' cut-off, typed', 'rng']) : '');
      }).join('') +
      selectHTML('f-bxLayer', 'bxLayer', 'Extra bottom layer', [['auto', 'Auto'], ['1', 'Layer 1, with main bars'], ['2', 'Layer 2, on spacer bars']], vals.bxLayer, 'bxl');
    // anchorage: per end, Auto or an override; at a column or wall also Ld or Ld + 10 x bar size
    var OPT = { col: [['auto', 'Auto'], ['ld', 'Straight Ld'], ['bend', 'Bent']], beam: [['auto', 'Auto'], ['bendfull', 'Bent to cover'], ['ld', 'Straight Ld'], ['cover', 'Straight to cover']] };
    $('#anch').innerHTML = ['L', 'R'].map(function (k) {
      var t = vals['type' + k], cur = OPT[t].some(function (o) { return o[0] === vals[k + 'anch']; }) ? vals[k + 'anch'] : 'auto';
      return '<div class="field"><label for="f-' + k + 'anch">' + (k === 'L' ? 'Left' : 'Right') + ' end (' + ENDS[t] + ')</label>' +
        '<select id="f-' + k + 'anch" data-c="' + k + 'anch">' + OPT[t].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
        (t === 'col' ? '<div class="under"><label><input type="radio" name="' + k + 'colx" value="ld"' + (vals[k + 'colx'] !== 'ld10' ? ' checked' : '') + '> Ld</label><label><input type="radio" name="' + k + 'colx" value="ld10"' + (vals[k + 'colx'] === 'ld10' ? ' checked' : '') + '> Ld + 10 x bar size</label></div>' : '') +
        '<small id="an' + k + '"></small></div>';
    }).join('') +
      selectHTML2('f-legMin', 'legMin', 'Shortest bent leg', [['is', 'IS 456: 8 \u00D7 bar size'], ['bs', 'BS 8666: end projection P'], ['12d', '12 \u00D7 bar size'], ['10d', '10 \u00D7 bar size']], vals.legMin, 'legMinHow');
    ['L', 'R'].forEach(function (k) { $('#t' + k + '-' + vals['type' + k]).checked = true; var r = document.querySelector('input[name="' + k + 'under"][value="' + vals[k + 'under'] + '"]'); if (r) r.checked = true; });
  }

