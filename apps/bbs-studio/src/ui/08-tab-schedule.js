  /* ---------- tab: schedule ---------- */
  function renderBBS() {
    var c = st.c, M = mem(), rows = st.onlySel && M ? c.rows.filter(function (r) { return r.id === M.id; }) : c.rows, cols = B.bbsCols(st.p), p = st.p, S = st.plan, R = p.rules.wall;
    var body = rows.map(function (r) { return '<tr data-hi="' + r.mark + '" class="' + (r.mark === st.hi ? 'hi ' : '') + (M && r.id === M.id ? 'on' : '') + '">' + cols.map(function (k) { var v = k.v(r); return '<td' + (k.x ? ' class="x2"' : '') + '>' + esc(typeof v === 'number' ? v.toLocaleString('en-IN', { maximumFractionDigits: 3 }) : v) + '</td>'; }).join('') + '</tr>'; }).join('');
    var plan = S.groups.map(function (g) {
      return '<div class="cut"><h3>' + B.STDS[p.standard].prefix + g.dia + '</h3><p class="cut-s"><span><b>' + g.newBars + '</b> new ' + (p.stock / 1000) + ' m bars</span><span><b>' + g.offcutsUsed + '</b> yard offcuts used</span><span><b>' + n2(g.wastePct) + '%</b> scrap (' + n2(g.scrapKg) + ' kg)</span><span>' + g.reusable.length + ' offcuts kept</span></p><ul>' +
        g.patterns.slice(0, 12).map(function (t) { return '<li><span class="cnt">' + t.count + ' x</span><span class="bar"><i style="width:' + ((t.len - t.left) / t.len * 100).toFixed(1) + '%"></i>' + (t.left >= p.minOffcut ? '<b style="width:' + (t.left / t.len * 100).toFixed(1) + '%"></b>' : '') + '</span><span>' + esc(t.desc) + ', left ' + Math.round(t.left) + '</span></li>'; }).join('') +
        (g.patterns.length > 12 ? '<li class="more">and ' + (g.patterns.length - 12) + ' more patterns in the Excel download</li>' : '') + '</ul></div>';
    }).join('');
    var std = B.stdFormAOA(p, c, rows), notes = B.stdFormNotes(p), ri = -1, shown = rows.length;
    var stdBody = std.slice(1).map(function (r) { if (!r.length) return '<tr class="gap"><td colspan="14"></td></tr>'; ri++; var src = rows[ri];
      return '<tr data-hi="' + src.mark + '" class="' + (src.mark === st.hi ? 'hi' : '') + '">' + r.map(function (v, k) { return '<td' + (k === 0 ? ' class="l mem"' : '') + '>' + esc(v) + '</td>'; }).join('') + '</tr>'; }).join('');
    var head = '<table class="cads-h"><tbody><tr><td rowspan="2" class="logo">' + esc(p.consultant || 'BBS Studio') + '</td><td>Client: <b>' + esc(p.client) + '</b></td><td>Prep. by: <b>' + esc(p.prep) + '</b></td><td>Dwg no.: <b>' + esc(p.dwg) + '</b></td></tr>' +
      '<tr><td>Site ref: <b>' + esc(p.name) + '</b></td><td>Chk\'d by: <b>' + esc(p.chk) + '</b></td><td>Job no.: <b>' + esc(p.job) + '</b></td></tr></tbody></table>';
    return '<section class="card"><div class="card-h"><h2>Bar bending schedule</h2><div class="row-btns"><div class="seg"><button data-form="std" aria-pressed="' + (st.form === 'std') + '">Standard form</button><button data-form="full" aria-pressed="' + (st.form === 'full') + '">Full data</button></div>' +
      '<label class="chk"><input type="checkbox" data-tog="onlySel"' + (st.onlySel ? ' checked' : '') + '> Only ' + esc(M ? M.mark : 'selected member') + '</label><button data-act="' + (st.form === 'std' ? 'x-pdf-std' : 'x-pdf-full') + '">Download PDF</button></div></div>' +
      (st.form === 'std' ? head + '<div class="scroll tall"><table class="data bbs cads"><thead><tr>' + std[0].map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + stdBody + '</tbody></table></div>' +
        notes.map(function (n) { return '<p class="hint">' + esc(n) + '</p>'; }).join('') + '<p class="hint">' + shown + ' rows. This is the layout of your CADS RC schedule sheet. Fill the header fields under Rules. Click a row to pick that bar mark everywhere.</p></section>' :
      '<div class="scroll tall"><table class="data bbs"><thead><tr>' + cols.map(function (k) { return '<th' + (k.x ? ' class="x2"' : '') + '>' + k.h + '</th>'; }).join('') + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      '<p class="hint">Length is by <strong>' + (R.lengthBy === 'standard' ? B.STDS[p.standard].name : 'the workbook method') + '</strong>. The last three columns show all three methods side by side. Click a row to pick that bar mark everywhere.</p></section>') +
      '<section class="card"><h2>Steel by bar size</h2>' + table(B.byDiaAOA(p, c)) + '</section>' +
      '<details class="card"><summary>Cutting plan from ' + (p.stock / 1000) + ' m stock: ' + S.total.newBars + ' bars, ' + n2(S.total.wastePct) + '% scrap</summary><p class="hint">Red is cut pieces, yellow is an offcut worth keeping (longer than ' + p.minOffcut + ' mm), hatching is scrap. Best-fit heuristic, not a proven minimum. Kept offcuts are not counted as scrap.</p>' + plan + '</details>';
  }

