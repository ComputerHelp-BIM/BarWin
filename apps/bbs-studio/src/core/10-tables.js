  /* ---------- tables (screen, CSV, XLSX, DXF) ---------- */
  function bbsCols(p) {
    var S = STDS[p.standard], R = p.rules.wall, gov = R.lengthBy === 'standard' ? S.name : 'workbook method';
    return [
      { h: 'Member', w: 9, v: function (r) { return r.member; } }, { h: 'Bar mark', w: 5, v: function (r) { return r.mark; } }, { h: 'Description', w: 9, v: function (r) { return r.desc; } },
      { h: 'Type and size', w: 6, v: function (r) { return S.prefix + r.dia; } }, { h: 'No. of mbrs', w: 5, v: function (r) { return r.qty; } }, { h: 'No. in each', w: 5, v: function (r) { return r.n; } },
      { h: 'Total no.', w: 5, v: function (r) { return r.total; } }, { h: 'Length (mm)', w: 6, v: function (r) { return r3(r.len); } }, { h: 'Shape code', w: 5, v: function (r) { return r.shape; } },
      { h: 'A', w: 5, v: function (r) { return r.dims.A || ''; } }, { h: 'B', w: 5, v: function (r) { return r.dims.B || ''; } }, { h: 'C', w: 5, v: function (r) { return r.dims.C || ''; } },
      { h: 'D', w: 5, v: function (r) { return r.dims.D || ''; } }, { h: 'E/R', w: 4, v: function (r) { return r.dims.E || ''; } }, { h: 'Former dia', w: 5, v: function (r) { return r.former || ''; } },
      { h: 'Spacing', w: 5, v: function (r) { return r.spc || ''; } }, { h: 'Total length (m)', w: 7, v: function (r) { return r2(r.totLen); } }, { h: 'Weight (kg)', w: 6, v: function (r) { return r2(r.wt); } },
      { h: 'Workbook length', w: 7, v: function (r) { return r3(r.lens.wb); }, x: 1 }, { h: STDS[p.standard].name.split(' ')[0] + ' length', w: 6, v: function (r) { return r3(r.lens.std); }, x: 1 }, { h: 'Centre-line', w: 6, v: function (r) { return Math.round(r.lens.cl); }, x: 1 }
    ];
  }
  function bbsAOA(p, c, rows, plain) { var cols = bbsCols(p).filter(function (k) { return !plain || !k.x; }), out = [cols.map(function (k) { return k.h; })]; (rows || c.rows).forEach(function (r) { out.push(cols.map(function (k) { return k.v(r); })); }); return out; }
  var STD_FORM = [['Member', 9], ['Bar mark', 5], ['Type & size', 5], ['No. of mbrs', 5], ['No. of bars in each', 6], ['Total no.', 5], ['Length of each bar (mm) +', 8], ['Shape code', 5], ['A *', 6], ['B *', 6], ['C *', 6], ['D *', 6], ['E/R *', 5], ['Rev letter', 4]];
  /**
   * The schedule in the form of BS 8666 / a CADS RC sheet: member named once per block, a blank row between members,
   * dimensions in multiples of 5 mm, the run-out dimension in brackets.
   */
  function stdFormAOA(p, c, rows) {
    var S = STDS[p.standard], out = [STD_FORM.map(function (k) { return k[0]; })], last = null;
    (rows || c.rows).forEach(function (r) {
      if (last !== null && r.id !== last) out.push([]);
      function dim(k) { var v = r.dims[k]; if (!v) return ''; v = Math.round(v / 5) * 5; return (RUNOUT[r.shape] || []).indexOf(k) >= 0 ? '(' + v + ')' : v; }
      out.push([r.id !== last ? r.member : '', r.mark, S.prefix + r.dia, r.qty, r.n, r.total, r3(r.len), r.shape, dim('A'), dim('B'), dim('C'), dim('D'), dim('E'), '']);
      last = r.id;
    });
    return out;
  }
  function stdFormNotes(p) {
    var S = STDS[p.standard], R = p.rules.wall;
    return [R.lengthBy === 'standard' ? 'This schedule conforms to ' + S.name + '.' : 'Lengths are by the workbook method, not ' + S.name + '. Switch "Cut lengths by" under Rules for a conforming schedule.',
      '* Specified in multiples of 5 mm.' + (R.lengthBy === 'standard' ? '   + Specified in multiples of ' + S.round + ' mm.' : ''), 'Bends formed to ' + S.name + ' former diameters. Shape 99 is a cross tie with one 135 degree and one 90 degree hook.'];
  }
  function byDiaAOA(p, c) {
    var out = [['Bar size', 'No. of bars', 'Total length (m)', 'kg/m', 'Weight (kg)']];
    Object.keys(c.byDia).map(Number).sort(function (a, b) { return a - b; }).forEach(function (d) { var a = c.byDia[d]; out.push([STDS[p.standard].prefix + d, a.bars, r2(a.len), r3(unitWt(p.rules.wall, d)), r2(a.wt)]); });
    out.push(['Total', '', '', '', r2(c.total.wt)]); return out;
  }
  function boqAOA(c) {
    var out = [['Level', 'Member', 'No.', 'Length (mm)', 'Width (mm)', 'Height (mm)', 'Concrete (m3)', 'Formwork (m2)', 'Steel (kg)', 'Steel (kg/m3)']];
    c.members.forEach(function (m) { out.push([m.level, m.mark, m.qty, m.L, m.W, m.H, r3(m.conc), r2(m.form), r2(m.wt), Math.round(m.kgm3)]); });
    out.push(['Total', '', c.total.members, '', '', '', r3(c.total.conc), r2(c.total.form), r2(c.total.wt), c.total.conc ? Math.round(c.total.wt / c.total.conc) : '']); return out;
  }
  function costAOA(K) {
    var out = [['Item', 'Unit', 'Quantity', 'Rate', 'Amount']];
    K.items.forEach(function (i) { out.push([i.name, i.unit, r3(i.qty), r2(i.rate), r2(i.amount)]); });
    out.push(['Sub-total', '', '', '', r2(K.sub)], ['GST', '', '', '', r2(K.gst)], ['Total', '', '', '', r2(K.total)], []);
    out.push(['Rate analysis', 'Unit', 'Component', 'Amount per unit', '']);
    K.items.forEach(function (i) {
      i.lines.forEach(function (l) { out.push([i.name, i.unit, l.label, r2(l.amount), '']); });
      out.push([i.name, i.unit, 'Overheads', r2(i.oh), ''], [i.name, i.unit, 'Profit', r2(i.profit), ''], [i.name, i.unit, 'Rate', r2(i.rate), ''], []);
    });
    return out;
  }
  function planAOA(plan) {
    var out = [['Bar size', 'Source', 'Bar length (mm)', 'No. of bars', 'Cut pattern', 'Left over (mm)']];
    plan.groups.forEach(function (g) {
      g.patterns.forEach(function (t) { out.push(['T' + g.dia, t.src === 'new' ? 'New stock' : 'Yard offcut', t.len, t.count, t.desc, Math.round(t.left)]); });
      out.push(['T' + g.dia + ' total', g.newBars + ' new + ' + g.offcutsUsed + ' offcuts', '', '', 'Issued ' + r2(g.kg) + ' kg, scrap ' + r2(g.wastePct) + '%', Math.round(g.scrap)]);
    });
    return out;
  }
  function inputAOA(p) {
    var out = [['Level', 'Mark', 'No.', 'Height', 'Length', 'Width', 'Vertical bars (b = boundary, w = web)', 'Box rings', 'Confining ties', 'Master ring', 'General ties']];
    p.levels.forEach(function (lv) { lv.members.forEach(function (m) {
      if (m.type === 'beam') { out.push([lv.name, m.mark, m.qty, m.H, m.L, m.W, 'Beam: ' + m.bars.length + ' bar sets, ' + m.spans.length + ' span' + (m.spans.length === 1 ? '' : 's'), '', '', '', '']); return; }
      function lk(t) { return m.links.filter(function (l) { return l.type === t; }).map(function (l) { return l.per + ' x T' + l.dia + ' @ ' + l.spc + (t === 'box' ? ' A=' + l.A : ''); }).join('; '); }
      out.push([lv.name, m.mark, m.qty, m.H || lv.H, m.L, m.W, m.vert.map(function (v) { return v.n + '-T' + v.dia + ' ' + v.zone; }).join(', '), lk('box'), lk('conf'), lk('master'), lk('gen')]);
    }); });
    return out;
  }
  function csv(aoa) {
    return aoa.map(function (row) { return row.map(function (v) { v = String(v === undefined || v === null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\r\n') + '\r\n';
  }

