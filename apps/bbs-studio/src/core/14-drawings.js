  /* ---------- drawings: every view is a projection of the same 3D bars that go to the 3D view and the IFC file ---------- */
  ['line', 'pl', 'circ', 'text'].forEach(function (k) {     // stamp each primitive with the bar mark being drawn, so views can highlight a mark
    var f = Dwg.prototype[k]; Dwg.prototype[k] = function () { var r = f.apply(this, arguments); if (this.cur) this.p[this.p.length - 1].m = this.cur; return r; };
  });
  var VIEW = { plan: function (q) { return [q[0], q[1]]; }, elev: function (q) { return [q[0], q[2]]; }, side: function (q) { return [q[1], q[2]]; } };
  /** Drops repeated points left when a 3D path is projected (legs running towards the viewer collapse to a point). */
  function clean2D(pts) { var o = []; pts.forEach(function (q) { var l = o[o.length - 1]; if (!l || Math.abs(l[0] - q[0]) > 0.05 || Math.abs(l[1] - q[1]) > 0.05) o.push(q); }); return o; }
  /** The outline of a bar of width w along a centre-line: one side out, the other side back. */
  function outline2D(pts, w) {
    var L = [], Rt = [], n = pts.length, i;
    for (i = 0; i < n; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.sqrt(tx * tx + ty * ty) || 1;
      L.push([pts[i][0] - ty / l * w / 2, pts[i][1] + tx / l * w / 2]); Rt.push([pts[i][0] + ty / l * w / 2, pts[i][1] - tx / l * w / 2]);
    }
    return L.concat(Rt.reverse());
  }
  /**
   * Draws one bar from its 2D centre-line, in one of the four presentations: 'outline' (true-width edges), 'solid' (filled), 'both' (filled, with the centre-line), 'line' (one heavy line).
   * A bar seen end-on is a filled circle of its own diameter in every mode.
   */
  /** Colour for each bar size in the real view. The DXF uses one layer per size with the nearest AutoCAD colour. */
  var SIZE_COL = { 6: ['#EC4899', 221], 8: ['#0EA5B7', 4], 10: ['#3B82F6', 5], 12: ['#8B5CF6', 6], 16: ['#F97316', 30], 20: ['#EF4444', 1], 25: ['#22C55E', 3], 32: ['#D4A017', 2], 40: ['#94A3B8', 8], 50: ['#64748B', 9] };
  var SIZE_CSS = Object.keys(SIZE_COL).map(function (k) { var c = SIZE_COL[k][0]; return '.dwg .ly-RB.sz-' + k + ',.dwg .ly-RL.sz-' + k + '{stroke:' + c + '}.dwg circle.fill.ly-RB.sz-' + k + ',.dwg circle.fill.ly-RL.sz-' + k + ',.dwg .lg.sz-' + k + '{fill:' + c + ';stroke:' + c + '}.dwg .sol.ly-RB.sz-' + k + ',.dwg .sol.ly-RL.sz-' + k + '{fill:' + c + ';fill-opacity:.25}'; }).join('');
  function sized(d, from, dia) { for (var i = from; i < d.p.length; i++) d.p[i].sz = dia; }
  function barDraw(d, layer, pts, dia, mark, mode, ticks, sz) {
    var from = d.p.length; barDraw0(d, layer, pts, dia, mark, mode, ticks); sized(d, from, sz || dia);
  }
  /**
   * Reads a drawing mode. 'solid' is the real view: every bar at its own diameter. 'solid@pres' is the presentation view:
   * the same drawing, same presentation, but every link is drawn at one size and every main bar at another (project settings,
   * 10 and 20 mm unless changed), which reads more cleanly on a crowded section. Colour still tells the real size.
   */
  function viewOf(p, mode) {
    mode = mode || 'outline'; var pres = /@pres$/.test(mode), ps = p.pres || { link: 10, bar: 20 };
    return { m: mode.replace('@pres', ''), pres: pres, dia: function (b) { return !pres ? b.dia : b.drawDia || ((b.kind === 'vert' || b.kind === 'manual') ? ps.bar : ps.link); } };
  }
  /**
   * The member as the presentation view draws it. Drawing a 12 mm bar as a 20 mm dot at its true centre makes it overlap the link beside it,
   * so the member is laid out again at the presentation sizes: every main bar at the bar size, every link and tie at the link size,
   * and every link bend formed to an inside diameter equal to the bar size. Each bar then sits exactly in the bend that holds it.
   * Marks, real sizes, numbers and labels stay those of the real member; only the drawn geometry is replaced.
   */
  function presMember(p, M) {
    var ps = p.pres || { link: 10, bar: 20 }, q = JSON.parse(JSON.stringify(p)), lv = q.levels[M.li], m = lv && lv.members[M.mi]; if (!m || !memberOk(m)) return M;
    var k = ps.bar / (2 * ps.link); q.rules.wall.radius[q.standard] = { rSmall: k, rLarge: k, rSplit: 999 };
    m.vert.forEach(function (v) { v.dia = ps.bar; }); m.links.forEach(function (l) { l.dia = ps.link; });
    var B = buildMember(q, lv, m);
    return Object.assign({}, M, { layout: B.layout, ghosts: B.ghosts, bars: M.bars.map(function (b) {
      var s = B.sets.filter(function (x) { return x.kind === b.kind && x.idx === b.idx; })[0];
      return s && s.protos.length ? Object.assign({}, b, { protos: s.protos, rc: s.rc, drawDia: s.dia }) : b; }) });
  }
  function barDraw0(d, layer, pts, dia, mark, mode, ticks) {
    pts = clean2D(pts); d.cur = mark;
    if (pts.length < 2) d.circ(layer, pts[0][0], pts[0][1], dia / 2, true);
    else {
      if (mode === 'line') {
        d.pl(layer, pts, false); d.p[d.p.length - 1].hv = 1;
        // a lapped leg lies on the bar it laps, so in the line presentation its cut end is shown by a short tick, as on the shape-code figures
        if (ticks) [[pts[0], pts[1]], [pts[pts.length - 1], pts[pts.length - 2]]].forEach(function (e) { var l = Math.sqrt(Math.pow(e[0][0] - e[1][0], 2) + Math.pow(e[0][1] - e[1][1], 2)) || 1, nx = -(e[0][1] - e[1][1]) / l * dia * 0.9, ny = (e[0][0] - e[1][0]) / l * dia * 0.9; d.line(layer, e[0][0] - nx, e[0][1] - ny, e[0][0] + nx, e[0][1] + ny); d.p[d.p.length - 1].hv = 1; });
      }
      else { d.pl(layer, outline2D(pts, dia), true); if (mode !== 'outline') d.p[d.p.length - 1].sol = 1; if (mode === 'both') d.pl('CL', pts, false, true); }
    }
    d.cur = null;
  }
  function projBar(d, layer, view, pts, place, mark, dia, mode, ticks, sz) {
    var f = VIEW[view], P = pts.map(function (q) { return f([q[0] + place[0], q[1] + place[1], q[2] + place[2]]); });
    barDraw(d, layer, P, dia, mark, mode, ticks, sz);
  }
  /**
   * A link seen edge-on, drawn as the shape-code figures draw a plan view: a strip between its outer faces with round ends,
   * because the bar turns away from the viewer at each end; in the line presentation, a line with a dot at each end.
   */
  function band(d, layer, x0, x1, y, dia, mark, mode, sz) {
    var from = d.p.length; band0(d, layer, x0, x1, y, dia, mark, mode); sized(d, from, sz || dia);
  }
  function band0(d, layer, x0, x1, y, dia, mark, mode) {
    var r = dia / 2, a = x0 + r, b = x1 - r, i, o; d.cur = mark;
    if (mode === 'line') { d.line(layer, a, y, b, y); d.p[d.p.length - 1].hv = 1; d.circ(layer, a, y, dia * 0.7, true); d.circ(layer, b, y, dia * 0.7, true); }
    else {
      o = [[a, y + r], [b, y + r]]; for (i = 1; i < 6; i++) o.push([b + r * Math.sin(Math.PI * i / 6), y + r * Math.cos(Math.PI * i / 6)]);
      o.push([b, y - r], [a, y - r]); for (i = 1; i < 6; i++) o.push([a - r * Math.sin(Math.PI * i / 6), y - r * Math.cos(Math.PI * i / 6)]);
      d.pl(layer, o, true); if (mode !== 'outline') d.p[d.p.length - 1].sol = 1; if (mode === 'both') d.pl('CL', [[x0 - dia, y], [x1 + dia, y]], false, true);
    }
    d.cur = null;
  }
  /** Leader with a label. With ring = true the bar mark is drawn in a circle ahead of the label, as on the user's own detailing sheets. */
  function leader(d, x, y, tx, ty, T, s, mark, a, ring) {
    var sg = a === 'r' ? -1 : 1, off = 0.3 * T;
    d.cur = mark; d.line('TAG', x, y, tx, ty); d.circ('TAG', x, y, 0.09 * T, true);
    if (ring) { d.circ('TAG', tx + sg * 1.05 * T, ty, 1.05 * T); d.text('TAG', tx + sg * 1.05 * T, ty - 0.4 * T, 0.85 * T, mark, 'c'); off = 2.4 * T; }
    d.text('TAG', tx + sg * off, ty - 0.35 * T, T, s, a); d.cur = null;
  }
  /** View title, underlined, with the scale beneath when the sheet has one. */
  function viewTitle(d, x, y, T, s, scale) {
    var w = 0.62 * 1.25 * T * s.length; d.text('TTL', x, y, 1.25 * T, s, 'c'); d.line('TTL', x - w / 2, y - 0.35 * T, x + w / 2, y - 0.35 * T);
    if (scale) d.text('TTL', x, y - 1.9 * T, 0.85 * T, '(SCALE 1:' + scale + ')', 'c');
  }
  function setOf(M, kind) { return M.bars.filter(function (b) { return b.kind === kind; })[0]; }
  function wallTitle(M) { return M.mark + '  (' + M.qty + ' no.)  ' + M.L + ' x ' + M.W + ' x ' + M.H; }
  /** Plan section through the lowest link level. */
  function wallPlan(p, M, T, scale, mode) {
    var V = viewOf(p, mode); mode = V.m; if (V.pres) M = presMember(p, M);
    var d = new Dwg(), L = M.L, W = M.W, lay = M.layout, up = 0, dn = 0, ring = p.standard === 'IS';
    d.pl('OUT', rect(-L / 2, -W / 2, L / 2, W / 2), true);
    M.bars.forEach(function (b) {
      if (b.kind === 'vert' || b.kind === 'manual') return;
      var pr = b.protos[0], z0 = Math.min.apply(null, pr.places.map(function (q) { return q[2]; }));
      pr.places.forEach(function (q) { if (q[2] === z0) projBar(d, 'RL', 'plan', pr.pts, q, b.mark, V.dia(b), mode, b.kind === 'box' || b.kind === 'master', b.dia); });
    });
    M.bars.forEach(function (b) { if (b.kind !== 'vert') return; d.cur = b.mark; b.protos.forEach(function (pr) { pr.places.forEach(function (q) { d.circ('RB', q[0], q[1], V.dia(b) / 2, true); d.p[d.p.length - 1].sz = b.dia; }); }); d.cur = null; });
    function upTag(x, y, s, mark, b) { leader(d, x, y, x + 0.8 * T, W / 2 + (2.2 + (ring ? 2.5 : 1.7) * up++) * T, T, s, mark, 'l', ring && !b.spc); }
    function dnTag(x, y, s, mark, a, b) { leader(d, x, y, x + (a === 'r' ? -0.8 : 0.8) * T, -W / 2 - (1.8 + 1.7 * dn++) * T, T, s, mark, a, false); }
    M.bars.filter(function (b) { return b.kind === 'vert'; }).forEach(function (b) {
      var pl = b.protos.filter(function (pr) { return pr.face === 1; })[0] || b.protos[0], xs = pl.places.slice().sort(function (a, e) { return a[0] - e[0]; }), q = b.zone === 'w' ? xs[Math.floor(xs.length / 2)] : xs[0];
      upTag(q[0], q[1], tagText(p, b) + (b.zone === 'b' ? ' BOUNDARY' : ' WEB'), b.mark, b);
    });
    var bx = setOf(M, 'box'), cf = setOf(M, 'conf'), ms = setOf(M, 'master'), gn = setOf(M, 'gen'), c = p.rules.wall.cover;
    if (bx) dnTag(bx.protos[0].places[0][0] - bx.dims.A * 0.25, -W / 2 + c + bx.dia / 2, tagText(p, bx) + ' (BOX RING)', bx.mark);
    if (cf) dnTag(cf.protos[0].places[0][0], 0, tagText(p, cf) + ' (CONFINING)', cf.mark);
    if (gn) dnTag(gn.protos[0].places[Math.floor(gn.per / 2)][0], 0, tagText(p, gn) + ' (GENERAL)', gn.mark);
    if (ms) dnTag(L / 2 - c - Math.min(L * 0.1, 5 * T), -W / 2 + c + ms.dia / 2, tagText(p, ms) + ' (MASTER RING)', ms.mark, 'r');
    var yd = -W / 2 - (2.6 + 1.7 * dn) * T;
    dimH(d, -L / 2, L / 2, yd - 2 * T, T, String(L));
    if (lay.zone > 0 && lay.zone * 2 < L) { dimH(d, -L / 2, -L / 2 + lay.zone, yd, 0.85 * T, 'zone ' + Math.round(lay.zone)); dimH(d, L / 2 - lay.zone, L / 2, yd, 0.85 * T, 'zone ' + Math.round(lay.zone)); }
    dimV(d, -L / 2 - 2.2 * T, -W / 2, W / 2, T, String(W));
    viewTitle(d, 0, d.b[1] - 2.8 * T, T, 'SECTION A-A', scale);
    return d;
  }
  /** Elevation of the long face: the near-face vertical bars and every link level. */
  function wallElevation(p, M, T, scale, mode) {
    var V = viewOf(p, mode); mode = V.m; if (V.pres) M = presMember(p, M);
    var R = p.rules.wall, L = M.L, H = M.H, d = new Dwg(), top = H, c = R.cover, lay = M.layout;
    d.pl('OUT', rect(-L / 2, 0, L / 2, H), true);
    d.line('OUT', -L / 2 - 3 * T, 0, L / 2 + 3 * T, 0).line('OUT', -L / 2 - 3 * T, H, L / 2 + 3 * T, H);
    M.ghosts.forEach(function (g) { if (g.pts[0][1] > 0) d.line('GH', g.pts[0][0], g.pts[0][2], g.pts[1][0], g.pts[1][2], true); });
    var ring = setOf(M, 'master') || setOf(M, 'box') || M.bars.filter(function (b) { return b.role === 'LIGATURE'; })[0], zs = [];
    if (ring) { var seen = {}; ring.protos[0].places.forEach(function (q) { if (!seen[q[2]]) { seen[q[2]] = 1; zs.push(q[2]); } }); zs.forEach(function (z) { band(d, 'RL', -L / 2 + c, L / 2 - c, z, V.dia(ring), ring.mark, mode, ring.dia); }); }
    M.bars.forEach(function (b) { if (b.kind !== 'vert') return; b.protos.forEach(function (pr) { if (pr.face !== 1) return; pr.places.forEach(function (q) { projBar(d, 'RB', 'elev', pr.pts, q, b.mark, V.dia(b), mode, false, b.dia); top = Math.max(top, q[2] + pr.pts[pr.pts.length - 1][2]);
      if (mode === 'line' && pr.verts.length === 4) { d.cur = b.mark; [1, 2].forEach(function (k) { d.circ('RB', q[0] + pr.verts[k][0], q[2] + pr.verts[k][2], V.dia(b) * 0.7, true); d.p[d.p.length - 1].sz = b.dia; }); d.cur = null; } }); }); });
    if (lay.zone * 2 < L) [-1, 1].forEach(function (s) { d.line('DIM', s * (L / 2 - lay.zone), 0, s * (L / 2 - lay.zone), H, true); });
    dimV(d, -L / 2 - 4.4 * T, 0, H, T, String(H));
    if (M.z0 > 0) dimV(d, -L / 2 - 2.2 * T, 0, M.z0, 0.85 * T, 'bars start ' + Math.round(M.z0));
    if (top > H) dimV(d, L / 2 + 4.6 * T, H, top, T, String(Math.round(top - H)) + ' above floor');
    // range line for the link sets, with one label per set
    if (zs.length) {
      var xr = L / 2 + 2.2 * T, k = 0.3 * T, i = 0; d.line('DIM', xr, zs[0], xr, zs[zs.length - 1]).line('DIM', xr - k, zs[0], xr + k, zs[0]).line('DIM', xr - k, zs[zs.length - 1], xr + k, zs[zs.length - 1]);
      M.bars.forEach(function (b) { if (b.role !== 'LIGATURE') return; d.cur = b.mark; d.text('TAG', xr + 3.4 * T, H * 0.62 - i * 1.7 * T, T, tagText(p, b)); d.cur = null; i++; });
    }
    viewTitle(d, 0, -3 * T, T, 'ELEVATION', scale);
    return d;
  }
  /** Section across the thickness: shows the crank and lap of the vertical bars, and the link levels. */
  function wallSide(p, M, T, scale, mode) {
    var V = viewOf(p, mode); mode = V.m; if (V.pres) M = presMember(p, M);
    var W = M.W, H = M.H, d = new Dwg(), c = p.rules.wall.cover, done = {};
    d.pl('OUT', rect(-W / 2, 0, W / 2, H), true); d.line('OUT', -W / 2 - 2 * T, 0, W / 2 + 2 * T, 0).line('OUT', -W / 2 - 2 * T, H, W / 2 + 2 * T, H);
    M.ghosts.forEach(function (g) { var k = Math.round(g.pts[0][1]) + '|' + g.dia; if (done[k]) return; done[k] = 1; d.line('GH', g.pts[0][1], 0, g.pts[1][1], g.pts[1][2], true); });
    var ring = setOf(M, 'master') || setOf(M, 'box');
    if (ring) { var seen = {}; ring.protos[0].places.forEach(function (q) { if (seen[q[2]]) return; seen[q[2]] = 1; band(d, 'RL', -W / 2 + c, W / 2 - c, q[2], V.dia(ring), ring.mark, mode, ring.dia); }); }
    M.bars.forEach(function (b) { if (b.kind !== 'vert') return; b.protos.forEach(function (pr) { projBar(d, 'RB', 'side', pr.pts, [0, pr.places[0][1], pr.places[0][2]], b.mark, V.dia(b), mode, false, b.dia); }); });
    viewTitle(d, 0, -3 * T, T, 'SECTION B-B', scale);
    return d;
  }
  /** The four bar presentations, in the order they are offered. Outline is the default. */
  var BAR_MODES = [['outline', 'Outline', 'm1'], ['solid', 'Solid', 'm2'], ['both', 'Solid + centre-line', 'm3'], ['line', 'Line, dot at bend', 'm4']];
  /** Which figure a bar set uses: the IS hooked link is 51A, the cross tie is the example drawn under 99. */
  function figCode(key) { var k = key === 'islink' ? '51A' : key === 'tie' ? '99' : String(key); return FIG.byCode[k] ? k : '99'; }
  function figValues(dims) { var v = {}; Object.keys(dims || {}).forEach(function (k) { if (dims[k]) v[k] = r3(dims[k]); }); return v; }
  /** Example length shown beside a figure. 51A is not a BS code: its length is the centre-line of the real bar. */
  function figLength(p, D) {
    if (D.code === '99') return 230;
    if (D.code === '51A') { var d = D.d, rc = bendRadius(p, d) + d / 2, ha = (D.v.A - d) / 2, hb = (D.v.B - d) / 2, t = rc * Math.tan(3 * Math.PI / 8), k = Math.SQRT1_2, q = Math.SQRT2 * rc, e = D.v.C;
      var P = FIG.fillet([[ha + q - (t + e) * k, -hb + (t + e) * k], [ha + q, -hb], [-ha, -hb], [-ha, hb], [ha, hb], [ha, -hb - q], [ha - (t + e) * k, -hb - q + (t + e) * k]], rc).P, L = 0, i;
      for (i = 1; i < P.length; i++) L += Math.sqrt(Math.pow(P[i][0] - P[i - 1][0], 2) + Math.pow(P[i][1] - P[i - 1][1], 2)); return ceilTo(L, 5); }
    return shapeLength(p, D.code, D.v, D.d);
  }
  /**
   * Draws a shape-code figure into a drawing, from the same geometry the on-screen figures use, fitted into the box x, y, w, h.
   * dims = the bar's own dimensions (null = the example values). mode = one of the four presentations.
   */
  function shapeFigure(d, key, dims, mark, x, y, w, h, T, mode) {
    var D = FIG.byCode[figCode(key)], c = {}; FIG.figure(D, dims ? figValues(dims) : null, c);
    var groups = [c.side].concat(c.plan && c.plan.length ? [c.plan] : []), vis = mode === 'line' ? { ln: 1, dot: 1, tick: 1 } : mode === 'both' ? { bar: 1, cl: 1 } : { bar: 1 };
    function show(q) { return q.t === 'tx' || q.c === 'ex' || q.c === 'dm' || vis[q.c]; }
    function box(g) {
      var b = [1e9, 1e9, -1e9, -1e9]; function e(px, py) { b[0] = Math.min(b[0], px); b[1] = Math.min(b[1], py); b[2] = Math.max(b[2], px); b[3] = Math.max(b[3], py); }
      g.forEach(function (q) { if (!show(q)) return;
        if (q.t === 'pl') q.pts.forEach(function (o) { e(o[0], o[1]); }); else if (q.t === 'ln') { e(q.a[0], q.a[1]); e(q.b[0], q.b[1]); } else if (q.t === 'ci') { e(q.x - q.r, q.y - q.r); e(q.x + q.r, q.y + q.r); }
        else { var tw = 6.4 * q.s.length, x0 = q.an === 'end' ? q.x - tw : q.an === 'middle' ? q.x - tw / 2 : q.x; e(x0, q.y - 10); e(x0 + tw, q.y + 3); } });
      return b;
    }
    var bx = groups.map(box), LAB = 15, GAP = 16, X0 = Math.min.apply(null, bx.map(function (b) { return b[0]; })), X1 = Math.max.apply(null, bx.map(function (b) { return b[2]; }));
    var totH = bx.reduce(function (t, b) { return t + (b[3] - b[1]) + LAB; }, 0) + GAP * (groups.length - 1), s = Math.min(w / (X1 - X0), h / totH), left = x + (w - (X1 - X0) * s) / 2, top = y + h / 2 + totH * s / 2;
    groups.forEach(function (g, gi) {
      var b = bx[gi]; d.text('TXT', left, top - 10 * s, 8.5 * s, c.names[gi].toUpperCase()); top -= LAB * s;
      function X(px) { return left + (px - X0) * s; } function Y(py) { return top - (py - b[1]) * s; }
      g.forEach(function (q) { if (!show(q)) return;
        var isBar = q.c === 'bar' || q.c === 'ln' || q.c === 'dot' || q.c === 'tick', ly = isBar ? 'SH' : q.c === 'cl' ? 'CL' : 'DIM'; d.cur = isBar ? mark : null;
        if (q.t === 'pl') { d.pl(ly, q.pts.map(function (o) { return [X(o[0]), Y(o[1])]; }), !!q.closed, q.c === 'cl'); var pr = d.p[d.p.length - 1]; if (q.c === 'bar' && mode !== 'outline') pr.sol = 1; if (q.c === 'ln') pr.hv = 1; }
        else if (q.t === 'ci') d.circ(ly, X(q.x), Y(q.y), q.r * s, q.c === 'dot');
        else if (q.t === 'ln') {
          d.line(ly, X(q.a[0]), Y(q.a[1]), X(q.b[0]), Y(q.b[1])); if (q.c === 'tick') d.p[d.p.length - 1].hv = 1;
          if (q.arrows) { var ax = X(q.a[0]), ay = Y(q.a[1]), bx2 = X(q.b[0]), by2 = Y(q.b[1]), l = Math.sqrt((bx2 - ax) * (bx2 - ax) + (by2 - ay) * (by2 - ay)) || 1, ux = (bx2 - ax) / l, uy = (by2 - ay) / l, hl = 4.5 * s;
            var head = function (tx, ty, sg) { d.pl('DIM', [[tx - sg * ux * hl - uy * hl * 0.45, ty - sg * uy * hl + ux * hl * 0.45], [tx, ty], [tx - sg * ux * hl + uy * hl * 0.45, ty - sg * uy * hl - ux * hl * 0.45]], false); };
            if (q.arrows & 2) head(bx2, by2, 1); if (q.arrows & 1) head(ax, ay, -1); }
        } else d.text('DIM', X(q.x), Y(q.y), 10.5 * s, q.s, q.an === 'end' ? 'r' : q.an === 'middle' ? 'c' : 'l');
        d.cur = null; });
      top -= ((b[3] - b[1]) + GAP) * s;
    });
  }
  /** Every shape code on one sheet, drawn by the same engine as the screen: figure, name, formula and an example length. */
  function shapeSheet(T, mode, p) {
    mode = String(mode || 'outline').replace('@pres', '');
    var d = new Dwg(), cw = 46 * T, ch = 50 * T, cols = 6;
    FIG.DEFS.forEach(function (D, i) {
      var cx = (i % cols) * (cw + T), y0 = -Math.floor(i / cols) * (ch + T) - ch;
      d.pl('TBL', rect(cx, y0, cx + cw, y0 + ch), true); shapeFigure(d, D.code, null, null, cx + 1.5 * T, y0 + 5.5 * T, cw - 3 * T, ch - 11.5 * T, T, mode || 'outline');
      d.text('TTL', cx + T, y0 + ch - 2.2 * T, 1.4 * T, 'Shape code ' + D.code); d.text('TXT', cx + T, y0 + ch - 4 * T, 0.85 * T, D.name.length > 62 ? D.name.slice(0, 60) + '..' : D.name);
      d.text('TXT', cx + T, y0 + 2.6 * T, 0.85 * T, 'L = ' + D.f); if (p) d.text('TXT', cx + T, y0 + T, 0.85 * T, '= ' + figLength(p, D) + ' mm for ' + (D.code === '51A' ? 'T' : 'H') + D.d);
    });
    return d;
  }
  function detailT(M, Tsheet) { return Math.min(Tsheet, Math.max(M.L / 62, 26)); }
  /** Plan section on top, elevation and cross-section below, then one cell per bar mark. */
  function wallDetail(p, M, Tsheet, mode) {
    mode = mode || 'outline';   // 'outline' | 'solid' | 'both' | 'line', optionally followed by '@pres' for presentation sizes
    var VW = viewOf(p, mode);
    var T = detailT(M, Tsheet), scale = Tsheet < 1e6 ? Math.round(Tsheet / 2.5) : 0, d = new Dwg(), plan = wallPlan(p, M, T, scale, mode), el = wallElevation(p, M, T, scale, mode), sd = wallSide(p, M, T, scale, mode), S = STDS[p.standard];
    d.add(plan, 0, 0); var ey = plan.b[1] - 3 * T - el.b[3]; d.add(el, 0, ey); d.add(sd, el.b[2] + 5 * T - sd.b[0], ey);
    d.text('TTL', d.b[0], d.b[3] + 1.6 * T, 1.5 * T, wallTitle(M));
    {                                          // say which colour is which bar size, and when sizes are not to scale
      var seen = {}, lx = d.b[0], ly = d.b[1] - 2.6 * T; M.bars.forEach(function (b) { if (b.protos.length) seen[b.dia] = 1; });
      d.text('TXT', lx, ly, 0.9 * T, 'BAR SIZES'); lx += 7.5 * T;
      Object.keys(seen).map(Number).sort(function (a, b) { return a - b; }).forEach(function (k) { d.pl('RB', rect(lx, ly - 0.1 * T, lx + 1.6 * T, ly + 0.8 * T), true); var q = d.p[d.p.length - 1]; q.sz = k; q.lg = 1; d.text('TXT', lx + 2 * T, ly, 0.9 * T, S.prefix + k); lx += 6 * T; });
      if (VW.pres) d.text('TXT', lx + T, ly, 0.9 * T, 'PRESENTATION SIZES: LINKS DRAWN AS ' + (p.pres || {}).link + ', BARS AS ' + (p.pres || {}).bar + ', BENDS TO FIT THE BAR. SIZES AND BAR CENTRES NOT TO SCALE.');
    }
    var seen = {}, cells = []; M.bars.forEach(function (b) { if (!seen[b.mark]) { seen[b.mark] = 1; cells.push(b); } });
    var cw = 22 * T, ch = 24 * T, x0 = d.b[0], top = d.b[1] - 2.5 * T, perRow = Math.max(1, Math.floor((d.w() + T) / (cw + T)));
    cells.forEach(function (b, i) {
      var cx = x0 + (i % perRow) * (cw + T), y0 = top - ch - Math.floor(i / perRow) * (ch + T);
      d.cur = b.mark; d.pl('TBL', rect(cx, y0, cx + cw, y0 + ch), true); d.cur = null;
      shapeFigure(d, b.fig || b.shape, b.dims, b.mark, cx + 0.6 * T, y0 + 1.2 * T, cw - 1.2 * T, ch - 4.4 * T, T, VW.m);
      d.cur = b.mark; d.text('TXT', cx + 0.5 * T, y0 + ch - 1.5 * T, T, 'Mk ' + b.mark + '   ' + S.prefix + b.dia + '   shape ' + b.shape); d.text('TXT', cx + 0.5 * T, y0 + ch - 2.9 * T, 0.8 * T, b.desc + ', former dia ' + Math.round(b.former));
      d.text('TXT', cx + 0.5 * T, y0 + 0.4 * T, 0.85 * T, 'L = ' + r3(b.len) + '   ' + b.n + ' no. each'); d.cur = null;
    });
    return d;
  }
  /** A ruled table from rows of cells; the first row is the header. */
  function tableBlock(cols, rows, T, title) {
    var d = new Dwg(), rh = 2.2 * T, x = 0, xs = [0], n = rows.length, i;
    cols.forEach(function (k) { x += k.w * T; xs.push(x); });
    if (title) d.text('TBT', 0, 1.2 * T, 1.4 * T, title);
    for (i = 0; i <= n; i++) d.line('TBL', 0, -i * rh, x, -i * rh);
    xs.forEach(function (v) { d.line('TBL', v, 0, v, -n * rh); });
    rows.forEach(function (row, ri) { row.forEach(function (v, ci) { var s = String(v); if (s === '') return; d.text('TBT', (xs[ci] + xs[ci + 1]) / 2, -(ri + 1) * rh + 0.6 * T, ri === 0 || s.length > cols[ci].w * 1.3 ? 0.72 * T : T, s.length > 22 ? s.slice(0, 21) + '.' : s, 'c'); }); });
    return d;
  }
  /** Drawing sheet for one wall type: its detail with its own bar list underneath. */
  function memberSheet(p, c, M, Tsheet, mode) {
    var T = detailT(M, Tsheet), d = new Dwg(), det = wallDetail(p, M, Tsheet, mode), cols = STD_FORM.map(function (k) { return { h: k[0], w: k[1] }; });
    d.add(det, 0, 0);
    var tb = tableBlock(cols, stdFormAOA(p, c, M.bars), T * 0.8, 'BAR SCHEDULE  -  ' + M.mark + '  -  ' + r2(M.wt) + ' kg for ' + M.qty + ' no.');
    d.add(tb, det.b[0] - tb.b[0], det.b[1] - 4 * T - tb.b[3]);
    return d;
  }
  /** Schedule sheet: up to three ruled columns of 60 rows each. */
  function scheduleSheet(p, c, rows, T, part, parts) {
    var d = new Dwg(), per = 60, x = 0, i, R = p.rules.wall, cols = STD_FORM.map(function (k) { return { h: k[0], w: k[1] }; });
    for (i = 1; i < rows.length; i += per) {
      var tb = tableBlock(cols, [rows[0]].concat(rows.slice(i, i + per)), T, i === 1 ? 'BAR BENDING SCHEDULE  -  ' + p.name + (parts > 1 ? '  -  sheet ' + part + ' of ' + parts : '') : '');
      d.add(tb, x - tb.b[0], 0); x += tb.w() + 4 * T;
    }
    var notes = stdFormNotes(p).concat(['Total ' + r2(c.total.wt) + ' kg.  Lap ' + R.lap + 'd, cover ' + R.cover + ' mm.']), y0 = d.b[1] - 2.4 * T;
    notes.forEach(function (s, k) { d.text('TBT', 0, y0 - k * 1.7 * T, T, s); });
    return d;
  }

