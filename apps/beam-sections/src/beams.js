/*
 * Beam sections drawing module, v0.17.0
 * One source for the interactive page and for the standalone .svg files.
 *
 * The drawing is a fixed, not-to-scale template: geometry never follows the numbers the user types,
 * with these deliberate exceptions: each end is drawn as a column or a beam as chosen; a support beam is drawn flush
 * with the main beam, 200 deeper, or 200 shallower, depending on which typed depth is larger; and where the support
 * beam is the shallower one, the main beam either stops at its face or runs on under it to its far face, as chosen.
 * Sections A-A (mid-span), B-B (near the left end) and C-C (near the right end) can each be shown or hidden.
 *
 * Reinforcement. Links: an end zone at each support with closer spacing and a mid zone between. Main bars: top and
 * bottom bars run the span and anchor into each support (straight Ld, bent, bent to cover, or straight to cover),
 * chosen automatically from the support width and Ld, with an override per end. Face bars on deep beams.
 * In the cross-sections bars are drawn as in the office's standard beam detail: links in outline with rounded bends
 * that wrap the corner bars, closed with two 135 degree hooks; inner open links for 4 and 6 legs, hooked over the
 * top bars; bars as dots, one per bar, so the count reads off the drawing.
 * A typical simply supported beam. Either end rests on a vertical member (a column or a wall) or on another beam,
 * which gives four arrangements: column both ends (a primary beam), column one end and beam the other (a secondary
 * beam, either way round), beams both ends (a tertiary beam).
 * Each element is its own shape: the supports and the beam span.
 * Faces in the open are solid; a face shared by two elements (a junction) is dashed. No hatching.
 * The cover line is the combined outline offset inwards, so it turns cleanly at every junction.
 */
(function (root) {
  'use strict';
  var VERSION = '0.17.0';
  // each end keeps its column and its beam sizes, so switching an end back and forth loses nothing
  var DEFAULTS = { typeL: 'col', typeR: 'beam', LcolW: 900, LbeamW: 300, LbeamD: 900, RcolW: 900, RbeamW: 300, RbeamD: 900,
    span: 5000, D: 900, B: 300, ctop: 25, cbot: 40, cside: 25, ccol: 40,
    Lunder: 'stop', Runder: 'stop',          // a shallower support beam: the main beam 'stop's at its face or runs 'under' it
    showA: true, showB: true, showC: true,    // which cross-sections are shown
    ldia: 8, lsEnd: 100, lsMid: 150, lEnd: 1800,    // links: bar size, spacing near the supports and at mid-span, end-zone length from each support face
    lmode: 'three',                                 // link distribution: 'single' (one spacing over the span); end zones and a mid zone with the end
                                                    // length typed ('three'), 2 x depth ('d2'), span / 3 ('l3') or a % of the span ('pct'); 'two' (left and right zones)
    lPct: 25,                                       // end zone as a % of the span, for 'pct'
    lStart: 50,                                     // first and last link from the support faces (25 to 100)
    lsOne: 150, lLeft: 2500, lsL: 100, lsR: 150,    // single spacing; left zone length and the two spacings for 'two'
    legs: 2,                                        // link legs: 2, 4 or 6
    topN: 3, topDia: 16, botN: 3, botDia: 16,       // main bars, full length
    faceN: 2, faceDia: 12,                          // face bars on each side face
    ldF: 50,                                        // Ld as a multiple of the bar size
    Lanch: 'auto', Ranch: 'auto',                   // anchorage at each end: auto, or an override (column: ld, bend; beam: bendfull, ld, cover)
    Lcolx: 'ld', Rcolx: 'ld',                       // at a column or wall: Ld, or Ld + 10 x bar size
    legMin: '12d',                                  // a bent leg is never shorter than: 'is' 8 x bar (IS 456), 'bs' P (BS 8666 Table 2), '12d', '10d'
    // extra top bars over each support: count (0 for none), size, and how far into the span from the support face:
    // 'l4' span / 4, 'l3' span / 3, 'p03' 0.3 x span, or 'typed' (xLen)
    LxN: 2, LxDia: 25, LxMode: 'l4', LxLen: 1250, LxLayer: 'auto',   // layer: 'auto', '1' (with the main bars) or '2' (second layer)
    RxN: 2, RxDia: 25, RxMode: 'l4', RxLen: 1250, RxLayer: 'auto',
    spcS: 1000,                                     // spacer (pin) bars between layers: no further apart than this
    // top bars by zone: each end the same as mid (topN / topDia) or its own; where they change, bars lap inside the end area,
    // ending at the lap point: 'x' (the extra bars' cut-off, L/4 if none), 'l4', 'l3', 'p03' or 'typed' (xlapLen)
    LtSame: true, LtN: 3, LtDia: 16, LlapMode: 'x', LlapLen: 1250,
    RtSame: true, RtN: 3, RtDia: 16, RlapMode: 'x', RlapLen: 1250,
    lapF: 50,                                       // lap length = this x the smaller bar at the change
    // bottom bars by zone, as the top: each end the same as mid (botN / botDia) or its own; lap point 'face' (junction: the lap
    // starts at the support face and runs into the span), 'x' (the bottom extras' cut-off), 'l4', 'l3', 'p03' or 'typed'
    LbSame: true, LbN: 3, LbDia: 16, LblapMode: 'face', LblapLen: 1250,
    RbSame: true, RbN: 3, RbDia: 16, RblapMode: 'face', RblapLen: 1250,
    // bottom extra bars over mid-span, curtailed short of each support: 'p01' 0.1L, 'p015' 0.15L, 'l5' L/5, 'l4' L/4, 'l7' L/7, 'typed'
    bxN: 2, bxDia: 20, LbxMode: 'p015', LbxLen: 750, RbxMode: 'p015', RbxLen: 750, bxLayer: 'auto',
    // how laps are drawn, top and bottom: 'inline' (one line, a tick at each lap end), 'offset' (side by side), 'crank' (1:6)
    tLapStyle: 'inline', bLapStyle: 'inline',
    showLabels: true,                               // bar tags, notes, bar lists and the Ld / lap / cut-off dimensions; off for a clean drawing
    textScale: 100,                                 // text size on the drawings, % (70 to 130)
    panel: 'tabs', tab: 'geo',                      // settings panel: 'tabs' (one tab at a time) or 'groups' (collapsible); the open tab
    colors: {} };                                   // bar colour overrides by group (see GROUPS); empty = the theme's colours
  var NAMES = { LcolW: 'left column or wall width', LbeamW: 'left support beam width', LbeamD: 'left support beam depth',
    RcolW: 'right column or wall width', RbeamW: 'right support beam width', RbeamD: 'right support beam depth',
    span: 'clear span', D: 'beam depth', B: 'beam width', ctop: 'top cover', cbot: 'bottom cover', cside: 'side cover', ccol: 'column or wall cover',
    ldia: 'link bar size', lsEnd: 'link spacing near the supports', lsMid: 'link spacing at mid-span', lEnd: 'end zone length',
    legs: 'number of link legs', topN: 'number of top bars', topDia: 'top bar size', botN: 'number of bottom bars', botDia: 'bottom bar size',
    faceN: 'face bars on each side', faceDia: 'face bar size', ldF: 'Ld multiple',
    LxN: 'number of extra top bars at the left end', LxDia: 'left extra top bar size', LxLen: 'left extra top bar length from the support face',
    RxN: 'number of extra top bars at the right end', RxDia: 'right extra top bar size', RxLen: 'right extra top bar length from the support face',
    spcS: 'spacer bar spacing', lapF: 'lap length multiple',
    LtN: 'number of top bars at the left end', LtDia: 'left end top bar size', RtN: 'number of top bars at the right end', RtDia: 'right end top bar size',
    LlapLen: 'left lap point from the support face', RlapLen: 'right lap point from the support face',
    LbN: 'number of bottom bars at the left end', LbDia: 'left end bottom bar size', RbN: 'number of bottom bars at the right end', RbDia: 'right end bottom bar size',
    LblapLen: 'left bottom lap point from the support face', RblapLen: 'right bottom lap point from the support face',
    bxN: 'number of bottom extra bars', bxDia: 'bottom extra bar size', LbxLen: 'bottom extra cut-off from the left face', RbxLen: 'bottom extra cut-off from the right face',
    lsOne: 'link spacing', lPct: 'end zone percentage', lStart: 'first link distance from the support face', lLeft: 'left zone length', lsL: 'link spacing in the left zone', lsR: 'link spacing in the right zone' };
  /** Values that are counts, not sizes. faceN may be 0; legs must be 2, 4 or 6. */
  var COUNT = { topN: 1, botN: 1, faceN: 1, legs: 1, lPct: 1, LxN: 1, RxN: 1, LtN: 1, RtN: 1, LbN: 1, RbN: 1, bxN: 1 };
  var COVER = { ctop: 1, cbot: 1, cside: 1, ccol: 1 };
  var MONO_EM = 0.6;                       // advance width of the monospaced dimension face, in em

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function n(v) { return Math.round(v * 10) / 10; }
  function fmt(v) { return String(Math.round(v)); }
  function assign(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
  function pts(p) { return p.map(function (q) { return n(q[0]) + ',' + n(q[1]); }).join(' '); }
  function line(x1, y1, x2, y2, c) { return '<line class="' + c + '" x1="' + n(x1) + '" y1="' + n(y1) + '" x2="' + n(x2) + '" y2="' + n(y2) + '"/>'; }
  function poly(p, c) { return '<polyline class="' + c + '" points="' + pts(p) + '"/>'; }

  /**
   * A text label. With a value key on an interactive drawing it becomes a focusable button with a dashed
   * underline and a generous hit area, so a small number is still easy to tap. Cover values are drawn in the cover colour.
   */
  function label(x, y, txt, o) {
    var tr = o.rot ? ' transform="rotate(' + o.rot + ' ' + n(x) + ' ' + n(y) + ')"' : '';
    var an = o.anchor === 'start' || o.anchor === 'end' ? o.anchor : 'middle';
    var t = '<text class="' + (o.cls || 'tx') + (o.key && COVER[o.key] ? ' cv' : '') + '" x="' + n(x) + '" y="' + n(y) + '" font-size="' + n(o.fs) + '" text-anchor="' + an + '">' + esc(txt) + '</text>';
    if (!(o.key && o.ia)) return tr ? '<g' + tr + '>' + t + '</g>' : t;
    var w = txt.length * o.fs * MONO_EM, x0 = an === 'start' ? x : an === 'end' ? x - w : x - w / 2;
    var hit = '<rect class="hit" x="' + n(x0 - o.fs * 0.45) + '" y="' + n(y - o.fs * 1.05) + '" width="' + n(w + o.fs * 0.9) + '" height="' + n(o.fs * 1.5) + '" rx="' + n(o.fs * 0.15) + '"/>';
    var ul = line(x0 - o.fs * 0.08, y + o.fs * 0.22, x0 + w + o.fs * 0.08, y + o.fs * 0.22, 'ul');
    return '<g class="ed' + (COVER[o.key] ? ' cvr' : '') + '" data-k="' + o.key + '" tabindex="0" role="button" aria-label="Edit ' + NAMES[o.key] + ', ' + esc(txt) + ' mm"' + tr + '>' + hit + t + ul + '</g>';
  }
  /**
   * A label such as "T8 @ 100 C/C" built from fixed text and editable values. parts: strings, or {k: key} for a value.
   * Each part is centred on its own slice of the monospaced line, so the editable numbers line up with the fixed text.
   */
  function spec(v, x, y, parts, o) {
    var segs = parts.map(function (p) { return typeof p === 'string' ? { t: p } : { t: fmt(v[p.k]), k: p.k }; });
    var cw = o.fs * MONO_EM, x0 = x - segs.reduce(function (a, g) { return a + g.t.length; }, 0) * cw / 2, out = '';
    segs.forEach(function (g) {
      var w = g.t.length * cw, cx = x0 + w / 2;
      var cls = o.cls || 'tx lkt';
      out += g.k ? label(cx, y, g.t, assign(o, { key: g.k, cls: cls })) : label(cx, y, g.t.trim(), { fs: o.fs, cls: cls });
      x0 += w;
    });
    return out;
  }
  function ticks(x1, y1, x2, y2, t, cls) { return line(x1 - t, y1 + t, x1 + t, y1 - t, cls) + line(x2 - t, y2 + t, x2 + t, y2 - t, cls); }

  /**
   * Horizontal dimension with architectural ticks. A value too wide for its gap is set past one end:
   * past the right end by default, or the side given in o.out ('before' or 'after').
   */
  function hdim(x1, x2, y, txt, o) {
    var t = o.fs * 0.32, s = line(x1, y, x2, y, 'dm') + ticks(x1, y, x2, y, t, 'tk');
    var w = txt.length * o.fs * MONO_EM, x = (x1 + x2) / 2;
    if (o.out || w > (x2 - x1) - o.fs * 0.8) {
      if ((o.out || o.prefer) === 'before') { x = x1 - o.fs * 0.55 - w / 2; s += line(x1 - o.fs * 0.35, y, x1, y, 'dm'); }
      else { x = x2 + o.fs * 0.55 + w / 2; s += line(x2, y, x2 + o.fs * 0.35, y, 'dm'); }
    }
    return s + label(x, y - o.fs * 0.4, txt, o);
  }
  /** Vertical dimension; the value reads from the right, set on the left of the line. */
  function vdim(y1, y2, x, txt, o) {
    var t = o.fs * 0.32, s = line(x, y1, x, y2, 'dm') + ticks(x, y1, x, y2, t, 'tk');
    return s + label(x - o.fs * 0.4, (y1 + y2) / 2, txt, assign(o, { rot: -90 }));
  }
  /** A small vertical dimension (a cover): the line runs on past one end and the value sits level beyond it. */
  function vdimOut(y1, y2, x, txt, o, where) {
    var t = o.fs * 0.32, run = o.fs * (o.run || 1.0), s = ticks(x, y1, x, y2, t, 'tk');
    if (where === 'above') return s + line(x, y2, x, y1 - run, 'dm') + label(x, y1 - run - o.fs * 0.25, txt, o);
    return s + line(x, y1, x, y2 + run, 'dm') + label(x, y2 + run + o.fs * 0.9, txt, o);
  }
  /** Section-mark arrow pointing in the direction of view. */
  function arrow(x1, y, x2, fs) {
    var h = fs * 0.6;
    return line(x1, y, x2 - h * 0.7, y, 'sm') + '<polygon class="ah" points="' + n(x2) + ',' + n(y) + ' ' + n(x2 - h) + ',' + n(y - h * 0.32) + ' ' + n(x2 - h) + ',' + n(y + h * 0.32) + '"/>';
  }
  function wrapSVG(vb, body, opt, title) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" class="dw" role="img" aria-label="' + esc(title) + '">' +
      (opt.style ? '<style>' + opt.style + '</style>' : '') + '<title>' + esc(title) + '</title>' + body + '</svg>';
  }

  /** Points on a circular arc, angles in degrees, y down (SVG): a0 to a1 in about 10 degree steps. */
  function arc(cx, cy, R, a0, a1) {
    var n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 10)), out = [], i, a;
    for (i = 0; i <= n; i++) { a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; out.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
    return out;
  }
  function dedupe(p) { return p.filter(function (q, i) { return !i || Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) > 0.01; }); }
  /**
   * A bar of width t drawn in outline: the centre-line offset to both sides (mitred at each sampled point) and closed.
   * Bends are already arcs in the centre-line, so the outline has true rounded bends.
   */
  function outline(p, t, cls) {
    p = dedupe(p); var h = t / 2, L = [], R = [], i;
    function nrm(a, b) { var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [-dy / l, dx / l]; }
    for (i = 0; i < p.length; i++) {
      var n1 = i ? nrm(p[i - 1], p[i]) : null, n2 = i < p.length - 1 ? nrm(p[i], p[i + 1]) : null, m;
      if (!n1) m = n2; else if (!n2) m = n1; else { var k = 1 + n1[0] * n2[0] + n1[1] * n2[1]; m = [(n1[0] + n2[0]) / k, (n1[1] + n2[1]) / k]; }
      L.push([p[i][0] + h * m[0], p[i][1] + h * m[1]]); R.push([p[i][0] - h * m[0], p[i][1] - h * m[1]]);
    }
    return '<polygon class="' + cls + '" points="' + pts(L.concat(R.reverse())) + '"/>';
  }
  var DIAG = Math.SQRT1_2;
  /**
   * Closed link round four corner bars (centres x0,y0 to x1,y1), centre-line radius R, closed at the top-left corner
   * with two 135 degree hooks whose tails run parallel into the core, as on site.
   */
  function closedLink(x0, y0, x1, y1, R, Lh) {
    var p135 = [x0 + R * Math.cos(3 * Math.PI / 4), y0 + R * Math.sin(3 * Math.PI / 4)], p315 = [x0 + R * DIAG, y0 - R * DIAG];
    return [[p135[0] + Lh * DIAG, p135[1] + Lh * DIAG]].concat(arc(x0, y0, R, 135, 270), arc(x1, y0, R, 270, 360), arc(x1, y1, R, 0, 90), arc(x0, y1, R, 90, 180), arc(x0, y0, R, 180, 315), [[p315[0] + Lh * DIAG, p315[1] + Lh * DIAG]]);
  }
  /** Open inner link (a U) round bottom bars at xa and xb, legs up to the top bars, each hooked 135 degrees over its top bar, tails inwards. */
  function openLink(xa, xb, y0, y1, R, Lh) {
    var pa = [xa + R * DIAG, y0 - R * DIAG], pb = [xb - R * DIAG, y0 - R * DIAG];
    return [[pa[0] + Lh * DIAG, pa[1] + Lh * DIAG]].concat(arc(xa, y0, R, 315, 180), arc(xa, y1, R, 180, 90), arc(xb, y1, R, 90, 0), arc(xb, y0, R, 360, 225), [[pb[0] - Lh * DIAG, pb[1] + Lh * DIAG]]);
  }
  /** n positions evenly between a and b (one bar sits in the middle). */
  function spread(n, a, b) { var out = [], i; if (n <= 1) return n === 1 ? [(a + b) / 2] : []; for (i = 0; i < n; i++) out.push(a + (b - a) * i / (n - 1)); return out; }
  /** Inner leg positions: links with L legs put a leg near every (L-1)th share of the width, on the nearest bottom bar. */
  function innerLegs(L, xs, a, b) {
    var out = [], j; for (j = 1; j <= L - 2; j++) { var f = j / (L - 1); out.push(xs.length >= L ? xs[Math.round(f * (xs.length - 1))] : a + (b - a) * f); }
    return out;
  }

  /**
   * How the main bars anchor at end k ('L' or 'R'), for a bar of size dia. Auto: straight Ld when the support is wide
   * enough to take Ld past its face (less the cover at its far face); otherwise bent at a column or wall, and bent down
   * to the cover at a support beam. The user can override per end.
   */
  function anchorage(v, k, dia) {
    var t = v['type' + k] === 'beam' ? 'beam' : 'col', w = v[k + (t === 'col' ? 'colW' : 'beamW')], cov = t === 'col' ? v.ccol : v.cside;
    var ld = v.ldF * dia + (t === 'col' && v[k + 'colx'] === 'ld10' ? 10 * dia : 0), avail = w - cov, auto = avail >= ld ? 'ld' : (t === 'col' ? 'bend' : 'bendfull');
    var ok = t === 'col' ? ['ld', 'bend'] : ['bendfull', 'ld', 'cover'], m = v[k + 'anch'], mode = ok.indexOf(m) >= 0 ? m : auto;
    return { mode: mode, auto: auto, ld: ld, avail: avail, override: mode !== auto && ok.indexOf(m) >= 0, fits: mode !== 'ld' || avail >= ld };
  }
  /** BS 8666:2020 Table 2: minimum end projection P beyond a bend (bar bent to the minimum radius, then at least 5d straight). */
  var BS_P = { 6: 110, 8: 115, 10: 120, 12: 125, 16: 130, 20: 190, 25: 240, 32: 305, 40: 380, 50: 475 };
  /** The rules a bent leg may be held to (legMin). */
  var LEG_MIN = { is: 'IS 456: 8 \u00D7 bar size (a 90\u00B0 bend is worth 8\u00D8, cl. 26.2.2.1)', bs: 'BS 8666: end projection P (Table 2)', '12d': '12 \u00D7 bar size', '10d': '10 \u00D7 bar size' };
  /**
   * The shortest bent leg allowed for a bar of size dia under the chosen rule: { min, mode, basis }.
   * IS 456 cl. 26.2.2.1: a 90 degree bend develops 8 x bar size, so the leg is at least that. BS 8666 Table 2: the minimum
   * end projection P (sizes not in the table: radius + bar + 5 x bar, rounded up to 5). Or a plain 12 x or 10 x bar size.
   */
  function legMin(v, dia) {
    var m = LEG_MIN.hasOwnProperty(v.legMin) ? v.legMin : '12d';
    if (m === 'is') return { min: 8 * dia, mode: m, basis: '8\u00D8 IS 456' };
    if (m === 'bs') { var r = dia <= 16 ? 2 * dia : 3.5 * dia; return { min: BS_P[dia] || Math.ceil((r + 6 * dia) / 5) * 5, mode: m, basis: 'P BS 8666' }; }
    var f = m === '10d' ? 10 : 12;
    return { min: f * dia, mode: m, basis: f + '\u00D8' };
  }
  /**
   * The bent leg at end k for a bar of size dia, in mm (0 when the bar is straight): at a column or wall the leg makes up
   * what the straight run leaves of Ld, never less than the chosen minimum (legMin); bent to the cover at a support beam it
   * runs to the far cover, so the smaller of beam and support depth less the top and bottom covers.
   * Returns { leg, run, ld, mode, min, minRules (the minimum set the leg), minBasis }.
   */
  function bendLeg(v, k, dia) {
    var a = anchorage(v, k, dia), t = v['type' + k] === 'beam' ? 'beam' : 'col', run = a.avail, lm = legMin(v, dia);
    if (a.mode === 'bend') return { leg: Math.max(a.ld - run, lm.min), run: run, ld: a.ld, mode: a.mode, min: lm.min, minRules: a.ld - run < lm.min, minBasis: lm.basis };
    if (a.mode === 'bendfull') return { leg: Math.min(v.D, t === 'beam' ? v[k + 'beamD'] : v.D) - v.ctop - v.cbot, run: run, ld: a.ld, mode: a.mode, min: lm.min, minRules: false, minBasis: lm.basis };
    return { leg: 0, run: run, ld: a.ld, mode: a.mode, min: lm.min, minRules: false, minBasis: lm.basis };
  }
  var ANCH_NAME = { ld: 'STRAIGHT LD', bend: 'BENT', bendfull: 'BENT TO COVER', cover: 'STRAIGHT TO COVER' };

  /**
   * The range each link length and spacing may take, so the zones always fit the span:
   * an end zone holds at least one of its spacings and leaves at least one mid spacing between the two;
   * a left zone holds at least one left spacing and leaves at least one right spacing; a spacing fits inside its zone (and is 25 to 600).
   * Returns { key: [min, max] }; a range with min > max means the span is too short for that distribution.
   */
  /** Extra top bar lengths: a rule of the span, or typed. */
  var XMODES = { l4: 'L/4', l3: 'L/3', p03: '0.3L', typed: '' };
  /** Extra top bars at end k: { n, dia, len (mm from the support face), basis ('' when typed), mode }. n = 0 means none. */
  function extraTop(v, k) {
    var m = XMODES.hasOwnProperty(v[k + 'xMode']) ? v[k + 'xMode'] : 'l4', sp = v.span, n = Math.max(0, v[k + 'xN'] | 0);
    var len = m === 'l4' ? Math.round(sp / 4) : m === 'l3' ? Math.round(sp / 3) : m === 'p03' ? Math.round(0.3 * sp) : Math.min(v[k + 'xLen'], sp);
    return { n: n, dia: v[k + 'xDia'], len: n ? len : 0, basis: XMODES[m], mode: m };
  }
  /** Value keys for side s ('t' top, 'b' bottom), end k and field f; the top's lap keys predate the side letter (LlapMode). */
  function zk(s, k, f) { return s === 't' && /^lap/.test(f) ? k + f : k + s + f; }
  /** Bars of a zone on side s: 'M' mid (topN / topDia or botN / botDia); 'L' or 'R' the same as mid, or the end's own. */
  function barZone(v, s, k) {
    var mn = s === 't' ? 'topN' : 'botN', md = s === 't' ? 'topDia' : 'botDia';
    if (k === 'M' || v[zk(s, k, 'Same')] !== false) return { n: v[mn], d: v[md] };
    return { n: v[zk(s, k, 'N')], d: v[zk(s, k, 'Dia')] };
  }
  function topZone(v, k) { return barZone(v, 't', k); }
  /** Bottom extra bars: one set over mid-span, curtailed at cut[k] mm from each support face (a rule of the span or typed). */
  var BXMODES = { p01: ['0.1L', 0.1], p015: ['0.15L', 0.15], l5: ['L/5', 0.2], l4: ['L/4', 0.25], l7: ['L/7', 1 / 7], typed: ['', 0] };
  function extraBot(v) {
    var n = Math.max(0, v.bxN | 0), cut = {}, basis = {}, mode = {};
    ['L', 'R'].forEach(function (k) {
      var m = BXMODES.hasOwnProperty(v[k + 'bxMode']) ? v[k + 'bxMode'] : 'p015';
      cut[k] = m === 'typed' ? Math.min(Math.max(0, v[k + 'bxLen']), v.span) : Math.round(v.span * BXMODES[m][1]); basis[k] = BXMODES[m][0]; mode[k] = m;
    });
    return { n: n, d: v.bxDia, cut: cut, basis: basis, mode: mode };
  }
  /**
   * The lap point at end k on side s, in mm from that support face. Top: the extra bars' cut-off by default (L/4 when there
   * are none). Bottom: the junction by default (the lap starts at the face, so the point is one lap length in), or the bottom
   * extras' cut-off. Both: L/4, L/3, 0.3L or typed.
   */
  function lapPoint(v, s, k, lap) {
    var m = v[zk(s, k, 'lapMode')], sp = v.span;
    if (m === 'typed') return { at: Math.min(v[zk(s, k, 'lapLen')], sp), basis: '', mode: m };
    if (m === 'l3') return { at: Math.round(sp / 3), basis: 'L/3', mode: m };
    if (m === 'p03') return { at: Math.round(0.3 * sp), basis: '0.3L', mode: m };
    if (m === 'l4') return { at: Math.round(sp / 4), basis: 'L/4', mode: m };
    if (s === 't') { var x = extraTop(v, k); return x.n ? { at: x.len, basis: x.basis || 'EXTRA', mode: 'x' } : { at: Math.round(sp / 4), basis: 'L/4', mode: 'x' }; }
    if (m === 'x') { var b = extraBot(v); if (b.n) return { at: b.cut[k], basis: b.basis[k] || 'EXTRA CUT-OFF', mode: 'x' }; }
    return { at: lap, basis: 'FACE', mode: 'face' };
  }
  function lapAt(v, k) { return lapPoint(v, 't', k, 0); }
  /**
   * How the bars on side s change at end k: 'none' (same as mid), 'count' (same size, other count) or 'dia' (other size);
   * lap = lapF x the smaller bar; the lap sits inside the end area and ends at the lap point.
   */
  function barChange(v, s, k) {
    var z = barZone(v, s, k), M = barZone(v, s, 'M');
    var ch = z.d !== M.d ? 'dia' : z.n !== M.n ? 'count' : 'none', lap = ch === 'none' ? 0 : v.lapF * Math.min(z.d, M.d), at = lapPoint(v, s, k, lap);
    return { ch: ch, at: at.at, basis: at.basis, mode: at.mode, lap: lap, z: z, M: M };
  }
  function topChange(v, k) { return barChange(v, 't', k); }
  /**
   * Every bar run on side s along the span, in mm from the left support face: [{ n, d, a, b, ancL, ancR, zone, lapL, lapR }].
   * Bars of the same size run through; only the added or different bars lap or stop (the user's rule). Mid bars that do not
   * reach a support stop a lap length short of that end's lap point, so the lap lies inside the end area (lapL / lapR mark
   * a free end that is lapping, which the cranked style cranks).
   */
  function barRuns(v, s) {
    var sp = v.span, M = barZone(v, s, 'M'), runs = [], reach = {}, stop = {}, C = {};
    ['L', 'R'].forEach(function (e) {
      var c = C[e] = barChange(v, s, e), z = c.z;
      reach[e] = c.ch === 'none' ? M.n : c.ch === 'count' ? Math.min(z.n, M.n) : 0;   // mid bars reaching this support
      stop[e] = Math.max(0, c.at - c.lap);                                            // where the others stop, from this face
      var only = c.ch === 'dia' ? z.n : c.ch === 'count' && z.n > M.n ? z.n - M.n : 0;
      if (only) runs.push({ n: only, d: z.d, a: e === 'L' ? 0 : sp - c.at, b: e === 'L' ? c.at : sp, ancL: e === 'L', ancR: e === 'R', zone: e });
    });
    var t = Math.min(reach.L, reach.R), lapL = C.L.ch !== 'none', lapR = C.R.ch !== 'none';
    if (t) runs.unshift({ n: t, d: M.d, a: 0, b: sp, ancL: true, ancR: true, zone: 'M' });
    if (reach.L > t) runs.push({ n: reach.L - t, d: M.d, a: 0, b: sp - stop.R, ancL: true, ancR: false, zone: 'M', lapR: lapR });
    if (reach.R > t) runs.push({ n: reach.R - t, d: M.d, a: stop.L, b: sp, ancL: false, ancR: true, zone: 'M', lapL: lapL });
    var rest = M.n - Math.max(reach.L, reach.R);
    if (rest > 0) runs.push({ n: rest, d: M.d, a: stop.L, b: sp - stop.R, ancL: false, ancR: false, zone: 'M', lapL: lapL, lapR: lapR });
    return runs;
  }
  function topRuns(v) { return barRuns(v, 't'); }
  /** The main bars on side s a cut at mm from the left face passes through: [{ dia, zone }] (one entry per bar). */
  function barsAt(v, s, mm) {
    var out = [];
    barRuns(v, s).forEach(function (r) { if (mm >= r.a - 0.5 && mm <= r.b + 0.5) for (var i = 0; i < r.n; i++) out.push({ dia: r.d, x: false, zone: r.zone }); });
    return out;
  }
  function mainsAt(v, mm) { return barsAt(v, 't', mm); }
  /** Bottom layers at a cut: the main bottom bars there, plus the bottom extras when the cut lies between their cut-offs. */
  function botLayersAt(v, mm) {
    var b = extraBot(v), ex = [];
    if (b.n && mm >= b.cut.L - 0.5 && mm <= v.span - b.cut.R + 0.5) for (var i = 0; i < b.n; i++) ex.push({ dia: b.d, x: true, k: 'B' });
    var L = v.bxLayer;
    return arrange(v, barsAt(v, 'b', mm), L === '1' ? ex : [], L === '1' || L === '2' ? [] : ex, L === '2' ? ex : []);
  }
  /** Layers at end k's section cut (B-B for the left, C-C for the right): its main bars there and its extras. */
  function layersAt(v, k) {
    var mm = cutX(v, k === 'L' ? 'B' : 'C') * v.span / 5000;
    return topLayers(v, [k], mainsAt(v, mm));
  }

  /**
   * The top bars at a cut, given which ends' extras pass through it (['L'], ['R'], both or none).
   * Extras share the main bars' layer while the clear gap holds max(largest bar, 25); otherwise they go in a
   * second layer under it, on a spacer bar. Returns { row1: [{dia, x: true when extra, k}], row2: [...], gap1, gap2, need, second }.
   * Clear width = beam width - 2 side covers - 2 link sizes.
   */
  function topLayers(v, ends, mains) {
    var main = [], one = [], auto = [], two = [], i;
    if (mains) main = mains.slice(); else for (i = 0; i < v.topN; i++) main.push({ dia: v.topDia, x: false });
    // each end's extras: its layer choice decides; 'auto' joins the main layer while the clear gap allows
    (ends || []).forEach(function (k) {
      var e = extraTop(v, k), L = v[k + 'xLayer'], to = L === '1' ? one : L === '2' ? two : auto;
      for (var j = 0; j < e.n; j++) to.push({ dia: e.dia, x: true, k: k });
    });
    return arrange(v, main, one, auto, two);
  }
  /**
   * One row against the stirrup leg (row1) and, where needed, a second row on spacer bars (row2): main bars always in row1,
   * extras chosen for layer 1 or 2 go there, 'auto' extras join row1 while the clear gap holds max(largest bar, 25).
   * Clear width = beam width - 2 side covers - 2 link sizes.
   */
  function arrange(v, main, one, auto, two) {
    var Bw = v.B - 2 * v.cside - 2 * v.ldia, i;
    var all = main.concat(one, auto, two), need = Math.max(25, Math.max.apply(null, all.map(function (b) { return b.dia; }).concat([0])));
    function gap(bars) { return bars.length < 2 ? Bw - (bars[0] ? bars[0].dia : 0) : (Bw - bars.reduce(function (a, b) { return a + b.dia; }, 0)) / (bars.length - 1); }
    var ex = one.concat(auto), r2 = two, bumped = false;
    if (auto.length && gap(main.concat(ex)) < need) { ex = one; r2 = auto.concat(two); }   // auto extras move down quietly when one layer is too tight
    if (one.length && gap(main.concat(ex)) < need) { ex = []; r2 = one.concat(r2); bumped = true; }   // layer 1 chosen but too tight: layer 2, and say so
    // one layer: the corner bars stay main bars (the links wrap them); extras go into the gaps between main bars,
    // shared out evenly, any remainder to mirrored pairs of gaps from the middle so the row stays symmetric where it can
    var g = main.length - 1, per = [], row = [];
    if (!ex.length) row = main.slice();
    else if (g < 1) { var h = Math.floor(ex.length / 2); row = ex.slice(0, h).concat(main, ex.slice(h)); }
    else {
      for (i = 0; i < g; i++) per.push(Math.floor(ex.length / g));
      var r = ex.length % g, a, b;
      for (a = Math.floor((g - 1) / 2), b = Math.ceil((g - 1) / 2); a >= 0 && r > 0; a--, b++) {
        if (a === b) { if (r % 2) { per[a]++; r--; } }
        else if (r >= 2) { per[a]++; per[b]++; r -= 2; }
      }
      if (r > 0) per[Math.floor((g - 1) / 2)]++;
      var xi = 0; main.forEach(function (bb, j) { row.push(bb); if (j < g) for (var q = 0; q < per[j]; q++) row.push(ex[xi++]); });
    }
    return { row1: row, row2: r2, gap1: gap(row), gap2: r2.length ? gap(r2) : null, gapAll: gap(all), need: need, second: r2.length > 0, forced: one.length > 0 || two.length > 0, bumped: bumped };
  }
  /** Spacer (pin) bar between layers: size max(25, largest bar there); positions in mm along a run from a to b (at least two, no further apart than v.spcS). */
  function spacers(v, a, b, need) {
    var len = Math.abs(b - a), m = Math.max(2, Math.ceil(len / Math.max(100, v.spcS || 1000))), out = [], i;
    for (i = 0; i < m; i++) out.push(Math.min(a, b) + len * (i + 0.5) / m);
    return { dia: Math.max(25, need || 25), at: out };
  }
  /** The colour group of a link zone's spacing key: the closer of two end zones reads as the end colour. */
  function linkGroup(v, k) {
    if (k === 'lsMid') return 'lkMid';
    if (layoutMode(v) === 'two' && v.lsL !== v.lsR) return (k === 'lsL' ? v.lsL < v.lsR : v.lsR < v.lsL) ? 'lkEnd' : 'lkMid';
    return 'lkEnd';
  }
  /** Where each section mark cuts the drawn span (template units, span drawn 5000): B-B in the left end zone, A-A at mid-span, C-C in the right. */
  function cutX(v, L) {
    var S = 5000, mode = layoutMode(v), X = function (mm) { return S * mm / v.span; };
    if (L === 'A') return S / 2;
    var z0 = mode === 'two' ? X(Math.min(v.lLeft, v.span)) : mode === 'three' ? X(endZone(v).len) : null;
    var bx = Math.max(700, Math.min(z0 === null ? 1250 : z0 / 2, 1600));   // never closer than 700 to a support, so the letters clear its name
    if (L === 'B') return bx;
    return mode === 'two' ? S - Math.max(700, Math.min((S - z0) / 2, 1600)) : S - bx;
  }
  /** The ends whose extra top bars pass through section L's cut. */
  function extrasAt(v, L) {
    var x = cutX(v, L) * v.span / 5000, out = [];
    ['L', 'R'].forEach(function (k) { var e = extraTop(v, k); if (e.n && (k === 'L' ? x <= e.len : x >= v.span - e.len)) out.push(k); });
    return out;
  }

  /** Distributions with an end zone at each support and a mid zone between; they differ only in how the end length is set. */
  var ENDS_MODES = { three: 'typed', d2: '2 x depth', l3: 'span / 3', pct: '% of span' };
  function linkMode(v) { return v.lmode === 'single' || v.lmode === 'two' || ENDS_MODES[v.lmode] ? v.lmode : 'three'; }
  function isEnds(v) { return !!ENDS_MODES[linkMode(v)]; }
  /**
   * End zone length in mm for the end-zone distributions, never more than half the span (then the whole span is end zone).
   * basis: how it was set, for the drawing ('' when typed). capped: true when 2D, L/3 or % asked for more than half the span.
   */
  function endZone(v) {
    var m = linkMode(v), sp = v.span, want = m === 'd2' ? 2 * v.D : m === 'l3' ? Math.round(sp / 3) : m === 'pct' ? Math.round(sp * v.lPct / 100) : v.lEnd;
    // whole: the two end zones together reach the clear span (2D + 2D >= L, or 50% and over), so no mid zone is left and
    // the span takes one spacing, the end spacing. A typed length is held below half the span by linkRange, so never whole.
    var whole = (m === 'd2' || m === 'pct') && 2 * want >= sp;
    return { len: Math.min(want, sp / 2), want: want, whole: whole, capped: want > sp / 2, basis: m === 'd2' ? '2D' : m === 'l3' ? 'L/3' : m === 'pct' ? v.lPct + '%' : '' };
  }
  /** How links are laid out: 'single', 'two', 'three' (ends and mid), or 'whole' (an end-zone mode whose ends cover the span). */
  function layoutMode(v) { return isEnds(v) ? (endZone(v).whole ? 'whole' : 'three') : linkMode(v); }
  /** Valid [min, max] for each typed link length, spacing, start distance and percentage on the current span. */
  function linkRange(v) {
    var r = {}, sp = v.span, st = v.lStart, E = isEnds(v) ? endZone(v).len : v.lEnd, mid = sp - 2 * E;
    r.lStart = [25, 100];
    r.LxLen = [100, sp]; r.RxLen = [100, sp]; r.spcS = [300, 3000];
    r.LlapLen = [100, sp]; r.RlapLen = [100, sp]; r.lapF = [20, 100];
    r.LblapLen = [100, sp]; r.RblapLen = [100, sp]; r.LbxLen = [0, sp]; r.RbxLen = [0, sp];
    r.lEnd = [Math.max(v.lsEnd, st), Math.floor((sp - v.lsMid) / 2)];
    r.lPct = [Math.ceil(100 * r.lEnd[0] / sp), 100];   // over 49% is allowed: the ends then cover the span (one spacing, with an alert)
    r.lLeft = [Math.max(v.lsL, st), sp - Math.max(v.lsR, st)];
    // a typed end length holds spacings to the zone; where the zones are worked out (2D, L/3, %) the spacing stays the user's,
    // and a spacing longer than its zone simply gives one space
    var worked = isEnds(v) && linkMode(v) !== 'three';
    r.lsEnd = [25, worked ? 600 : Math.min(E, 600)]; r.lsMid = [25, worked || mid < 25 ? 600 : Math.min(mid, 600)];
    r.lsL = [25, Math.min(v.lLeft, 600)]; r.lsR = [25, Math.min(sp - v.lLeft, 600)]; r.lsOne = [25, Math.min(sp - 2 * st, 600)];
    return r;
  }
  /** Default distance of the first and last links from the support faces (the junctions); editable 25 to 100 as lStart. */
  var LINK_START = 50;
  /**
   * Where every link really stands, in mm from the left support face.
   * Each zone is split into equal spaces that never exceed its typed spacing: spaces = ceil(length / spacing),
   * links = spaces + 1 (the usual BBS count). A link on a zone boundary is shared and counted once, in the zone
   * nearer the support it belongs to (end zones in "ends and mid-span", the left zone in "left and right").
   * Returns { pos: [mm...], zones: [{ k, from, to, n, pitch }], total }.
   */
  function linkLayout(v) {
    var st = v.lStart > 0 ? v.lStart : LINK_START, sp = v.span, a = st, b = sp - st, pos = [], zones = [];
    var mode = layoutMode(v);
    // put links from x0 to x1 in equal spaces no wider than s; withStart / withEnd say whether the end links are this zone's
    function fill(k, x0, x1, s, withStart, withEnd) {
      var len = Math.max(0, x1 - x0), m = len > 0 ? Math.max(1, Math.ceil(len / s - 1e-9)) : 0, j, n = 0;
      for (j = 0; j <= m; j++) {
        if ((j === 0 && !withStart) || (j === m && !withEnd)) continue;
        pos.push(m ? x0 + len * j / m : x0); n++;
        if (!m) break;
      }
      zones.push({ k: k, from: x0, to: x1, n: n, pitch: m ? len / m : 0 });
    }
    if (mode === 'single') fill('lsOne', a, b, v.lsOne, true, true);
    else if (mode === 'whole') fill('lsEnd', a, b, v.lsEnd, true, true);
    else if (mode === 'two') {
      var m2 = Math.min(Math.max(v.lLeft, a), b);
      fill('lsL', a, m2, v.lsL, true, true); fill('lsR', m2, b, v.lsR, false, true);
    } else {
      var e = Math.min(Math.max(endZone(v).len, a), sp / 2);
      fill('lsEnd', a, e, v.lsEnd, true, true);
      fill('lsMid', e, sp - e, v.lsMid, false, false);
      fill('lsEnd', sp - e, b, v.lsEnd, sp - 2 * e > 0.5, true);   // end zones meeting at mid-span share that link; count it once
    }
    pos.sort(function (p, q) { return p - q; });
    pos = pos.filter(function (p, i) { return !i || p - pos[i - 1] > 0.5; });   // a boundary can never be drawn twice
    return { pos: pos, zones: zones, total: pos.length };
  }
  /** The link spacing a cross-section cuts through: B-B near the left end, A-A at mid-span, C-C near the right end. */
  function sectionSpacingKey(v, L) {
    if (linkMode(v) === 'single') return 'lsOne';
    if (layoutMode(v) === 'whole') return 'lsEnd';
    if (linkMode(v) === 'two') return L === 'B' ? 'lsL' : L === 'C' ? 'lsR' : (v.lLeft >= v.span / 2 ? 'lsL' : 'lsR');
    return L === 'A' ? 'lsMid' : 'lsEnd';
  }

  /** How a support beam at end k ('L' or 'R') compares with the main beam: drawn flush, 200 deeper, or 200 shallower. */
  function supportCase(v, k) { var d = v[k + 'beamD']; return d > v.D ? 'deeper' : d < v.D ? 'shallower' : 'flush'; }
  /** Primary: column or wall both ends. Secondary: one of each. Tertiary: beams both ends. */
  function beamClass(v) { var n = (v.typeL === 'beam') + (v.typeR === 'beam'); return n === 0 ? 'primary' : n === 1 ? 'secondary' : 'tertiary'; }

  /**
   * L-section. The span is drawn 5000 long and 900 deep; each end is a 900 column or wall (broken top and bottom)
   * or a 300 support beam. Faces in the open are solid, a face shared by two elements is dashed, and the cover line
   * is the combined outline offset inwards, trimmed where the offsets meet.
   */
  /** A copy of the values where an end that follows mid shows mid's numbers (so its tag reads right). */
  function withZones(v) {
    var w = assign(v, {});
    ['L', 'R'].forEach(function (k) {
      if (v[k + 'tSame'] !== false) { w[k + 'tN'] = v.topN; w[k + 'tDia'] = v.topDia; }
      if (v[k + 'bSame'] !== false) { w[k + 'bN'] = v.botN; w[k + 'bDia'] = v.botDia; }
    });
    return w;
  }
  function lSection(v, opt) {
    opt = opt || {}; v = withZones(v);
    var TS = Math.min(1.3, Math.max(0.7, (v.textScale || 100) / 100)), LB = v.showLabels !== false;
    var fs = 130 * TS, o = { fs: fs, ia: !!opt.ia }, S = 5000, D = 900, cT = -700, cB = 1600, c = 70, s = '';
    // each end in local terms: u runs outwards from the beam's end face, so one routine draws either end
    var ends = ['L', 'R'].map(function (k) {
      var t = v['type' + k] === 'beam' ? 'beam' : 'col', d = k === 'L' ? -1 : 1, xi = k === 'L' ? 0 : S, w = t === 'col' ? 900 : 500;
      var kase = t === 'beam' ? supportCase(v, k) : null, Ds = kase === 'deeper' ? D + 200 : kase === 'shallower' ? D - 200 : D;
      return { k: k, t: t, d: d, w: w, kase: kase, Ds: Ds, under: kase === 'shallower' && v[k + 'under'] === 'under', xo: xi + d * w, X: function (u) { return xi + d * u; } };
    });
    var L = ends[0], R = ends[1];
    // rows of dimensions outside the beam, so nothing but bars and links sits inside it. Above: the top laps (when an end
    // laps), extra-bar lengths, lap points, the chain and the overall length. Below, under the bottom bar tags: the bottom
    // extras' cut-offs and the bottom laps; everything further down (section marks, link zones, title) moves down by bS.
    var TCh = { L: barChange(v, 't', 'L'), R: barChange(v, 't', 'R') }, BCh = { L: barChange(v, 'b', 'L'), R: barChange(v, 'b', 'R') }, XB = extraBot(v);
    var hasTopLap = LB && (TCh.L.ch !== 'none' || TCh.R.ch !== 'none');
    var hasCut = LB && XB.n > 0 && (XB.cut.L > 0 || XB.cut.R > 0), hasBLap = LB && (BCh.L.ch !== 'none' || BCh.R.ch !== 'none');
    var yLapRow = -470 - 150 * TS, yX = hasTopLap ? yLapRow - 300 * TS : -470 - 350 * TS, yLapDim = yX - 165 * TS, yC = yLapDim - 165 * TS, yO = yC - 350 * TS, yTop = yO - 350 * TS;
    var bRows = (hasCut ? 1 : 0) + (hasBLap ? 1 : 0), yBC = D + 130 + 175 * TS, yBL = hasCut ? yBC + 150 * TS : yBC, bS = bRows ? (bRows * 150 + 60) * TS : 0;

    ends.forEach(function (e) {
      var X = e.X, w = e.w;
      if (e.t === 'col') {
        // column or wall: solid in the open, dashed where the beam frames into it, broken top and bottom
        var brk = function (y) { return [[X(w), y], [X(w * 0.62), y], [X(w * 0.56), y - 70], [X(w * 0.44), y + 70], [X(w * 0.38), y], [X(0), y]]; };
        s += poly(brk(cT), 'th') + poly(brk(cB), 'th') + line(X(w), cT, X(w), cB, 'ob') + line(X(0), cT, X(0), 0, 'ob') + line(X(0), D, X(0), cB, 'ob') + line(X(0), 0, X(0), D, 'jn');
        s += line(X(w - c), cT, X(w - c), cB, 'cl');
      } else if (e.under) {
        // shallower support beam with the main beam running on under it: the beam's end is the support's far face,
        // and both faces the two members share (the support's side and its soffit) are dashed
        s += line(X(0), 0, X(w), 0, 'ob') + line(X(w), 0, X(w), D, 'ob') + line(X(0), D, X(w), D, 'ob') + line(X(0), 0, X(0), e.Ds, 'jn') + line(X(0), e.Ds, X(w), e.Ds, 'jn');
      } else {
        // support beam: its own shape; the shared face is dashed, and whichever member is deeper shows its face below the other
        var J = Math.min(D, e.Ds);
        s += line(X(0), 0, X(w), 0, 'ob') + line(X(w), 0, X(w), e.Ds, 'ob') + line(X(0), e.Ds, X(w), e.Ds, 'ob') + line(X(0), 0, X(0), J, 'jn');
        if (e.Ds !== D) s += line(X(0), J, X(0), Math.max(D, e.Ds), 'ob');
      }
    });
    // the beam span
    s += line(0, 0, S, 0, 'ob') + line(0, D, S, D, 'ob');

    // cover: walk the combined outline, right end top to bottom then left end bottom to top; a column breaks the walk
    function endPts(e) {
      var P = function (u, y) { return [e.X(u), y]; };
      if (e.t === 'col') return [P(c, c), P(c, cT), null, P(c, cB), P(c, D - c)];
      if (e.under) return [P(e.w - c, c), P(e.w - c, D - c)];
      var a = [P(e.w - c, c), P(e.w - c, e.Ds - c)];
      if (e.kase === 'deeper') a.push(P(c, e.Ds - c), P(c, D - c)); else if (e.kase === 'shallower') a.push(P(-c, e.Ds - c), P(-c, D - c));
      return a;
    }
    var walk = endPts(R).concat(endPts(L).reverse()), cut = walk.indexOf(null), runs = [];
    if (cut < 0) runs = [walk.concat([walk[0]])];
    else { var cur = []; walk.slice(cut + 1).concat(walk.slice(0, cut)).forEach(function (p) { if (p === null) { runs.push(cur); cur = []; } else cur.push(p); }); runs.push(cur); }
    runs.forEach(function (r) { s += poly(r, 'cl'); });

    // links, in one of three distributions. Everything is to the span's scale: a 2000 zone on a 5000 span takes 40%,
    // and every link drawn is a real one (see linkLayout), the first and last 50 from the support faces.
    var mode = layoutMode(v), EZ = endZone(v), zones, LK = linkLayout(v);
    var X = function (mm) { return S * mm / v.span; };
    /** The centre for a label of txt (font size f, em width per char) wanted at cx, kept inside the span so it never runs over a support. */
    function inSpan(cx, txt, f, em) { var h = txt.length * f * (em || MONO_EM) / 2; return Math.min(Math.max(cx, h + 60), S - h - 60); }
    if (mode === 'single') zones = [{ a: 0, b: S, k: 'lsOne', z: 0 }];
    else if (mode === 'whole') zones = [{ a: 0, b: S, k: 'lsEnd', z: 0, whole: true }];
    else if (mode === 'two') { var zL = X(Math.min(v.lLeft, v.span)); zones = [{ a: 0, b: zL, k: 'lsL', len: 'lLeft', z: 0 }, { a: zL, b: S, k: 'lsR', len: 'right', z: 1 }]; }
    else { var zE = X(EZ.len); zones = [{ a: 0, b: zE, k: 'lsEnd', len: 'lEnd', z: 0 }, { a: zE, b: S - zE, k: 'lsMid', len: 'mid', z: 1 }, { a: S - zE, b: S, k: 'lsEnd', len: 'lEnd', z: 2 }]; }
    var lx = LK.pos.map(X);
    // each link takes its zone's colour; a link on a zone boundary belongs to the end zone (as it is counted)
    var eLen = EZ.len, m2 = Math.min(v.lLeft, v.span);
    function zoneKey(p) {
      if (mode === 'three') return p <= eLen + 0.5 || p >= v.span - eLen - 0.5 ? 'lsEnd' : 'lsMid';
      if (mode === 'two') return p <= m2 + 0.5 ? 'lsL' : 'lsR';
      return mode === 'single' ? 'lsOne' : 'lsEnd';
    }
    LK.pos.forEach(function (p, i) { s += line(lx[i], c, lx[i], D - c, 'lk k-' + linkGroup(v, zoneKey(p))); });
    // a dimension standing inside the beam goes midway between the two links nearest where it wants to be
    function clearX(want) {
      var best = want, d = Infinity;
      for (var i = 1; i < lx.length; i++) { var m = (lx[i - 1] + lx[i]) / 2; if (Math.abs(m - want) < d) { d = Math.abs(m - want); best = m; } }
      return best;
    }

    // chain and overall dimensions above
    var g = 50, ov = 110;
    function ext(e, x, toY) { return line(x, e.t === 'col' ? cT - g : -g, x, toY, 'ex'); }
    function key(e) { return e.k + (e.t === 'col' ? 'colW' : 'beamW'); }
    s += ext(L, L.xo, yO - ov) + ext(L, 0, yC - ov) + ext(R, S, yC - ov) + ext(R, R.xo, yO - ov);
    s += hdim(L.xo, 0, yC, fmt(v[key(L)]), assign(o, { key: key(L), prefer: 'before' })) + hdim(0, S, yC, fmt(v.span), assign(o, { key: 'span' })) + hdim(S, R.xo, yC, fmt(v[key(R)]), assign(o, { key: key(R) }));
    s += hdim(L.xo, R.xo, yO, fmt(v[key(L)] + v.span + v[key(R)]), { fs: fs, cls: 'tx ov' });

    // extra top bar lengths above the beam, between the section marks and the chain dimension: typed in red with the
    // valid range in grey, a rule of the span in grey with the rule under it
    var xo = assign(o, { fs: fs * 0.85 });
    ['L', 'R'].forEach(function (k) {
      var x = extraTop(v, k); if (!x.n) return;
      var xc = k === 'L' ? S * x.len / v.span : S - S * x.len / v.span, a = k === 'L' ? 0 : xc, b = k === 'L' ? xc : S;
      s += line(xc, -560, xc, yX - ov, 'ex');
      s += hdim(a, b, yX, fmt(x.len), x.mode === 'typed' ? assign(xo, { key: k + 'xLen', prefer: k === 'L' ? 'after' : 'before' }) : { fs: xo.fs, cls: 'tx ov' });
      var lc = topChange(v, k), lapHere = lc.ch !== 'none' && lc.mode === 'x';
      var note = x.mode === 'typed' ? (o.ia ? 'min 100 \u00B7 max ' + v.span : '') : '= ' + x.basis;
      var nt0 = (x.mode === 'typed' ? '' : (lapHere ? 'EXTRA TOP + LAP POINT ' : 'EXTRA TOP ')) + note, nh = nt0.length * xo.fs * 0.72 * 0.56 / 2;
      var ncx = k === 'L' ? Math.min((a + b) / 2, b - nh - 30) : Math.max((a + b) / 2, a + nh + 30);   // a long note runs out over the support, where there is room
      if (note && LB) s += label(ncx, yX + 115, nt0, { fs: xo.fs * 0.72, cls: x.mode === 'typed' ? 'nm rng halo' : 'nm halo' });
    });

    // covers: beam top and bottom are placed after the bar tags (in a free gap); column or wall cover on its outer face (shown once)
    var co = assign(o, { fs: fs * 0.85 });
    var col = L.t === 'col' ? L : R.t === 'col' ? R : null;
    if (col) s += hdim(Math.min(col.X(col.w), col.X(col.w - c)), Math.max(col.X(col.w), col.X(col.w - c)), 1250, fmt(v.ccol), assign(co, { key: 'ccol', out: col.k === 'L' ? 'before' : 'after' }));

    // section marks, all looking right: B-B near the left end, A-A at mid-span, C-C near the right end.
    // On the page every mark has a tick box under it that shows or hides that section; a hidden section's mark is faded.
    // In an exported drawing only the marks of shown sections appear.
    var bx = cutX(v, 'B'), cx = cutX(v, 'C');   // B-B and C-C sit in the middle of each end zone, never closer than 700 to a support
    [['B', bx], ['A', S / 2], ['C', cx]].forEach(function (m) {
      var k = m[0], x = m[1], on = v['show' + k] !== false;
      if (!on && !o.ia) return;
      var g = line(x, -470, x, -200, 'sm') + arrow(x, -470, x + 280, fs) + label(x + 400, -470 + fs * 0.4, k, { fs: fs * 1.15, cls: 'sk' }) +
        line(x, D + 200 + bS, x, D + 460 + bS, 'sm') + arrow(x, D + 460 + bS, x + 280, fs) + label(x + 400, D + 460 + bS + fs * 0.4, k, { fs: fs * 1.15, cls: 'sk' });
      s += '<g class="sec' + (on ? '' : ' off') + '">' + g + '</g>';
      if (o.ia) {
        var bx = x - 60, by = D + 600 + bS, sz = 120;
        s += '<g class="sx" data-s="' + k + '" tabindex="0" role="checkbox" aria-checked="' + on + '" aria-label="Show section ' + k + '-' + k + '">' +
          '<rect class="hit" x="' + (bx - 40) + '" y="' + (by - 40) + '" width="' + (sz + 420) + '" height="' + (sz + 80) + '"/>' +
          '<rect class="box" x="' + bx + '" y="' + by + '" width="' + sz + '" height="' + sz + '" rx="16"/>' +
          (on ? poly([[bx + 26, by + 62], [bx + 50, by + 88], [bx + 96, by + 32]], 'tick') : '') +
          label(bx + sz + 180, by + 92, 'SHOW', { fs: fs * 0.75, cls: 'nm' }) + '</g>';
      }
    });

    // main bars: top and bottom run the span; each end anchors as worked out (drawn shape only, the numbers are in the notes)
    var yt = c + 35, yb = D - c - 35, rB = 50;
    function endPath(e, y, s1, dia, inset) {
      var X = e.X, a = anchorage(v, e.k, dia).mode, P = [[X(0), y]];
      var blocked = e.t === 'beam' && !e.under && y > e.Ds - c;          // the bar is below a shallower support's soffit: it cannot enter
      var bendAt = function (u1, leg) { var i, q; for (i = 0; i <= 6; i++) { q = i / 6 * Math.PI / 2; P.push([X(u1 - rB) + e.d * rB * Math.sin(q), y + s1 * rB * (1 - Math.cos(q))]); } P.push([X(u1), y + s1 * leg]); };
      if (blocked) { P = [[X(0), y]]; bendAt(-(c + 35), 300); return P; }
      var uF = e.w - c - 35 - (s1 < 0 ? 40 : 0) - (inset || 0);   // the bottom bar's bend sits 40 inside the top bar's, an extra bar's 80 inside, so the legs read separately
      if (a === 'ld') P.push([X(e.t === 'col' ? 600 : 330), y]);
      else if (a === 'cover') P.push([X(uF), y]);
      else if (a === 'bend') bendAt(uF, 300);
      else bendAt(uF, s1 > 0 ? (e.Ds - c - 35) - y : y - (c + 35));   // bent to the cover: top bar down, bottom bar up
      return P;
    }
    var X1 = function (mm) { return S * mm / v.span; }, OFF = 22, TK = 30;
    /**
     * The bar runs of side sd ('t' top, 'b' bottom) in its lap style:
     *  inline: every run on the one line, with a tick at each free bar end (the lap reads between the two ticks);
     *  offset: overlapping runs on parallel lines one bar apart;
     *  crank:  the bar going into mid-span sits one bar off the line over the lap and cranks back at 1:6.
     * Runs anchor into a support only where they reach it. Returns the drawing and the deepest line used.
     */
    function drawRuns(sd) {
      var top = sd === 't', y0 = top ? yt : yb, dir = top ? 1 : -1, style = v[sd + 'LapStyle'] || 'inline', grp = top ? 'top' : 'bot';
      var C = { L: barChange(v, sd, 'L'), R: barChange(v, sd, 'R') }, lv = [], lvl = 0, out = '';
      function tick(x, y, side) { return line(x, y, x + side * TK, y + dir * TK, 'br k-' + grp); }   // leans away from the bar, into the beam
      barRuns(v, sd).forEach(function (r) {
        var i = 0;
        if (style === 'offset') { while (lv[i] && lv[i].some(function (q) { return r.a < q.b - 1 && r.b > q.a + 1; })) i++; (lv[i] = lv[i] || []).push(r); }
        lvl = Math.max(lvl, i);
        var y = y0 + dir * OFF * i, inset = 30 * i, P = [];
        if (r.ancL) P = endPath(L, y, dir, r.d, inset).reverse();
        else if (style === 'crank' && r.lapL) { var cl = X1(Math.min(r.a + C.L.lap, v.span)); P = [[X1(r.a), y + dir * OFF], [cl, y + dir * OFF], [cl + 6 * OFF, y]]; }
        else P = [[X1(r.a), y]];
        if (r.ancR) P = P.concat(endPath(R, y, dir, r.d, inset));
        else if (style === 'crank' && r.lapR) { var cr = X1(Math.max(r.b - C.R.lap, 0)); P = P.concat([[cr - 6 * OFF, y], [cr, y + dir * OFF], [X1(r.b), y + dir * OFF]]); }
        else P.push([X1(r.b), y]);
        out += poly(P, 'br k-' + grp);
        if (style === 'inline') { if (!r.ancL) out += tick(X1(r.a), y, -1); if (!r.ancR) out += tick(X1(r.b), y, 1); }
      });
      return { svg: out, lvl: style === 'crank' && (C.L.ch !== 'none' || C.R.ch !== 'none') ? 1 : lvl, C: C };
    }
    var TR = drawRuns('t'), BR = drawRuns('b');
    s += TR.svg + BR.svg;
    var yX0 = yt + OFF * TR.lvl, ybX0 = yb - OFF * BR.lvl;   // the innermost main lines; extras hang inside them
    // face bars: straight, 150 into each support (or stopping inside the beam where a shallower support beam is in the way)
    var fys = spread(v.faceN + 2, yt, yb).slice(1, -1);
    fys.forEach(function (y) {
      function tip(e) { return e.t === 'beam' && !e.under && y > e.Ds - c ? e.X(-(c + 35)) : e.X(150); }
      s += line(tip(L), y, tip(R), y, 'fb k-face');
    });
    var bo = assign(o, { fs: fs * 0.8 }), cw = bo.fs * MONO_EM, busy = [];
    // extra top bars over each support: under the top bar (lower again in a second layer, held on spacer bars),
    // anchored by the same rule as the main top bars, cut off in the span at their length, to the span's scale like the links
    var XT = {};
    [L, R].forEach(function (e) {
      var x = extraTop(v, e.k); XT[e.k] = x; if (!x.n) return;
      var lay = layersAt(v, e.k), y = yX0 + (lay.second ? 72 : 40), xc = e.k === 'L' ? X1(x.len) : S - X1(x.len);
      x.xc = xc; x.y = y;
      s += poly([[xc, y]].concat(endPath(e, y, 1, x.dia, 80 + 30 * TR.lvl)), 'br k-xtop');
      if (lay.second) spacers(v, 0, x.len, lay.need).at.forEach(function (mm) {
        s += '<circle class="bd k-spc" cx="' + n(e.k === 'L' ? X1(mm) : S - X1(mm)) + '" cy="' + n(yX0 + 36) + '" r="15"/>';
      });
    });
    // bottom extras over mid-span: above the bottom bars (higher again in a second layer, on spacer bars), curtailed at their
    // cut-off from each support face, to the span's scale
    var blay = botLayersAt(v, v.span / 2), ybx = ybX0 - (blay.second ? 72 : 40);
    if (XB.n) {
      var xa0 = X1(XB.cut.L), xb0 = S - X1(XB.cut.R);
      s += line(xa0, ybx, xb0, ybx, 'br k-xbot');
      if (blay.second) spacers(v, XB.cut.L, v.span - XB.cut.R, blay.need).at.forEach(function (mm) {
        s += '<circle class="bd k-spc" cx="' + n(X1(mm)) + '" cy="' + n(ybX0 - 36) + '" r="15"/>';
      });
    }
    // a tag of coloured runs, centred on x: [[parts, group], ...]; editable numbers keep the edit colour
    function partsLen(parts) { return parts.reduce(function (a, p) { return a + (typeof p === 'string' ? p.length : fmt(v[p.k]).length); }, 0); }
    function tag(x, y, runs) {
      var total = runs.reduce(function (a, r) { return a + partsLen(r[0]); }, 0), x0 = x - total * cw / 2, out = '';
      runs.forEach(function (r) { var w = partsLen(r[0]) * cw; out += spec(v, x0 + w / 2, y, r[0], assign(bo, { cls: 'tx gt k-' + r[1] + ' halo' })); x0 += w; });
      busy.push([x - total * cw / 2 - 40, x + total * cw / 2 + 40, y < 0 ? 't' : 'b', 'tag']);   // which side of the beam the tag is on
      return out;
    }
    function runsW(runs) { return runs.reduce(function (a, r) { return a + partsLen(r[0]); }, 0) * cw; }
    /** Three tags on a side (left, mid, right) at height y: ends near their extras (or 800 in), kept clear of the mid tag. */
    function tagRow(y, midRuns, endRuns, endMid) {
      var midHalf = runsW(midRuns) / 2, out = tag(S / 2, y, midRuns);
      ['L', 'R'].forEach(function (k) {
        var runs = endRuns(k), half = runsW(runs) / 2, mid = endMid(k), room = S / 2 - midHalf - 80 - half;
        var cxT = k === 'L' ? Math.min(Math.max(mid, half + 60), room) : Math.max(Math.min(mid, S - half - 60), S - room);
        out += tag(cxT, y, runs);
      });
      return out;
    }
    // top bar tags above the beam: "3-T16 TOP" mid; each end its own bars (the same as mid until set apart), "+ 2-T25 EXTRA" where it has them
    if (LB) s += tagRow(-55, [[[{ k: 'topN' }, '-T', { k: 'topDia' }, ' TOP'], 'top']], function (k) {
      var runs = [[[{ k: k + 'tN' }, '-T', { k: k + 'tDia' }, ' TOP'], 'top']];
      if (XT[k].n) runs.push([[' + ', { k: k + 'xN' }, '-T', { k: k + 'xDia' }, ' EXTRA'], 'xtop']);
      return runs;
    }, function (k) { return XT[k].n ? (k === 'L' ? XT[k].xc / 2 : (S + XT[k].xc) / 2) : (k === 'L' ? 800 : S - 800); });
    // bottom bar tags below the beam: "3-T16 BOTTOM + 2-T20 EXTRA" mid (the extras sit over mid-span); each end its own bars
    var midB = [[[{ k: 'botN' }, '-T', { k: 'botDia' }, ' BOTTOM'], 'bot']];
    if (XB.n) midB.push([[' + ', { k: 'bxN' }, '-T', { k: 'bxDia' }, ' EXTRA'], 'xbot']);
    if (LB) s += tagRow(D + 130, midB, function (k) { return [[[{ k: k + 'bN' }, '-T', { k: k + 'bDia' }, ' BOTTOM'], 'bot']]; }, function (k) { return k === 'L' ? 800 : S - 800; });
    if (fys.length && LB) s += spec(v, 2750, (yt + yb) / 2 + 40, [{ k: 'faceN' }, '-T', { k: 'faceDia' }, ' EACH FACE'], assign(bo, { cls: 'tx gt k-face halo' }));

    // laps: a small dimension for each lap, "LAP 800", on its own row outside the beam. Top: above the beam, under the
    // extra-bar lengths; its lap point is dimensioned higher up when it is not the extra bars' cut-off. Bottom: under the
    // bottom tags, saying where the lap sits; the bottom extras' cut-offs on the row above it.
    var lpo = assign(o, { fs: fs * 0.62 });
    function lapDim(sd, k, c, y, below) {
      var a = Math.max(0, k === 'L' ? c.at - c.lap : v.span - c.at), b = Math.min(v.span, k === 'L' ? c.at : v.span - c.at + c.lap), xa = X1(a), xb = X1(b);
      var txt = 'LAP ' + fmt(Math.round(b - a)) + (sd === 'b' ? (c.mode === 'face' ? ' FROM FACE' : ' TO ' + (c.basis || fmt(c.at))) : '');
      if (sd === 'b') { var lcx = inSpan((xa + xb) / 2, txt, lpo.fs), lhw = txt.length * lpo.fs * MONO_EM / 2; busy.push([Math.min(xa, lcx - lhw) - 40, Math.max(xb, lcx + lhw) + 40, 'b']); }   // the bottom cover keeps clear
      return line(xa, y - 40, xa, y + 30, 'ex') + line(xb, y - 40, xb, y + 30, 'ex') + line(xa, y, xb, y, 'dm') + ticks(xa, y, xb, y, lpo.fs * 0.32, 'tk') +
        label(inSpan((xa + xb) / 2, txt, lpo.fs), below ? y + lpo.fs * 1.15 : y - lpo.fs * 0.45, txt, assign(lpo, { cls: 'tx gt k-' + (sd === 't' ? 'top' : 'bot') + ' halo' }));
    }
    ['L', 'R'].forEach(function (k) {
      var c = TR.C[k]; if (c.ch === 'none') return;
      if (LB) s += lapDim('t', k, c, yLapRow, false);
      if (!(c.mode === 'x' && XT[k].n)) {
        var xp = k === 'L' ? X1(c.at) : S - X1(c.at), p0 = k === 'L' ? 0 : xp, p1 = k === 'L' ? xp : S;
        s += line(xp, -560, xp, yLapDim - ov, 'ex');
        s += hdim(p0, p1, yLapDim, fmt(c.at), c.mode === 'typed' ? assign(xo, { key: k + 'lapLen', prefer: k === 'L' ? 'after' : 'before' }) : { fs: xo.fs, cls: 'tx ov' });
        // the note sits beside the dimension, towards mid-span, so it never meets the extra-length dimension under it
        var nt2 = 'LAP POINT' + (c.basis ? ' = ' + c.basis : ''), nw = nt2.length * xo.fs * 0.72 * 0.5;
        s += label(k === 'L' ? p1 + 60 + nw / 2 : p0 - 60 - nw / 2, yLapDim - xo.fs * 0.1, nt2, { fs: xo.fs * 0.72, cls: 'nm' });
      }
    });
    if (LB) ['L', 'R'].forEach(function (k) { var c = BR.C[k]; if (c.ch !== 'none') s += lapDim('b', k, c, yBL, false); });
    // bottom extras: their cut-off from each support face, dimensioned just above them ("750 = 0.15L"; a typed one in red)
    if (XB.n && LB) ['L', 'R'].forEach(function (k) {
      var cut = XB.cut[k], x0 = k === 'L' ? 0 : S - X1(cut), x1 = k === 'L' ? X1(cut) : S; if (cut <= 0) return;
      s += line(x0, yBC, x1, yBC, 'dm') + ticks(x0, yBC, x1, yBC, lpo.fs * 0.32, 'tk');
      var typedB = XB.mode[k] === 'typed', ctx = typedB ? fmt(cut) + ' CUT-OFF' : fmt(cut) + ' = ' + XB.basis[k] + ' CUT-OFF', tx0 = inSpan((x0 + x1) / 2, ctx, lpo.fs), ty0 = yBC - lpo.fs * 0.45;
      var chw = ctx.length * lpo.fs * MONO_EM / 2;
      busy.push([Math.min(x0, x1, tx0 - chw) - 40, Math.max(x0, x1, tx0 + chw) + 40, 'b']);   // the bottom cover keeps clear of the dimension and its label
      s += typedB ? spec(v, tx0, ty0, [{ k: k + 'bxLen' }, ' CUT-OFF'], assign(lpo, { cls: 'tx gt k-xbot halo' }))
        : label(tx0, ty0, ctx, assign(lpo, { cls: 'tx gt k-xbot halo' }));
    });

    // beam top and bottom covers: one vertical dimension each, at the x furthest from every tag and section mark
    // each cover dimension avoids the section marks and the tags on its own side of the beam (its value is about 80 wide)
    function freeX(side) {
      var best = 3450, score = -1;   // a cover value sits beyond the tag row, so only its leader has to pass between tags
      // each section mark takes its line, arrow and letter: from just before the line to past the letter
      var marks = [bx, S / 2, cx].map(function (m) { return [m - 80, m + 400 + fs * 0.9, side]; });
      for (var xq = 250; xq <= S - 250; xq += 25) {
        var d = Math.min.apply(null, marks.map(function (r) { return xq < r[0] ? r[0] - xq : xq > r[1] ? xq - r[1] : -1; }).concat(busy.filter(function (r) { return r[2] === side; })
          .map(function (r) { var lo = r[3] === 'tag' ? 25 : 0, a0 = r[0] + lo, b0 = r[1] - lo; return xq < a0 ? a0 - xq : xq > b0 ? xq - b0 : -1; })));
        if (d > score + 1e-6 || (Math.abs(d - score) < 1e-6 && Math.abs(xq - 3450) < Math.abs(best - 3450))) { score = d; best = xq; }
      }
      return clearX(best);
    }
    s += vdimOut(0, c, freeX('t'), fmt(v.ctop), assign(co, { key: 'ctop', run: LB ? 2.3 : 1.0 }), 'above') + vdimOut(D - c, D, freeX('b'), fmt(v.cbot), assign(co, { key: 'cbot', run: LB ? (150 + 76 * TS) / co.fs : 1.0 }), 'below');

    // link zones dimensioned under the beam: typed lengths in red with their valid range in grey beneath, worked-out lengths
    // in grey; the link size and spacing under each zone
    var yz = 1850 + bS, lo = assign(o, { fs: fs * 0.85 }), ye = D + 760 + bS, rg = linkRange(v), hw = 13 * lo.fs * MONO_EM / 2 + 20;
    var lens = { lEnd: EZ.len, lLeft: v.lLeft, mid: Math.max(0, v.span - 2 * EZ.len), right: Math.max(0, v.span - v.lLeft) };
    var typed = function (k) { return k === 'lLeft' || (k === 'lEnd' && linkMode(v) === 'three'); };
    zones.forEach(function (z, i) { s += line(z.a, ye, z.a, yz + ov, 'ex') + (i === zones.length - 1 ? line(z.b, ye, z.b, yz + ov, 'ex') : ''); });
    var lastR = null, lastDrop = false, anyDrop = false;
    zones.forEach(function (z, i) {
      var key = z.len && typed(z.len) ? z.len : null, val = z.len ? lens[z.len] : v.span;
      if (z.b - z.a < 1) return;   // an end zone covering the whole span leaves no mid zone to dimension
      s += hdim(z.a, z.b, yz, fmt(val), key ? assign(lo, { key: key, prefer: i ? 'before' : 'after' }) : { fs: lo.fs, cls: 'tx ov' });
      // an end zone set by 2D, L/3 or a % says so under its length; the % is editable
      // end zones that cover the span: say why the span has one spacing (the % stays editable)
      if (z.whole && LB) s += EZ.basis === '2D' ? label((z.a + z.b) / 2, yz + 110, '2D EACH END \u2265 HALF SPAN: ONE SPACING', { fs: lo.fs * 0.72, cls: 'nm' })
        : spec(v, (z.a + z.b) / 2, yz + 110, [{ k: 'lPct' }, '% EACH END \u2265 HALF SPAN: ONE SPACING'], assign(lo, { fs: lo.fs * 0.72 }));
      if (z.len === 'lEnd' && EZ.basis && LB) s += EZ.basis === '2D' || EZ.basis === 'L/3' ? label((z.a + z.b) / 2, yz + 110, '= ' + EZ.basis + (EZ.capped ? ', HALF SPAN' : ''), { fs: lo.fs * 0.72, cls: 'nm' })
        : spec(v, (z.a + z.b) / 2, yz + 110, ['= ', { k: 'lPct' }, '% OF SPAN'], assign(lo, { fs: lo.fs * 0.72 }));
      if (key && o.ia && i === 0 && LB) s += label((z.a + z.b) / 2, yz + 110, rg[key][0] <= rg[key][1] ? 'min ' + rg[key][0] + ' · max ' + rg[key][1] : 'span too short', { fs: lo.fs * 0.72, cls: 'nm rng' });
      var xl2 = (z.a + z.b) / 2; if (i === 0) xl2 = Math.max(xl2, hw); if (i === zones.length - 1 && zones.length > 1) xl2 = Math.min(xl2, S - hw);
      // a note that would touch the one before it (large text, short zones) drops a line
      var parts = [LK.zones[z.z].n + ' NOS T', { k: 'ldia' }, ' @ ', { k: z.k }, ' C/C'], half2 = partsLen(parts) * lo.fs * MONO_EM / 2 + 30;
      var yS = yz + 250 + (lastR !== null && xl2 - half2 < lastR && !lastDrop ? lo.fs * 1.2 : 0);
      lastDrop = yS > yz + 250; anyDrop = anyDrop || (lastDrop && LB); lastR = xl2 + half2;
      if (LB) s += spec(v, xl2, yS, parts, assign(lo, { cls: 'tx gt k-' + linkGroup(v, z.k) }));
    });

    // where the first and last links stand, editable: under the left end of the link zones, clear of the title
    if (LB) s += spec(v, 1000, yz + 390, ['1ST LINK ', { k: 'lStart' }, ' FROM FACE'], assign(lo, { fs: lo.fs * 0.72 }));

    // anchorage at each support: the length the top and bottom bars take into it, measured from the support face, as a
    // dimension over (top) or under (bottom) the bar: "LD 800" when straight, the straight run when bent or to the cover.
    // Each bent leg has its own vertical dimension: inside a column or wall, stepping in from the bars; outside a support
    // beam's outer face, where there is room. The full sum ("LD 800: 860 + 240 LEG") goes in the support's caption.
    var ao = assign(o, { fs: fs * 0.62 }), ldo = assign(o, { fs: fs * 0.72 }), gapL = 1.9 * ldo.fs, CAP = {}, nOut = { L: 0, R: 0 };
    function anchText(e, a, bl, dia) {
      var plus = e.t === 'col' && v[e.k + 'colx'] === 'ld10';
      if (a.mode === 'ld') return 'LD ' + a.ld + ' = ' + (plus ? '(' + v.ldF + '+10)' : v.ldF) + ' × T' + dia;
      if (a.mode === 'cover') return 'STRAIGHT ' + a.avail + ' TO COVER (LD ' + a.ld + ')';
      return 'LD ' + a.ld + ': ' + bl.run + ' + ' + bl.leg + ' LEG' + (bl.minRules ? ' (MIN ' + bl.minBasis + ')' : '');
    }
    ends.forEach(function (e) {
      var legs = [], lines = [], uF0 = e.w - c - 35;
      [['top', topZone(v, e.k).d, -250, 1], ['bot', barZone(v, 'b', e.k).d, Math.max(D, e.t === 'beam' ? e.Ds : D) + 170, -1]].forEach(function (q) {
        var a = anchorage(v, e.k, q[1]), yb2 = q[3] > 0 ? yt : yb;
        if (q[3] < 0 && e.t === 'beam' && !e.under && yb2 > e.Ds - c) return;   // blocked by a shallower support: no anchorage into it
        var uF = uF0 - (q[3] < 0 ? 40 : 0), u1 = a.mode === 'ld' ? (e.t === 'col' ? 600 : 330) : uF, bl = bendLeg(v, e.k, q[1]);
        lines.push({ who: q[0] === 'top' ? 'TOP' : 'BOT', text: anchText(e, a, bl, q[1]) });
        if (bl.leg) legs.push({ y0: q[3] > 0 ? yt : (a.mode === 'bend' ? yb - 300 : c + 35), y1: q[3] > 0 ? (a.mode === 'bend' ? yt + 300 : e.Ds - c - 35) : yb, u: uF, val: bl.leg, grp: q[0] });
        if (!LB) return;
        var x0 = e.X(0), x1 = e.X(u1), lo2 = Math.min(x0, x1), hi2 = Math.max(x0, x1), y = q[2];
        s += line(x1, q[3] > 0 ? -40 : Math.max(D, e.t === 'beam' ? e.Ds : D) + 40, x1, y + (q[3] > 0 ? -ov : ov), 'ex');
        s += line(lo2, y, hi2, y, 'dm') + ticks(lo2, y, hi2, y, ldo.fs * 0.32, 'tk');
        s += label((lo2 + hi2) / 2, y - ldo.fs * 0.4, a.mode === 'ld' ? 'LD ' + a.ld : String(a.avail), assign(ldo, { cls: 'tx gt k-' + q[0] }));
      });
      // extra top bars anchor by the same rule at their own size: their own note and their own leg
      var xt = XT[e.k];
      if (xt && xt.n) {
        var ax = anchorage(v, e.k, xt.dia), blx = bendLeg(v, e.k, xt.dia);
        lines.push({ who: 'EXTRA', text: anchText(e, ax, blx, xt.dia) });
        if (blx.leg) legs.push({ y0: xt.y, y1: ax.mode === 'bend' ? xt.y + 300 : e.Ds - c - 35, u: uF0 - 80 - 30 * TR.lvl, val: blx.leg, grp: 'xtop' });
      }
      CAP[e.k] = lines;
      if (!LB) return;
      var inside = e.t === 'col';
      legs.forEach(function (lg, i) {
        var u = inside ? uF0 - 150 - i * gapL : e.w + 150 + i * gapL, xl = e.X(u), sg = u > lg.u ? 1 : -1;
        // short extension lines from the leg's two ends to its dimension
        s += line(e.X(lg.u + sg * 20), lg.y0, e.X(u + sg * 40), lg.y0, 'ex') + line(e.X(lg.u + sg * 20), lg.y1, e.X(u + sg * 40), lg.y1, 'ex');
        s += line(xl, lg.y0, xl, lg.y1, 'dm') + ticks(xl, lg.y0, xl, lg.y1, ldo.fs * 0.32, 'tk');
        // the value sits on the side away from the bars: towards the beam inside a column, outwards beyond a support beam
        var right = (inside ? -1 : 1) * e.d > 0;
        s += label(xl + (right ? ldo.fs * 1.05 : -ldo.fs * 0.4), (lg.y0 + lg.y1) / 2, fmt(lg.val), assign(ldo, { cls: 'tx gt k-' + lg.grp + ' halo', rot: -90 }));
      });
      if (!inside) nOut[e.k] = legs.length;
    });

    // a support beam's depth beside it, outside (beyond any leg dimensions). The main beam's depth is not dimensioned
    // here: the cross-sections carry it.
    ends.forEach(function (e) {
      e.uOut = 500;
      if (e.t !== 'beam') return;
      e.uOut = Math.max(500, nOut[e.k] ? 150 + nOut[e.k] * gapL + 200 : 0);
      var x = e.X(e.w + e.uOut);
      s += line(e.xo + e.d * g, 0, x + e.d * ov, 0, 'ex') + line(e.xo + e.d * g, e.Ds, x + e.d * ov, e.Ds, 'ex') + vdim(0, e.Ds, x, fmt(v[e.k + 'beamD']), assign(o, { key: e.k + 'beamD' }));
    });

    // names and captions, aligned away from the beam so a long note never runs back over the span: the support's name,
    // the anchorage choice (a menu on the page), then one Ld note each for the top, bottom and extra bars
    var capW = { L: 0, R: 0 }, CW = 0.56;   // average width of the condensed caption face, in em
    ends.forEach(function (e) {
      var right = e.k === 'R', ax2 = right ? S + 80 : -80, an2 = right ? 'start' : 'end';
      var yN = e.t === 'col' ? cB + 270 : Math.max(D, e.Ds) + 430;   // a support beam's name clears the bottom anchorage dimension above it
      var name = e.t === 'col' ? 'COLUMN / WALL' : 'SUPPORT BEAM';
      s += label(ax2, yN, name, { fs: fs * 0.9, cls: 'nm', anchor: an2 });
      capW[e.k] = name.length * fs * 0.9 * CW;
      if (!LB) return;
      // anchorage choice under the name (on the page: click to change Auto / Straight / Bent, and Ld or Ld + 10 x bar size at a column)
      var at = anchorage(v, e.k, topZone(v, e.k).d), ab = anchorage(v, e.k, barZone(v, 'b', e.k).d), lx = e.t === 'col' && v[e.k + 'colx'] === 'ld10' ? 'LD+10Ø' : 'LD';
      var txt = at.mode === ab.mode ? ANCH_NAME[at.mode].replace('LD', lx) : 'TOP ' + ANCH_NAME[at.mode].replace('LD', lx) + ' · BOT ' + ANCH_NAME[ab.mode].replace('LD', lx);
      txt += at.override || ab.override ? '' : ' (AUTO)';
      var cy2 = yN + fs * 1.1, fc = fs * 0.62;
      if (!o.ia) s += label(ax2, cy2, txt, { fs: fc, cls: 'nm', anchor: an2 });
      else {
        var w2 = (txt.length + 2) * fc * CW;
        s += '<g class="ch" data-ch="' + e.k + '" tabindex="0" role="button" aria-label="Change the ' + (right ? 'right' : 'left') + ' end anchorage, now ' + esc(txt.toLowerCase()) + '">' +
          '<rect class="hit" x="' + n((right ? ax2 : ax2 - w2) - 30) + '" y="' + n(cy2 - fc * 1.2) + '" width="' + n(w2 + 60) + '" height="' + n(fc * 1.7) + '" rx="12"/>' +
          label(ax2, cy2, txt + ' ▾', { fs: fc, cls: 'nm chx', anchor: an2 }) + '</g>';
      }
      capW[e.k] = Math.max(capW[e.k], (txt.length + 2) * fc * CW);
      // the Ld notes: one line each, identical notes share a line ("TOP & BOT")
      var merged = [];
      (CAP[e.k] || []).forEach(function (q) { var same = merged.filter(function (m) { return m.text === q.text; })[0]; if (same) same.who += ' & ' + q.who; else merged.push({ who: q.who, text: q.text }); });
      merged.forEach(function (q, i) {
        var t2 = q.who + '  ' + q.text;
        s += label(ax2, cy2 + fc * (1.75 + 1.4 * i), t2, { fs: fc, cls: 'nm', anchor: an2 });
        capW[e.k] = Math.max(capW[e.k], t2.length * fc * CW);
      });
    });
    // the title moves down when a link note dropped a line or the text is larger, and the drawing grows to match
    var tSh = (anyDrop ? lo.fs * 1.3 : 0) + Math.max(0, TS - 1) * 260 + bS;
    s += label(S / 2, 2420 + tSh, 'L-SECTION', { fs: fs * 1.4, cls: 'tt' }) + line(S / 2 - 430, 2465 + tSh, S / 2 + 430, 2465 + tSh, 'ob') + label(S / 2, 2610 + tSh, beamClass(v).toUpperCase() + ' BEAM  ·  NTS', { fs: fs * 0.85, cls: 'nm' });
    // the sheet: room for each end's outside dimensions and caption, and for every row of dimensions above
    var x0 = Math.min(L.xo - (L.t === 'col' ? 550 : L.uOut + 250), -80 - capW.L - 60), x1 = Math.max(R.xo + (R.t === 'col' ? 550 : R.uOut + 250), S + 80 + capW.R + 60);
    return wrapSVG(n(x0) + ' ' + n(yTop) + ' ' + n(x1 - x0) + ' ' + n(2710 + tSh - yTop), s, opt, 'Beam L-section, ' + beamClass(v) + ' beam');
  }

  /** A cross-section (A-A by default): the beam cut through, with its cover line and its covers dimensioned. */
  function xSection(v, opt) {
    opt = opt || {}; v = withZones(v);
    var L = opt.letter || 'A';
    // drawn width: 300 for a 2-legged link, wider for 4 and 6 legs (as in the standard detail), and wide enough
    // that the larger bar row never crowds; the typed width only changes the number
    // the top bars this cut passes through: main bars, plus the extras of any end whose extra length reaches the cut
    var cutMm = cutX(v, L) * v.span / 5000, MA = mainsAt(v, cutMm), XE = extrasAt(v, L), TL = topLayers(v, XE, MA);
    var BL = botLayersAt(v, cutMm), BM = barsAt(v, 'b', cutMm);
    var nMax = Math.max(TL.row1.length, TL.row2.length, BL.row1.length, BL.row2.length, 2), lg = v.legs === 6 || v.legs === 4 ? v.legs : 2;
    var TS = Math.min(1.3, Math.max(0.7, (v.textScale || 100) / 100)), LB = v.showLabels !== false;
    var fs = 75 * TS, o = { fs: fs, ia: !!opt.ia }, B = Math.max(lg === 6 ? 660 : lg === 4 ? 480 : 300, 2 * 67 + (nMax - 1) * 36), D = 900, c = 45, s = '';
    s += '<rect class="ob" x="0" y="0" width="' + B + '" height="' + D + '"/>';
    s += '<rect class="cl" x="' + c + '" y="' + c + '" width="' + (B - 2 * c) + '" height="' + (D - 2 * c) + '"/>';
    // reinforcement, drawn in presentation sizes: links 12 wide in outline, bars 20 across, bends formed round the bars
    var t = 12, rb = 10, R = rb + t / 2, Lh = 62, off = c + t + rb, x0 = off, x1 = B - off, y0 = off, y1 = D - off;
    var tops = spread(TL.row1.length, x0, x1), bots = spread(BL.row1.length, x0, x1), legs = v.legs === 6 || v.legs === 4 ? v.legs : 2, inner = innerLegs(legs, bots, x0, x1), i;
    // links in the colour of the zone this cut is in; every bar dot in its group's colour
    var lkg = 'k-' + linkGroup(v, sectionSpacingKey(v, L));
    s += outline(closedLink(x0, y0, x1, y1, R, Lh), t, 'lkb ' + lkg);
    for (i = 0; i + 1 < inner.length; i += 2) s += outline(openLink(inner[i], inner[i + 1], y0, y1, R, Lh * 0.8), t, 'lkb ' + lkg);
    function dot(x, y, r, grp) { return '<circle class="bd k-' + grp + '" cx="' + n(x) + '" cy="' + n(y) + '" r="' + r + '"/>'; }
    tops.forEach(function (x, j) { s += dot(x, y0, rb, TL.row1[j].x ? 'xtop' : 'top'); });
    // a second layer hangs under the first on a spacer (pin) bar, seen along its length: a bar across the width between the rows
    var y2 = y0 + 2 * rb + 20;
    if (TL.row2.length) {
      s += '<rect class="spb k-spc" x="' + n(c) + '" y="' + n(y0 + rb) + '" width="' + n(B - 2 * c) + '" height="20" rx="10"/>';   // cover to cover
      (TL.row2.length === 1 ? [(x0 + x1) / 2] : spread(TL.row2.length, x0, x1)).forEach(function (x) { s += dot(x, y2 + 0, rb, 'xtop'); });
    }
    bots.forEach(function (x, j) { s += dot(x, y1, rb, BL.row1[j].x ? 'xbot' : 'bot'); });
    // a second bottom row sits above the first on a spacer (pin) bar, cover to cover
    if (BL.row2.length) {
      s += '<rect class="spb k-spc" x="' + n(c) + '" y="' + n(y1 - rb - 20) + '" width="' + n(B - 2 * c) + '" height="20" rx="10"/>';
      (BL.row2.length === 1 ? [(x0 + x1) / 2] : spread(BL.row2.length, x0, x1)).forEach(function (x) { s += dot(x, y1 - 2 * rb - 20, rb, 'xbot'); });
    }
    spread(v.faceN + 2, y0, y1).slice(1, -1).forEach(function (y) { s += dot(c + t + 7, y, 7, 'face') + dot(B - c - t - 7, y, 7, 'face'); });
    // width above, depth beside
    s += line(0, -40, 0, -300, 'ex') + line(B, -40, B, -300, 'ex') + hdim(0, B, -220, fmt(v.B), assign(o, { key: 'B' }));
    s += line(B + 40, 0, B + 340, 0, 'ex') + line(B + 40, D, B + 340, D, 'ex') + vdim(0, D, B + 260, fmt(v.D), assign(o, { key: 'D' }));
    // top and bottom cover on the left, side cover underneath
    var co = assign(o, { fs: fs * 0.9 }), xl = -230;
    s += line(-40, 0, xl - 70, 0, 'ex') + line(-40, c, xl - 70, c, 'ex') + line(-40, D - c, xl - 70, D - c, 'ex') + line(-40, D, xl - 70, D, 'ex');
    s += vdimOut(0, c, xl, fmt(v.ctop), assign(co, { key: 'ctop' }), 'above') + vdimOut(D - c, D, xl, fmt(v.cbot), assign(co, { key: 'cbot' }), 'below');
    var yb = D + 270;   /* below the bottom-cover value, so the two never meet */
    s += line(0, D + 40, 0, yb + 70, 'ex') + line(c, D + 40, c, yb + 70, 'ex');
    s += hdim(0, c, yb, fmt(v.cside), assign(co, { key: 'cside', out: 'before' }));   // one side is enough: both sides take the same cover
    // the bars in this section, one line each, under the drawing
    // the bars in this section, one line each in its group's colour: [parts, group]
    var so = assign(o, { fs: 62 * TS }), rows = [], y = 1290;
    // the main top bars this cut passes through, by zone: editable when the count is the zone's own, plain when only part of it
    function zoneRows(list, sd) {
      var byZone = {}, word = sd === 't' ? ' TOP' : ' BOTTOM';
      list.forEach(function (b) { var q = byZone[b.zone + b.dia] = byZone[b.zone + b.dia] || { zone: b.zone, dia: b.dia, n: 0 }; q.n++; });
      Object.keys(byZone).forEach(function (key2, i) {
        var q = byZone[key2], kn = q.zone === 'M' ? (sd === 't' ? 'topN' : 'botN') : q.zone + sd + 'N', kd = q.zone === 'M' ? (sd === 't' ? 'topDia' : 'botDia') : q.zone + sd + 'Dia';
        var lead = i ? '+ ' : '', tail = word + (q.zone === 'M' ? '' : q.zone === 'L' ? ' (LEFT END)' : ' (RIGHT END)');
        rows.push([[lead].concat(q.n === v[kn] ? [{ k: kn }] : [String(q.n)], ['-T', { k: kd }, tail]).filter(function (p) { return p !== ''; }), sd === 't' ? 'top' : 'bot']);
      });
    }
    zoneRows(MA, 't');
    XE.forEach(function (k) {
      var inTwo = TL.row2.some(function (b) { return b.k === k; });
      rows.push([['+ ', { k: k + 'xN' }, '-T', { k: k + 'xDia' }, ' EXTRA TOP' + (inTwo ? ', 2ND LAYER' : '')], 'xtop']);
    });
    if (TL.second) rows.push([['T' + spacers(v, 0, 1, TL.need).dia + ' SPACER L=' + (v.B - 2 * v.cside) + ' @ ', { k: 'spcS' }, ' C/C'], 'spc']);   // cover to cover
    zoneRows(BM, 'b');
    if (BL.row1.concat(BL.row2).some(function (b) { return b.x; })) rows.push([['+ ', { k: 'bxN' }, '-T', { k: 'bxDia' }, ' EXTRA BOTTOM' + (BL.second ? ', 2ND LAYER' : '')], 'xbot']);
    if (BL.second) rows.push([['T' + spacers(v, 0, 1, BL.need).dia + ' SPACER L=' + (v.B - 2 * v.cside) + ' @ ', { k: 'spcS' }, ' C/C'], 'spc']);
    if (v.faceN > 0) rows.push([[{ k: 'faceN' }, '-T', { k: 'faceDia' }, ' EACH FACE'], 'face']);
    rows.push([[{ k: 'legs' }, 'L-T', { k: 'ldia' }, ' @ ', { k: sectionSpacingKey(v, L) }, ' C/C'], linkGroup(v, sectionSpacingKey(v, L))]);
    if (LB) rows.forEach(function (r) { s += spec(v, B / 2, y, r[0], assign(so, { cls: 'tx gt k-' + r[1] })); y += 88 * TS; });
    y += 70;
    s += label(B / 2, y, 'SECTION ' + L + '-' + L, { fs: 90 * TS, cls: 'tt' }) + line(B / 2 - 265, y + 26, B / 2 + 265, y + 26, 'ob') + label(B / 2, y + 115 * TS, 'NTS', { fs: 64 * TS, cls: 'nm' });
    return wrapSVG('-460 -460 ' + (B + 920) + ' ' + (y + 175 * TS + 460), s, opt, 'Beam section ' + L + '-' + L);
  }

  /**
   * Bar colour groups. Each drawn bar, dot, link and tag carries a class k-<group>; the page maps it to a colour
   * (the theme's, or the user's pick) and an exported .svg bakes the colours in.
   * light / dark: the theme defaults, vivid and high contrast (top red / magenta, bottom blue / cyan, links green, face violet, spacer orange).
   */
  var GROUPS = [
    { k: 'top', name: 'Main top', light: '#E0201B', dark: '#FF5A52' },
    { k: 'xtop', name: 'Extra top', light: '#D0149A', dark: '#FF5CCB' },
    { k: 'face', name: 'Face', light: '#7A35E8', dark: '#B392FF' },
    { k: 'bot', name: 'Main bottom', light: '#1D4ED8', dark: '#6A97FF' },
    { k: 'xbot', name: 'Extra bottom', light: '#0891B2', dark: '#2ED6F2' },
    { k: 'lkEnd', name: 'Links, end zone', light: '#15803D', dark: '#2FD27A' },
    { k: 'lkMid', name: 'Links, mid zone', light: '#65A30D', dark: '#B6E84A' },
    { k: 'spc', name: 'Spacer / pin bar', light: '#F07800', dark: '#FFA640' }
  ];
  /** A colour the user typed or picked: #RGB or #RRGGBB only (anything else is ignored). */
  function okColor(c) { return typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c); }
  /** Styles baked into an exported .svg, so it looks right with no page around it; colours = the user's picks over the light theme. */
  function exportCSS(colors) {
    colors = colors || {};
    var g = GROUPS.map(function (G) {
      var c = okColor(colors[G.k]) ? colors[G.k] : G.light;
      return '.br.k-' + G.k + ',.fb.k-' + G.k + ',.lk.k-' + G.k + ',.lkb.k-' + G.k + '{stroke:' + c + '}.bd.k-' + G.k + ',.gt.k-' + G.k + ',.spb.k-' + G.k + '{fill:' + c + '}';
    }).join('');
    return [
      '.ob{fill:none;stroke:#8A949D;stroke-width:1.6px;vector-effect:non-scaling-stroke}',
      '.th,.ex,.dm{fill:none;stroke:#7A858F;stroke-width:0.8px;vector-effect:non-scaling-stroke}',
      '.tk{fill:none;stroke:#1B2530;stroke-width:1.4px;vector-effect:non-scaling-stroke}',
      '.cl{fill:none;stroke:#2E8B57;stroke-width:0.9px;stroke-dasharray:7 4;vector-effect:non-scaling-stroke}',
      '.lk{fill:none;stroke:#2F6DB5;stroke-width:1.1px;vector-effect:non-scaling-stroke}.lkt{fill:#2F6DB5}',
      '.lkb{fill:none;stroke:#2F6DB5;stroke-width:1px;stroke-linejoin:round;vector-effect:non-scaling-stroke}.bd{fill:#1B2530}.bt{fill:#1B2530}',
      '.br{fill:none;stroke:#1B2530;stroke-width:2px;stroke-linejoin:round;vector-effect:non-scaling-stroke}.fb{fill:none;stroke:#1B2530;stroke-width:1px;vector-effect:non-scaling-stroke}',
      '.spb{fill:#D9730D}',
      '.halo{paint-order:stroke;stroke:#FBFCFD;stroke-width:.3em;stroke-linejoin:round}',
      '.sm{fill:none;stroke:#1B2530;stroke-width:2.2px;vector-effect:non-scaling-stroke}.ah{fill:#1B2530}',
      '.jn{fill:none;stroke:#8A949D;stroke-width:1.2px;stroke-dasharray:10 6;vector-effect:non-scaling-stroke}',
      '.tx{font-family:"IBM Plex Mono",Consolas,"Courier New",monospace;fill:#1B2530}.ov{fill:#5B6772}.cv{fill:#2E8B57}',
      '.nm,.tt,.sk{font-family:"Barlow Condensed","Arial Narrow",Arial,sans-serif;letter-spacing:.06em;fill:#5B6772}',
      '.tt,.sk{font-weight:700;fill:#1B2530}', g
    ].join('');
  }
  var EXPORT_CSS = exportCSS({});

  root.BeamSections = { VERSION: VERSION, GROUPS: GROUPS, okColor: okColor, exportCSS: exportCSS, linkGroup: linkGroup, spacers: spacers, DEFAULTS: DEFAULTS, NAMES: NAMES, COVER: COVER, COUNT: COUNT, anchorage: anchorage, bendLeg: bendLeg, legMin: legMin, LEG_MIN: LEG_MIN, BS_P: BS_P, zk: zk, barZone: barZone, barChange: barChange, barRuns: barRuns, barsAt: barsAt, botLayersAt: botLayersAt, extraBot: extraBot, BXMODES: BXMODES, arrange: arrange, topZone: topZone, lapAt: lapAt, topChange: topChange, topRuns: topRuns, mainsAt: mainsAt, layersAt: layersAt, extraTop: extraTop, topLayers: topLayers, extrasAt: extrasAt, cutX: cutX, XMODES: XMODES, endZone: endZone, layoutMode: layoutMode, isEnds: isEnds, linkMode: linkMode, ENDS_MODES: ENDS_MODES, linkRange: linkRange, linkLayout: linkLayout, LINK_START: LINK_START, supportCase: supportCase, beamClass: beamClass, lSection: lSection, xSection: xSection, EXPORT_CSS: EXPORT_CSS };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.BeamSections;
})(typeof window !== 'undefined' ? window : globalThis);
