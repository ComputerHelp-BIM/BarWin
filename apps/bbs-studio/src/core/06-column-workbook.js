  /* ---------- reading the user's "COLUMN STEEL QTY" workbook layout ---------- */
  /**
   * book = { sheetName: rows }, rows = arrays of cell values (formula results), 0-based.
   * A member block starts where column J says "Member"; the next row carries no., height, length, width.
   * Bar rows are recognised by their shape code in column D and their description in column C.
   */
  function importColumnBook(book, names) {
    var res = { levels: [], rules: null, errors: [], notes: [], found: false, workbookKg: 0, meta: {} };
    function cell(rows, r, c) { var row = rows[r]; var v = row ? row[c] : undefined; return v === undefined || v === null ? '' : v; }
    var F = book.FORMULA;
    if (F) {
      var R = wallRules(), r;
      for (r = 0; r < F.length; r++) {
        var lab = String(cell(F, r, 4)).toUpperCase(), val = num(cell(F, r, 5), NaN);
        if (!isNaN(val)) { if (/^LAP/.test(lab)) R.lap = val; else if (/^HOOK/.test(lab)) R.hook = val; else if (/COL COVER/.test(lab)) R.cover = val; }
        var sc = String(cell(F, r, 1)).trim(), dv = cell(F, r, 2);
        if (r >= 12 && r <= 30 && sc !== '' && typeof dv === 'number' && /^\d+A?$/.test(sc) && Math.abs(dv) <= 20) R.ded[sc] = Math.abs(dv);
      }
      res.rules = R; res.notes.push('Rules read from the FORMULA sheet: lap ' + R.lap + 'd, hook ' + R.hook + 'd, cover ' + R.cover + ' mm.');
    }
    var order = names || Object.keys(book), used = {};
    order.forEach(function (name) {
      var rows = book[name]; if (!rows || name === 'FORMULA') return;
      var base = name.replace(/\s+(PRO|BLUEPRINT)$/i, '').trim();
      var heads = []; rows.forEach(function (row, r) { if (row && String(row[9] || '').trim() === 'Member') heads.push(r); });
      if (!heads.length) return;
      if (used[base]) { res.notes.push('Sheet "' + name + '" repeats "' + base + '" in another style and was skipped.'); return; }
      used[base] = 1; res.found = true;
      var lv = { name: base, H: num(cell(rows, 1, 26), 0), Hnext: num(cell(rows, 2, 26), 0), members: [] };
      if (!res.meta.project) { res.meta.consultant = String(cell(rows, 0, 9)); res.meta.client = String(cell(rows, 1, 9)); res.meta.project = String(cell(rows, 2, 9)); res.meta.title = String(cell(rows, 3, 9)); }
      heads.forEach(function (h, hi) {
        var end = hi + 1 < heads.length ? heads[hi + 1] : rows.length, m = newMember(String(cell(rows, h, 1)).trim());
        m.vert = []; m.links = []; m.manual = [];
        m.qty = Math.max(1, Math.round(num(cell(rows, h + 1, 9), 1))); m.H = num(cell(rows, h + 1, 10)); m.L = num(cell(rows, h + 1, 11)); m.W = num(cell(rows, h + 1, 12)); m.extra = num(cell(rows, h + 1, 13));
        if (!lv.H) lv.H = m.H; if (m.H === lv.H) m.H = 0;
        for (var r = h + 2; r < end; r++) {
          var shape = String(cell(rows, r, 3)).trim(), desc = String(cell(rows, r, 2)).trim(), dia = num(cell(rows, r, 12));
          if (/length according to diameter/i.test(String(cell(rows, r, 13)))) break;
          if (shape === '' || !dia) continue;
          var per = num(cell(rows, r, 9)), n = num(cell(rows, r, 10)), spc = num(cell(rows, r, 11));
          if (shape === '26' && /ver/i.test(desc)) m.vert.push({ n: n, dia: dia, zone: '', spc: 0 });
          else if (/box ring/i.test(desc)) m.links.push({ type: 'box', per: per, spc: spc, dia: dia, A: num(cell(rows, r, 15)) });
          else if (/confining hook/i.test(desc)) m.links.push({ type: 'conf', per: per, spc: spc, dia: dia });
          else if (/master ring/i.test(desc)) m.links.push({ type: 'master', per: per, spc: spc, dia: dia });
          else if (/general hook/i.test(desc)) m.links.push({ type: 'gen', per: per, spc: spc, dia: dia });
          else { m.manual.push({ desc: desc || 'Bar', shape: shape, n: n, dia: dia, len: num(cell(rows, r, 13)) * 1000, A: num(cell(rows, r, 15)), B: num(cell(rows, r, 16)), C: num(cell(rows, r, 17)), D: num(cell(rows, r, 18)), E: num(cell(rows, r, 19)), hook: num(cell(rows, r, 20)) });
            res.notes.push(m.mark + ': "' + desc + '" (shape ' + shape + ') is not a known pattern and was kept as a manual bar row.'); }
        }
        lv.members.push(m);
      });
      if (!lv.Hnext) lv.Hnext = lv.H;
      // the sheet's own total, to prove the engine against it
      rows.forEach(function (row) { if (row && /total steel \(kg\)/i.test(String(row[13] || ''))) res.workbookKg += num(row[22]); });
      res.levels.push(lv);
    });
    return res;
  }

