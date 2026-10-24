  /* ---------- wall engine: one model that the schedule, the drawings, the 3D view and the IFC file all read ---------- */
  /** Hook leg of a link or tie. A BS 8666 schedule takes it from Table 2; otherwise the project rule (10d, minimum 75, as in the workbook and IS 13920). */
  function hookLeg(p, d) { var R = p.rules.wall; if (p.standard === 'BS' && R.lengthBy === 'standard' && BS_P.link[d]) return BS_P.link[d]; return d <= R.hookMinDia ? R.hookMinLeg : d * R.hook; }
  /** Link levels: the workbook's count (clear height / spacing, rounded up, plus one), spread evenly between the covers so the first and last sit at the cover. */
  function levelsZ(R, m, H, l) { var clear = H + m.extra - 2 * R.cover, n = Math.ceil(clear / l.spc - 1e-9) + 1, z = [], i; for (i = 0; i < n; i++) z.push(R.cover + (n > 1 ? clear * i / (n - 1) : 0)); return z; }
  function memberOk(m) { return m.L > 0 && m.W > 0; }
  /**
   * Where the vertical bars stand. Boundary groups share the boundary zone at each end (largest first, from the corner inwards, two faces);
   * web groups share the length between the zones. Returns slots {x, s (face +1/-1), dia, gi (group index), y}.
   */
  function vertLayout(p, m) {
    var R = p.rules.wall, out = [], c = R.cover, ring = 0; m.links.forEach(function (l) { if ((l.type === 'master' || l.type === 'box') && l.per > 0) ring = Math.max(ring, l.dia); });
    var box = m.links.filter(function (l) { return l.type === 'box' && l.per > 0 && l.A > 0; })[0], zone = m.bz > 0 ? m.bz : box ? box.A : Math.min(800, m.L / 4);
    var bGroups = [], wGroups = []; m.vert.forEach(function (v, gi) { if (!(v.n > 0 && v.dia > 0)) return; (v.zone === 'b' ? bGroups : wGroups).push({ v: v, gi: gi }); });
    var dmax = 0; m.vert.forEach(function (v) { if (v.n > 0) dmax = Math.max(dmax, v.dia); });
    var xa = -m.L / 2 + c + ring + dmax / 2, xb = Math.min(-m.L / 2 + c + zone - ring - dmax / 2, -dmax), webFrom = xa, endSeq = [];
    function yOf(s, d) { return s * (m.W / 2 - c - ring - d / 2); }
    // boundary: per end, per face = n / 4 (remainders go to the first ends and faces in turn)
    bGroups.forEach(function (g) { var q = Math.floor(g.v.n / 4), rem = g.v.n - q * 4, k; for (k = 0; k < q; k++) endSeq.push({ g: g, full: 4 }); if (rem) endSeq.push({ g: g, full: rem }); });
    var nb = endSeq.length;
    endSeq.forEach(function (e, i) {
      var x = nb > 1 ? xa + (xb - xa) * i / (nb - 1) : xa, combos = [[-1, 1], [-1, -1], [1, 1], [1, -1]], k;
      for (k = 0; k < e.full; k++) out.push({ x: combos[k][0] * -x * -1 * (combos[k][0] < 0 ? 1 : -1) * (combos[k][0] < 0 ? 1 : -1), s: combos[k][1], dia: e.g.v.dia, gi: e.g.gi, y: yOf(combos[k][1], e.g.v.dia), zone: 'b', end: combos[k][0] });
      webFrom = Math.max(webFrom, x);
    });
    // fix x sign: left end keeps x (negative side), right end mirrors it
    out.forEach(function (q) { q.x = q.end < 0 ? -Math.abs(q.x) : Math.abs(q.x); });
    // web: evenly between the last boundary bars (or between the corners when there is no boundary group)
    var w0 = nb ? webFrom : xa, span = -2 * w0, wSeq = [];
    wGroups.forEach(function (g) {
      var n = g.v.n;
      if (g.v.spc > 0) { var perFace = Math.max(0, Math.ceil(span / g.v.spc - 1e-9) - (nb ? 1 : -1)); n = perFace * 2; g.derived = n; }
      for (var k = 0; k < Math.ceil(n / 2); k++) wSeq.push({ g: g, faces: (k === Math.ceil(n / 2) - 1 && n % 2) ? 1 : 2 });
    });
    wSeq.forEach(function (e, i) {
      var nW = wSeq.length, x = nb ? w0 + span * (i + 1) / (nW + 1) : (nW > 1 ? w0 + span * i / (nW - 1) : 0);
      out.push({ x: x, s: 1, dia: e.g.v.dia, gi: e.g.gi, y: yOf(1, e.g.v.dia), zone: 'w', end: 0 });
      if (e.faces === 2) out.push({ x: x, s: -1, dia: e.g.v.dia, gi: e.g.gi, y: yOf(-1, e.g.v.dia), zone: 'w', end: 0 });
    });
    var derived = {}; wGroups.forEach(function (g) { if (g.derived !== undefined) derived[g.gi] = g.derived; });
    return { slots: out, zone: zone, ring: ring, xa: xa, xb: xb, derived: derived, webPitch: wSeq.length ? span / (wSeq.length + (nb ? 1 : -1 || 1)) : 0, endPitch: nb > 1 ? (xb - xa) / (nb - 1) : 0 };
  }
  /** One member's bar sets, each with its true geometry (protos = centre-line of one bar, places = where each copy stands) and its three lengths. */
  function buildMember(p, lv, m) {
    var R = p.rules.wall, H = m.H > 0 ? m.H : lv.H, avg = (lv.H + lv.Hnext) / 2, c = R.cover, sets = [], lay = vertLayout(p, m), z0 = R.vertStart === 'mid' ? lv.H / 2 : 0;
    var S = STDS[p.standard], hasMaster = m.links.some(function (l) { return l.type === 'master' && l.per > 0; }), dm = 0, db = 0;
    m.links.forEach(function (l) { if (l.per > 0) { if (l.type === 'master') dm = l.dia; if (l.type === 'box') db = l.dia; } });
    function finish(o) {
      var d = o.dia, ri = bendRadius(p, d), rc = ri + d / 2, cl = 0;
      o.protos.forEach(function (pr) { var bp = bendPath(pr.verts, rc); pr.pts = bp.pts; pr.len = bp.len; cl = Math.max(cl, bp.len); if (bp.tight) o.tight = true; });
      o.rc = rc;
      o.n = o.protos.reduce(function (a, pr) { return a + pr.places.length; }, 0);
      var D = o.dims, hk = o.hookLeg || 0;
      o.lens = { cl: cl };
      if (o.kind === 'manual') { o.lens.std = o.fixedLen > 0 ? o.fixedLen : shapeLength(p, o.shape, D, d); o.lens.wb = o.fixedLen > 0 ? o.fixedLen : o.lens.std; o.lens.cl = o.lens.std; }
      else if (o.shape === '51') { o.lens.wb = 2 * (D.A + D.B) + 2 * hk - (R.ded['51'] || 0) * d; o.lens.std = p.standard === 'BS' ? 2 * (D.A + D.B + hk) - 2.5 * ri - 5 * d : cl; }
      else if (o.shape === '99') { o.lens.wb = D.A + 2 * hk - (R.ded['99'] || 0) * d; o.lens.std = cl; }
      else { var sum = (D.A || 0) + (D.B || 0) + (D.C || 0); o.lens.wb = sum - (R.ded['26'] || 0) * d; o.lens.std = p.standard === 'BS' ? sum : cl; }
      o.lens.wb = ceilTo(o.lens.wb, R.round); o.lens.std = ceilTo(o.lens.std, S.round);
      o.len = R.lengthBy === 'standard' ? o.lens.std : o.lens.wb; o.former = 2 * ri;
      o.member = m.mark; o.qty = m.qty; o.total = o.n * m.qty; o.totLen = o.total * o.len / 1000; o.wt = o.totLen * unitWt(R, d);
      o.wtWb = o.total * o.lens.wb / 1000 * unitWt(R, d); o.wtStd = o.total * o.lens.std / 1000 * unitWt(R, d);
      sets.push(o);
    }
    // vertical bars: straight, crank inwards at 1 in crankSlope, then the lap
    m.vert.forEach(function (v, gi) {
      if (!(v.dia > 0)) return;
      var d = v.dia, crank = d < R.noCrankFrom ? ceilTo(R.crank * d, R.crankRound) : 0, A = avg - crank, C = d < R.noCrankFrom ? R.lap * d : 0, off = crank / R.crankSlope, rise = Math.sqrt(crank * crank - off * off), protos = [];   // offset D = B / slope, as CADS RC schedules it
      [1, -1].forEach(function (s) {
        var places = lay.slots.filter(function (q) { return q.gi === gi && q.s === s; }).map(function (q) { return [q.x, q.y, z0]; }); if (!places.length) return;
        protos.push({ verts: crank ? [[0, 0, 0], [0, 0, A], [0, -s * off, A + rise], [0, -s * off, A + rise + C]] : [[0, 0, 0], [0, 0, avg]], places: places, face: s });
      });
      if (!protos.length) return;
      finish({ kind: 'vert', idx: gi, desc: 'Vertical ' + (v.zone === 'b' ? 'boundary' : 'web'), shape: crank ? '26' : '00', dia: d, spc: 0, per: 0, zone: v.zone,
        dims: crank ? { A: A, B: crank, C: C, D: r2(off) } : { A: avg }, protos: protos, role: 'MAIN' });
    });
    // rings and ties
    m.links.forEach(function (l, i) {
      if (!(l.per > 0 && l.dia > 0 && l.spc > 0)) return;
      var d = l.dia, T = LINK_TYPES[l.type], hk = hookLeg(p, d), zs = levelsZ(R, m, H, l), b = m.W - 2 * c, protos = [], dz = l.type === 'master' ? 0 : l.type === 'box' ? dm : dm + db;
      if (l.type === 'box' || l.type === 'master') {
        var a = l.type === 'box' ? l.A : m.L - 2 * c, ha = (a - d) / 2, hb = (b - d) / 2, k = Math.SQRT1_2, places = [], rcL = bendRadius(p, d) + d / 2, t135 = rcL * Math.tan(3 * Math.PI / 8), ext = p.standard === 'IS' ? Math.max(R.hookExt * d, R.hookExtMin) : Math.max(hk - rcL - d / 2, 4 * d);   // straight length beyond the bend: the IS rule, or the BS hook leg less the bend
        var xs = l.type === 'master' ? [0] : (l.per >= 2 ? [-(m.L / 2 - c - a / 2), m.L / 2 - c - a / 2] : [-(m.L / 2 - c - a / 2)]);
        zs.forEach(function (z) { xs.forEach(function (x) { places.push([x, 0, z + dz]); }); });
        var lg = Math.max(hk - d / 2, 2 * rcL);
        protos.push({ places: places, verts: R.linkEnds === 'lap90' ?
          // BS 8666 shape 51, as it sits on site: leg C lies along the first side, then four sides, then leg D turns up along the next side. Five 90 degree bends.
          // The second pass is one bar size higher, so the lapped legs lie beside the sides they lap, never inside the link.
          [[-ha + lg, -hb, 0], [-ha, -hb, 0], [-ha, hb, 0], [ha, hb, 0], [ha, -hb, 0], [-ha, -hb, d], [-ha, -hb + lg, d]] :
          // two 135 degree hooks bent round the same corner bar, tails parallel into the core: site practice and ductile detailing, and the default
          [[-ha - Math.SQRT2 * rcL + (t135 + ext) * k, -hb + (t135 + ext) * k, 0], [-ha - Math.SQRT2 * rcL, -hb, 0], [ha, -hb, 0], [ha, hb, 0], [-ha, hb, 0], [-ha, -hb - Math.SQRT2 * rcL, d], [-ha + (t135 + ext) * k, -hb - Math.SQRT2 * rcL + (t135 + ext) * k, d]] });
        finish({ kind: l.type, idx: i, desc: T.label, shape: '51', fig: R.linkEnds === 'lap90' ? '51' : 'islink', dia: d, spc: l.spc, per: l.per, dims: { A: a, B: b, C: hk, D: hk }, hookLeg: hk, protos: protos, role: 'LIGATURE', levels: zs.length });
      } else {
        var hw = (b - d) / 2, kk = Math.SQRT1_2, pairs = [], seen = {}, zoneSlots = lay.slots.filter(function (q) { return q.s === 1 && (l.type === 'conf' ? q.zone === 'b' : q.zone === 'w'); });
        zoneSlots.forEach(function (q) { var key = Math.round(q.x); if (!seen[key]) { seen[key] = 1; pairs.push(q); } });
        var xsT = [];
        if (l.type === 'conf') {
          var half = Math.ceil(l.per / 2);
          [-1, 1].forEach(function (end, ei) {
            var mine = pairs.filter(function (q) { return q.end === end; }).sort(function (q1, q2) { return Math.abs(q2.x) - Math.abs(q1.x); }).slice(1), want = ei === 0 ? half : l.per - half, j;   // the corner pair is held by the ring
            for (j = 0; j < want; j++) { if (j < mine.length) xsT.push({ x: mine[j].x, d: mine[j].dia }); else xsT.push({ x: end * (m.L / 2 - c - lay.zone * (j + 1) / (want + 1)), d: 0 }); }
          });
        } else {
          pairs.sort(function (q1, q2) { return q1.x - q2.x; });
          for (var j = 0; j < l.per; j++) { if (pairs.length >= l.per) { var pk = pairs[Math.round(j * (pairs.length - 1) / Math.max(1, l.per - 1))]; if (l.per === 1) pk = pairs[Math.floor(pairs.length / 2)]; xsT.push({ x: pk.x, d: pk.dia }); } else if (j < pairs.length) xsT.push({ x: pairs[j].x, d: pairs[j].dia }); else xsT.push({ x: (lay.xb + (-2 * lay.xb) * (j + 1) / (l.per + 1)), d: 0 }); }
          if (pairs.length >= l.per && l.per > 1) { var used = {}; xsT = xsT.filter(function (q) { var key = Math.round(q.x); if (used[key]) return false; used[key] = 1; return true; }); pairs.forEach(function (q) { if (xsT.length < l.per && !used[Math.round(q.x)]) { used[Math.round(q.x)] = 1; xsT.push({ x: q.x, d: q.dia }); } }); }
        }
        // a tie sits beside its bar pair. Its hooks follow the rule: the same way at every level, swapping ends on alternate levels, or 135 degrees at both ends
        var pA = [], pB = [];
        var rcT = bendRadius(p, d) + d / 2, tT = rcT * Math.tan(3 * Math.PI / 8), eT = p.standard === 'IS' ? Math.max(R.hookExt * d, R.hookExtMin) : Math.max(hk - tT, 4 * d), e90 = p.standard === 'IS' ? eT : Math.max(hk - d / 2 - rcT, 4 * d);
        // the tie's main leg stands one bend radius clear of the bar centre, so both hooks really wrap the bars
        zs.forEach(function (z, zi) { xsT.forEach(function (q) { (R.tieHooks === 'alt' && zi % 2 ? pB : pA).push([q.x - rcT, 0, z + dz]); }); });
        // 135 degree hook round one bar (tail back into the core), 90 degree hook round the other (tail along the wall)
        function tie(s) { return [[(tT + eT) * kk, s * (-hw - Math.SQRT2 * rcT + (tT + eT) * kk), 0], [0, s * (-hw - Math.SQRT2 * rcT), 0], [0, s * hw, 0], [rcT + e90, s * hw, 0]]; }
        function tie135() { var ye = hw + Math.SQRT2 * rcT, t = (tT + eT) * kk; return [[t, -ye + t, 0], [0, -ye, 0], [0, ye, 0], [t, ye - t, 0]]; }
        if (pA.length) protos.push({ verts: R.tieHooks === 'both135' ? tie135() : tie(1), places: pA }); if (pB.length) protos.push({ verts: tie(-1), places: pB });
        var loose = xsT.filter(function (q) { return !q.d; }).length;
        finish({ kind: l.type, idx: i, desc: T.label, shape: '99', fig: 'tie', dia: d, spc: l.spc, per: l.per, dims: { A: b, C: hk, D: hk }, hookLeg: hk, protos: protos, role: 'LIGATURE', levels: zs.length, loose: loose });
      }
    });
    m.manual.forEach(function (x, i) {
      if (!(x.n > 0 && x.dia > 0)) return;
      var o = { kind: 'manual', idx: i, desc: x.desc, shape: SHAPES[x.shape] ? x.shape : '99', dia: x.dia, spc: 0, per: 0, dims: { A: x.A, B: x.B, C: x.C, D: x.D, E: x.E }, hookLeg: 0, protos: [], fixedLen: x.len, role: 'USERDEFINED' };
      finish(o); o.n = x.n; o.total = x.n * m.qty; o.totLen = o.total * o.len / 1000; o.wt = o.wtWb = o.wtStd = o.totLen * unitWt(R, x.dia);
    });
    // bars continuing from the storey below (not scheduled here; drawn faint so the cage reads as complete)
    var ghosts = [];
    if (R.vertStart === 'mid') sets.forEach(function (s) { if (s.kind !== 'vert') return; s.protos.forEach(function (pr) { var top = z0 + (s.dims.C || 0); pr.places.forEach(function (q) { ghosts.push({ dia: s.dia, pts: [[q[0], q[1] - pr.face * (s.dims.D || 0), 0], [q[0], q[1] - pr.face * (s.dims.D || 0), top]] }); }); }); });
    return { sets: sets, layout: lay, H: H, z0: z0, ghosts: ghosts };
  }
  /**
   * The single model. Everything else (schedule, weights, BOQ, drawings, 3D, IFC) is read from what this returns,
   * so an edit to any input reaches every output. Identical bars share one mark across the project.
   */
  /** Workbook legs a to f as BS 8666 dimensions for the shape code. In a link (51) the workbook gives width, depth, width, depth, then both hooks together. */
  function beamDims(shape, g) {
    if (shape === '51') return { A: g[0] || g[2], B: g[1] || g[3], C: g[4] / 2, D: g[4] / 2 };
    var o = {}, keys = ['A', 'B', 'C', 'D', 'E'], i, k = 0; for (i = 0; i < 6 && k < 5; i++) if (g[i]) o[keys[k++]] = g[i]; return o;
  }
  /**
   * Schedule rows for one beam. Lengths and numbers are the workbook's own unless the "correct the workbook's slips" rule is on,
   * in which case a length is the sum of its legs and a number is beams x members x bars. Each row keeps a flag for either slip.
   */
  function beamRows(p, lv, m, id) {
    var R = p.rules.wall, Rb = p.rules.beam, S = STDS[p.standard], out = [];
    m.bars.forEach(function (x, i) {
      var d = x.dia, D = beamDims(x.shape, x.legs), shape = SHAPES[x.shape] ? x.shape : '99', ri = bendRadius(p, d), fixLen = Math.round(x.sum / 10) * 10, uw = Rb.uw[d] > 0 ? Rb.uw[d] : unitWt(R, d);
      var o = { kind: 'beam', idx: i, desc: x.desc, shape: shape, dia: d, spc: x.spc, per: 0, dims: D, hookLeg: 0, protos: [], role: /link|stirrup|ring/i.test(x.desc) ? 'LIGATURE' : 'MAIN', typed: x.typed, lenSlip: x.lenSlip, neg: x.neg, srow: x.row };
      if (shape === '51' && R.linkEnds !== 'lap90') o.fig = 'islink';   // closed links are hooked at 135 degrees unless the rule says lapped
      o.lens = { wb: Rb.fix && fixLen > 0 ? fixLen : x.len, std: 0, cl: 0 }; o.lens.std = ceilTo(shapeLength(p, shape, D, d) || o.lens.wb, S.round); o.lens.cl = o.lens.std;
      o.len = R.lengthBy === 'standard' ? o.lens.std : o.lens.wb; o.former = 2 * ri;
      o.member = m.mark; o.qty = Math.max(1, x.nb || m.qty); o.n = Rb.fix ? Math.max(0, x.nm * x.n) : x.nm * x.n; o.total = Rb.fix ? Math.max(0, x.nb * x.nm * x.n) : x.tot;
      o.totLen = Math.round(o.total * o.len / 1000 * 100 + 1e-7) / 100; o.wt = o.totLen * uw;
      o.wtWb = Math.round(o.total * o.lens.wb / 1000 * 100 + 1e-7) / 100 * uw; o.wtStd = o.total * o.lens.std / 1000 * uw;
      out.push(o);
    });
    return out;
  }
  function compute(p) {
    var R = p.rules.wall, rows = [], warn = [], marks = {}, next = 1, byDia = {}, mem = [], seen = {}, tot = { wt: 0, wtWb: 0, wtStd: 0, conc: 0, form: 0, members: 0 };
    p.levels.forEach(function (lv, li) {
      lv.members.forEach(function (m, mi) {
        var H = m.H > 0 ? m.H : lv.H, id = li + ':' + mi, key = lv.name + '|' + m.mark;
        function w(t, level) { warn.push({ level: level || 'error', member: m.mark || '(no mark)', text: t }); }
        if (!m.mark) w('Member has no mark.'); else if (seen[key]) w('Mark is used twice on ' + lv.name + '.'); seen[key] = 1;
        if (m.type === 'beam') {
          var bw = 0, bconc = 0, bform = 0, sets = beamRows(p, lv, m, id);
          sets.forEach(function (b) {
            var D = b.dims, k = [b.dia, b.shape, D.A || 0, D.B || 0, D.C || 0, D.D || 0, D.E || 0, b.len].join('|');
            if (!marks[k]) marks[k] = pad2(next++);
            b.mark = marks[k]; b.id = id; b.level = lv.name; b.uid = m.guid + ':beam' + b.idx; rows.push(b); bw += b.wt;
            var a = byDia[b.dia] || (byDia[b.dia] = { dia: b.dia, len: 0, wt: 0, bars: 0 }); a.len += b.totLen; a.wt += b.wt; a.bars += b.total;
            tot.wtWb += b.wtWb; tot.wtStd += b.wtStd;
            if (b.len > p.stock) w(b.desc + ' size ' + b.dia + ' is ' + Math.round(b.len) + ' mm, longer than the ' + p.stock + ' mm stock bar: it needs a lap.', 'warn');
            if (b.lenSlip) w(b.desc + ' (sheet row ' + b.srow + '): the workbook length is not the sum of its legs. ' + (p.rules.beam.fix ? 'Corrected.' : 'Kept as in the workbook.'), 'warn');
            if (b.neg) w(b.desc + ' (sheet row ' + b.srow + '): the workbook has a negative number of bars, which takes steel off the total. ' + (p.rules.beam.fix ? 'Corrected to none.' : 'Kept as in the workbook.'), 'warn');
            if (b.typed) w(b.desc + ' (sheet row ' + b.srow + '): the total number was typed over the formula. ' + (p.rules.beam.fix ? 'Corrected to beams x members x bars.' : 'Kept as typed.'), 'warn');
          });
          m.spans.forEach(function (s) { bconc += s.L * s.B * s.D / 1e9 * m.qty; bform += s.L * (s.B + 2 * s.D) / 1e6 * m.qty; });
          mem.push({ id: id, li: li, mi: mi, type: 'beam', level: lv.name, guid: m.guid, mark: m.mark, qty: m.qty, L: m.L, W: m.W, H: m.H, wt: bw, conc: bconc, form: bform, kgm3: bconc > 0 ? bw / bconc : 0, bars: sets, layout: { slots: [], derived: {} }, z0: 0, ghosts: [], spans: m.spans });
          tot.wt += bw; tot.conc += bconc; tot.form += bform; tot.members += m.qty;
          return;
        }
        if (!memberOk(m)) w('Length and width must be greater than zero.');
        if (m.W <= 2 * R.cover) w('Width ' + m.W + ' leaves no room inside ' + R.cover + ' mm cover.');
        m.links.forEach(function (l) { if (l.type === 'box' && l.per > 0 && !(l.A > 0)) w('Box ring needs its length A (the boundary zone length).'); if (l.type === 'box' && l.A * 2 > m.L) w('Two box rings of ' + l.A + ' do not fit in a ' + m.L + ' long wall.', 'warn'); });
        if (!m.vert.some(function (v) { return v.n > 0; })) w('No vertical bars entered.', 'warn');
        m.vert.forEach(function (v) { if (DIAS.indexOf(v.dia) < 0) w('Bar size ' + v.dia + ' is not a standard size.', 'warn'); if (v.zone === 'b' && v.n % 4) w(v.n + ' boundary bars of size ' + v.dia + ' do not divide evenly over two ends and two faces.', 'info'); });
        var B = memberOk(m) ? buildMember(p, lv, m) : { sets: [], layout: { slots: [], derived: {} }, H: H, z0: 0, ghosts: [] }, wt = 0;
        if (B.layout.endPitch > 0 && B.layout.endPitch < 50) w('Boundary bars come out at ' + Math.round(B.layout.endPitch) + ' mm centres; check the zone length or which bar sizes are in the boundary.', 'warn');
        B.sets.forEach(function (b) {
          var D = b.dims, k = [b.dia, b.shape, D.A || 0, D.B || 0, D.C || 0, D.D || 0, D.E || 0, b.len].join('|');
          if (!marks[k]) marks[k] = pad2(next++);
          b.mark = marks[k]; b.id = id; b.level = lv.name; b.uid = m.guid + ':' + b.kind + b.idx; rows.push(b); wt += b.wt;
          var a = byDia[b.dia] || (byDia[b.dia] = { dia: b.dia, len: 0, wt: 0, bars: 0 }); a.len += b.totLen; a.wt += b.wt; a.bars += b.total;
          tot.wtWb += b.wtWb; tot.wtStd += b.wtStd;
          if (b.len > p.stock) w(b.desc + ' size ' + b.dia + ' is ' + Math.round(b.len) + ' mm, longer than the ' + p.stock + ' mm stock bar.');
          if (b.loose) w(b.desc + ': ' + b.loose + ' of the ' + b.per + ' per level have no bar pair to hold in that zone. Check which bar sizes are boundary and which are web, or the number per level.', 'info');
          if (b.tight) w(b.desc + ' size ' + b.dia + ': its legs are too short for the ' + Math.round(b.former) + ' mm former of ' + STDS[p.standard].name + ', so the bends are drawn tighter than the standard radius.', 'info');
        });
        var conc = m.L * m.W * H / 1e9 * m.qty, form = 2 * (m.L + m.W) * H / 1e6 * m.qty;
        mem.push({ id: id, li: li, mi: mi, level: lv.name, guid: m.guid, mark: m.mark, qty: m.qty, L: m.L, W: m.W, H: H, wt: wt, conc: conc, form: form, kgm3: conc > 0 ? wt / conc : 0, bars: B.sets, layout: B.layout, z0: B.z0, ghosts: B.ghosts });
        tot.wt += wt; tot.conc += conc; tot.form += form; tot.members += m.qty;
      });
    });
    return { rows: rows, warnings: warn, byDia: byDia, members: mem, total: tot };
  }
  /**
   * Bar label. BS projects follow CADS RC ("179 H10 01-250 LINKS"); IS projects follow the user's detailing DXF
   * ("2*19-T8" for members x bars, "7-T8@150-04" for a spaced set), where the bar mark is also drawn in a circle.
   */
  var NOTE = { vert: 'VERT', box: 'LINKS', master: 'LINKS', conf: 'TIES', gen: 'TIES' };
  function tagText(p, b, plain) {
    var note = plain || !NOTE[b.kind] ? '' : ' ' + NOTE[b.kind];
    if (p.standard === 'BS') return b.n + ' H' + b.dia + ' ' + b.mark + (b.spc ? '-' + b.spc : '') + note;
    return b.spc ? b.n + '-T' + b.dia + '@' + b.spc + '-' + b.mark : b.qty + '*' + b.n + '-T' + b.dia;
  }

