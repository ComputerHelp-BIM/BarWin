/*
 * BarWin CAD sheets, v1.0.0
 * One drawing model, three outputs of the same sheet:
 *   DXF  - everything 1:1 in model space (mm); a paper-space layout "SHEET" holds the frame, the title block and one
 *          locked viewport per view at that view's scale. Real DIMENSION entities, editable in CAD.
 *   SVG  - the paper sheet in millimetres.
 *   PDF  - the paper sheet, vector, built-in Helvetica (no fonts to embed).
 * No dependencies: the browser page and Node use the same file (UMD).
 *
 * The sheet model (all lengths mm):
 *   sheet = {
 *     paper: { name: 'A1', w: 841, h: 594 },                  // see paper()
 *     views: [{
 *       id: 'L', scale: 25,                                   // 1:25
 *       ents: [ ...entities in model space, real size ],
 *       parts: [{ win: { x0, y0, x1, y1 }, at: { x, y } }]    // model window shown, and its lower-left corner on paper;
 *     }],                                                     // two parts = a view broken in two (break line)
 *     ents: [ ...entities on paper: frame, title block, view titles, break lines ],
 *     meta: { title, app }                                    // PDF and SVG document title, producer
 *   }
 *
 * Entities (l = layer name from SPEC.layers; optional col = colour index override, lt = linetype override):
 *   { t: 'line',   l, p: [[x, y], [x, y]] }
 *   { t: 'poly',   l, p: [[x, y, bulge?], ...], closed, w? }     bulge = tan(arc angle / 4), positive anticlockwise
 *   { t: 'circle', l, c: [x, y], r, fill? }                       fill draws a solid dot (a bar in section)
 *   { t: 'arc',    l, c: [x, y], r, a0, a1 }                      degrees, anticlockwise from a0 to a1
 *   { t: 'text',   l, p: [x, y], h, s, rot?, al?, va?, style? }   h in paper mm (scaled by the view);
 *                                                                 al 'l' | 'c' | 'r', va 'b' | 'm' | 't'; style 'ROMANS' | 'RC'
 *   { t: 'dim',    l, p1: [x, y], p2: [x, y], dir: 'h' | 'v', at, text?, side? }
 *        a linear dimension; at = y of the dimension line (dir 'h') or its x (dir 'v'). text overrides the value,
 *        '<>' standing for the measurement ('LD <>'). side 'l' | 'r' puts text that does not fit outside on that side.
 *
 * Text may use Ø, ° and ±; the DXF writes them as %%c, %%d and %%p so every CAD program shows them.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BarWinCAD = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '1.0.0';

  // Copy of layers.json (without _about). A test keeps the two equal; tools/make_template.py builds the template from the JSON.
  var SPEC = {
    layers: {
      'FRAMING':    { aci: 7, lw: 0.25, lt: 'CONTINUOUS', role: 'concrete outlines, junctions, break lines, dimensions' },
      'BEAM R':     { aci: 1, lw: 0.50, lt: 'CONTINUOUS', role: 'beam bars: main, extra, face' },
      'STIRRUPS':   { aci: 3, lw: 0.25, lt: 'CONTINUOUS', role: 'links (stirrups)' },
      'SPACER BAR': { aci: 3, lw: 0.35, lt: 'CONTINUOUS', role: 'spacer and pin bars' },
      'COVERS':     { aci: 2, lw: 0.13, lt: 'DASHED2', role: 'cover lines' },
      'TEXT':       { aci: 1, lw: 0.18, lt: 'CONTINUOUS', role: 'bar tags, notes, leaders' },
      'COLUMN':     { aci: 6, lw: 0.50, lt: 'CONTINUOUS', role: 'view titles and section marks' },
      'TITLE':      { aci: 7, lw: 0.35, lt: 'CONTINUOUS', role: 'sheet border and title block' },
      'VIEWPORT':   { aci: 8, lw: 0.13, lt: 'CONTINUOUS', role: 'viewport frames (not plotted)', plot: false }
    },
    scales: [10, 15, 20, 25, 30, 40, 50, 75, 100],
    paper: { A0: [1189, 841], A1: [841, 594], A2: [594, 420], A3: [420, 297], A4: [297, 210] },
    text: { font: 'romans.shx', titleFont: 'romanc.shx', note: 2.5, subtitle: 3.25, title: 4.25 },
    dim: { txt: 2.5, asz: 2.5, exo: 0.25, exe: 0.25, gap: 1.25, clrd: 4, clre: 2, clrt: 3 }
  };
  var LINETYPES = { DASHED2: [6.35, -3.175], CENTER2: [19.05, -3.175, 3.175, -3.175] };   // on paper, mm
  // ISO 5457 frame: 20 mm filing margin on the left, 10 mm elsewhere
  var FRAME = { left: 20, right: 10, top: 10, bottom: 10 };

  /* ---------- small helpers ---------- */

  /** A paper size: name A0..A4, orientation 'landscape' (default) or 'portrait'. */
  function paper(name, orient) {
    var s = SPEC.paper[name];
    if (!s) throw new Error('unknown paper ' + name);
    var land = orient !== 'portrait';
    return { name: name, orient: land ? 'landscape' : 'portrait', w: land ? s[0] : s[1], h: land ? s[1] : s[0] };
  }

  // Helvetica advance widths (1/1000 em), characters 32..126; the PDF uses Helvetica, the SVG asks for it, and romans.shx
  // runs close enough for placing text. Used to keep labels apart and inside their boxes.
  var HELV = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
  var CAP = 0.72;   // Helvetica's capital height, as a share of its font size; CAD text height is the capital height
  /** Advance width of s in Helvetica at font size em. */
  function helvWidth(s, em) {
    var w = 0, i, c;
    s = String(s);
    for (i = 0; i < s.length; i++) { c = s.charCodeAt(i); w += c >= 32 && c <= 126 ? HELV[c - 32] : 722; }
    return w / 1000 * em;
  }
  /** Width of a line of text whose capitals are h high (same units as h), with a little to spare for romans.shx. */
  function textWidth(s, h) { return helvWidth(s, h / CAP) * 1.04; }

  /** The first standard scale (largest drawing) at which modelW x modelH fits a boxW x boxH box on paper; null if even 1:100 does not. */
  function fitScale(modelW, modelH, boxW, boxH) {
    for (var i = 0; i < SPEC.scales.length; i++) {
      var s = SPEC.scales[i];
      if (modelW / s <= boxW + 1e-9 && modelH / s <= boxH + 1e-9) return s;
    }
    return null;
  }

  function num(v) {
    var r = Math.round(v * 10000) / 10000;
    if (r === 0) r = 0;   // no "-0"
    return String(r);
  }
  function hex(n) { return n.toString(16).toUpperCase(); }
  function round(v) { return Math.round(v + 1e-9); }

  /** Arc through a bulged polyline segment: centre, radius, start and end angle (radians, anticlockwise if ccw). */
  function bulgeArc(p, q, b) {
    var dx = q[0] - p[0], dy = q[1] - p[1], chord = Math.sqrt(dx * dx + dy * dy), th = 4 * Math.atan(b);
    var r = chord / (2 * Math.sin(Math.abs(th) / 2)), mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    var d = r * Math.cos(Math.abs(th) / 2), nx = -dy / chord, ny = dx / chord, sgn = b > 0 ? 1 : -1;
    // the centre lies to the left of p->q for an anticlockwise arc under 180 degrees
    var flip = Math.abs(th) > Math.PI ? -1 : 1, cx = mx + nx * d * sgn * flip, cy = my + ny * d * sgn * flip;
    return { c: [cx, cy], r: r, a0: Math.atan2(p[1] - cy, p[0] - cx), a1: Math.atan2(q[1] - cy, q[0] - cx), ccw: b > 0, sweep: th };
  }

  /* ---------- dimensions: one geometry for the DXF block, the SVG and the PDF ---------- */

  /**
   * The parts of a linear dimension at scale s (model units): extension lines, the dimension line, two closed blank
   * arrows and the text, laid out as the BARWIN-s dimension style would. value is the number shown.
   */
  function dimGeometry(d, s) {
    var D = SPEC.dim, v = d.dir === 'v', a = v ? [d.p1[1], d.p1[0]] : d.p1, b = v ? [d.p2[1], d.p2[0]] : d.p2;
    // work in a frame where the dimension runs along x; swap back at the end
    var x1 = Math.min(a[0], b[0]), x2 = Math.max(a[0], b[0]), ya = a[0] <= b[0] ? a[1] : b[1], yb = a[0] <= b[0] ? b[1] : a[1];
    var at = d.at, len = x2 - x1, asz = D.asz * s, gap = D.gap * s, th = D.txt * s;
    var value = d.text !== undefined && d.text !== null ? String(d.text).split('<>').join(String(round(len))) : String(round(len));
    var lines = [], arrows = [];
    function ext(x, y) {
      if (Math.abs(y - at) < 1e-6) return;
      var sg = at > y ? 1 : -1;
      lines.push({ a: [x, y + sg * D.exo * s], b: [x, at + sg * D.exe * s], col: D.clre });
    }
    ext(x1, ya); ext(x2, yb);
    var tw = textWidth(value, th), inside = len >= 2 * asz * 1.15, textIn = tw + 2 * gap <= len;
    function arrow(x, dir) {   // tip at x, pointing in direction dir (+1 right, -1 left)
      arrows.push([[x, at], [x - dir * asz, at + asz / 6], [x - dir * asz, at - asz / 6]]);
    }
    if (inside) { lines.push({ a: [x1, at], b: [x2, at], col: D.clrd }); arrow(x1, -1); arrow(x2, 1); }
    else { lines.push({ a: [x1 - asz * 1.6, at], b: [x2 + asz * 1.6, at], col: D.clrd }); arrow(x1, 1); arrow(x2, -1); }
    var tx = (x1 + x2) / 2, moved = false;
    if (!textIn) {
      moved = true;
      var room = (inside ? 0 : asz * 1.6) + gap;
      tx = d.side === 'l' ? x1 - room - tw / 2 : x2 + room + tw / 2;
      if (!inside) lines.push(d.side === 'l' ? { a: [x1 - room - tw, at], b: [x1 - asz * 1.6, at], col: D.clrd } : { a: [x2 + asz * 1.6, at], b: [x2 + room + tw, at], col: D.clrd });
    }
    var text = { p: [tx, at + gap], h: th, s: value, al: 'c', va: 'b', rot: 0 };
    if (v) {   // back to the real frame: x <-> y, text turned to read from the right
      var sw = function (p) { return [p[1], p[0]]; };
      lines.forEach(function (l) { l.a = sw(l.a); l.b = sw(l.b); });
      arrows = arrows.map(function (t) { return t.map(sw); });
      text = { p: [at - gap, tx], h: th, s: value, al: 'c', va: 'b', rot: 90 };
    }
    return { lines: lines, arrows: arrows, text: text, value: value, moved: moved, len: len };
  }

  /* ---------- flattening: entities to primitives in model units, used by SVG and PDF ---------- */

  /** Entities to drawable primitives at scale s: text heights become model units, dimensions become lines and text. */
  function flatten(ents, s) {
    var out = [];
    ents.forEach(function (e) {
      if (e.t === 'dim') {
        var g = dimGeometry(e, s);
        g.lines.forEach(function (l) { out.push({ t: 'line', l: e.l, p: [l.a, l.b], col: l.col, dim: true }); });
        g.arrows.forEach(function (tri) { out.push({ t: 'poly', l: e.l, p: tri, closed: true, col: SPEC.dim.clrd, dim: true }); });
        out.push({ t: 'text', l: e.l, p: g.text.p, h: g.text.h, s: g.text.s, al: 'c', va: 'b', rot: g.text.rot, col: SPEC.dim.clrt, style: 'ROMANS' });
      } else if (e.t === 'text') {
        var c = {}; for (var k in e) c[k] = e[k]; c.h = e.h * s; out.push(c);
      } else out.push(e);
    });
    return out;
  }

  /** A primitive moved from model to paper: p_paper = at + (p - win.lower-left) / s. */
  function toPaper(prim, part, s) {
    var ox = part.win.x0, oy = part.win.y0, ax = part.at.x, ay = part.at.y;
    function P(p) { var q = [ax + (p[0] - ox) / s, ay + (p[1] - oy) / s]; if (p.length > 2) q.push(p[2]); return q; }
    var c = {}; for (var k in prim) c[k] = prim[k];
    if (prim.p) c.p = prim.t === 'text' ? P(prim.p) : prim.p.map(P);
    if (prim.c) c.c = P(prim.c);
    if (prim.r) c.r = prim.r / s;
    if (prim.h) c.h = prim.h / s;
    if (prim.w) c.w = prim.w / s;
    return c;
  }

  /** Every primitive on paper, grouped: one group per viewport (with its clip rectangle) and one for the paper itself. */
  function paperGroups(sheet) {
    var groups = [];
    sheet.views.forEach(function (v) {
      var prims = flatten(v.ents, v.scale);
      v.parts.forEach(function (part) {
        var w = (part.win.x1 - part.win.x0) / v.scale, h = (part.win.y1 - part.win.y0) / v.scale;
        groups.push({ clip: [part.at.x, part.at.y, w, h], prims: prims.map(function (q) { return toPaper(q, part, v.scale); }) });
      });
    });
    groups.push({ clip: null, prims: flatten(sheet.ents || [], 1) });
    return groups;
  }

  /* ---------- colours for SVG and PDF ---------- */

  // AutoCAD colour index to RGB, tuned for white paper (yellow and cyan darkened to stay readable).
  var ACI_RGB = { 1: '#D11F1F', 2: '#B8860B', 3: '#1E8C2E', 4: '#0B8BA5', 5: '#1F4FD1', 6: '#B0279E', 7: '#000000', 8: '#808080', 9: '#A0A0A0', 30: '#D2691E', 251: '#5A5A5A', 253: '#B4B4B4' };
  function styleOf(prim, colour) {
    var L = SPEC.layers[prim.l] || { aci: 7, lw: 0.25, lt: 'CONTINUOUS' }, aci = prim.col || L.aci;
    var lw = prim.dim ? 0.18 : L.lw, lt = prim.lt || L.lt;
    return { stroke: colour ? (ACI_RGB[aci] || '#000000') : '#000000', lw: lw, dash: LINETYPES[lt] || null, hidden: L.plot === false };
  }

  /* ---------- SVG ---------- */

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /**
   * The sheet as an SVG document, in millimetres (1 user unit = 1 mm on paper).
   * opts.colour: draw in layer colours (default false: black, as monochrome plotting).
   */
  function toSVG(sheet, opts) {
    opts = opts || {};
    var W = sheet.paper.w, H = sheet.paper.h, out = [], clips = [];
    function X(x) { return num(x); }
    function Y(y) { return num(H - y); }
    function strokeAttr(st) {
      return ' stroke="' + st.stroke + '" stroke-width="' + num(st.lw) + '"' + (st.dash ? ' stroke-dasharray="' + st.dash.map(function (v) { return num(Math.abs(v)); }).join(' ') + '"' : '');
    }
    function prim(q) {
      var st = styleOf(q, opts.colour);
      if (st.hidden) return '';
      if (q.t === 'line') return '<line x1="' + X(q.p[0][0]) + '" y1="' + Y(q.p[0][1]) + '" x2="' + X(q.p[1][0]) + '" y2="' + Y(q.p[1][1]) + '"' + strokeAttr(st) + '/>';
      if (q.t === 'poly') {
        var d = 'M' + X(q.p[0][0]) + ' ' + Y(q.p[0][1]), n = q.p.length, i, segs = q.closed ? n : n - 1;
        for (i = 0; i < segs; i++) {
          var p = q.p[i], r = q.p[(i + 1) % n], b = p[2] || 0;
          if (!b) { d += ' L' + X(r[0]) + ' ' + Y(r[1]); continue; }
          var arc = bulgeArc(p, r, b);
          d += ' A' + num(arc.r) + ' ' + num(arc.r) + ' 0 ' + (Math.abs(arc.sweep) > Math.PI ? 1 : 0) + ' ' + (b > 0 ? 0 : 1) + ' ' + X(r[0]) + ' ' + Y(r[1]);
        }
        if (q.closed) d += ' Z';
        var lw = q.w ? Math.max(q.w, st.lw) : st.lw;
        return '<path d="' + d + '" fill="none"' + strokeAttr({ stroke: st.stroke, lw: lw, dash: st.dash }) + ' stroke-linejoin="round"/>';
      }
      if (q.t === 'circle') {
        return '<circle cx="' + X(q.c[0]) + '" cy="' + Y(q.c[1]) + '" r="' + num(q.r) + '"' + (q.fill ? ' fill="' + st.stroke + '" stroke="none"' : ' fill="none"' + strokeAttr(st)) + '/>';
      }
      if (q.t === 'arc') {
        var a0 = q.a0 * Math.PI / 180, a1 = q.a1 * Math.PI / 180, sweep = ((q.a1 - q.a0) % 360 + 360) % 360;
        return '<path d="M' + X(q.c[0] + q.r * Math.cos(a0)) + ' ' + Y(q.c[1] + q.r * Math.sin(a0)) + ' A' + num(q.r) + ' ' + num(q.r) + ' 0 ' + (sweep > 180 ? 1 : 0) + ' 0 ' + X(q.c[0] + q.r * Math.cos(a1)) + ' ' + Y(q.c[1] + q.r * Math.sin(a1)) + '" fill="none"' + strokeAttr(st) + '/>';
      }
      if (q.t === 'text') {
        var anchor = q.al === 'r' ? 'end' : q.al === 'c' ? 'middle' : 'start';
        var base = q.va === 't' ? 'hanging' : q.va === 'm' ? 'central' : 'alphabetic';
        // cap height of Helvetica is about 0.72 em; CAD text height is the cap height
        var fs = q.h / CAP, rot = q.rot ? ' transform="rotate(' + num(-q.rot) + ' ' + X(q.p[0]) + ' ' + Y(q.p[1]) + ')"' : '';
        return '<text x="' + X(q.p[0]) + '" y="' + Y(q.p[1]) + '" font-size="' + num(fs) + '" text-anchor="' + anchor + '" dominant-baseline="' + base + '" fill="' + st.stroke + '"' + rot + '>' + esc(q.s) + '</text>';
      }
      return '';
    }
    paperGroups(sheet).forEach(function (g, i) {
      if (g.clip) {
        clips.push('<clipPath id="vp' + i + '"><rect x="' + X(g.clip[0]) + '" y="' + Y(g.clip[1] + g.clip[3]) + '" width="' + num(g.clip[2]) + '" height="' + num(g.clip[3]) + '"/></clipPath>');
        out.push('<g clip-path="url(#vp' + i + ')">');
      } else out.push('<g>');
      g.prims.forEach(function (q) { var s = prim(q); if (s) out.push(s); });
      out.push('</g>');
    });
    var title = (sheet.meta && sheet.meta.title) || 'BarWin sheet';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + 'mm" height="' + H + 'mm" viewBox="0 0 ' + W + ' ' + H + '" font-family="Helvetica, Arial, sans-serif" stroke-linecap="round">' +
      '<title>' + esc(title) + '</title><rect width="' + W + '" height="' + H + '" fill="#FFFFFF"/><defs>' + clips.join('') + '</defs>' + out.join('') + '</svg>';
  }

  /* ---------- PDF ---------- */

  var PT = 72 / 25.4;
  function pdfText(s) {
    return String(s).replace(/[\u2013\u2014]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '?');
  }
  function pdfEsc(s) { return s.replace(/[\\()]/g, '\\$&').replace(/[\u0080-\u00FF]/g, function (ch) { return '\\' + ('00' + ch.charCodeAt(0).toString(8)).slice(-3); }); }
  function rgb(hexc) { var n = parseInt(hexc.slice(1), 16); return [(n >> 16) / 255, (n >> 8 & 255) / 255, (n & 255) / 255].map(function (v) { return num(v); }).join(' '); }

  /** Bezier curves for an arc (radians, anticlockwise from a0 by sweep), as PDF path operators (start point not included). */
  function bezierArc(cx, cy, r, a0, sweep) {
    var n = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2))), da = sweep / n, k = 4 / 3 * Math.tan(da / 4), ops = [], i;
    for (i = 0; i < n; i++) {
      var t0 = a0 + i * da, t1 = t0 + da, c0 = Math.cos(t0), s0 = Math.sin(t0), c1 = Math.cos(t1), s1 = Math.sin(t1);
      ops.push([cx + r * (c0 - k * s0), cy + r * (s0 + k * c0), cx + r * (c1 + k * s1), cy + r * (s1 - k * c1), cx + r * c1, cy + r * s1].map(function (v) { return (v * PT).toFixed(2); }).join(' ') + ' c');
    }
    return ops.join(' ');
  }

  /** The sheet as a one-page vector PDF (PDF 1.4). opts.colour as for SVG. */
  function toPDF(sheet, opts) {
    opts = opts || {};
    var W = sheet.paper.w, H = sheet.paper.h, ops = [];
    function P(x, y) { return (x * PT).toFixed(2) + ' ' + (y * PT).toFixed(2); }
    function stroke(st) { ops.push(rgb(st.stroke) + ' RG ' + rgb(st.stroke) + ' rg ' + (st.lw * PT).toFixed(3) + ' w ' + (st.dash ? '[' + st.dash.map(function (v) { return (Math.abs(v) * PT).toFixed(2); }).join(' ') + '] 0 d' : '[] 0 d')); }
    function prim(q) {
      var st = styleOf(q, opts.colour);
      if (st.hidden) return;
      if (q.t === 'line') { stroke(st); ops.push(P(q.p[0][0], q.p[0][1]) + ' m ' + P(q.p[1][0], q.p[1][1]) + ' l S'); return; }
      if (q.t === 'poly') {
        stroke({ stroke: st.stroke, lw: q.w ? Math.max(q.w, st.lw) : st.lw, dash: st.dash });
        var s = P(q.p[0][0], q.p[0][1]) + ' m', n = q.p.length, i, segs = q.closed ? n : n - 1;
        for (i = 0; i < segs; i++) {
          var p = q.p[i], r = q.p[(i + 1) % n], b = p[2] || 0;
          if (!b) { s += ' ' + P(r[0], r[1]) + ' l'; continue; }
          var arc = bulgeArc(p, r, b);
          s += ' ' + bezierArc(arc.c[0], arc.c[1], arc.r, arc.a0, arc.sweep);
        }
        ops.push(s + (q.closed ? ' h S' : ' S'));
        return;
      }
      if (q.t === 'circle') {
        stroke(st);
        ops.push(P(q.c[0] + q.r, q.c[1]) + ' m ' + bezierArc(q.c[0], q.c[1], q.r, 0, 2 * Math.PI) + (q.fill ? ' f' : ' S'));
        return;
      }
      if (q.t === 'arc') {
        stroke(st);
        var a0 = q.a0 * Math.PI / 180, sw = ((q.a1 - q.a0) % 360 + 360) % 360 * Math.PI / 180;
        ops.push(P(q.c[0] + q.r * Math.cos(a0), q.c[1] + q.r * Math.sin(a0)) + ' m ' + bezierArc(q.c[0], q.c[1], q.r, a0, sw) + ' S');
        return;
      }
      if (q.t === 'text') {
        // CAD text height is the capital height; Helvetica's capitals are 0.72 of its font size
        var s2 = pdfText(q.s), fs = q.h / CAP, w = helvWidth(s2, fs), rot = (q.rot || 0) * Math.PI / 180;
        var dx = q.al === 'r' ? -w : q.al === 'c' ? -w / 2 : 0, dy = q.va === 't' ? -q.h : q.va === 'm' ? -q.h / 2 : 0;
        var c = Math.cos(rot), sn = Math.sin(rot), x = q.p[0] + dx * c - dy * sn, y = q.p[1] + dx * sn + dy * c;
        ops.push(rgb(st.stroke) + ' rg BT /F1 ' + (fs * PT).toFixed(2) + ' Tf ' + [c, sn, -sn, c].map(function (v) { return num(v); }).join(' ') + ' ' + P(x, y) + ' Tm (' + pdfEsc(s2) + ') Tj ET');
      }
    }
    ops.push('1 J 1 j');
    paperGroups(sheet).forEach(function (g) {
      ops.push('q');
      if (g.clip) ops.push(P(g.clip[0], g.clip[1]) + ' ' + (g.clip[2] * PT).toFixed(2) + ' ' + (g.clip[3] * PT).toFixed(2) + ' re W n');
      g.prims.forEach(prim);
      ops.push('Q');
    });
    var stream = ops.join('\n'), objs = [], out = '%PDF-1.4\n%\u00E2\u00E3\u00CF\u00D3\n', off = [];
    var title = pdfEsc(pdfText((sheet.meta && sheet.meta.title) || 'BarWin sheet')), app = pdfEsc(pdfText((sheet.meta && sheet.meta.app) || 'BarWin'));
    objs.push('<< /Type /Catalog /Pages 2 0 R >>');
    objs.push('<< /Type /Pages /Kids [4 0 R] /Count 1 >>');
    objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + (W * PT).toFixed(2) + ' ' + (H * PT).toFixed(2) + '] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R >>');
    objs.push('<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream');
    objs.forEach(function (s, i) { off.push(out.length); out += (i + 1) + ' 0 obj\n' + s + '\nendobj\n'; });
    var xref = out.length;
    out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + off.map(function (o) { return ('0000000000' + o).slice(-10) + ' 00000 n \n'; }).join('');
    return out + 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R /Info << /Title (' + title + ') /Producer (' + app + ') >> >>\nstartxref\n' + xref + '\n%%EOF\n';
  }

  /* ---------- DXF ---------- */

  var tplCache = { text: null, info: null };
  /** Facts about the template: the owner handles, the block record table, the highest handle in use. */
  function templateInfo(tpl) {
    if (tplCache.text === tpl) return tplCache.info;
    function rec(name) {
      var m = new RegExp('  0\\nBLOCK_RECORD\\n  5\\n([0-9A-F]+)\\n(?:(?!  0\\n)[\\s\\S])*?  2\\n' + name.replace('*', '\\*') + '\\n').exec(tpl);
      if (!m) throw new Error('DXF template has no ' + name + ' block record');
      return m[1];
    }
    var table = /  0\nTABLE\n  2\nBLOCK_RECORD\n  5\n([0-9A-F]+)\n/.exec(tpl);
    if (!table) throw new Error('DXF template has no BLOCK_RECORD table');
    ['{{BLOCK_RECORDS}}', '{{BLOCKS}}', '{{ENTITIES}}', '{{HANDSEED}}', '{{PW}}', '{{MEDIA}}'].forEach(function (t) {
      if (tpl.indexOf(t) < 0) throw new Error('DXF template is missing ' + t);
    });
    var max = 0, lines = tpl.split('\n').filter(function (l) { return !/^\{\{[A-Z_0-9]+\}\}$/.test(l); }), i;
    for (i = 0; i + 1 < lines.length; i += 2) {
      if ((lines[i] === '  5' || lines[i] === '105') && /^[0-9A-F]+$/.test(lines[i + 1])) max = Math.max(max, parseInt(lines[i + 1], 16));
    }
    var info = { ms: rec('*Model_Space'), ps: rec('*Paper_Space'), brTable: table[1], maxHandle: max };
    tplCache = { text: tpl, info: info };
    return info;
  }

  /** Text as a DXF TEXT value: Ø ° ± as CAD control codes, anything else outside ASCII as \U+XXXX, no line breaks. */
  function dxfText(s) {
    return String(s).replace(/[\r\n]+/g, ' ').replace(/[\u00D8\u00F8\u2300]/g, '%%c').replace(/\u00B0/g, '%%d').replace(/\u00B1/g, '%%p')
      .replace(/[^\x20-\x7e]/g, function (ch) { return '\\U+' + ('0000' + ch.charCodeAt(0).toString(16).toUpperCase()).slice(-4); });
  }

  /**
   * The sheet as DXF text (AutoCAD 2010 format), written into template (the text of template.dxf).
   * Model space holds every view at real size; the layout SHEET holds the paper entities and one locked viewport per view part.
   */
  function toDXF(sheet, template) {
    var info = templateInfo(template), next = Math.max(info.maxHandle + 1, 0x100), ents = [], recs = [], blocks = [], dimN = 0, vpN = 1;
    function H() { return hex(next++); }
    function g(code, value) { var c = String(code); return ['   '.slice(c.length) + c, String(value)]; }
    function push(arr, pairs) { for (var i = 0; i < pairs.length; i++) arr.push(pairs[i]); }

    /** Group codes common to every entity. own = owner handle; paper = in paper space. */
    function head(type, e, own, paper) {
      var t = [].concat(g(0, type), g(5, H()), g(330, own), g(100, 'AcDbEntity'));
      if (paper) t = t.concat(g(67, 1));
      t = t.concat(g(8, e.l || '0'));
      if (e.lt) t = t.concat(g(6, e.lt));
      if (e.col) t = t.concat(g(62, e.col));
      return t;
    }
    function pt(code, p) { return [].concat(g(code, num(p[0])), g(code + 10, num(p[1])), g(code + 20, 0)); }

    /** One drawing entity (not a dimension) as group codes. s = view scale, for text heights. */
    function entity(e, own, paper, s) {
      var t;
      if (e.t === 'line') return head('LINE', e, own, paper).concat(g(100, 'AcDbLine'), pt(10, e.p[0]), pt(11, e.p[1]));
      if (e.t === 'poly') {
        t = head('LWPOLYLINE', e, own, paper).concat(g(100, 'AcDbPolyline'), g(90, e.p.length), g(70, e.closed ? 1 : 0));
        if (e.w) t = t.concat(g(43, num(e.w)));
        e.p.forEach(function (p) { t = t.concat(g(10, num(p[0])), g(20, num(p[1]))); if (p[2]) t = t.concat(g(42, num(p[2]))); });
        return t;
      }
      if (e.t === 'circle') {
        if (e.fill) {   // a solid dot: a closed two-arc polyline as wide as the radius, which every CAD program fills
          return head('LWPOLYLINE', e, own, paper).concat(g(100, 'AcDbPolyline'), g(90, 2), g(70, 1), g(43, num(e.r)),
            g(10, num(e.c[0] - e.r / 2)), g(20, num(e.c[1])), g(42, 1), g(10, num(e.c[0] + e.r / 2)), g(20, num(e.c[1])), g(42, 1));
        }
        return head('CIRCLE', e, own, paper).concat(g(100, 'AcDbCircle'), pt(10, e.c), g(40, num(e.r)));
      }
      if (e.t === 'arc') return head('ARC', e, own, paper).concat(g(100, 'AcDbCircle'), pt(10, e.c), g(40, num(e.r)), g(100, 'AcDbArc'), g(50, num(e.a0)), g(51, num(e.a1)));
      if (e.t === 'text') {
        var al = { l: 0, c: 1, r: 2 }[e.al || 'l'], va = { b: 0, m: 2, t: 3 }[e.va || 'b'];   // b = baseline
        t = head('TEXT', e, own, paper).concat(g(100, 'AcDbText'), pt(10, e.p), g(40, num(e.h * s)), g(1, dxfText(e.s)));
        if (e.rot) t = t.concat(g(50, num(e.rot)));
        t = t.concat(g(7, e.style || 'ROMANS'));
        if (al || va) t = t.concat(g(72, al), pt(11, e.p));
        return t.concat(g(100, 'AcDbText'), va ? g(73, va) : []);
      }
      throw new Error('unknown entity type ' + e.t);
    }

    /** A linear dimension: the DIMENSION entity, plus its anonymous block holding the drawn geometry. */
    function dimension(e, own, paper, s) {
      var geo = dimGeometry(e, s), name = '*D' + (++dimN), rh = H(), style = SPEC.scales.indexOf(s) >= 0 ? 'BARWIN-' + s : 'BARWIN';
      push(recs, [].concat(g(0, 'BLOCK_RECORD'), g(5, rh), g(330, info.brTable), g(100, 'AcDbSymbolTableRecord'), g(100, 'AcDbBlockTableRecord'),
        g(2, name), g(340, 0), g(70, 0), g(280, 1), g(281, 0)));
      push(blocks, [].concat(g(0, 'BLOCK'), g(5, H()), g(330, rh), g(100, 'AcDbEntity'), g(8, '0'), g(100, 'AcDbBlockBegin'), g(2, name), g(70, 1),
        pt(10, [0, 0]), g(3, name), g(1, '')));
      geo.lines.forEach(function (l) { push(blocks, entity({ t: 'line', l: '0', col: l.col, p: [l.a, l.b] }, rh, false, 1)); });
      geo.arrows.forEach(function (tri) { push(blocks, entity({ t: 'poly', l: '0', col: SPEC.dim.clrd, closed: true, p: tri }, rh, false, 1)); });
      push(blocks, entity({ t: 'text', l: '0', col: SPEC.dim.clrt, p: geo.text.p, h: geo.text.h, s: geo.text.s, rot: geo.text.rot, al: 'c', va: 'b' }, rh, false, 1));
      push(blocks, [].concat(g(0, 'ENDBLK'), g(5, H()), g(330, rh), g(100, 'AcDbEntity'), g(8, '0'), g(100, 'AcDbBlockEnd')));
      var v = e.dir === 'v', def = v ? [e.at, e.p2[1]] : [e.p2[0], e.at], tm = geo.text.p;
      var t = head('DIMENSION', e, own, paper).concat(g(100, 'AcDbDimension'), g(280, 0), g(2, name), g(3, style), pt(10, def), pt(11, tm),
        g(70, 32 + (geo.moved ? 128 : 0)), g(71, 5), g(42, num(geo.len)), g(1, e.text !== undefined && e.text !== null ? dxfText(e.text) : ''),
        g(100, 'AcDbAlignedDimension'), pt(13, e.p1), pt(14, e.p2), g(50, v ? 90 : 0), g(100, 'AcDbRotatedDimension'));
      if (style === 'BARWIN' && s !== 1) t = t.concat(g(1001, 'ACAD'), g(1000, 'DSTYLE'), g(1002, '{'), g(1070, 40), g(1040, num(s)), g(1002, '}'));
      return t;
    }

    function add(e, paper, s) {
      var own = paper ? info.ps : info.ms;
      push(ents, e.t === 'dim' ? dimension(e, own, paper, s) : entity(e, own, paper, s));
    }

    sheet.views.forEach(function (v) { v.ents.forEach(function (e) { add(e, false, v.scale); }); });
    (sheet.ents || []).forEach(function (e) { add(e, true, 1); });

    // one locked viewport per view part; the view's model window fills it at the view's scale
    sheet.views.forEach(function (v) {
      v.parts.forEach(function (part) {
        var w = (part.win.x1 - part.win.x0) / v.scale, h = (part.win.y1 - part.win.y0) / v.scale, id = ++vpN;
        push(ents, [].concat(g(0, 'VIEWPORT'), g(5, H()), g(330, info.ps), g(100, 'AcDbEntity'), g(67, 1), g(8, 'VIEWPORT'), g(100, 'AcDbViewport'),
          pt(10, [part.at.x + w / 2, part.at.y + h / 2]), g(40, num(w)), g(41, num(h)), g(68, id), g(69, id),
          g(12, num((part.win.x0 + part.win.x1) / 2)), g(22, num((part.win.y0 + part.win.y1) / 2)),
          g(13, 0), g(23, 0), g(14, 10), g(24, 10), g(15, 10), g(25, 10), g(16, 0), g(26, 0), g(36, 1), g(17, 0), g(27, 0), g(37, 0),
          g(42, 50), g(43, 0), g(44, 0), g(45, num(part.win.y1 - part.win.y0)), g(50, 0), g(51, 0), g(72, 100),
          g(90, 16384),   // display locked: the scale cannot change by accident
          g(1, ''), g(281, 0), g(71, 0), g(74, 0), g(110, 0), g(120, 0), g(130, 0), g(111, 1), g(121, 0), g(131, 0), g(112, 0), g(122, 1), g(132, 0),
          g(79, 0), g(146, 0), g(282, 0)));
      });
    });

    var P = sheet.paper, media = 'ISO_full_bleed_' + P.name + '_(' + P.w.toFixed(2) + '_x_' + P.h.toFixed(2) + '_MM)';
    var fill = { BLOCK_RECORDS: recs, BLOCKS: blocks, ENTITIES: ents };
    var text = template.replace(/^\{\{(BLOCK_RECORDS|BLOCKS|ENTITIES)\}\}\n/gm, function (m, k) { return fill[k].length ? fill[k].join('\n') + '\n' : ''; });
    var vals = { HANDSEED: hex(next + 16), PW: num(P.w), PH: num(P.h), PW2: num(P.w / 2), PH2: num(P.h / 2), MEDIA: media };
    return text.replace(/\{\{([A-Z0-9]+)\}\}/g, function (m, k) {
      if (!(k in vals)) throw new Error('DXF template has an unknown token ' + m);
      return vals[k];
    });
  }

  /* ---------- frame and title block ---------- */

  /**
   * The ISO 5457 frame and the BarWin title block, as paper entities, and the drawing area left for the views.
   * fields: { firm, project, client, title, drawingNo, rev, drawnBy, checkedBy, approvedBy, date, scale, sheet, app }
   * notes: lines for the notes box beside the title block. revisions: [{ rev, date, text, by }] (up to 3 shown, A3 and up).
   */
  function titleBlock(p, fields, notes, revisions) {
    var W = p.w, H = p.h, x0 = FRAME.left, y0 = FRAME.bottom, x1 = W - FRAME.right, y1 = H - FRAME.top, ents = [];
    var f = fields || {}, TB = 180, TH = 62, L = 'TITLE';
    function line(a, b) { ents.push({ t: 'line', l: L, p: [a, b] }); }
    function rect(ax, ay, bx, by) { ents.push({ t: 'poly', l: L, closed: true, p: [[ax, ay], [bx, ay], [bx, by], [ax, by]] }); }
    function label(x, y, s) { ents.push({ t: 'text', l: L, p: [x + 1.5, y - 1.5], h: 1.8, s: s, va: 't' }); }
    function value(x, y, s, w, h) {   // fitted to its box: shortened with ".." if it would not fit
      s = String(s || '').toUpperCase(); h = h || 3.5;
      while (s.length > 1 && textWidth(s, h) > w - 3) s = s.slice(0, -3) + '..';
      ents.push({ t: 'text', l: L, p: [x + 1.5, y + 2], h: h, s: s });
    }
    rect(x0, y0, x1, y1);
    ents.push({ t: 'poly', l: L, closed: true, w: 0.5, p: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]] });
    var tx = x1 - TB, rows = [12, 10, 14, 12, 14], ys = [y0], k;
    for (k = 0; k < rows.length; k++) ys.push(ys[k] + rows[k]);
    rect(tx, y0, x1, y0 + TH);
    for (k = 1; k < rows.length; k++) line([tx, ys[k]], [x1, ys[k]]);
    // row 1: drawing number, revision, sheet
    line([tx + 110, ys[0]], [tx + 110, ys[1]]); line([tx + 130, ys[0]], [tx + 130, ys[1]]);
    label(tx, ys[1], 'DRAWING NO.'); value(tx, ys[0], f.drawingNo, 110, 4.25);
    label(tx + 110, ys[1], 'REV'); value(tx + 110, ys[0], f.rev, 20);
    label(tx + 130, ys[1], 'SHEET'); value(tx + 130, ys[0], f.sheet || '1 OF 1', 50);
    // row 2: drawn, checked, approved, date, scale
    [[0, 'DRAWN', f.drawnBy, 30], [30, 'CHECKED', f.checkedBy, 30], [60, 'APPROVED', f.approvedBy, 30], [90, 'DATE', f.date, 30], [120, 'SCALE', f.scale, 60]].forEach(function (c) {
      if (c[0]) line([tx + c[0], ys[1]], [tx + c[0], ys[2]]);
      label(tx + c[0], ys[2], c[1]); value(tx + c[0], ys[1], c[2], c[3], c[3] >= 60 ? 2.5 : 3);
    });
    // row 3: drawing title
    label(tx, ys[3], 'DRAWING TITLE'); value(tx, ys[2] + 1, f.title, TB, 4.25);
    // row 4: project, client
    line([tx + 110, ys[3]], [tx + 110, ys[4]]);
    label(tx, ys[4], 'PROJECT'); value(tx, ys[3], f.project, 110);
    label(tx + 110, ys[4], 'CLIENT'); value(tx + 110, ys[3], f.client, 70);
    // row 5: firm, and how the drawing was made
    line([tx + 110, ys[4]], [tx + 110, ys[5]]);
    value(tx, ys[4] + 2.5, f.firm, 110, 5);
    ents.push({ t: 'text', l: L, p: [tx + 111.5, ys[5] - 4.5], h: 1.8, s: 'ALL DIMENSIONS IN MM.' });
    ents.push({ t: 'text', l: L, p: [tx + 111.5, ys[5] - 8], h: 1.8, s: 'DO NOT SCALE FROM THIS DRAWING.' });
    ents.push({ t: 'text', l: L, p: [tx + 111.5, ys[4] + 2.5], h: 1.8, s: String(f.app || 'BARWIN').toUpperCase() });

    // the band left of the title block: notes, then revisions where there is room
    var bandX = x0, bandW = tx - x0, revW = bandW >= 200 ? 100 : 0, nx1 = tx - revW;
    rect(bandX, y0, tx, y0 + TH);
    if (revW) {
      line([nx1, y0], [nx1, y0 + TH]);
      var rx = nx1, rt = y0 + TH, rh = 8, cols = [[0, 'REV', 12], [12, 'DATE', 22], [34, 'DESCRIPTION', 52], [86, 'BY', 14]];
      ents.push({ t: 'text', l: L, p: [rx + 1.5, rt - 4.5], h: 2.5, s: 'REVISIONS' });
      line([rx, rt - 7], [tx, rt - 7]);
      cols.forEach(function (c) { if (c[0]) line([rx + c[0], y0], [rx + c[0], rt - 7]); label(rx + c[0], rt - 7, c[1]); });
      (revisions || []).slice(-5).forEach(function (r, i) {
        var yy = rt - 7 - 4 - (i + 1) * rh + 2;
        [r.rev, r.date, r.text, r.by].forEach(function (s, j) { value(rx + cols[j][0], yy, s, cols[j][2], 2.5); });
      });
    }
    if (nx1 - bandX > 40) {
      ents.push({ t: 'text', l: L, p: [bandX + 1.5, y0 + TH - 4.5], h: 2.5, s: 'NOTES' });
      var nh = 2.5, lh = 4.2, ny = y0 + TH - 10, maxW = nx1 - bandX - 6;
      wrapLines(notes || [], nh, maxW).forEach(function (s, i) {
        var yy = ny - i * lh;
        if (yy > y0 + 2) ents.push({ t: 'text', l: L, p: [bandX + 3, yy], h: nh, s: s });
      });
    }
    return { ents: ents, area: { x0: x0, y0: y0 + TH, x1: x1, y1: y1 } };
  }

  /** Numbered notes broken into lines no wider than maxW at text height h. */
  function wrapLines(notes, h, maxW) {
    var out = [];
    notes.forEach(function (n, i) {
      var lead = (i + 1) + '. ', words = String(n).toUpperCase().split(/\s+/).filter(Boolean), cur = lead;
      words.forEach(function (w) {
        var t = cur + (cur === lead || cur === '   ' ? '' : ' ') + w;
        if (textWidth(t, h) <= maxW || cur === lead || cur === '   ') cur = t;
        else { out.push(cur); cur = '   ' + w; }
      });
      out.push(cur);
    });
    return out;
  }

  return {
    VERSION: VERSION, SPEC: SPEC, FRAME: FRAME, ACI_RGB: ACI_RGB,
    paper: paper, textWidth: textWidth, fitScale: fitScale, bulgeArc: bulgeArc,
    dimGeometry: dimGeometry, flatten: flatten, titleBlock: titleBlock, wrapLines: wrapLines,
    toDXF: toDXF, toSVG: toSVG, toPDF: toPDF, dxfText: dxfText, templateInfo: templateInfo
  };
}));
