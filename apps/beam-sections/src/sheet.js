/*
 * Beam Sections: the true-scale drawing sheet (BACKLOG C1).
 *
 * The on-screen drawings are a not-to-scale template. This module draws the same beam from the real numbers, in
 * millimetres, and lays it out on a sheet with the BarWin title block: the L-section at one scale, the shown
 * cross-sections at another (1:10 to 1:100), on A4 to A0. packages/cad turns the sheet into DXF, PDF and SVG.
 *
 * Model space (DXF): x along the beam from the left support face, y up from the soffit; the L-section at the origin,
 * the sections below it. Every bar, link and face is at its real size and position; text and dimension sizes are set
 * on paper (2.5 mm) and grow with each view's scale.
 *
 * Drafting conventions (from the office standard beam detail): bars and links as single lines, bars in section as solid
 * dots, layers FRAMING / BEAM R / STIRRUPS / SPACER BAR / COVERS / TEXT / COLUMN.
 * Where a real offset would vanish on paper (laps side by side, extras alongside the main bars, a bottom bar's bend
 * inside the top bar's), the offset is a fixed distance on paper so the bars read apart: 1 mm, 2 mm for a second layer.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./beams.js'), require('../../../packages/cad/cad.js'));
  else root.BeamSheet = factory(root.BeamSections, root.BarWinCAD);
}(typeof self !== 'undefined' ? self : this, function (B, CAD) {
  'use strict';

  var LY = { OUT: 'FRAMING', BAR: 'BEAM R', LINK: 'STIRRUPS', SPC: 'SPACER BAR', COV: 'COVERS', TXT: 'TEXT', DIM: 'FRAMING', MARK: 'COLUMN' };
  var TXT = 2.5, NOTE = 2.0, ROW = 7;        // text heights and the pitch of dimension rows, mm on paper
  var BULGE90 = Math.tan(Math.PI / 8);       // a quarter circle as a polyline bulge

  function fmt(v) { return String(Math.round(v)); }
  /** Rows of labels: place(a, b) gives the first row (0, 1, ...) where the span a..b touches nothing already placed. */
  function Rows() {
    var rows = [];
    return function (a, b) {
      for (var r = 0; ; r++) {
        var R = rows[r] = rows[r] || [];
        if (!R.some(function (q) { return a < q[1] && b > q[0]; })) { R.push([a, b]); return r; }
      }
    };
  }
  function clamp(x, a, b) { return Math.min(Math.max(x, a), b); }
  /** The radius bars are drawn bent to: BS 8666 minimum, 2 x bar up to 16, 3.5 x bar above (drawn only; no deduction is made). */
  function bendR(d) { return d <= 16 ? 2 * d : 3.5 * d; }

  /** A drawing being built: entities plus the box they fill (text measured), all in model mm at scale s. */
  function Pen(s) {
    var ents = [], box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    function grow(x, y) { box.x0 = Math.min(box.x0, x); box.y0 = Math.min(box.y0, y); box.x1 = Math.max(box.x1, x); box.y1 = Math.max(box.y1, y); }
    function add(e) { ents.push(e); return e; }
    var pen = {
      ents: ents, box: box, s: s, u: s,      // u: one millimetre on paper, in model units
      line: function (l, a, b, o) { grow(a[0], a[1]); grow(b[0], b[1]); return add(Object.assign({ t: 'line', l: l, p: [a, b] }, o || {})); },
      poly: function (l, p, closed, o) { p.forEach(function (q) { grow(q[0], q[1]); }); return add(Object.assign({ t: 'poly', l: l, p: p, closed: !!closed }, o || {})); },
      dot: function (l, c, r) { grow(c[0] - r, c[1] - r); grow(c[0] + r, c[1] + r); return add({ t: 'circle', l: l, c: c, r: r, fill: true }); },
      circle: function (l, c, r) { grow(c[0] - r, c[1] - r); grow(c[0] + r, c[1] + r); return add({ t: 'circle', l: l, c: c, r: r }); },
      /** Text of height h (paper mm); returns its box in model units. */
      text: function (l, p, str, h, al, va, rot, style) {
        h = h || TXT; var w = CAD.textWidth(str, h) * s, H = h * s, x0, y0;
        x0 = al === 'r' ? p[0] - w : al === 'c' ? p[0] - w / 2 : p[0];
        y0 = va === 't' ? p[1] - H : va === 'm' ? p[1] - H / 2 : p[1];
        if (rot === 90) { grow(p[0] - H * 1.2, p[1] - w); grow(p[0] + H * 1.2, p[1] + w); }
        else { grow(x0, y0 - H * 0.3); grow(x0 + w, y0 + H * 1.1); }
        add({ t: 'text', l: l, p: p, s: str, h: h, al: al || 'l', va: va || 'b', rot: rot || 0, style: style });
        return { x0: x0, x1: x0 + w, y0: y0, y1: y0 + H };
      },
      /** A linear dimension; its text box is counted in the drawing's size. */
      dim: function (p1, p2, dir, at, text, side) {
        var e = { t: 'dim', l: LY.DIM, p1: p1, p2: p2, dir: dir, at: at };
        if (text !== undefined && text !== null) e.text = text;
        if (side) e.side = side;
        var g = CAD.dimGeometry(e, s);
        g.lines.forEach(function (q) { grow(q.a[0], q.a[1]); grow(q.b[0], q.b[1]); });
        var tw = CAD.textWidth(g.text.s, CAD.SPEC.dim.txt) * s, th = CAD.SPEC.dim.txt * s * 1.3;
        if (g.text.rot) { grow(g.text.p[0] - th, g.text.p[1] - tw / 2); grow(g.text.p[0], g.text.p[1] + tw / 2); }
        else { grow(g.text.p[0] - tw / 2, g.text.p[1]); grow(g.text.p[0] + tw / 2, g.text.p[1] + th); }
        return add(e);
      }
    };
    return pen;
  }

  /** Reverses a polyline path whose points may carry a bulge (on the segment that starts there). */
  function reversePath(P) {
    var n = P.length, out = [], j;
    for (j = 0; j < n; j++) {
      var p = P[n - 1 - j], b = j < n - 1 ? (P[n - 2 - j][2] || 0) : 0;
      out.push(b ? [p[0], p[1], -b] : [p[0], p[1]]);
    }
    return out;
  }
  /** Joins paths, dropping a point that repeats the last one (keeping the later one's bulge). */
  function join() {
    var out = [];
    Array.prototype.forEach.call(arguments, function (P) {
      P.forEach(function (q) {
        var l = out[out.length - 1];
        if (l && Math.abs(l[0] - q[0]) < 0.01 && Math.abs(l[1] - q[1]) < 0.01) { if (q[2]) l[2] = q[2]; return; }
        out.push(q.slice());
      });
    });
    return out;
  }
  function translate(ents, dx, dy) {
    function T(p) { var q = [p[0] + dx, p[1] + dy]; if (p.length > 2) q.push(p[2]); return q; }
    return ents.map(function (e) {
      var c = Object.assign({}, e);
      if (e.p) c.p = e.t === 'text' ? T(e.p) : e.p.map(T);
      if (e.c) c.c = T(e.c);
      if (e.p1) { c.p1 = T(e.p1); c.p2 = T(e.p2); c.at = e.at + (e.dir === 'v' ? dx : dy); }
      return c;
    });
  }

  /* ---------- L-section ---------- */

  /**
   * The L-section at real size, annotated for scale s. Returns { ents, box, beam: { x0, x1, y0, y1 }, cuts: { A, B, C },
   * breakable: [[x0, x1], ...] } where breakable lists the stretches of span a break line may take out.
   */
  function lsection(v, s) {
    v = B.withZones(v);
    var P = Pen(s), u = s, sp = v.span, D = v.D, LBL = v.showLabels !== false;
    var ext = clamp(0.6 * D, 450, 900);   // how far a column or wall is drawn above and below the beam, broken off
    var ends = ['L', 'R'].map(function (k) {
      var t = v['type' + k] === 'beam' ? 'beam' : 'col', d = k === 'L' ? -1 : 1, w = t === 'col' ? v[k + 'colW'] : v[k + 'beamW'];
      var Ds = t === 'beam' ? v[k + 'beamD'] : D, kase = t === 'beam' ? B.supportCase(v, k) : null;
      return { k: k, t: t, d: d, w: w, Ds: Ds, kase: kase, under: kase === 'shallower' && v[k + 'under'] === 'under',
        X: function (q) { return k === 'L' ? -q : sp + q; }, soffit: D - Ds };
    });
    var EL = ends[0], ER = ends[1], JN = { lt: 'DASHED2', col: 8 };

    // concrete: open faces solid, shared faces dashed
    ends.forEach(function (e) {
      var X = e.X, w = e.w;
      if (e.t === 'col') {
        var z = Math.min(1.5 * u, 0.12 * w);
        var brk = function (y) { return [[X(0), y], [X(0.38 * w), y], [X(0.44 * w), y + z], [X(0.56 * w), y - z], [X(0.62 * w), y], [X(w), y]]; };
        P.poly(LY.OUT, brk(D + ext)); P.poly(LY.OUT, brk(-ext));
        P.line(LY.OUT, [X(w), -ext], [X(w), D + ext]);
        P.line(LY.OUT, [X(0), -ext], [X(0), 0]); P.line(LY.OUT, [X(0), D], [X(0), D + ext]);
        P.line(LY.OUT, [X(0), 0], [X(0), D], JN);
        P.line(LY.COV, [X(w - v.ccol), -ext], [X(w - v.ccol), D + ext]);   // cover at the column's far face
      } else if (e.under) {
        P.line(LY.OUT, [X(0), D], [X(w), D]); P.line(LY.OUT, [X(w), 0], [X(w), D]); P.line(LY.OUT, [X(0), 0], [X(w), 0]);
        P.line(LY.OUT, [X(0), e.soffit], [X(0), D], JN); P.line(LY.OUT, [X(0), e.soffit], [X(w), e.soffit], JN);
      } else {
        var J = Math.max(0, e.soffit);
        P.line(LY.OUT, [X(0), D], [X(w), D]); P.line(LY.OUT, [X(w), e.soffit], [X(w), D]); P.line(LY.OUT, [X(0), e.soffit], [X(w), e.soffit]);
        P.line(LY.OUT, [X(0), J], [X(0), D], JN);
        if (e.Ds !== D) P.line(LY.OUT, [X(0), Math.min(0, e.soffit)], [X(0), J]);
      }
    });
    P.line(LY.OUT, [0, D], [sp, D]); P.line(LY.OUT, [0, 0], [sp, 0]);

    // cover line: the combined outline offset inwards; a column breaks the walk top and bottom
    var ct = v.ctop, cb = v.cbot, cs = v.cside, cc = v.ccol;
    function endPts(e) {
      var Q = function (q, y) { return [e.X(q), y]; };
      if (e.t === 'col') return [Q(cc, D - ct), Q(cc, D + ext), null, Q(cc, -ext), Q(cc, cb)];
      if (e.under) return [Q(e.w - cs, D - ct), Q(e.w - cs, cb)];
      var a = [Q(e.w - cs, D - ct), Q(e.w - cs, e.soffit + cb)];
      if (e.kase === 'deeper') a.push(Q(cs, e.soffit + cb), Q(cs, cb));
      else if (e.kase === 'shallower') a.push(Q(-cs, e.soffit + cb), Q(-cs, cb));
      return a;
    }
    var walk = endPts(ER).concat(endPts(EL).reverse()), cut = walk.indexOf(null);
    if (cut < 0) P.poly(LY.COV, walk, true);
    else {
      var cur = [];
      walk.slice(cut + 1).concat(walk.slice(0, cut)).forEach(function (q) { if (q === null) { P.poly(LY.COV, cur); cur = []; } else cur.push(q); });
      P.poly(LY.COV, cur);
    }

    // links: every real link, outer face to outer face
    var LK = B.linkLayout(v);
    LK.pos.forEach(function (x) { P.line(LY.LINK, [x, cb], [x, D - ct]); });

    // main bars, on single lines at their real centres
    var dT = Math.max(v.topDia, v.LtDia || 0, v.RtDia || 0), dB = Math.max(v.botDia, v.LbDia || 0, v.RbDia || 0);
    var yt = D - ct - v.ldia - dT / 2, yb = cb + v.ldia + dB / 2, OFF = 1.0 * u, TK = 1.2 * u;
    /** The path of a bar's end at support e: from the face outwards, as anchored. s1 = -1 bends down (top), +1 up (bottom). */
    function endPath(e, y, s1, dia, inset) {
      var X = e.X, a = B.anchorage(v, e.k, dia), bl = B.bendLeg(v, e.k, dia), r = bendR(dia), bul = e.d * s1 * BULGE90;
      var cov = e.t === 'col' ? cc : cs;
      function bendAt(q, leg) { return [[X(q - r), y, bul], [X(q), y + s1 * r], [X(q), y + s1 * Math.max(leg, r + 1)]]; }
      // under a shallower support beam's soffit the bar cannot enter: it turns up inside the beam, short of the face
      if (e.t === 'beam' && !e.under && y < e.soffit + cb) return bendAt(-(cs + v.ldia + dia / 2 + (inset || 0)), B.legMin(v, dia).min);
      var qF = e.w - cov - dia / 2 - (inset || 0);
      if (a.mode === 'ld') return [[X(0), y], [X(Math.min(a.ld, e.w - cov - dia / 2)), y]];
      if (a.mode === 'cover') return [[X(0), y], [X(qF), y]];
      return [[X(0), y]].concat(bendAt(qF, bl.leg));
    }
    function anchored(run, e, y, s1, inset) {
      var p = endPath(e, y, s1, run.d, inset);
      return e.k === 'L' ? reversePath(p) : p;
    }
    var runInfo = { t: [], b: [] };
    ['t', 'b'].forEach(function (sd) {
      var top = sd === 't', y0 = top ? yt : yb, dir = top ? -1 : 1, s1 = top ? -1 : 1, style = v[sd + 'LapStyle'] || 'inline';
      var C = { L: B.barChange(v, sd, 'L'), R: B.barChange(v, sd, 'R') }, lv = [];
      B.barRuns(v, sd).forEach(function (r) {
        var i = 0;
        if (style === 'offset') { while (lv[i] && lv[i].some(function (q) { return r.a < q.b - 1 && r.b > q.a + 1; })) i++; (lv[i] = lv[i] || []).push(r); }
        var y = y0 + dir * OFF * i, inset = (top ? 0 : 1.0 * u) + OFF * i, path;
        var left = r.ancL ? anchored(r, EL, y, s1, inset)
          : style === 'crank' && r.lapL ? [[r.a, y + dir * OFF], [Math.min(r.a + C.L.lap, sp), y + dir * OFF], [Math.min(r.a + C.L.lap, sp) + 6 * OFF, y]]
          : [[r.a, y]];
        var right = r.ancR ? anchored(r, ER, y, s1, inset)
          : style === 'crank' && r.lapR ? [[Math.max(r.b - C.R.lap, 0) - 6 * OFF, y], [Math.max(r.b - C.R.lap, 0), y + dir * OFF], [r.b, y + dir * OFF]]
          : [[r.b, y]];
        path = join(left, right);
        P.poly(LY.BAR, path);
        if (style === 'inline') {
          if (!r.ancL) P.line(LY.BAR, [r.a, y], [r.a - TK, y + dir * TK]);
          if (!r.ancR) P.line(LY.BAR, [r.b, y], [r.b + TK, y + dir * TK]);
        }
        runInfo[sd].push({ r: r, y: y });
      });
    });

    // face bars: straight, 150 into each support (stopping inside the beam where a shallower support is in the way)
    var faces = B.spread(v.faceN + 2, yt, yb).slice(1, -1);
    faces.forEach(function (y) {
      function tip(e) { return e.t === 'beam' && !e.under && y < e.soffit + cb ? e.X(-(cs + v.ldia)) : e.X(150); }
      P.line(LY.BAR, [tip(EL), y], [tip(ER), y]);
    });

    // extra top bars: alongside the top bars (a second layer further in), anchored as the main bars, cut off at their length
    var XT = {};
    ends.forEach(function (e) {
      var x = B.extraTop(v, e.k); XT[e.k] = x; if (!x.n) return;
      var lay = B.layersAt(v, e.k), y = yt - (lay.second ? 2 : 1) * OFF, xc = e.k === 'L' ? x.len : sp - x.len, pth = endPath(e, y, -1, x.dia, 2.0 * u);
      x.y = y; x.xc = xc;
      P.poly(LY.BAR, e.k === 'L' ? join(reversePath(pth), [[xc, y]]) : join([[xc, y]], pth));
      if (lay.second) {
        var sb = B.spacers(v, 0, x.len, lay.need);
        sb.at.forEach(function (mm) { P.dot(LY.SPC, [e.k === 'L' ? mm : sp - mm, yt - OFF], Math.max(sb.dia / 2, 0.35 * u)); });
      }
    });
    // bottom extras over mid-span, cut off at each end
    var XB = B.extraBot(v), blay = B.botLayersAt(v, sp / 2);
    if (XB.n) {
      var ybx = yb + (blay.second ? 2 : 1) * OFF;
      P.line(LY.BAR, [XB.cut.L, ybx], [sp - XB.cut.R, ybx]);
      if (blay.second) {
        var sbb = B.spacers(v, XB.cut.L, sp - XB.cut.R, blay.need);
        sbb.at.forEach(function (mm) { P.dot(LY.SPC, [mm, yb + OFF], Math.max(sbb.dia / 2, 0.35 * u)); });
      }
    }

    // ---- annotation ----
    var colTop = ends.some(function (e) { return e.t === 'col'; }) ? D + ext : D;
    var lowest = Math.min(0, EL.soffit, ER.soffit), colBot = ends.some(function (e) { return e.t === 'col'; }) ? -ext : lowest;
    var cuts = { B: B.cutX(v, 'B') * sp / 5000, A: sp / 2, C: B.cutX(v, 'C') * sp / 5000 };

    // tags: three above the beam (left, mid, right), three below; a tag that would touch another takes the next row out
    function tagRow(y, va, mid, endTxt, endAt) {
      var free = Rows(), out = va === 'b' ? 1 : -1, used = 0;
      function put(t, want) {
        var h = CAD.textWidth(t, TXT) * u / 2, cx = h * 2 > sp ? sp / 2 : clamp(want, h, sp - h), r = free(cx - h - 1.5 * u, cx + h + 1.5 * u);
        used = Math.max(used, r + 1);
        if (LBL) P.text(LY.TXT, [cx, y + out * r * 4 * u], t, TXT, 'c', va);
      }
      put(mid, sp / 2);
      ['L', 'R'].forEach(function (k) { var t = endTxt(k); if (t) put(t, endAt(k)); });
      return used;
    }
    function zoneTxt(sd, k) { var z = B.barZone(v, sd, k); return z.n + '-T' + z.d + (sd === 't' ? ' TOP' : ' BOTTOM'); }
    var topRows = tagRow(D + 2 * u, 'b', zoneTxt('t', 'M'), function (k) {
      return zoneTxt('t', k) + (XT[k].n ? ' + ' + XT[k].n + '-T' + XT[k].dia + ' EXTRA' : '');
    }, function (k) { return XT[k].n ? (k === 'L' ? XT[k].xc / 2 : (sp + XT[k].xc) / 2) : (k === 'L' ? 0.16 * sp : 0.84 * sp); });
    var botMid = zoneTxt('b', 'M') + (XB.n ? ' + ' + XB.n + '-T' + XB.d + ' EXTRA' : '');
    var botRows = tagRow(-2 * u, 't', botMid, function (k) { return zoneTxt('b', k); }, function (k) { return k === 'L' ? 0.16 * sp : 0.84 * sp; });
    var yFace = -2 * u - 4 * u * botRows;
    if (faces.length && LBL) P.text(LY.TXT, [sp / 2, yFace], v.faceN + '-T' + v.faceDia + ' EACH FACE', TXT, 'c', 't');
    var belowTags = yFace - (faces.length ? 4 * u : 0) - 2 * u;

    // section marks: a line, an arrow looking right and the letter, above and below the beam
    var shown = ['B', 'A', 'C'].filter(function (k) { return v['show' + k] !== false; });
    var yM0 = D + 2 * u + 4 * u * topRows + 1 * u, yM1 = yM0 + 6 * u;
    function mark(x, y0, y1, k) {
      P.line(LY.MARK, [x, y0], [x, y1]);
      P.line(LY.MARK, [x, y1], [x + 5 * u, y1]);
      P.poly(LY.MARK, [[x + 5 * u, y1], [x + 3.5 * u, y1 + 0.6 * u], [x + 3.5 * u, y1 - 0.6 * u]], true);
      P.text(LY.MARK, [x + 6 * u, y1], k, 3.5, 'l', 'm', 0, 'RC');
    }
    shown.forEach(function (k) { mark(cuts[k], yM0, yM1, k); });

    // rows of dimensions above: top laps, extra-bar lengths, lap points, the chain and the overall length
    var y = yM1 + 3 * u, TC = { L: B.barChange(v, 't', 'L'), R: B.barChange(v, 't', 'R') };
    function nextRow() { y += ROW * u; return y; }
    function hd(a, b, row, text, side) { if (Math.abs(b - a) > 0.5) P.dim([a, row - 2.5 * u], [b, row - 2.5 * u], 'h', row, text, side); }
    if (LBL && (TC.L.ch !== 'none' || TC.R.ch !== 'none')) {
      var yl = nextRow();
      ['L', 'R'].forEach(function (k) {
        var c = TC[k]; if (c.ch === 'none') return;
        var a = Math.max(0, k === 'L' ? c.at - c.lap : sp - c.at), b2 = Math.min(sp, k === 'L' ? c.at : sp - c.at + c.lap);
        hd(a, b2, yl, 'LAP <>', k === 'L' ? 'l' : 'r');
      });
    }
    if (LBL && (XT.L.n || XT.R.n)) {
      var yx = nextRow();
      ['L', 'R'].forEach(function (k) {
        var x = XT[k]; if (!x.n) return;
        hd(k === 'L' ? 0 : x.xc, k === 'L' ? x.xc : sp, yx, x.mode === 'typed' ? null : '<> = ' + x.basis, k === 'L' ? 'l' : 'r');
      });
    }
    if (LBL) {
      var lapRow = null;
      ['L', 'R'].forEach(function (k) {
        var c = TC[k]; if (c.ch === 'none' || (c.mode === 'x' && XT[k].n)) return;
        if (lapRow === null) lapRow = nextRow();
        var xp = k === 'L' ? c.at : sp - c.at;
        hd(k === 'L' ? 0 : xp, k === 'L' ? xp : sp, lapRow, 'LAP POINT <>' + (c.basis ? ' = ' + c.basis : ''), k === 'L' ? 'l' : 'r');
      });
    }
    var yC = Math.max(nextRow(), colTop + 4 * u), yO = yC + ROW * u;
    function supKey(e) { return e.X(e.w); }
    P.dim([supKey(EL), yC - 2.5 * u], [0, yC - 2.5 * u], 'h', yC, null, 'l');
    P.dim([0, yC - 2.5 * u], [sp, yC - 2.5 * u], 'h', yC);
    P.dim([sp, yC - 2.5 * u], [supKey(ER), yC - 2.5 * u], 'h', yC, null, 'r');
    P.dim([supKey(EL), yO - 2.5 * u], [supKey(ER), yO - 2.5 * u], 'h', yO);

    // below: bottom extras' cut-offs and bottom laps on their own rows, then the section marks, then the link zones
    var yb2 = belowTags, BC = { L: B.barChange(v, 'b', 'L'), R: B.barChange(v, 'b', 'R') };
    function downRow() { yb2 -= ROW * u; return yb2 + 2 * u; }
    function hdb(a, b, row, text, side) { if (Math.abs(b - a) > 0.5) P.dim([a, row + 2.5 * u], [b, row + 2.5 * u], 'h', row, text, side); }
    if (LBL && XB.n && (XB.cut.L > 0 || XB.cut.R > 0)) {
      var yc = downRow();
      ['L', 'R'].forEach(function (k) {
        var c = XB.cut[k]; if (c <= 0) return;
        hdb(k === 'L' ? 0 : sp - c, k === 'L' ? c : sp, yc, XB.mode[k] === 'typed' ? 'CUT-OFF <>' : 'CUT-OFF <> = ' + XB.basis[k], k === 'L' ? 'r' : 'l');
      });
    }
    if (LBL && (BC.L.ch !== 'none' || BC.R.ch !== 'none')) {
      var ybl = downRow();
      ['L', 'R'].forEach(function (k) {
        var c = BC[k]; if (c.ch === 'none') return;
        var a = Math.max(0, k === 'L' ? c.at - c.lap : sp - c.at), b2 = Math.min(sp, k === 'L' ? c.at : sp - c.at + c.lap);
        hdb(a, b2, ybl, 'LAP <>' + (c.mode === 'face' ? ' FROM FACE' : ' TO ' + (c.basis || fmt(c.at))), k === 'L' ? 'r' : 'l');
      });
    }
    var yMb0 = yb2 - 1 * u, yMb1 = yMb0 - 6 * u;
    shown.forEach(function (k) { mark(cuts[k], yMb0, yMb1, k); });

    // link zones: each zone's length, and its links under it ("19 NOS T8 @ 100 C/C")
    var yz = yMb1 - 8 * u, zrows = Rows(), zused = 1;
    LK.zones.forEach(function (z) {
      if (z.to - z.from < 0.5 && LK.zones.length > 1) return;
      var a = z.from === v.lStart || z.from <= v.lStart + 0.5 ? 0 : z.from, b2 = z.to >= sp - v.lStart - 0.5 ? sp : z.to;
      P.dim([a, yz + 2.5 * u], [b2, yz + 2.5 * u], 'h', yz);
      if (!LBL) return;
      var spacing = z.pitch ? Math.round(v[z.k] || z.pitch) : 0, note = z.n + ' NOS T' + v.ldia + (spacing ? ' @ ' + spacing + ' C/C' : '');
      var hw = CAD.textWidth(note, TXT) * u / 2, cx = hw * 2 > sp ? sp / 2 : clamp((a + b2) / 2, hw, sp - hw), r0 = zrows(cx - hw - u, cx + hw + u);
      zused = Math.max(zused, r0 + 1);
      P.text(LY.TXT, [cx, yz - 2 * u - r0 * 4 * u], note, TXT, 'c', 't');
    });
    if (LBL) P.text(LY.TXT, [u, yz - 2 * u - zused * 4 * u - 0.5 * u], 'FIRST AND LAST LINK ' + fmt(v.lStart) + ' FROM THE SUPPORT FACES', NOTE, 'l', 't');   // at the left end, clear of any break

    // anchorage: the length into each support over (top) or under (bottom) the bars, each bent leg dimensioned
    var CAP = {};
    function anchText(e, a, bl, dia) {
      var plus = e.t === 'col' && v[e.k + 'colx'] === 'ld10';
      if (a.mode === 'ld') return 'LD ' + a.ld + ' = ' + (plus ? '(' + v.ldF + '+10)' : v.ldF) + ' X T' + dia;
      if (a.mode === 'cover') return 'STRAIGHT ' + a.avail + ' TO COVER (LD ' + a.ld + ')';
      return 'LD ' + a.ld + ': ' + bl.run + ' + ' + bl.leg + ' LEG' + (bl.minRules ? ' (MIN ' + bl.minBasis + ')' : '');
    }
    var legsOut = { L: 0, R: 0 };
    ends.forEach(function (e) {
      var lines = [], legs = [];
      [['TOP', B.barZone(v, 't', e.k).d, yt, -1], ['BOT', B.barZone(v, 'b', e.k).d, yb, 1]].forEach(function (q) {
        var dia = q[1], yy = q[2], s1 = q[3], a = B.anchorage(v, e.k, dia), bl = B.bendLeg(v, e.k, dia);
        if (s1 > 0 && e.t === 'beam' && !e.under && yy < e.soffit + cb) return;   // blocked by a shallower support
        lines.push({ who: q[0], text: anchText(e, a, bl, dia) });
        var cov = e.t === 'col' ? cc : cs, qF = e.w - cov - dia / 2 - (s1 > 0 ? 1.0 * u : 0), q1 = a.mode === 'ld' ? Math.min(a.ld, e.w - cov - dia / 2) : qF;
        if (bl.leg) legs.push({ q: qF, y0: yy, y1: yy + s1 * bl.leg });
        if (!LBL) return;
        var row = s1 < 0 ? D + 3 * u : Math.min(0, e.soffit) - 3 * u, x0 = e.X(0), x1 = e.X(q1);
        var lo = Math.min(x0, x1), hi = Math.max(x0, x1), py = s1 < 0 ? row - 2 * u : row + 2 * u;
        P.dim([lo, py], [hi, py], 'h', row, a.mode === 'ld' ? 'LD <>' : String(a.avail), e.k === 'L' ? 'l' : 'r');
      });
      var xt = XT[e.k];
      if (xt && xt.n) {
        var ax = B.anchorage(v, e.k, xt.dia), blx = B.bendLeg(v, e.k, xt.dia);
        lines.push({ who: 'EXTRA', text: anchText(e, ax, blx, xt.dia) });
        if (blx.leg) legs.push({ q: e.w - (e.t === 'col' ? cc : cs) - xt.dia / 2 - 2.0 * u, y0: xt.y, y1: xt.y - blx.leg });
      }
      CAP[e.k] = lines;
      if (!LBL) return;
      var inside = e.t === 'col';
      legs.forEach(function (lg, i) {
        var q = inside ? lg.q - (5 + 4 * i) * u : e.w + (4 + 5 * i) * u, x = e.X(q);
        P.dim([e.X(lg.q), lg.y0], [e.X(lg.q), lg.y1], 'v', x, null, 'r');
      });
      if (!inside) legsOut[e.k] = legs.length;
    });
    // a support beam's depth beside it, outside any leg dimensions
    ends.forEach(function (e) {
      if (e.t !== 'beam') return;
      var x = e.X(e.w + (4 + 5 * legsOut[e.k] + 2) * u);
      P.dim([e.X(e.w), e.soffit], [e.X(e.w), D], 'v', x);
    });
    // captions under each support, aligned away from the beam: name, anchorage choice, Ld notes
    ends.forEach(function (e) {
      var right = e.k === 'R', x = right ? sp + 1.5 * u : -1.5 * u, al = right ? 'l' : 'r';
      var yN = (e.t === 'col' ? -ext : Math.min(0, e.soffit) - 3 * u - 6 * u) - 3 * u;
      P.text(LY.TXT, [x, yN], e.t === 'col' ? 'COLUMN / WALL' : 'SUPPORT BEAM', TXT, al, 't');
      if (!LBL) return;
      var at = B.anchorage(v, e.k, B.barZone(v, 't', e.k).d), ab = B.anchorage(v, e.k, B.barZone(v, 'b', e.k).d);
      var lx = e.t === 'col' && v[e.k + 'colx'] === 'ld10' ? 'LD+10%%C' : 'LD', nm = B.ANCH_NAME;
      var txt = at.mode === ab.mode ? nm[at.mode].replace('LD', lx) : 'TOP ' + nm[at.mode].replace('LD', lx) + ', BOT ' + nm[ab.mode].replace('LD', lx);
      txt = txt.replace('%%C', 'Ø');
      P.text(LY.TXT, [x, yN - 4 * u], txt, NOTE, al, 't');
      var merged = [];
      (CAP[e.k] || []).forEach(function (q) { var same = merged.filter(function (m) { return m.text === q.text; })[0]; if (same) same.who += ' & ' + q.who; else merged.push({ who: q.who, text: q.text }); });
      merged.forEach(function (q, i) { P.text(LY.TXT, [x, yN - (7.5 + 3.2 * i) * u], q.who + '  ' + q.text, NOTE, al, 't'); });
    });

    return { ents: P.ents, box: P.box, beam: { x0: 0, x1: sp, y0: 0, y1: D }, cuts: cuts, shown: shown,
      breakable: breakable() };
    /** Stretches of the span a break line may take out: clear of the section marks and their letters, inside the span. */
    function breakable() {
      var lo = shown.indexOf('B') >= 0 ? cuts.B + 12 * u : 0.15 * sp, hi = shown.indexOf('C') >= 0 ? cuts.C - 4 * u : 0.85 * sp;
      var out = shown.indexOf('A') >= 0 ? [[lo, cuts.A - 4 * u], [cuts.A + 12 * u, hi]] : [[lo, hi]];
      return out.filter(function (r) { return r[1] - r[0] > 2 * u; });
    }
  }

  /* ---------- cross-sections ---------- */

  var B135 = Math.tan(Math.PI * 0.75 / 4), C45 = Math.SQRT1_2;
  /**
   * A closed link round the corner-bar centres (x0, y0) to (x1, y1), y up, centre-line radius R, closed at the top-left bar
   * with two 135 degree hooks whose tails (Lh long) run into the core. Corners are true arcs (polyline bulges).
   */
  function closedLink(x0, y0, x1, y1, R, Lh) {
    var h1 = [x0 + R * C45, y1 + R * C45], h2 = [x0 - R * C45, y1 - R * C45];   // where the hooks leave the bar: at 45 and 225 degrees
    return [
      [h1[0] + Lh * C45, h1[1] - Lh * C45], [h1[0], h1[1], B135],   // first tail, then 135 degrees round the bar to its left side
      [x0 - R, y1], [x0 - R, y0, BULGE90], [x0, y0 - R], [x1, y0 - R, BULGE90], [x1 + R, y0], [x1 + R, y1, BULGE90], [x1, y1 + R],
      [x0, y1 + R, B135], [h2[0], h2[1]], [h2[0] + Lh * C45, h2[1] - Lh * C45]   // over the bar again, 135 degrees, into the second tail
    ];
  }
  /** An inner U link round bottom bars at xa and xb (row y0), legs up to the top bars (row y1), each hooked 135 degrees, tails inwards. */
  function openLink(xa, xb, y0, y1, R, Lh) {
    var ha = [xa + R * C45, y1 + R * C45], hb = [xb - R * C45, y1 + R * C45];
    return [
      [ha[0] + Lh * C45, ha[1] - Lh * C45], [ha[0], ha[1], B135], [xa - R, y1], [xa - R, y0, BULGE90], [xa, y0 - R],
      [xb, y0 - R, BULGE90], [xb + R, y0], [xb + R, y1, B135], [hb[0], hb[1]], [hb[0] - Lh * C45, hb[1] - Lh * C45]
    ];
  }
  /** The 135 degree hook's straight extension: 6 x the link size, at least 65 mm (IS 13920). */
  function hookLen(d) { return Math.max(6 * d, 65); }

  /**
   * Cross-section L ('A', 'B' or 'C') at real size, annotated for scale s, with its lower-left corner at the origin.
   * Bars are dots at their real size and positions; returns { ents, box, title, lines } (lines: the bar list under it).
   */
  function xsection(v, L, s) {
    v = B.withZones(v);
    var P = Pen(s), u = s, Bw = v.B, D = v.D, ct = v.ctop, cb = v.cbot, cs = v.cside, t = v.ldia, LBL = v.showLabels !== false;
    var mm = B.cutX(v, L) * v.span / 5000, MA = B.mainsAt(v, mm), XE = B.extrasAt(v, L), TL = B.topLayers(v, XE, MA);
    var BL = B.botLayersAt(v, mm), BM = B.barsAt(v, 'b', mm);
    P.poly(LY.OUT, [[0, 0], [Bw, 0], [Bw, D], [0, D]], true);
    P.poly(LY.COV, [[cs, cb], [Bw - cs, cb], [Bw - cs, D - ct], [cs, D - ct]], true);
    function maxd(row) { return Math.max.apply(null, row.map(function (b) { return b.dia; }).concat([0])); }
    var dT = maxd(TL.row1) || v.topDia, dB = maxd(BL.row1) || v.botDia;
    // corner bar centres: the link's inside face plus the bar's radius
    var yT = D - ct - t - dT / 2, yB = cb + t + dB / 2;
    function xs(row) {
      var a = cs + t + (row[0] ? row[0].dia : 0) / 2, b = Bw - cs - t - (row.length ? row[row.length - 1].dia : 0) / 2;
      return B.spread(row.length, a, b);
    }
    var xt = xs(TL.row1), xb = xs(BL.row1);
    // links: closed round the corner bars, the inner U links for 4 and 6 legs, in the cut's link zone
    var Rt = dT / 2 + t / 2, Rb = dB / 2 + t / 2, R = Math.max(Rt, Rb), Lh = hookLen(t);
    var x0 = cs + t / 2 + R, x1 = Bw - cs - t / 2 - R, y0 = cb + t / 2 + R, y1 = D - ct - t / 2 - R;
    P.poly(LY.LINK, closedLink(x0, y0, x1, y1, R, Lh));
    var legs = v.legs === 6 || v.legs === 4 ? v.legs : 2, inner = B.innerLegs(legs, xb, x0, x1);
    for (var i = 0; i + 1 < inner.length; i += 2) P.poly(LY.LINK, openLink(inner[i], inner[i + 1], y0, y1, R, Lh * 0.8));
    // bars
    TL.row1.forEach(function (b, j) { P.dot(LY.BAR, [xt[j], yT], b.dia / 2); });
    BL.row1.forEach(function (b, j) { P.dot(LY.BAR, [xb[j], yB], b.dia / 2); });
    function secondRow(row, yRow, dir, need) {   // a second layer, held off the first by a spacer bar seen along its length
      if (!row.length) return;
      var sp = B.spacers(v, 0, 1, need).dia, d1 = dir < 0 ? dT : dB, d2 = maxd(row), ySp = yRow + dir * (d1 / 2 + sp / 2), y2 = ySp + dir * (sp / 2 + d2 / 2);
      P.poly(LY.SPC, [[cs, ySp - sp / 2], [Bw - cs, ySp - sp / 2], [Bw - cs, ySp + sp / 2], [cs, ySp + sp / 2]], true);
      var a = cs + t + d2 / 2, b = Bw - cs - t - d2 / 2, xs2 = row.length === 1 ? [(a + b) / 2] : B.spread(row.length, a, b);
      row.forEach(function (bar, j) { P.dot(LY.BAR, [xs2[j], y2], bar.dia / 2); });
    }
    secondRow(TL.row2, yT, -1, TL.need);
    secondRow(BL.row2, yB, 1, BL.need);
    // face bars on both side faces, evenly between the top and bottom rows
    B.spread(v.faceN + 2, yT, yB).slice(1, -1).forEach(function (y) {
      P.dot(LY.BAR, [cs + t + v.faceDia / 2, y], v.faceDia / 2); P.dot(LY.BAR, [Bw - cs - t - v.faceDia / 2, y], v.faceDia / 2);
    });
    // width above, depth beside, covers on the left and under
    P.dim([0, D + 2 * u], [Bw, D + 2 * u], 'h', D + 6 * u);
    P.dim([Bw + 2 * u, 0], [Bw + 2 * u, D], 'v', Bw + 7 * u);
    P.dim([-2 * u, D - ct], [-2 * u, D], 'v', -6 * u, null, 'r');
    P.dim([-2 * u, 0], [-2 * u, cb], 'v', -6 * u, null, 'l');
    P.dim([Bw - cs, -2 * u], [Bw, -2 * u], 'h', -6 * u, null, 'r');
    // the bar list, one line each, under the section
    var lines = [];
    function zoneRows(list, sd) {
      var by = {}, word = sd === 't' ? ' TOP' : ' BOTTOM';
      list.forEach(function (b) { var q = by[b.zone + b.dia] = by[b.zone + b.dia] || { zone: b.zone, dia: b.dia, n: 0 }; q.n++; });
      Object.keys(by).forEach(function (k, j) { var q = by[k]; lines.push((j ? '+ ' : '') + q.n + '-T' + q.dia + word + (q.zone === 'L' ? ' (LEFT END)' : q.zone === 'R' ? ' (RIGHT END)' : '')); });
    }
    zoneRows(MA, 't');
    XE.forEach(function (k) {
      var x = B.extraTop(v, k), two = TL.row2.some(function (b) { return b.k === k; });
      lines.push('+ ' + x.n + '-T' + x.dia + ' EXTRA TOP' + (two ? ', 2ND LAYER' : ''));
    });
    if (TL.second) lines.push('T' + B.spacers(v, 0, 1, TL.need).dia + ' SPACER L=' + (Bw - 2 * cs) + ' @ ' + v.spcS + ' C/C');
    zoneRows(BM, 'b');
    if (BL.row1.concat(BL.row2).some(function (b) { return b.x; })) lines.push('+ ' + v.bxN + '-T' + v.bxDia + ' EXTRA BOTTOM' + (BL.second ? ', 2ND LAYER' : ''));
    if (BL.second) lines.push('T' + B.spacers(v, 0, 1, BL.need).dia + ' SPACER L=' + (Bw - 2 * cs) + ' @ ' + v.spcS + ' C/C');
    if (v.faceN > 0) lines.push(v.faceN + '-T' + v.faceDia + ' EACH FACE');
    lines.push(legs + 'L-T' + t + ' @ ' + Math.round(v[B.sectionSpacingKey(v, L)]) + ' C/C');
    if (LBL) lines.forEach(function (ln, j) { P.text(LY.TXT, [Bw / 2, -10 * u - j * 4 * u], ln, TXT, 'c', 't'); });
    return { ents: P.ents, box: P.box, title: 'SECTION ' + L + '-' + L, lines: lines };
  }

  /* ---------- the sheet ---------- */

  var GAP = 8, TITLE_BAND = 13;   // mm on paper: between views, and under each view for its title

  /** The notes the sheet carries by default, from the values; the user's own notes follow them. */
  function autoNotes(v) {
    var lm = B.legMin(v, 16).basis.replace('\u00D8', ' X BAR SIZE').replace(/^8 X BAR SIZE IS 456$/, '8 X BAR SIZE (IS 456)');
    return [
      'All dimensions are in mm. Do not scale.',
      'Clear cover: top ' + v.ctop + ', bottom ' + v.cbot + ', sides ' + v.cside + (v.typeL === 'col' || v.typeR === 'col' ? ', at column / wall ' + v.ccol : '') + '.',
      'Lap length ' + v.lapF + ' x bar size; Ld ' + v.ldF + ' x bar size.',
      'Bent legs not shorter than ' + lm + '.',
      'Links T' + v.ldia + ', ' + (v.legs === 4 || v.legs === 6 ? v.legs : 2) + ' legged, with 135 degree hooks of ' + hookLen(v.ldia) + ' min.'
    ];
  }

  /**
   * Lays the drawing out on a sheet. opts:
   *   paper 'A4'..'A0', orient 'landscape' | 'portrait', scaleL / scaleS a scale number or 'auto', brk (allow a break line),
   *   fields (title block, see CAD.titleBlock), notes (extra lines), revisions, app (who made it)
   * The sections go under the L-section, or beside it when that lets the drawing be larger. Auto scales: the L-section as
   * large as fits (with a break line in the span if allowed), then the sections as large as fits, never smaller than it.
   * Returns { sheet, scaleL, scaleS, broken, arrangement, issues: [text...] }. A drawing that will not fit is still made,
   * with an issue saying what to change: alert, never block.
   */
  function buildSheet(v, opts) {
    opts = opts || {};
    var p = CAD.paper(opts.paper || 'A2', opts.orient), issues = [], SC = CAD.SPEC.scales;
    var order = ['B', 'A', 'C'].filter(function (k) { return v['show' + k] !== false; });
    var fields = Object.assign({ app: opts.app }, opts.fields || {});
    var notes = autoNotes(v).concat((opts.notes || []).filter(function (n) { return String(n).trim(); }));
    var A = CAD.titleBlock(p, fields, notes, opts.revisions).area, aw = A.x1 - A.x0 - 2 * GAP, ah = A.y1 - A.y0 - 2 * GAP;
    function size(box, s) { return { w: (box.x1 - box.x0) / s, h: (box.y1 - box.y0) / s }; }
    var memoS = {};
    function sections(s) {
      if (memoS[s]) return memoS[s];
      var list = order.map(function (k) {
        var x = xsection(v, k, s); x.k = k; x.size = size(x.box, s);
        var tw = CAD.textWidth(x.title, 4.25) + 4;   // never narrower than its title
        if (x.size.w < tw) { var pad = (tw - x.size.w) * s / 2; x.box.x0 -= pad; x.box.x1 += pad; x.size.w = tw; }
        return x;
      });
      var w = list.reduce(function (q, x) { return q + x.size.w; }, 0) + GAP * Math.max(0, list.length - 1);
      var h = list.reduce(function (q, x) { return Math.max(q, x.size.h); }, 0);
      return (memoS[s] = { list: list, w: w, h: list.length ? h + TITLE_BAND : 0 });
    }
    function pick(want) { return want === 'auto' || !want ? null : Number(want); }
    var wantL = pick(opts.scaleL), wantS = pick(opts.scaleS), brk = opts.brk !== false;

    /** Whether the L-section (at sL, built as Ls) and the sections at sS fit in one arrangement; the plan if so. */
    function tryFit(sL, Ls, sz, sS, mode, allowCut) {
      var S2 = sections(sS), availW = mode === 'below' ? aw : aw - (S2.list.length ? GAP + S2.w : 0);
      var hNeed = mode === 'below' ? sz.h + TITLE_BAND + (S2.list.length ? GAP + S2.h : 0) : Math.max(sz.h + TITLE_BAND, S2.h);
      if (hNeed > ah || (mode === 'below' && S2.w > aw) || availW <= 0) return null;
      var cut = 0;
      if (sz.w > availW) {
        if (!allowCut) return null;
        var room = Ls.breakable.reduce(function (q, r) { return q + r[1] - r[0]; }, 0);
        cut = (sz.w - availW) * sL;
        cut += GAP * sL * (cut > Math.max.apply(null, Ls.breakable.map(function (r) { return r[1] - r[0]; }).concat([0])) ? 2 : 1);   // a second break costs another gap
        if (!Ls.breakable.length || cut > room) return null;
      }
      return { sL: sL, Ls: Ls, sz: sz, sS: sS, S: S2, mode: mode, cut: cut };
    }
    // a break line only when the drawing will not fit whole at any scale offered (or at the scale the user chose)
    var plan = null, candL = wantL ? [wantL] : SC, memoL = {};
    [false].concat(brk ? [true] : []).forEach(function (allowCut) {
      for (var i = 0; i < candL.length && !plan; i++) {
        var sL = candL[i], Ls = memoL[sL] = memoL[sL] || lsection(v, sL), sz = size(Ls.box, sL);
        var candS = wantS ? [wantS] : SC.filter(function (q) { return q <= sL; });
        for (var j = 0; j < candS.length && !plan; j++) {
          plan = tryFit(sL, Ls, sz, candS[j], 'below', allowCut) || tryFit(sL, Ls, sz, candS[j], 'beside', allowCut);
        }
      }
    });
    if (!plan) {   // nothing fits: the chosen scales (or 1:100), overflowing, with an alert saying what to change
      var sLx = wantL || SC[SC.length - 1], Lx = lsection(v, sLx), szx = size(Lx.box, sLx), sSx = wantS || sLx;
      plan = { sL: sLx, Ls: Lx, sz: szx, sS: sSx, S: sections(sSx), mode: 'below', cut: 0 };
      issues.push('The drawing does not fit ' + p.name + ' ' + p.orient + (wantL || wantS ? ' at the chosen scales' : ' even at 1:' + sLx) +
        (brk ? ', even with a break line' : '') + '. Pick a larger sheet' + (wantL || wantS ? ' or smaller scales' : '') + (brk ? '' : ', or allow a break line') + '.');
    }

    var ents = [], views = [], sL2 = plan.sL, Lb = plan.Ls.box, row = plan.S, sS2 = plan.sS;
    // the stretches taken out: one break in the longest stretch if it is enough, otherwise both, each in proportion
    var cuts = [];
    if (plan.cut) {
      var BR = plan.Ls.breakable.slice().sort(function (a, b) { return (b[1] - b[0]) - (a[1] - a[0]); });
      var one = BR[0][1] - BR[0][0] >= plan.cut - GAP * sL2 ? [BR[0]] : BR, need = plan.cut - GAP * sL2 * one.length, tot = one.reduce(function (q, r) { return q + r[1] - r[0]; }, 0);
      cuts = one.map(function (r) { var len = need * (r[1] - r[0]) / tot, m = (r[0] + r[1]) / 2; return [m - len / 2, m + len / 2]; }).sort(function (a, b) { return a[0] - b[0]; });
    }
    var removed = cuts.reduce(function (q, c) { return q + c[1] - c[0]; }, 0);
    var wL = plan.sz.w - removed / sL2 + GAP * cuts.length, hL = plan.sz.h;
    var totalW = plan.mode === 'below' ? Math.max(wL, row.w) : wL + (row.list.length ? GAP + row.w : 0);
    var left = A.x0 + GAP + Math.max(0, (aw - totalW) / 2), topY = A.y1 - GAP - hL;
    var xL = plan.mode === 'below' ? A.x0 + GAP + Math.max(0, (aw - wL) / 2) : left;
    // the L-section's viewports: the whole of it, or the pieces either side of each break, a gap apart, with break lines
    var parts = [], xNow = xL, from = Lb.x0;
    cuts.concat([[Lb.x1, Lb.x1]]).forEach(function (c, i) {
      parts.push({ win: { x0: from, y0: Lb.y0, x1: c[0], y1: Lb.y1 }, at: { x: xNow, y: topY } });
      xNow += (c[0] - from) / sL2;
      if (i < cuts.length) {
        var yb0 = topY + (0 - Lb.y0) / sL2 - 3, yb1 = topY + (v.D - Lb.y0) / sL2 + 3, ym = (yb0 + yb1) / 2;
        [xNow, xNow + GAP].forEach(function (xq) {
          ents.push({ t: 'poly', l: LY.OUT, p: [[xq, yb0], [xq, ym - 1.5], [xq - 1.2, ym - 0.6], [xq + 1.2, ym + 0.6], [xq, ym + 1.5], [xq, yb1]] });
        });
        xNow += GAP; from = c[1];
      }
    });
    if (cuts.length) issues.push('The L-section has ' + (cuts.length > 1 ? 'two break lines' : 'a break line') + ': ' + Math.round(removed) + ' of the span is left out at 1:' + sL2 + '.');
    views.push({ id: 'L', scale: sL2, ents: plan.Ls.ents, parts: parts });
    function title(cx, yTop, main, sub) {
      ents.push({ t: 'text', l: LY.MARK, p: [cx, yTop - 5], h: 4.25, s: main, al: 'c', style: 'RC' });
      var w = CAD.textWidth(main, 4.25) / 2;
      ents.push({ t: 'line', l: LY.MARK, p: [[cx - w, yTop - 6.2], [cx + w, yTop - 6.2]] });
      ents.push({ t: 'text', l: LY.TXT, p: [cx, yTop - 10.2], h: 2.5, s: sub, al: 'c' });
    }
    title(xL + wL / 2, topY, 'L-SECTION', B.beamClass(v).toUpperCase() + ' BEAM   SCALE 1:' + sL2);

    // the sections, in a row; in model space each sits below the L-section so nothing overlaps in CAD
    var rowTop = plan.mode === 'below' ? topY - TITLE_BAND - GAP : A.y1 - GAP;
    var xq = plan.mode === 'below' ? A.x0 + GAP + Math.max(0, (aw - row.w) / 2) : xL + wL + GAP, mx = Lb.x0, my = Lb.y0 - 3000;
    row.list.forEach(function (x) {
      var bx = x.box, dx = mx - bx.x0, dy = my - bx.y1, hS = x.size.h;
      views.push({ id: x.k, scale: sS2, ents: translate(x.ents, dx, dy), parts: [{ win: { x0: bx.x0 + dx, y0: bx.y0 + dy, x1: bx.x1 + dx, y1: bx.y1 + dy }, at: { x: xq, y: rowTop - hS } }] });
      title(xq + x.size.w / 2, rowTop - hS, x.title, 'SCALE 1:' + sS2);
      xq += x.size.w + GAP;
      mx += (bx.x1 - bx.x0) + 2000;
    });

    fields.scale = fields.scale || ('L-SEC 1:' + sL2 + (row.list.length ? ', SECTIONS 1:' + sS2 : ''));
    var tb = CAD.titleBlock(p, fields, notes, opts.revisions);
    return {
      sheet: { paper: p, views: views, ents: tb.ents.concat(ents), meta: { title: fields.title || 'Beam', app: opts.app || 'BarWin Beam Sections' } },
      scaleL: sL2, scaleS: sS2, broken: cuts.length > 0, arrangement: plan.mode, issues: issues
    };
  }

  return { buildSheet: buildSheet, autoNotes: autoNotes, lsection: lsection, xsection: xsection, closedLink: closedLink, openLink: openLink, hookLen: hookLen, reversePath: reversePath, join: join, translate: translate, bendR: bendR, LY: LY };
}));
