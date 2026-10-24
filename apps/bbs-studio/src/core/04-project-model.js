  /* ---------- project model ---------- */
  function guid() { var CH = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$', s = CH.charAt(Math.floor(Math.random() * 4)); for (var k = 0; k < 21; k++) s += CH.charAt(Math.floor(Math.random() * 64)); return s; }
  function newMember(mark) {
    return { guid: guid(), mark: mark || 'SW1', qty: 1, H: 0, L: 3000, W: 200, extra: 0, bz: 0,
      vert: [{ n: 16, dia: 16, zone: 'b', spc: 0 }, { n: 16, dia: 12, zone: 'w', spc: 0 }],
      links: [{ type: 'box', per: 2, spc: 200, dia: 8, A: 800 }, { type: 'conf', per: 6, spc: 200, dia: 8 }, { type: 'master', per: 1, spc: 200, dia: 10 }, { type: 'gen', per: 8, spc: 200, dia: 8 }], manual: [] };
  }
  function defaultCost() {
    return { sample: true, oh: 10, profit: 10, gst: 18,
      steel: { rate: 58000, wasteMode: 'plan', waste: 3, wireQty: 8, wireRate: 75, labour: 9000, handling: 500 },
      conc: { rate: 6500, waste: 2, pump: 250, labour: 450, curing: 50 },
      form: { material: 220, labour: 250, consumables: 30, waste: 5 } };
  }
  function newProject() {
    return { app: 'bbs-studio', schema: 7, version: VERSION, guid: guid(), name: 'New project', client: '', consultant: '', title: '', job: '', dwg: '', prep: '', chk: '', grade: 40, steel: 'Fe500', standard: 'BS',
      rules: { wall: wallRules() }, levels: [{ guid: guid(), name: 'Level 1', H: 3000, Hnext: 3000, members: [newMember('SW1')] }],
      stock: 12000, minOffcut: 1000, inventory: '', cost: defaultCost(), source: null };
  }
  /**
   * Which vertical bar groups sit in the boundary zones? The workbook does not say, but its tie counts do:
   * confining ties per end = boundary bar pairs per end less the corner pair, general ties = web bar pairs.
   */
  function guessZones(m) {
    var conf = 0, gen = 0, G = m.vert.length, best = 0, bestScore = 1e9, k, i;
    m.links.forEach(function (l) { if (l.type === 'conf') conf += l.per; if (l.type === 'gen') gen += l.per; });
    for (k = 0; k <= G; k++) {
      var b = 0, w = 0; for (i = 0; i < G; i++) { if (i < k) b += m.vert[i].n; else w += m.vert[i].n; }
      var score = Math.abs(b / 4 - 1 - conf / 2) + Math.abs(w / 2 - gen);
      if (score < bestScore - 1e-9) { bestScore = score; best = k; }
    }
    m.vert.forEach(function (v, j) { v.zone = j < best ? 'b' : 'w'; });
  }
  function normalise(p) {
    var b = newProject(), k;
    for (k in b) if (p[k] === undefined || p[k] === null) p[k] = b[k];
    if (!STDS[p.standard]) p.standard = 'BS';
    // presentation view: the one size every link, and the one size every main bar, is drawn at
    p.pres = { link: num(p.pres && p.pres.link, 10) || 10, bar: num(p.pres && p.pres.bar, 20) || 20 };
    var def = wallRules(), R = p.rules.wall = Object.assign(wallRules(), p.rules && p.rules.wall || {}); R.ded = Object.assign(def.ded, R.ded || {});
    ['lap', 'hook', 'hookMinLeg', 'hookMinDia', 'hookExt', 'hookExtMin', 'cover', 'crank', 'crankRound', 'crankSlope', 'noCrankFrom', 'round', 'density'].forEach(function (key) { R[key] = num(R[key], wallRules()[key]); });
    // beams: unit weights as the beam workbook tabulates them, and whether its slips are corrected (see beamRows)
    p.rules.beam = Object.assign({ uw: {}, fix: false }, p.rules.beam || {}); p.rules.beam.fix = !!p.rules.beam.fix;
    if (['same', 'alt', 'both135'].indexOf(R.tieHooks) < 0) R.tieHooks = 'same';   // open ties: 135 + 90 the same way at every level, 135 + 90 swapping ends at alternate levels, or 135 at both ends
    if (R.linkEnds !== 'lap90') R.linkEnds = 'hook135';   // how a closed link is closed: two 135 degree hooks round one corner bar (site and seismic practice), or the lapped legs of BS 8666 shape 51
    if (!(R.crankSlope >= 2)) R.crankSlope = 10;
    R.vertStart = R.vertStart === 'floor' ? 'floor' : 'mid'; R.lengthBy = R.lengthBy === 'standard' ? 'standard' : 'workbook';
    R.radius = R.radius || {}; ['BS', 'IS'].forEach(function (s) { R.radius[s] = Object.assign({}, STDS[s], R.radius[s] || {}); ['rSmall', 'rLarge', 'rSplit'].forEach(function (q) { R.radius[s][q] = num(R.radius[s][q], STDS[s][q]); }); });
    Object.keys(R.ded).forEach(function (s) { R.ded[s] = num(R.ded[s]); });
    p.grade = num(p.grade, 40); p.stock = num(p.stock, 12000); p.minOffcut = num(p.minOffcut, 1000);
    p.cost = Object.assign(defaultCost(), p.cost || {});
    ['steel', 'conc', 'form'].forEach(function (g) { p.cost[g] = Object.assign(defaultCost()[g], p.cost[g] || {}); Object.keys(p.cost[g]).forEach(function (key) { if (key !== 'wasteMode') p.cost[g][key] = num(p.cost[g][key]); }); });
    ['oh', 'profit', 'gst'].forEach(function (key) { p.cost[key] = num(p.cost[key]); });
    p.levels = (p.levels && p.levels.length ? p.levels : b.levels).map(function (lv) {
      return { guid: lv.guid || guid(), name: String(lv.name || 'Level'), H: Math.max(0, num(lv.H, 3000)), Hnext: Math.max(0, num(lv.Hnext, num(lv.H, 3000))), members: (lv.members || []).map(function (m) {
        if (m.type === 'beam') return {           // a beam as read from the beam workbook: its spans and one entry per bar set
          type: 'beam', guid: m.guid || guid(), mark: String(m.mark || 'Beam').trim(), qty: Math.max(1, Math.round(num(m.qty, 1))), L: Math.max(0, num(m.L)), W: Math.max(0, num(m.W)), H: Math.max(0, num(m.H)), vert: [], links: [], manual: [],
          spans: (m.spans || []).map(function (s) { return { name: String(s.name || ''), L: Math.max(0, num(s.L)), B: Math.max(0, num(s.B)), D: Math.max(0, num(s.D)), supL: Math.max(0, num(s.supL)), supR: Math.max(0, num(s.supR)), qty: Math.max(1, Math.round(num(s.qty, 1))) }; }),
          bars: (m.bars || []).map(function (b) { return { desc: String(b.desc || 'Bar'), shape: ('0' + String(b.shape === undefined ? '0' : b.shape)).slice(-2), legs: [0, 1, 2, 3, 4, 5].map(function (i) { return num((b.legs || [])[i]); }), ded: num(b.ded), dia: num(b.dia, 12), spc: Math.max(0, num(b.spc)),
            nb: Math.max(0, num(b.nb, 1)), nm: Math.max(0, num(b.nm, 1)), n: num(b.n), tot: num(b.tot), len: Math.max(0, num(b.len)), sum: num(b.sum), zone: num(b.zone), row: num(b.row), typed: !!b.typed, lenSlip: !!b.lenSlip, neg: !!b.neg }; }) };   // n and tot may be negative: a workbook slip that is kept, flagged, and removed only by the correction rule
        var o = { guid: m.guid || guid(), mark: String(m.mark === undefined ? '' : m.mark).trim(), qty: Math.max(1, Math.round(num(m.qty, 1))), H: Math.max(0, num(m.H)), L: Math.max(0, num(m.L)), W: Math.max(0, num(m.W)), extra: num(m.extra), bz: Math.max(0, num(m.bz)),
          vert: (m.vert || []).map(function (v) { return { n: Math.max(0, Math.round(num(v.n))), dia: num(v.dia, 12), zone: v.zone === 'b' || v.zone === 'w' ? v.zone : '', spc: Math.max(0, num(v.spc)) }; }),
          links: (m.links || []).filter(function (l) { return LINK_TYPES[l.type]; }).map(function (l) { return { type: l.type, per: Math.max(0, Math.round(num(l.per))), spc: Math.max(0, num(l.spc, 200)), dia: num(l.dia, 8), A: Math.max(0, num(l.A)) }; }),
          manual: (m.manual || []).map(function (x) { return { desc: String(x.desc || 'Bar'), shape: ('0' + String(x.shape || '0')).slice(-2), n: Math.max(0, Math.round(num(x.n))), dia: num(x.dia, 8), len: Math.max(0, num(x.len)), A: num(x.A), B: num(x.B), C: num(x.C), D: num(x.D), E: num(x.E), hook: num(x.hook) }; }) };
        if (o.vert.some(function (v) { return !v.zone; })) guessZones(o);      // files from 0.5 and fresh imports carry no zones
        return o;
      }) };
    });
    return p;
  }

