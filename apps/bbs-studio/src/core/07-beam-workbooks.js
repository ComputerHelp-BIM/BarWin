  /* ---------- beam workbooks ---------- */
  /** Rounds to 2 decimals the way Excel's ROUND does for these values (half away from zero, immune to binary noise). */
  function xlRound2(x) { return Math.round((x + (x >= 0 ? 1e-9 : -1e-9)) * 100) / 100; }
  /**
   * Reads a beam steel-quantity workbook in the user's layout: one sheet per floor, a header row starting "Sl. No.",
   * then blocks of one or more span rows (name, L, B, D, supports, number of beams) followed by one row per bar set
   * (shape code, legs a to f, bend reduction, total length, spacing, bar size, beams x members x bars, total, cut length).
   *
   * Every sheet that has this layout is read and its total recalculated the workbook's own way, row by row, so the
   * reading can be proved against the sheet's stated total. Three kinds of slip are reported, not silently corrected:
   * a total length that is not the sum of its legs, a total number typed over the formula, and a negative number of bars
   * (a link zone that came out shorter than nothing, which takes steel off the total).
   * opts.sheets (names) limits which sheets become levels; without it every sheet that is not a copy of another is loaded.
   */
  function importBeamBook(book, names, opts) {
    var res = { kind: 'beam', levels: [], sheets: [], errors: [], notes: [], found: false, workbookKg: 0, rules: null, meta: {} };
    function norm(v) { return String(v === undefined || v === null ? '' : v).replace(/\s+/g, ' ').trim().toLowerCase(); }
    function isNum(v) { return typeof v === 'number' && isFinite(v); }
    function n0(v) { return isNum(v) ? v : 0; }
    names.forEach(function (name) {
      var G = book[name]; if (!G || !G.length) return;
      var hr = -1, r, c, t; for (r = 0; r < Math.min(G.length, 45); r++) if (/^sl\b|^sl\./.test(norm((G[r] || [])[0]))) { hr = r; break; }
      if (hr < 0) return;
      var H = {}, W = 0; [hr, hr + 1].forEach(function (rr) { (G[rr] || []).forEach(function (v, ci) { t = norm(v); if (t && H[t] === undefined) H[t] = ci; W = Math.max(W, ci + 1); }); });
      function col() { var k, i; for (k in H) for (i = 0; i < arguments.length; i++) if (k.indexOf(arguments[i]) === 0) return H[k]; return -1; }
      var cDesc = col('description'), cShape = H.shape, cA = H.a, cL = H.l, cBend = col('bend', 'g (2d'), cN = col('total length', 'total l'), cSp = col('spacing', 'c/c'), cDia = col('dia of bar', 'dia (mm)', 'dia'), cQ = col('no.of beams', 'no. of beams', 'beams'), cR = col('no. of member', 'no.of member', 'members'), cS = col('no. of bars', 'no.of bars', 'bars'), cT = col('total no', 'total bars'), cU = col('cut length', 'cut l');
      if ([cDesc, cShape, cA, cL, cN, cDia, cQ, cR, cS, cT, cU].some(function (x) { return x === undefined || x < 0; })) return;
      var diaCol = {}, k; for (k in H) if (/^\d+mm$/.test(k)) diaCol[parseInt(k, 10)] = H[k];
      var uw = {}, stated = null, end = G.length;
      for (r = G.length - 1; r > hr; r--) for (c = 0; c < (G[r] || []).length; c++) {
        t = norm(G[r][c]);
        if (t.indexOf('unit weight') === 0) for (k in diaCol) if (isNum(G[r][diaCol[k]])) uw[k] = G[r][diaCol[k]];
        if (t.indexOf('total weight in') === 0 && stated === null) { end = r; for (var cc = c + 1; cc < G[r].length; cc++) if (isNum(G[r][cc])) { stated = G[r][cc]; break; } }
        if (t.indexOf('total length (rm)') === 0) end = Math.min(end, r);
      }
      var sh = { name: name, title: String((G[2] || [])[4] || '').trim(), project: String((G[1] || [])[4] || '').trim(), spans: 0, rows: 0, statedT: stated, kg: 0, issues: [], uw: uw, members: [] };
      var cur = null, per = {}, perFix = {}, used = {};
      for (r = hr + 2; r < end; r++) {
        var row = G[r] || [], desc = String(row[cDesc] === undefined || row[cDesc] === null ? '' : row[cDesc]).replace(/\s*\n\s*/g, ' / ').replace(/\s+/g, ' ').trim();
        if (/^left/.test(norm(row[cShape]))) {                                  // a span row: starts a new beam unless it directly follows another span row (a continuous beam)
          var sp = { name: desc, L: n0(row[cL]), B: n0(row[cL + 1]), D: n0(row[cL + 2]), supL: n0(row[cA]), supR: n0(row[cA + 2]), qty: Math.max(1, Math.round(n0(row[cQ]) || 1)) };
          if (!cur || cur.bars.length) { var mk = sp.name || 'Beam', i2 = 2; while (used[mk]) mk = sp.name + ' #' + i2++; used[mk] = 1; cur = { type: 'beam', mark: mk, spans: [], bars: [], row: r + 1 }; sh.members.push(cur); }
          cur.spans.push(sp); sh.spans++; continue;
        }
        if (!isNum(row[cDia]) || !desc || !cur) continue;
        var legs = [0, 1, 2, 3, 4, 5].map(function (i) { return n0(row[cA + i]); }), ded = cBend >= 0 ? n0(row[cBend]) : 0, sum = legs.reduce(function (a, b) { return a + b; }, 0) + ded;
        var Q = n0(row[cQ]), Rm = n0(row[cR]), S = n0(row[cS]), T = n0(row[cT]), N = n0(row[cN]), U = n0(row[cU]), dia = row[cDia], shp = String(row[cShape]).trim(), calcT = Math.max(0, Q * Rm * S);
        var bar = { desc: desc, shape: /^\d+$/.test(shp) ? ('0' + shp).slice(-2) : '99', legs: legs, ded: ded, dia: dia, spc: cSp >= 0 ? n0(row[cSp]) : 0, nb: Q, nm: Rm, n: S, tot: T, len: xlRound2(U * 1000), sum: sum, zone: n0(row[cL]), row: r + 1 };
        cur.bars.push(bar); sh.rows++;
        var w = uw[dia] || Math.PI * dia * dia / 4 * 7850 / 1e6;
        per[dia] = (per[dia] || 0) + xlRound2(T * U); perFix[dia] = (perFix[dia] || 0) + xlRound2(calcT * xlRound2(sum / 1000));
        if (Math.abs(sum - N) > 0.01) { bar.lenSlip = true; sh.issues.push({ row: r + 1, member: cur.mark, desc: desc, kind: 'length', wb: N, calc: sum, kg: (xlRound2(sum / 1000) - U) * T * w }); }
        if (T < 0) { bar.neg = true; sh.issues.push({ row: r + 1, member: cur.mark, desc: desc, kind: 'negative', wb: T, calc: 0, kg: -T * U * w }); }
        else if (Math.abs(calcT - T) > 1e-9) { bar.typed = true; sh.issues.push({ row: r + 1, member: cur.mark, desc: desc, kind: 'count', wb: T, calc: calcT, kg: (calcT - T) * U * w }); }
      }
      for (k in per) sh.kg += xlRound2(per[k] * (uw[k] || Math.PI * k * k / 4 * 7850 / 1e6));
      sh.kgFix = 0; for (k in perFix) sh.kgFix += xlRound2(perFix[k] * (uw[k] || Math.PI * k * k / 4 * 7850 / 1e6));
      sh.match = stated === null ? null : Math.abs(sh.kg / 1000 - stated) < 5e-6;
      if (sh.rows) { res.sheets.push(sh); res.found = true; }
    });
    if (!res.found) return res;
    // a sheet whose name is another sheet's name plus "(NEW)", "PRO" and the like, with the same total, is a copy: not loaded unless asked for
    res.sheets.forEach(function (s) { var base = s.name.replace(/\s*(\(new\)|pro|copy|\(\d+\))\s*$/i, '').trim(); s.copyOf = base !== s.name.trim() && res.sheets.some(function (o) { return o !== s && o.name.trim() === base; }) ? base : null; });
    var pick = opts && opts.sheets ? opts.sheets : res.sheets.filter(function (s) { return !s.copyOf; }).map(function (s) { return s.name; });
    var first = null;
    res.sheets.forEach(function (s) {
      s.loaded = pick.indexOf(s.name) >= 0; if (!s.loaded) return; first = first || s; res.workbookKg += s.kg;
      res.levels.push({ guid: guid(), name: s.name.trim(), H: 3000, Hnext: 3000, members: s.members.map(function (m) {
        return { type: 'beam', guid: guid(), mark: m.mark, qty: m.spans[0].qty, L: m.spans.reduce(function (a, x) { return a + x.L; }, 0), W: m.spans[0].B, H: m.spans[0].D, spans: m.spans, bars: m.bars, vert: [], links: [], manual: [] }; }) });
    });
    if (first) { res.rules = { uw: first.uw }; res.meta = { name: first.project, title: first.title }; }
    return res;
  }

