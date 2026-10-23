/*
 * Beam sections drawing module, v0.4.0
 * One source for the interactive page and for the standalone .svg files.
 *
 * The drawing is a fixed, not-to-scale template: geometry never follows the numbers the user types,
 * with these deliberate exceptions: each end is drawn as a column or a beam as chosen; a support beam is drawn flush
 * with the main beam, 200 deeper, or 200 shallower, depending on which typed depth is larger; and where the support
 * beam is the shallower one, the main beam either stops at its face or runs on under it to its far face, as chosen.
 * Sections A-A (mid-span), B-B (near the left end) and C-C (near the right end) can each be shown or hidden.
 * A typical simply supported beam. Either end rests on a vertical member (a column or a wall) or on another beam,
 * which gives four arrangements: column both ends (a primary beam), column one end and beam the other (a secondary
 * beam, either way round), beams both ends (a tertiary beam).
 * Each element is its own shape: the supports and the beam span.
 * Faces in the open are solid; a face shared by two elements (a junction) is dashed. No hatching.
 * The cover line is the combined outline offset inwards, so it turns cleanly at every junction.
 */
(function (root) {
  'use strict';
  var VERSION = '0.4.0';
  // each end keeps its column and its beam sizes, so switching an end back and forth loses nothing
  var DEFAULTS = { typeL: 'col', typeR: 'beam', LcolW: 900, LbeamW: 300, LbeamD: 900, RcolW: 900, RbeamW: 300, RbeamD: 900,
    span: 5000, D: 900, B: 300, ctop: 25, cbot: 40, cside: 25, ccol: 40,
    Lunder: 'stop', Runder: 'stop',          // a shallower support beam: the main beam 'stop's at its face or runs 'under' it
    showA: true, showB: true, showC: true };  // which cross-sections are shown
  var NAMES = { LcolW: 'left column or wall width', LbeamW: 'left support beam width', LbeamD: 'left support beam depth',
    RcolW: 'right column or wall width', RbeamW: 'right support beam width', RbeamD: 'right support beam depth',
    span: 'clear span', D: 'beam depth', B: 'beam width', ctop: 'top cover', cbot: 'bottom cover', cside: 'side cover', ccol: 'column or wall cover' };
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
    var t = '<text class="' + (o.cls || 'tx') + (o.key && COVER[o.key] ? ' cv' : '') + '" x="' + n(x) + '" y="' + n(y) + '" font-size="' + n(o.fs) + '" text-anchor="middle">' + esc(txt) + '</text>';
    if (!(o.key && o.ia)) return tr ? '<g' + tr + '>' + t + '</g>' : t;
    var w = txt.length * o.fs * MONO_EM;
    var hit = '<rect class="hit" x="' + n(x - w / 2 - o.fs * 0.45) + '" y="' + n(y - o.fs * 1.05) + '" width="' + n(w + o.fs * 0.9) + '" height="' + n(o.fs * 1.5) + '" rx="' + n(o.fs * 0.15) + '"/>';
    var ul = line(x - w / 2 - o.fs * 0.08, y + o.fs * 0.22, x + w / 2 + o.fs * 0.08, y + o.fs * 0.22, 'ul');
    return '<g class="ed' + (COVER[o.key] ? ' cvr' : '') + '" data-k="' + o.key + '" tabindex="0" role="button" aria-label="Edit ' + NAMES[o.key] + ', ' + esc(txt) + ' mm"' + tr + '>' + hit + t + ul + '</g>';
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
    var t = o.fs * 0.32, run = o.fs * 1.0, s = ticks(x, y1, x, y2, t, 'tk');
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

  /** How a support beam at end k ('L' or 'R') compares with the main beam: drawn flush, 200 deeper, or 200 shallower. */
  function supportCase(v, k) { var d = v[k + 'beamD']; return d > v.D ? 'deeper' : d < v.D ? 'shallower' : 'flush'; }
  /** Primary: column or wall both ends. Secondary: one of each. Tertiary: beams both ends. */
  function beamClass(v) { var n = (v.typeL === 'beam') + (v.typeR === 'beam'); return n === 0 ? 'primary' : n === 1 ? 'secondary' : 'tertiary'; }

  /**
   * L-section. The span is drawn 5000 long and 900 deep; each end is a 900 column or wall (broken top and bottom)
   * or a 300 support beam. Faces in the open are solid, a face shared by two elements is dashed, and the cover line
   * is the combined outline offset inwards, trimmed where the offsets meet.
   */
  function lSection(v, opt) {
    opt = opt || {};
    var fs = 130, o = { fs: fs, ia: !!opt.ia }, S = 5000, D = 900, cT = -700, cB = 1600, c = 70, s = '';
    // each end in local terms: u runs outwards from the beam's end face, so one routine draws either end
    var ends = ['L', 'R'].map(function (k) {
      var t = v['type' + k] === 'beam' ? 'beam' : 'col', d = k === 'L' ? -1 : 1, xi = k === 'L' ? 0 : S, w = t === 'col' ? 900 : 500;
      var kase = t === 'beam' ? supportCase(v, k) : null, Ds = kase === 'deeper' ? D + 200 : kase === 'shallower' ? D - 200 : D;
      return { k: k, t: t, d: d, w: w, kase: kase, Ds: Ds, under: kase === 'shallower' && v[k + 'under'] === 'under', xo: xi + d * w, X: function (u) { return xi + d * u; } };
    });
    var L = ends[0], R = ends[1];

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

    // chain and overall dimensions above
    var yC = -1000, yO = -1350, g = 50, ov = 110;
    function ext(e, x, toY) { return line(x, e.t === 'col' ? cT - g : -g, x, toY, 'ex'); }
    function key(e) { return e.k + (e.t === 'col' ? 'colW' : 'beamW'); }
    s += ext(L, L.xo, yO - ov) + ext(L, 0, yC - ov) + ext(R, S, yC - ov) + ext(R, R.xo, yO - ov);
    s += hdim(L.xo, 0, yC, fmt(v[key(L)]), assign(o, { key: key(L), prefer: 'before' })) + hdim(0, S, yC, fmt(v.span), assign(o, { key: 'span' })) + hdim(S, R.xo, yC, fmt(v[key(R)]), assign(o, { key: key(R) }));
    s += hdim(L.xo, R.xo, yO, fmt(v[key(L)] + v.span + v[key(R)]), { fs: fs, cls: 'tx ov' });

    // main beam depth inside the span; a support beam's depth beside it, outside
    s += vdim(0, D, 1550, fmt(v.D), assign(o, { key: 'D' }));
    ends.forEach(function (e) {
      if (e.t !== 'beam') return;
      var x = e.xo + e.d * 500;
      s += line(e.xo + e.d * g, 0, x + e.d * ov, 0, 'ex') + line(e.xo + e.d * g, e.Ds, x + e.d * ov, e.Ds, 'ex') + vdim(0, e.Ds, x, fmt(v[e.k + 'beamD']), assign(o, { key: e.k + 'beamD' }));
    });

    // covers: beam top and bottom near the right of the span, column or wall on its outer face (shown once)
    var xc = 3450, co = assign(o, { fs: fs * 0.85 });
    s += vdimOut(0, c, xc, fmt(v.ctop), assign(co, { key: 'ctop' }), 'above') + vdimOut(D - c, D, xc, fmt(v.cbot), assign(co, { key: 'cbot' }), 'below');
    var col = L.t === 'col' ? L : R.t === 'col' ? R : null;
    if (col) s += hdim(Math.min(col.X(col.w), col.X(col.w - c)), Math.max(col.X(col.w), col.X(col.w - c)), 1250, fmt(v.ccol), assign(co, { key: 'ccol', out: col.k === 'L' ? 'before' : 'after' }));

    // section marks, all looking right: B-B near the left end, A-A at mid-span, C-C near the right end.
    // On the page every mark has a tick box under it that shows or hides that section; a hidden section's mark is faded.
    // In an exported drawing only the marks of shown sections appear.
    [['B', 700], ['A', S / 2], ['C', 4300]].forEach(function (m) {
      var k = m[0], x = m[1], on = v['show' + k] !== false;
      if (!on && !o.ia) return;
      var g = line(x, -330, x, -70, 'sm') + arrow(x, -330, x + 280, fs) + label(x + 400, -330 + fs * 0.4, k, { fs: fs * 1.15, cls: 'sk' }) +
        line(x, D + 70, x, D + 330, 'sm') + arrow(x, D + 330, x + 280, fs) + label(x + 400, D + 330 + fs * 0.4, k, { fs: fs * 1.15, cls: 'sk' });
      s += '<g class="sec' + (on ? '' : ' off') + '">' + g + '</g>';
      if (o.ia) {
        var bx = x - 60, by = D + 470, sz = 120;
        s += '<g class="sx" data-s="' + k + '" tabindex="0" role="checkbox" aria-checked="' + on + '" aria-label="Show section ' + k + '-' + k + '">' +
          '<rect class="hit" x="' + (bx - 40) + '" y="' + (by - 40) + '" width="' + (sz + 420) + '" height="' + (sz + 80) + '"/>' +
          '<rect class="box" x="' + bx + '" y="' + by + '" width="' + sz + '" height="' + sz + '" rx="16"/>' +
          (on ? poly([[bx + 26, by + 62], [bx + 50, by + 88], [bx + 96, by + 32]], 'tick') : '') +
          label(bx + sz + 180, by + 92, 'SHOW', { fs: fs * 0.75, cls: 'nm' }) + '</g>';
      }
    });

    // names and title
    ends.forEach(function (e) { s += e.t === 'col' ? label(e.X(e.w / 2), cB + 270, 'COLUMN / WALL', { fs: fs * 0.9, cls: 'nm' }) : label(e.X(e.w / 2), Math.max(D, e.Ds) + 330, 'SUPPORT BEAM', { fs: fs * 0.9, cls: 'nm' }); });
    s += label(S / 2, 2250, 'L-SECTION', { fs: fs * 1.4, cls: 'tt' }) + line(S / 2 - 430, 2295, S / 2 + 430, 2295, 'ob') + label(S / 2, 2440, beamClass(v).toUpperCase() + ' BEAM  ·  NTS', { fs: fs * 0.85, cls: 'nm' });
    var x0 = L.xo - (L.t === 'col' ? 550 : 750), x1 = R.xo + (R.t === 'col' ? 550 : 750);
    return wrapSVG(n(x0) + ' -1700 ' + n(x1 - x0) + ' 4250', s, opt, 'Beam L-section, ' + beamClass(v) + ' beam');
  }

  /** A cross-section (A-A by default): the beam cut through, with its cover line and its covers dimensioned. */
  function xSection(v, opt) {
    opt = opt || {};
    var L = opt.letter || 'A';
    var fs = 75, o = { fs: fs, ia: !!opt.ia }, B = 300, D = 900, c = 45, s = '';
    s += '<rect class="ob" x="0" y="0" width="' + B + '" height="' + D + '"/>';
    s += '<rect class="cl" x="' + c + '" y="' + c + '" width="' + (B - 2 * c) + '" height="' + (D - 2 * c) + '"/>';
    // width above, depth beside
    s += line(0, -40, 0, -300, 'ex') + line(B, -40, B, -300, 'ex') + hdim(0, B, -220, fmt(v.B), assign(o, { key: 'B' }));
    s += line(B + 40, 0, 640, 0, 'ex') + line(B + 40, D, 640, D, 'ex') + vdim(0, D, 560, fmt(v.D), assign(o, { key: 'D' }));
    // top and bottom cover on the left, side cover underneath
    var co = assign(o, { fs: fs * 0.9 }), xl = -230;
    s += line(-40, 0, xl - 70, 0, 'ex') + line(-40, c, xl - 70, c, 'ex') + line(-40, D - c, xl - 70, D - c, 'ex') + line(-40, D, xl - 70, D, 'ex');
    s += vdimOut(0, c, xl, fmt(v.ctop), assign(co, { key: 'ctop' }), 'above') + vdimOut(D - c, D, xl, fmt(v.cbot), assign(co, { key: 'cbot' }), 'below');
    var yb = D + 270;   /* below the bottom-cover value, so the two never meet */
    s += line(0, D + 40, 0, yb + 70, 'ex') + line(c, D + 40, c, yb + 70, 'ex');
    s += hdim(0, c, yb, fmt(v.cside), assign(co, { key: 'cside', out: 'before' }));   // one side is enough: both sides take the same cover
    s += label(B / 2, 1330, 'SECTION ' + L + '-' + L, { fs: 90, cls: 'tt' }) + line(B / 2 - 265, 1356, B / 2 + 265, 1356, 'ob') + label(B / 2, 1445, 'NTS', { fs: 64, cls: 'nm' });
    return wrapSVG('-380 -460 1140 1980', s, opt, 'Beam section ' + L + '-' + L);
  }

  /** Styles baked into an exported .svg, so it looks right with no page around it. */
  var EXPORT_CSS = [
    '.ob{fill:none;stroke:#8A949D;stroke-width:1.6px;vector-effect:non-scaling-stroke}',
    '.th,.ex,.dm{fill:none;stroke:#7A858F;stroke-width:0.8px;vector-effect:non-scaling-stroke}',
    '.tk{fill:none;stroke:#1B2530;stroke-width:1.4px;vector-effect:non-scaling-stroke}',
    '.cl{fill:none;stroke:#2E8B57;stroke-width:0.9px;stroke-dasharray:7 4;vector-effect:non-scaling-stroke}',
    '.sm{fill:none;stroke:#1B2530;stroke-width:2.2px;vector-effect:non-scaling-stroke}.ah{fill:#1B2530}',
    '.jn{fill:none;stroke:#8A949D;stroke-width:1.2px;stroke-dasharray:10 6;vector-effect:non-scaling-stroke}',
    '.tx{font-family:"IBM Plex Mono",Consolas,"Courier New",monospace;fill:#1B2530}.ov{fill:#5B6772}.cv{fill:#2E8B57}',
    '.nm,.tt,.sk{font-family:"Barlow Condensed","Arial Narrow",Arial,sans-serif;letter-spacing:.06em;fill:#5B6772}',
    '.tt,.sk{font-weight:700;fill:#1B2530}'
  ].join('');

  root.BeamSections = { VERSION: VERSION, DEFAULTS: DEFAULTS, NAMES: NAMES, COVER: COVER, supportCase: supportCase, beamClass: beamClass, lSection: lSection, xSection: xSection, EXPORT_CSS: EXPORT_CSS };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.BeamSections;
})(typeof window !== 'undefined' ? window : globalThis);
