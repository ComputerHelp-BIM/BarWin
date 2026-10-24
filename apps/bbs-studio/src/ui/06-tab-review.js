  /* ---------- tab: review ---------- */
  function sourceBanner() {
    var s = st.p.source, T = st.c.total, R = st.p.rules.wall, S = B.STDS[st.p.standard]; if (!s) return '';
    var diff = st.kgWb - s.kg, ok = Math.abs(diff) < 0.5 && !s.added, dStd = st.kgStd - st.kgWb;
    return '<section class="card ' + (ok ? 'good' : 'note') + '"><h2>' + (ok ? 'Matches your workbook' : 'Imported from your workbook') + '</h2><p>' + esc(s.file) + ' says <strong>' + n2(s.kg) + ' kg</strong>. By the workbook\'s own method this app gets <strong>' + n2(st.kgWb) + ' kg</strong> from the typed inputs alone' +
      (ok ? ', a difference of ' + n2(Math.abs(diff)) + ' kg.' : s.added ? '. The project now holds more than that one workbook.' : ', ' + n2(Math.abs(diff)) + ' kg ' + (diff > 0 ? 'more' : 'less') + ', because inputs or rules were changed after import.') + '</p>' +
      '<p>By ' + S.name + ' the same bars come to <strong>' + n2(st.kgStd) + ' kg</strong> (' + (dStd >= 0 ? '+' : '') + n2(dStd / (st.kgWb || 1) * 100) + '%). The schedule, weights and cost currently use <strong>' + (R.lengthBy === 'standard' ? S.name : 'the workbook method') + '</strong>; change that under Rules.</p>' +
      (s.notes && s.notes.length ? '<ul class="notes">' + s.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' : '') +
      (s.slips && s.slips.length ? '<details><summary>' + s.slips.length + ' slips in the workbook</summary>' + table([['Sheet', 'Row', 'Beam', 'Bar', 'What', 'Workbook has', 'Should be', 'Effect (kg)']].concat(s.slips.map(function (i) { return [i.sheet, i.row, i.member, i.desc, i.kind === 'length' ? 'Length is not the sum of its legs' : i.kind === 'count' ? 'Number typed over the formula' : 'Negative number of bars', i.wb, i.calc, (i.kg >= 0 ? '+' : '') + n2(i.kg)]; }))) + '</details>' : '') + '</section>';
  }
  function chart(rows, unit) {
    var max = Math.max.apply(null, rows.map(function (r) { return r[1]; }).concat([1e-9]));
    return rows.map(function (r) { return '<div class="cr"><span>' + esc(r[0]) + '</span><span class="cb"><i style="width:' + (r[1] / max * 100).toFixed(1) + '%"></i></span><span class="cv">' + n0(r[1]) + ' ' + unit + '</span></div>'; }).join('');
  }
  function renderReview() {
    var c = st.c, K = st.K, w = c.warnings, T = c.total;
    var checks = w.length ? '<ul class="warns">' + w.map(function (x) { return '<li class="' + x.level + '"><strong>' + esc(x.member) + '</strong> ' + esc(x.text) + '</li>'; }).join('') + '</ul>' : '<p class="ok">No problems found in ' + c.members.length + ' member types.</p>';
    var dias = Object.keys(c.byDia).map(Number).sort(function (a, b) { return a - b; });
    var rows = c.members.map(function (m, i) { var pm = K.perMember[i]; return '<tr data-sel="' + i + '" class="' + (i === st.sel ? 'on' : '') + '"><td><button class="lk" data-sel="' + i + '" data-go="members">' + esc(m.mark) + '</button></td><td>' + m.L + ' x ' + m.W + ' x ' + m.H + '</td><td>' + m.qty + '</td><td>' + n2(m.wt) + '</td><td>' + n0(m.kgm3) + '</td><td>' + n3(m.conc) + '</td><td>' + n2(m.form) + '</td><td>' + n0(pm.amount) + '</td></tr>'; }).join('');
    return sourceBanner() +
      '<section class="card"><h2>Checks</h2>' + checks + '</section>' +
      '<section class="card"><h2>Quantities</h2><dl class="stats"><div><dt>Members</dt><dd>' + T.members + '</dd></div><div><dt>Steel</dt><dd>' + n2(T.wt) + ' kg</dd></div><div><dt>Concrete</dt><dd>' + n2(T.conc) + ' m\u00B3</dd></div>' +
      '<div><dt>Formwork</dt><dd>' + n2(T.form) + ' m\u00B2</dd></div><div><dt>Steel per concrete</dt><dd>' + (T.conc ? n0(T.wt / T.conc) : 0) + ' kg/m\u00B3</dd></div><div><dt>Estimate with GST</dt><dd>' + money(K.total) + '</dd></div></dl>' +
      '<h3>Steel by bar size</h3>' + chart(dias.map(function (d) { return [B.STDS[st.p.standard].prefix + d, c.byDia[d].wt]; }), 'kg') + '</section>' +
      '<section class="card"><h2>Member types</h2><p class="hint">Pick a mark to open its inputs, drawing and 3D.</p><div class="scroll"><table class="data"><thead><tr><th>Mark</th><th>Size (mm)</th><th>No.</th><th>Steel (kg)</th><th>kg/m\u00B3</th><th>Concrete (m\u00B3)</th><th>Formwork (m\u00B2)</th><th>Cost (\u20B9)</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>';
  }

