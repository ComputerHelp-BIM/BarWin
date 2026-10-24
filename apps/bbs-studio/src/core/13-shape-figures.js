  /* ---------- shape-code figures: the same engine and definitions as the shape-code sheet, kept in their own scope ---------- */
  var FIG = (function () {
/* Shape-code figure engine v1.3.0. One bar definition -> side view + plan view, four presentations. */
/* Bar thickness and the standard bend radius on the centre-line, in drawing units (one figure is about 380 wide).
   Radii a shape states for itself (12's radius, the semicircles of 13, 22 and 33) stay with the shape. */
var T = 10, h = T / 2, RC = 22;
/* Everything drawn is also sent to SINK when one is set, so the same figure can be written to a CAD drawing. */
var SINK = null;
function emit(o) { if (SINK) SINK.push(o); }
function f(v) { return Math.round(v * 10) / 10; }
/** Sharp vertices -> centre-line samples with circular bends. rc may be one radius or one per interior vertex. Records where each bend starts and ends. */
function fillet(V, rc) {
  var o = [V[0]], rng = [[0, 0]], i, k;
  for (i = 1; i < V.length - 1; i++) {
    var r = Array.isArray(rc) ? rc[i - 1] : (rc || RC), a = V[i - 1], b = V[i], c = V[i + 1], u = [b[0] - a[0], b[1] - a[1]], w = [c[0] - b[0], c[1] - b[1]], lu = Math.hypot(u[0], u[1]), lw = Math.hypot(w[0], w[1]);
    u = [u[0] / lu, u[1] / lu]; w = [w[0] / lw, w[1] / lw];
    var phi = Math.acos(Math.max(-1, Math.min(1, u[0] * w[0] + u[1] * w[1]))), t = r * Math.tan(phi / 2), s = Math.sign(u[0] * w[1] - u[1] * w[0]) || 1, p = [b[0] - u[0] * t, b[1] - u[1] * t];
    var cx = p[0] - s * u[1] * r, cy = p[1] + s * u[0] * r, a0 = Math.atan2(p[1] - cy, p[0] - cx), n = Math.max(2, Math.ceil(phi / (Math.PI / 45))), st = o.length;
    for (k = 0; k <= n; k++) { var g = a0 + s * phi * k / n; o.push([cx + r * Math.cos(g), cy + r * Math.sin(g)]); }
    rng.push([st, o.length - 1, phi]);
  }
  o.push(V[V.length - 1]); rng.push([o.length - 1, o.length - 1]); return { P: o, rng: rng };
}
function sides(P) { var L = [], R = []; P.forEach(function (p, i) { var a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, t = [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; L.push([p[0] - t[1] * h, p[1] + t[0] * h]); R.push([p[0] + t[1] * h, p[1] - t[0] * h]); }); return L.concat(R.reverse()); }
function pth(Q, z) { return 'M' + Q.map(function (q) { return f(q[0]) + ' ' + f(q[1]); }).join(' L') + (z ? ' Z' : ''); }
function ext(P) { var a = P[0], b = P[1], y = P[P.length - 1], x = P[P.length - 2], la = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, ly = Math.hypot(y[0] - x[0], y[1] - x[1]) || 1; return [[a[0] + (a[0] - b[0]) / la * 9, a[1] + (a[1] - b[1]) / la * 9]].concat(P.slice(1, -1), [[y[0] + (y[0] - x[0]) / ly * 9, y[1] + (y[1] - x[1]) / ly * 9]]); }
/** Aligned dimension p -> q, offset along the left-hand normal of the direction (negative = other side). */
function dim(p, q, off, lab, shift) {
  var l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, u = [(q[0] - p[0]) / l, (q[1] - p[1]) / l], n = [-u[1], u[0]], sg = Math.sign(off) || 1, g = 4 * sg, a = [p[0] + n[0] * off, p[1] + n[1] * off], b = [q[0] + n[0] * off, q[1] + n[1] * off], m = [(a[0] + b[0]) / 2 + n[0] * sg * 13 + u[0] * (shift || 0), (a[1] + b[1]) / 2 + n[1] * sg * 13 + u[1] * (shift || 0)];   // shift slides the label along the line, to keep two facing labels apart
  function ex(r) { emit({ t: 'ln', c: 'ex', a: [r[0] + n[0] * g, r[1] + n[1] * g], b: [r[0] + n[0] * (off + g), r[1] + n[1] * (off + g)] }); return '<line class="ex" x1="' + f(r[0] + n[0] * g) + '" y1="' + f(r[1] + n[1] * g) + '" x2="' + f(r[0] + n[0] * (off + g)) + '" y2="' + f(r[1] + n[1] * (off + g)) + '"/>'; }
  var an = n[0] * sg > 0.6 ? 'start' : n[0] * sg < -0.6 ? 'end' : 'middle', tx = an === 'middle' ? m[0] : m[0] - n[0] * sg * 6;
  emit({ t: 'ln', c: 'dm', a: a, b: b, arrows: 3 }); emit({ t: 'tx', x: tx, y: m[1] + 4, s: lab, an: an });
  return ex(p) + ex(q) + '<line class="dm" x1="' + f(a[0] + u[0] * 2) + '" y1="' + f(a[1] + u[1] * 2) + '" x2="' + f(b[0] - u[0] * 2) + '" y2="' + f(b[1] - u[1] * 2) + '" marker-start="url(#arrow)" marker-end="url(#arrow)"/><text class="ts" x="' + f(tx) + '" y="' + f(m[1] + 4) + '" text-anchor="' + an + '">' + lab + '</text>';
}
/** A bar in the plane of the view. raw = the points are already the centre-line (curved bars). */
function bar(V, rc, raw) {
  var F = raw ? { P: V, rng: null } : (V.length > 2 ? fillet(V, rc) : { P: V, rng: [[0, 0], [1, 1]] }), P = F.P, O = sides(P), xs = O.map(function (q) { return q[0]; }), ys = O.map(function (q) { return q[1]; });
  var S = { V: V, P: P, O: O, rng: F.rng, x0: Math.min.apply(0, xs), x1: Math.max.apply(0, xs), y0: Math.min.apply(0, ys), y1: Math.max.apply(0, ys) };
  S.svg = '<path class="bar" d="' + pth(O, 1) + '"/><path class="cl" d="' + pth(ext(P)) + '"/><path class="ln" d="' + pth(P) + '"/>';
  emit({ t: 'pl', c: 'bar', pts: O, closed: 1 }); emit({ t: 'pl', c: 'cl', pts: ext(P) }); emit({ t: 'pl', c: 'ln', pts: P });
  /**
   * Dimension of leg i (vertex i to i+1), measured as BS 8666 does: to the outside of a bend of 90 degrees or more,
   * to the intersection point at a shallower bend, to the cut at a free end. side +1/-1 picks the side; clear = stand off the whole figure.
   */
  S.leg = function (i, side, lab, clear, extra, shift) {
    var a = V[i], b = V[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]), u = [(b[0] - a[0]) / l, (b[1] - a[1]) / l], n = [-u[1] * side, u[0] * side], last = V.length - 2;
    function ends(j, sign) {                       // j = vertex index at this end of the leg
      if (j === 0 || j === V.length - 1) return V[j][0] * u[0] + V[j][1] * u[1];
      var r = F.rng[j]; if (r[2] < 1.55) return V[j][0] * u[0] + V[j][1] * u[1];
      var best = -1e9, k; for (k = r[0]; k <= r[1]; k++) { var s = (P[k][0] * u[0] + P[k][1] * u[1]) * sign; if (s > best) best = s; } return (best + h) * sign;
    }
    var s0 = ends(i, -1), s1 = ends(i + 1, 1), src = clear ? O : sides(P.slice(i === 0 ? 0 : F.rng[i][0], (i === last ? P.length - 1 : F.rng[i + 1][1]) + 1)), base = -1e9;
    src.forEach(function (q) { var d = q[0] * n[0] + q[1] * n[1]; if (d > base) base = d; });
    var c = a[0] * u[0] + a[1] * u[1], o0 = [a[0] + u[0] * (s0 - c), a[1] + u[1] * (s0 - c)], o1 = [a[0] + u[0] * (s1 - c), a[1] + u[1] * (s1 - c)], lift = base - (a[0] * n[0] + a[1] * n[1]);
    var p = [o0[0] + n[0] * lift, o0[1] + n[1] * lift], q = [o1[0] + n[0] * lift, o1[1] + n[1] * lift];
    return dim(p, q, side * (20 + (extra || 0)), lab, shift);
  };
  return S;
}
/** Outline of a strip from a to b (centres of its end treatment) at height y; rl / rr = round that end. */
function stripPts(a, b, y, rl, rr) {
  var o = [[a, y - h], [b, y - h]], i;
  if (rr) for (i = 1; i < 8; i++) { var g = (-90 + 180 * i / 8) * Math.PI / 180; o.push([b + h * Math.cos(g), y + h * Math.sin(g)]); }
  o.push([b, y + h], [a, y + h]);
  if (rl) for (i = 1; i < 8; i++) { var k = (90 + 180 * i / 8) * Math.PI / 180; o.push([a + h * Math.cos(k), y + h * Math.sin(k)]); }
  return o;
}
function stripSvg(a, b, y, rl, rr, x0, x1) {
  var O = stripPts(a, b, y, rl, rr), s = '<path class="bar" d="' + pth(O, 1) + '"/>'; emit({ t: 'pl', c: 'bar', pts: O, closed: 1 });
  if (x0 !== undefined) { s += '<path class="cl" d="M' + f(x0 - 9) + ' ' + y + ' L' + f(x1 + 9) + ' ' + y + '"/>'; emit({ t: 'pl', c: 'cl', pts: [[x0 - 9, y], [x1 + 9, y]] }); }
  emit({ t: 'pl', c: 'ln', pts: [[a, y], [b, y]] }); return s + '<path class="ln" d="M' + f(a) + ' ' + y + ' L' + f(b) + ' ' + y + '"/>';
}
function circ(c, x, y, r) { emit({ t: 'ci', c: c, x: x, y: y, r: r }); return '<circle class="' + c + '" cx="' + f(x) + '" cy="' + y + '" r="' + r + '"/>'; }
function seg(c, x1, y1, x2, y2) { emit({ t: 'ln', c: c, a: [x1, y1], b: [x2, y2] }); return '<line class="' + c + '" x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '"/>'; }
/** A note beside the figure, and a leader with an arrow at its far end. */
function note(x, y, s, an) { emit({ t: 'tx', x: x, y: y, s: s, an: an || 'start' }); return '<text class="ts" x="' + f(x) + '" y="' + f(y) + '"' + (an ? ' text-anchor="' + an + '"' : '') + '>' + s + '</text>'; }
function leader(x1, y1, x2, y2) { emit({ t: 'ln', c: 'dm', a: [x1, y1], b: [x2, y2], arrows: 2 }); return '<line class="dm" x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '" marker-end="url(#arrow)"/>'; }
/**
 * Plan of a bar bent in one vertical plane, worked out from the side view: a strip between the extreme faces.
 * A free leg standing up shows its cut end as a circle; an upper leg ending over the bar shows a cut line (a tick in the line presentation);
 * a dot marks every bend, because that is where the bar leaves the plan.
 */
function planOf(S, y) {
  var V = S.V, n = V.length, x0 = S.x0, x1 = S.x1, eL = 'rd', eR = 'rd', late = [], dots = [], raw = !S.rng;
  function freeEnd(p, q) {
    var dx = p[0] - q[0], dy = p[1] - q[1], l = Math.hypot(dx, dy), vert = Math.abs(dx) < 0.3 * l, up = vert && dy < 0;
    if (vert) { if (up) { late.push(['c', p[0]]); dots.push(p[0]); } return; }
    if (Math.abs(p[0] - x0) < 9 && dx < 0) { eL = 'sq'; return; } if (Math.abs(p[0] - x1) < 9 && dx > 0) { eR = 'sq'; return; }
    late.push(['t', p[0]]);
  }
  if (raw) { eL = eR = 'sq'; } else { freeEnd(V[0], V[1]); freeEnd(V[n - 1], V[n - 2]); for (var i = 1; i < n - 1; i++) dots.push(V[i][0]); }
  var cl = x0 + h, cr = x1 - h, a = eL === 'sq' ? x0 : cl, b = eR === 'sq' ? x1 : cr, s = stripSvg(a, b, y, eL !== 'sq', eR !== 'sq', x0, x1), used = [];
  late.forEach(function (q) { s += q[0] === 'c' ? circ('bar', q[1], y, h) : seg('bar', q[1], y - h, q[1], y + h) + seg('tick', q[1], y - h * 0.7, q[1], y + h * 0.7); });
  dots.map(function (x) { return Math.max(cl, Math.min(cr, x)); }).sort(function (p, q) { return p - q; }).forEach(function (x) { if (used.some(function (u) { return Math.abs(u - x) < 10; })) return; used.push(x); s += circ('dot', x, y, 4.5); });
  return s;
}
/** A second strip lying beside the main one in plan: a lap, seen from above as two bars side by side. */
function lapStrip(xa, xb, y, rl, rr) { return stripSvg(rl ? xa + h : xa, rr ? xb - h : xb, y, rl, rr); }
/** Short tick across the bar at a cut end, for the line presentation where lapped legs lie on top of the sides. */
function endTick(p, q) { var l = Math.hypot(p[0] - q[0], p[1] - q[1]) || 1, n = [-(p[1] - q[1]) / l * 6, (p[0] - q[0]) / l * 6]; return seg('tick', p[0] - n[0], p[1] - n[1], p[0] + n[0], p[1] + n[1]); }
/** Bends for a bar that leaves the plane: the same circular fillet, worked in 3D. */
function fillet3(V, rc) {
  var o = [V[0]], i, k;
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; } function len(a) { return Math.hypot(a[0], a[1], a[2]); } function mul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; } function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  for (i = 1; i < V.length - 1; i++) {
    var u = sub(V[i], V[i - 1]), w = sub(V[i + 1], V[i]); u = mul(u, 1 / len(u)); w = mul(w, 1 / len(w));
    var c = u[0] * w[0] + u[1] * w[1] + u[2] * w[2], phi = Math.acos(Math.max(-1, Math.min(1, c))), t = rc * Math.tan(phi / 2), nr = sub(w, mul(u, c)); nr = mul(nr, 1 / len(nr));
    var p0 = sub(V[i], mul(u, t)), ctr = add(p0, mul(nr, rc)), n = Math.max(2, Math.ceil(phi / (Math.PI / 45)));
    for (k = 0; k <= n; k++) { var g = phi * k / n; o.push(add(ctr, add(mul(nr, -rc * Math.cos(g)), mul(u, rc * Math.sin(g))))); }
  }
  o.push(V[V.length - 1]); return o;
}
/** Isometric projection: x runs down to the right, y down to the left, z straight up. */
function iso(p) { return [(p[0] - p[1]) * 0.866, (p[0] + p[1]) * 0.5 - p[2]]; }
/** Pictorial view for the chair: its length runs across the sheet rising slightly, depth comes towards the viewer down to the left, height is true. */
function pict(p) { return [p[0] * 0.95 - p[1] * 0.62, -p[0] * 0.16 + p[1] * 0.36 - p[2]]; }

/**
 * One figure from its definition. vals replaces the example dimensions (a bar from the schedule); a missing value leaves the letter alone.
 * collect, when given, receives the drawn primitives as collect.side and collect.plan.
 */
function figure(D, vals, collect) {
  var v = vals || D.v;
  function L(k) { var x = v[k], br = D.run.indexOf(k) >= 0; if (x === undefined || x === null || x === '' || x === 0) return br ? '(' + k + ')' : k; return (br ? '(' + k + ')=' : k + '=') + x; }
  var S, side, plan = '', names = D.names || ['Side view', 'Plan view'];
  SINK = collect ? (collect.side = []) : null;
  if (D.iso) { side = D.iso(L, dim); names = [D.code === '98' ? 'Pictorial view' : 'Isometric view']; }      // bent in more than one plane: one pictorial view says more than two flat ones
  else {
    S = bar(D.V, D.rc, D.raw); side = S.svg + D.dims(S, L, dim);
    if (D.lap) side += endTick(D.V[0], D.V[1]) + endTick(D.V[D.V.length - 1], D.V[D.V.length - 2]);
    SINK = collect ? (collect.plan = []) : null;
    if (D.code === '75') plan = stripSvg(S.x0 + h, S.x1 - h, 20, 1, 1, S.x0, S.x1) + dim([S.x0, 20 + h], [S.x1, 20 + h], 22, L('A'));
    else {
      var lapY = 20 + T, hasLap = D.planLap && D.planLap.length;
      plan = planOf(S, 20) + (D.planLap || []).map(function (q) { return lapStrip(q[0], q[1], lapY, q[2], q[3]); }).join('') + (D.pd ? dim([S.x0, hasLap ? lapY + h : 20 + h], [S.x1, hasLap ? lapY + h : 20 + h], 22, L(D.pd)) : '');
    }
  }
  SINK = null; if (collect) collect.names = names;
  return { side: side, plan: plan, names: names };
}
/** The figure as an SVG element string, before fitting. */
function figureSVG(D, vals) {
  var F = figure(D, vals);
  return '<svg class="fig" viewBox="0 0 380 400" role="img" aria-label="Shape code ' + D.code + ', ' + D.name + ': ' + F.names.join(' and ').toLowerCase() + '"><text class="vw" x="10" y="16">' + F.names[0] + '</text><g class="gs">' + F.side + '</g>' + (F.plan ? '<text class="vw pl" x="10" y="0">' + F.names[1] + '</text><g class="gp">' + F.plan + '</g>' : '') + '</svg>';
}
/**
 * Fit pass: measure each figure in the two widest presentations and place it inside its sheet with a fixed margin, so nothing can be clipped.
 * host carries the presentation class (m1 outline, m2 solid, m3 solid + centre-line, m4 line with dots); it is left as it was found.
 */
function fitFigures(root, host) {
  var was = host.className;
  function box(g) { var o = null; ['m3', 'm4'].forEach(function (m) { host.className = was.replace(/\bm[1-4]\b/, '').trim() + ' ' + m; var b = g.getBBox(); o = o ? { x0: Math.min(o.x0, b.x), y0: Math.min(o.y0, b.y), x1: Math.max(o.x1, b.x + b.width), y1: Math.max(o.y1, b.y + b.height) } : { x0: b.x, y0: b.y, x1: b.x + b.width, y1: b.y + b.height }; }); return o; }
  [].forEach.call(root.querySelectorAll('svg.fig'), function (sv) {
    var gs = sv.querySelector('.gs'), gp = sv.querySelector('.gp'), a = box(gs), b = gp ? box(gp) : a, M = 10, W = 380, x0 = Math.min(a.x0, b.x0), x1 = Math.max(a.x1, b.x1), s = Math.min(1, (W - 2 * M) / (x1 - x0)), dx = (W - (x1 - x0) * s) / 2 - x0 * s, k = Math.round(s * 1000) / 1000;
    var yS = 26 - a.y0 * s, yL = 26 + (a.y1 - a.y0) * s + 26, H = gp ? yL + 10 + (b.y1 - b.y0) * s + M : 26 + (a.y1 - a.y0) * s + M;
    gs.setAttribute('transform', 'translate(' + f(dx) + ',' + f(yS) + ') scale(' + k + ')');
    if (gp) { gp.setAttribute('transform', 'translate(' + f(dx) + ',' + f(yL + 10 - b.y0 * s) + ') scale(' + k + ')'); sv.querySelector('.pl').setAttribute('y', f(yL)); }
    sv.setAttribute('viewBox', '0 0 ' + W + ' ' + Math.ceil(H));
  });
  host.className = was;
}
/* Shape definitions. V = centre-line vertices of the side view (y down). dims(S, L, R) returns the dimension lines; L('A') gives the label "A=900" or "(B)=1350". */
function arc(cx, cy, r, a0, a1, n) { var o = [], i; for (i = 0; i <= n; i++) { var a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return o; }
/* 51A: two 135 degree hooks round the top-right corner bar, bent to the standard radius RC, each with a straight tail e.
   In plan, the second pass shows as a strip from the inner tail's cut end to the corner bar. */
var G51A = (function () { var t = RC * Math.tan(3 * Math.PI / 8), k = Math.SQRT1_2, e = 46, q = Math.SQRT2 * RC, s = (t + e) * k;
  return { V: [[300 + q - s, 68 + s], [300 + q, 68], [60, 68], [60, 190], [300, 190], [300, 68 - q], [300 - s, 68 - q + s]], lap: [[f(300 - s), 300 + h, 0, 1]] }; })();
var DEFS = [
 { code: '00', name: 'Straight bar', f: 'A', d: 16, v: { A: 5600 }, run: [], V: [[40, 190], [340, 190]], pd: 'A', dims: function (S, L) { return S.leg(0, 1, L('A')); } },
 { code: '01', name: 'Stock length (straight, cut to order)', f: 'A', d: 16, v: { A: 12000 }, run: [], V: [[40, 190], [340, 190]], pd: 'A', dims: function (S, L) { return S.leg(0, 1, L('A')); } },
 { code: '11', name: 'One bend', f: 'A + (B) - 0.5r - d', d: 25, v: { A: 900, B: 1350 }, run: ['B'], V: [[40, 190], [263, 190], [263, 64]], pd: 'B', dims: function (S, L) { return S.leg(0, 1, L('B')) + S.leg(1, 1, L('A')); } },
 { code: '12', name: 'One bend to a stated radius', f: 'A + (B) - 0.43R - 1.2d', d: 16, v: { A: 600, B: 1500, R: 200 }, run: ['B'], V: [[40, 190], [263, 190], [263, 64]], rc: 69, pd: 'B',
   dims: function (S, L) { return S.leg(0, 1, L('B')) + S.leg(1, 1, L('A')) + leader(194, 121, 236.3, 163.3) + note(190, 113, L('R'), 'end'); } },
 { code: '13', name: 'Hairpin with semi-circular bend', f: 'A + 0.57B + (C) - 1.6d', d: 12, v: { A: 1000, B: 150, C: 400 }, run: ['C'], V: [[40, 190], [283, 190], [283, 134], [180, 134]], rc: 28, pd: 'A',
   dims: function (S, L, R) { return S.leg(0, 1, L('A')) + S.leg(2, 1, L('C')) + R([S.x1, S.y1], [S.x1, S.y0], 22, L('B')); } },
 { code: '14', name: 'Acute bend', f: 'A + (C) - 4d', d: 16, v: { A: 800, B: 450, C: 1000 }, run: ['C'], V: [[158.3, 43.9], [336, 190], [40, 190]], pd: 'C',
   dims: function (S, L, R) { return S.leg(0, -1, L('A')) + S.leg(1, -1, L('C')) + R([S.x1, S.y1], [S.x1, S.y0], 26, L('B')); } },
 { code: '15', name: 'Obtuse bend', f: 'A + (C)', d: 16, v: { A: 600, B: 400, C: 900 }, run: ['C'], V: [[96, 84], [216, 190], [344, 190]],
   dims: function (S, L, R) { return S.leg(0, -1, L('A')) + S.leg(1, 1, L('C')) + R([S.x0, S.y0], [S.x0, S.y1], 24, L('B')); } },
 { code: '21', name: 'Two bends, U', f: 'A + B + (C) - r - 2d', d: 12, v: { A: 800, B: 250, C: 800 }, run: ['C'], V: [[60, 70], [60, 190], [300, 190], [300, 100]], pd: 'B',
   dims: function (S, L) { return S.leg(0, 1, L('A')) + S.leg(1, 1, L('B')) + S.leg(2, 1, L('C')); } },
 { code: '22', name: 'Bend and semi-circular hook', f: 'A + B + C + (D) - 1.5r - 3d', d: 10, v: { A: 130, B: 1315, C: 60, D: 120 }, run: ['D'], V: [[60, 160], [60, 84], [290, 84], [290, 140], [170, 140]], rc: [RC, 28, 28], pd: 'B',
   dims: function (S, L) { return S.leg(0, -1, L('A')) + S.leg(1, -1, L('B')) + S.leg(2, -1, L('C')) + S.leg(3, -1, L('D')); } },
 { code: '23', name: 'Two bends, Z', f: 'A + B + (C) - r - 2d', d: 12, v: { A: 300, B: 1200, C: 300 }, run: ['C'], V: [[60, 50], [60, 125], [300, 125], [300, 200]], pd: 'B',
   dims: function (S, L) { return S.leg(0, 1, L('A')) + S.leg(1, 1, L('B'), true) + S.leg(2, -1, L('C')); } },
 { code: '24', name: 'Two bends, A and C at right angles', f: 'A + B + (C)', d: 16, v: { A: 500, B: 700, C: 400, D: 350 }, run: ['C'], V: [[40, 190], [150, 190], [300, 110], [300, 40]],
   dims: function (S, L, R) { return S.leg(0, 1, L('A')) + S.leg(1, 1, L('B')) + S.leg(2, 1, L('C')) + R([S.x1, 190 + h], [S.x1, 110 + h], 60, L('D')); } },
 { code: '25', name: 'Two obtuse bends', f: 'A + B + (E)', d: 16, v: { A: 500, B: 500, C: 400, D: 400, E: 800 }, run: ['E'], V: [[70, 80], [130, 190], [250, 190], [310, 80]],
   dims: function (S, L, R) { return S.leg(0, 1, L('A')) + S.leg(2, 1, L('B')) + S.leg(1, 1, L('E')) + R([S.x0, S.y0], [S.x0, S.y1], 52, L('C')) + R([S.x1, S.y1], [S.x1, S.y0], 52, L('D')); } },
 { code: '26', name: 'Crank', f: 'A + B + (C)', d: 25, v: { A: 4000, B: 600, C: 1400, D: 60 }, run: ['C'], V: [[40, 190], [130, 190], [210, 110], [340, 110]],
   dims: function (S, L, R) { return S.leg(0, 1, L('A')) + S.leg(1, -1, L('B')) + S.leg(2, -1, L('C')) + R([S.x1, 190 + h], [S.x1, 110 - h], 20, L('D')); } },
 { code: '27', name: 'Inclined bar with end bent down', f: 'A + B + (C) - 0.5r - d', d: 16, v: { A: 900, B: 600, C: 400, D: 700 }, run: ['C'], V: [[50, 200], [170, 90], [290, 90], [290, 170]],
   dims: function (S, L, R) { return S.leg(0, -1, L('A')) + S.leg(1, -1, L('B')) + S.leg(2, -1, L('C')) + R([S.x1, S.y1], [S.x1, S.y0], 84, L('D')); } },
 { code: '28', name: 'Inclined bar with end bent up', f: 'A + B + (C) - 0.5r - d', d: 16, v: { A: 900, B: 600, C: 300, D: 500 }, run: ['C'], V: [[50, 200], [170, 120], [290, 120], [290, 50]],
   dims: function (S, L, R) { return S.leg(0, -1, L('A')) + S.leg(1, 1, L('B')) + S.leg(2, 1, L('C')) + R([S.x1, S.y1], [S.x1, 120 + h], 62, L('D')); } },
 { code: '29', name: 'Two bends with acute return', f: 'A + B + (C) - r - 2d', d: 16, v: { A: 1000, B: 600, C: 500, D: 450 }, run: ['C'], V: [[60, 90], [190, 90], [290, 190], [60, 190]],
   dims: function (S, L, R) { return S.leg(0, -1, L('C')) + S.leg(1, -1, L('B')) + S.leg(2, -1, L('A')) + R([S.x1, S.y1], [S.x1, S.y0], 58, L('D')); } },
 { code: '31', name: 'Three bends', f: 'A + B + C + (D) - 1.5r - 3d', d: 10, v: { A: 600, B: 1315, C: 615, D: 900 }, run: ['D'], V: [[180, 100], [60, 100], [60, 190], [300, 190], [300, 50]], pd: 'C',
   dims: function (S, L) { return S.leg(0, 1, L('A')) + S.leg(1, 1, L('B')) + S.leg(2, 1, L('C')) + S.leg(3, 1, L('D')); } },
 { code: '32', name: 'Three bends, stepped', f: 'A + B + C + (D) - 1.5r - 3d', d: 12, v: { A: 300, B: 400, C: 1200, D: 400 }, run: ['D'], V: [[160, 50], [60, 50], [60, 125], [300, 125], [300, 200]], pd: 'C',
   dims: function (S, L) { return S.leg(0, 1, L('A')) + S.leg(1, 1, L('B')) + S.leg(2, 1, L('C'), true) + S.leg(3, -1, L('D')); } },
 { code: '33', name: 'Closed loop with semi-circular ends', f: '2A + 1.7B + 2(C) - 4d', d: 10, v: { A: 1200, B: 200, C: 300 }, run: ['C'], V: [[225, 120], [70, 120], [70, 190], [310, 190], [310, 120], [155, 120]], rc: 35, pd: 'A', lap: true, planLap: [[155, 225, 0, 0]],
   dims: function (S, L, R) { return R([S.x0, S.y1], [S.x1, S.y1], 24, L('A')) + R([S.x1, S.y1], [S.x1, S.y0], 22, L('B')) + R([155, S.y0], [225, S.y0], -22, L('C')); } },
 { code: '34', name: 'Crank with end bent down', f: 'A + B + C + (E) - 0.5r - d', d: 16, v: { A: 400, B: 700, C: 400, D: 500, E: 300 }, run: ['E'], V: [[40, 190], [110, 190], [200, 90], [290, 90], [290, 160]],
   dims: function (S, L, R) { return S.leg(0, 1, L('A')) + S.leg(1, -1, L('B')) + S.leg(2, -1, L('C')) + S.leg(3, -1, L('E')) + R([S.x1, S.y1], [S.x1, S.y0], 84, L('D')); } },
 { code: '35', name: 'Crank with end bent up', f: 'A + B + C + (E) - 0.5r - d', d: 16, v: { A: 400, B: 600, C: 500, D: 400, E: 300 }, run: ['E'], V: [[40, 190], [110, 190], [190, 120], [290, 120], [290, 50]],
   dims: function (S, L, R) { return S.leg(0, 1, L('A')) + S.leg(1, -1, L('B')) + S.leg(2, 1, L('C')) + S.leg(3, 1, L('E')) + R([S.x1, 190 + h], [S.x1, 120 + h], 84, L('D')); } },
 { code: '36', name: 'U with one inclined leg', f: 'A + B + C + (D) - r - 2d', d: 12, v: { A: 600, B: 700, C: 500, D: 700, E: 350 }, run: ['D'], V: [[220, 70], [60, 70], [60, 190], [210, 190], [320, 110]],
   dims: function (S, L, R) { return S.leg(0, 1, L('D')) + S.leg(1, 1, L('C')) + S.leg(2, 1, L('B')) + S.leg(3, 1, L('A')) + R([S.x1, 190 + h], [S.x1, S.V[4][1] - 5], 22, L('E')); } },
 { code: '41', name: 'Four bends', f: 'A + B + C + D + (E) - 2r - 4d', d: 12, v: { A: 400, B: 500, C: 1500, D: 400, E: 300 }, run: ['E'], V: [[170, 80], [60, 80], [60, 190], [310, 190], [310, 110], [225, 110]], pd: 'C',
   dims: function (S, L) { return S.leg(0, 1, L('A')) + S.leg(1, 1, L('B')) + S.leg(2, 1, L('C')) + S.leg(3, 1, L('D')) + S.leg(4, 1, L('E')); } },
 { code: '44', name: 'Four bends, top hat', f: 'A + B + C + D + (E) - 2r - 4d', d: 12, v: { A: 500, B: 400, C: 600, D: 300, E: 500 }, run: ['E'], V: [[30, 90], [130, 90], [130, 190], [250, 190], [250, 115], [350, 115]],
   dims: function (S, L) { return S.leg(0, -1, L('A')) + S.leg(1, 1, L('B')) + S.leg(2, 1, L('C')) + S.leg(3, 1, L('D')) + S.leg(4, -1, L('E')); } },
 { code: '46', name: 'Double crank', f: 'A + 2B + C + (E)', d: 16, v: { A: 1175, B: 500, C: 2650, D: 50, E: 1175 }, run: ['E'], V: [[30, 90], [100, 90], [150, 190], [230, 190], [280, 90], [350, 90]],
   dims: function (S, L, R) { return S.leg(0, -1, L('A')) + S.leg(1, 1, L('B')) + S.leg(2, 1, L('C')) + S.leg(3, 1, L('B')) + S.leg(4, -1, L('E')) + R([S.x1, S.y1], [S.x1, S.y0], 22, L('D')); } },
 { code: '47', name: 'U with hooked ends', f: '2A + B + 2(C) + 1.5r - 3d', d: 10, v: { A: 600, B: 400, C: 150, D: 150 }, run: ['C', 'D'], V: [[110, 140], [110, 60], [40, 60], [40, 190], [340, 190], [340, 60], [270, 60], [270, 140]], pd: 'B',
   dims: function (S, L) { return S.leg(2, 1, L('A')) + S.leg(3, 1, L('B')) + S.leg(0, 1, L('C'), false, 0, 16) + S.leg(6, 1, L('D'), false, 0, 16); } },
 { code: '51', name: 'Closed link, ends lapped at one corner', f: '2(A + B + (C)) - 2.5r - 5d', d: 10, v: { A: 1055, B: 1040, C: 130, D: 130 }, run: ['C', 'D'], V: [[205, 68], [300, 68], [300, 190], [60, 190], [60, 68], [300, 68], [300, 150]], pd: 'A', lap: true, planLap: [[205, 300 + h, 0, 1]],
   dims: function (S, L, R) { return R([S.x0, S.y1], [S.x1, S.y1], 24, L('A')) + R([S.x0, S.y0], [S.x0, S.y1], 24, L('B')) + S.leg(0, -1, L('C')) + S.leg(5, -1, L('D')); } },
 { code: '51A', name: 'Closed link with 135 degree hooks (site and IS practice; not a BS 8666 code)', f: 'by calculation, along the centre-line', d: 10, v: { A: 1055, B: 1040, C: 100 }, run: [], pd: 'A', lap: true,
   V: G51A.V, planLap: G51A.lap,
   dims: function (S, L, R) { return R([60 - h, 190 + h], [300 + h, 190 + h], 24, L('A')) + R([60 - h, 68 - h], [60 - h, 190 + h], 24, L('B')) + note(180, 150, 'each hook: ' + L('C') + ' straight', 'middle'); } },
 { code: '56', name: 'Closed link with one splayed corner', f: 'A + B + C + (D) + 2(E) - 2.5r - 5d', d: 10, v: { A: 600, B: 300, C: 350, D: 350, E: 130, F: 130 }, run: ['D', 'E', 'F'], V: [[60, 118], [60, 190], [320, 190], [225, 68], [60, 68], [60, 190], [150, 190]], pd: 'A', lap: true, planLap: [[60 - h, 150, 1, 0]],
   dims: function (S, L, R) { return R([S.x0, S.y1], [S.x1, S.y1], 54, L('A')) + R([S.x0, S.y0], [S.x0, S.y1], 62, L('B')) + S.leg(3, 1, L('C')) + S.leg(2, 1, L('D')) + S.leg(5, 1, L('E')) + S.leg(0, 1, L('F')); } },
 { code: '63', name: 'Closed link, both ends turned in', f: '2A + 3B + 2(C) - 3r - 6d', d: 10, v: { A: 500, B: 300, C: 130, D: 130 }, run: ['C', 'D'], V: [[60, 146], [60, 68], [300, 68], [300, 190], [60, 190], [60, 68], [300, 68], [300, 146]], pd: 'B', lap: true, planLap: [[60 - h, 300 + h, 1, 1]],
   dims: function (S, L, R) { return R([S.x0, S.y0], [S.x0, S.y1], 24, L('A')) + R([S.x0, S.y1], [S.x1, S.y1], 24, L('B')) + S.leg(0, 1, L('C'), false, 0, 12) + S.leg(6, 1, L('D'), false, 0, 12); } },
 { code: '64', name: 'Double link', f: 'A + B + C + 2D + E + (F) - 3r - 6d', d: 10, v: { A: 450, B: 300, C: 700, D: 400, E: 450, F: 150 }, run: ['F'], V: [[280, 110], [40, 110], [40, 200], [340, 200], [340, 40], [190, 40], [190, 200], [268, 200]], pd: 'C', lap: true, planLap: [[190 - h, 268, 1, 0]],
   dims: function (S, L) { return S.leg(0, -1, L('A'), false, 0, 55) + S.leg(1, 1, L('B')) + S.leg(2, 1, L('C')) + S.leg(3, 1, L('D')) + S.leg(4, 1, L('E')) + S.leg(6, -1, L('F')); } },
 { code: '67', name: 'Bar bent to a radius', f: 'A', d: 20, v: { A: 6000, B: 5900, C: 300, R: 9000 }, run: [], raw: true, V: arc(190, 560, 420, -110, -70, 24), pd: 'B',
   dims: function (S, L, R) { return R([S.x0 + 5, S.y1], [S.x1 - 5, S.y1], 22, L('B')) + R([S.x1, S.y1], [S.x1, S.y0], 22, L('C')) + note(190, S.y0 - 10, L('A') + ' along the bar, ' + L('R'), 'middle'); } },
 { code: '75', name: 'Circular link with lap', f: 'pi (A - d) + (B)', d: 12, v: { A: 600, B: 400 }, run: ['B'], raw: true, V: arc(190, 130, 66, -50, 350, 60), names: ['Plan view', 'Side view'],
   dims: function (S, L, R) { return R([S.x0, S.y1], [S.x1, S.y1], 24, L('A')) + note(S.x1 + 8, 92, L('B') + ' lap'); } },
 { code: '77', name: 'Helix', f: 'C pi (A - d)', d: 10, v: { A: 400, B: 100, C: 10 }, run: [],
   iso: function (L, R) { var P = [], i, n = 240, r = 86, pitch = 40; for (i = 0; i <= n; i++) { var t = i / n * 8 * Math.PI; P.push(iso([r * Math.cos(t), r * Math.sin(t), pitch * t / (2 * Math.PI)])); }
     var S = bar(P, 0, true), a = iso([r * Math.cos(-Math.PI / 4), r * Math.sin(-Math.PI / 4), pitch * 0.875]), b = [a[0], a[1] - pitch];
     return S.svg + R([S.x0, S.y1], [S.x1, S.y1], 22, L('A')) + R([a[0] + h, a[1]], [b[0] + h, b[1]], 24, L('B') + ' pitch') + note(S.x0, S.y0 - 10, L('C') + ' turns'); } },
 { code: '98', name: 'Chair, bent in two planes', f: 'A + 2B + C + (D) - 2r - 4d', d: 12, v: { A: 500, B: 200, C: 150, D: 150 }, run: ['D'],
   iso: function (L, R) { var A = 230, Bh = 120, C = 100, V3 = [[0, C, 0], [0, 0, 0], [0, 0, Bh], [A, 0, Bh], [A, 0, 0], [A, -C, 0]], S = bar(fillet3(V3, 26).map(pict), 0, true), q = V3.map(pict);
     return S.svg + R(q[2], q[3], -26, L('A')) + R(q[1], q[2], -26, L('B')) + R(q[3], q[4], -26, L('B')) + R(q[0], q[1], 26, L('C')) + R(q[4], q[5], 26, L('D')); } },
 { code: '99', name: 'Any other shape (example: cross tie)', f: 'by calculation, from a dimensioned sketch', d: 8, v: { A: 120, C: 75, D: 75 }, run: [], V: [[124, 126], [60, 190], [300, 190], [300, 110]], rc: RC,
   dims: function (S, L) { return S.leg(1, 1, L('A')) + S.leg(0, 1, L('C')) + S.leg(2, 1, L('D')); } }
];
    var byCode = {}; DEFS.forEach(function (D) { byCode[D.code] = D; });
    return { DEFS: DEFS, byCode: byCode, figure: figure, figureSVG: figureSVG, fitFigures: fitFigures, fillet: fillet };
  })();

