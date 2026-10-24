  /* ---------- render and events ---------- */
  function renderTab() {
    $('#holder3d').appendChild($('#stage3d'));   // keep the WebGL canvas alive across redraws
    var has = st.c.members.length > 0, h;
    $('#landing').hidden = has; $('#work').hidden = !has; if (!has) return;
    h = st.tab === 'review' ? renderReview() : st.tab === 'members' ? renderMembers() : st.tab === 'bbs' ? renderBBS() : st.tab === 'shapes' ? renderShapes() : st.tab === 'cost' ? renderCost() : st.tab === 'rules' ? renderRules() : renderOut();
    $('#tab').innerHTML = h; $('#work').className = 'work tab-' + st.tab;
    [].forEach.call(document.querySelectorAll('#tab .figs'), function (host) { B.FIG.fitFigures(host, host); });   // fit every shape figure inside its sheet
    var slot = $('#slot3d'); if (slot) { slot.appendChild($('#stage3d')); build3D(); }
    markHi();
  }
  /** Light up the picked bar mark in the drawing (the schedule rows and the 3D view do it when they are drawn). */
  function markHi() { var svg = $('#dwg svg'); if (!svg) return; svg.classList.toggle('has-hl', !!st.hi); Array.prototype.forEach.call(svg.querySelectorAll('[data-mark]'), function (n) { n.classList.toggle('hl', n.getAttribute('data-mark') === st.hi); }); }
  function pickMark(mk) { st.hi = st.hi === mk ? null : mk; st.fit3d = false; renderTab(); }
  function refresh() { recalc(); renderTop(); renderSide(); renderTab(); }
  /** Redraw after an edit without losing the field the user has just moved to. */
  function redraw() {
    setTimeout(function () {
      var a = document.activeElement, id = a && a.dataset ? a.dataset.id : undefined;
      renderTop(); renderSide(); renderTab();
      if (id) { var n = document.querySelector('[data-id="' + id + '"]'); if (n) { n.focus(); if (n.select && n.tagName === 'INPUT') n.select(); } }
    }, 0);
  }
  document.addEventListener('change', function (e) {
    var t = e.target, d = t.dataset || {}, s = d.s, k = d.k, p = st.p, m = memSrc(), v = t.value, txt = ['mark', 'name', 'client', 'consultant', 'steel', 'inventory', 'type', 'wasteMode', 'zone', 'standard', 'lengthBy', 'vertStart', 'job', 'dwg', 'prep', 'chk', 'desc', 'shape', 'linkEnds', 'tieHooks', 'fix'].indexOf(k) >= 0;
    if (t.id === 'pick') { st.sel = +t.value; st.hi = null; renderSide(); renderTab(); return; }
    if (d.tog) { st[d.tog] = t.checked; renderTab(); return; }
    if (!s) return;
    if (!txt) { v = v.trim() === '' ? 0 : parseFloat(v); if (!isFinite(v) || v < 0) { t.setAttribute('aria-invalid', 'true'); toast('"' + t.value + '" is not a number.'); return; } }
    if (s === 'pv') { st.p.pres[k] = v; }
    else if (s === 'rb') { st.p.rules.beam[k] = v === 'yes'; }
    else if (s === 'o') { m.manual[+d.i][k] = v; if (k !== 'desc' && k !== 'n') m.manual[+d.i].len = 0; }
    else if (s === 'm') m[k] = v; else if (s === 'v') { m.vert[+d.i][k] = v; if (k === 'zone' && v === 'b') m.vert[+d.i].spc = 0; } else if (s === 'l') m.links[+d.i][k] = v;
    else if (s === 'r') p.rules.wall[k] = v; else if (s === 'q') p.rules.wall.radius[p.standard][k] = v; else if (s === 'ded') p.rules.wall.ded[k] = v; else if (s === 'lv') p.levels[+d.i][k] = v; else if (s === 'p') p[k] = v;
    else if (s === 'c') { if (d.g) p.cost[d.g][k] = v; else p.cost[k] = v; if (k !== 'wasteMode') p.cost.sample = false; }
    st.pristine = false; B.normalise(p); recalc(); redraw();
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var p = st.p, d = b.dataset, a = d.act, n = slug(), m = memSrc(), M = mem();
    if (d.hi) { pickMark(d.hi); return; }
    if (d.zoom) { st.zoom = d.zoom; renderTab(); return; }
    if (d.form) { st.form = d.form; renderTab(); return; }
    if (d.bar2d) { st.bar2d = d.bar2d; renderTab(); return; }
    if (d.size2d) { st.size2d = d.size2d; renderTab(); return; }
    if (d.solid) { st.solid = d.solid === '1'; st.fit3d = false; renderTab(); return; }
    if (d.sel !== undefined) { st.sel = +d.sel; st.hi = null; if (d.go) st.tab = d.go; renderTop(); renderSide(); renderTab(); if (d.go) window.scrollTo(0, 0); return; }
    if (d.tab) { st.tab = d.tab; renderTop(); renderTab(); window.scrollTo(0, 0); return; }
    if (d.view) { st.view = d.view; renderTab(); return; }
    if (d.m3) { st.mode3 = d.m3; renderTab(); return; }
    if (!a) return;
    if (a === 'import') pick('.xlsx,.xls,.xlsm', importWorkbook);
    else if (a === 'open') pick('.json', openProject);
    else if (a === 'sample') { st.p = B.normalise(B.newProject()); st.pristine = false; st.tab = 'members'; st.sel = 0; refresh(); }
    else if (a === 'addm') {
      var li = M ? M.li : 0, lv = p.levels[li], used = {}, i = 1; lv.members.forEach(function (x) { used[x.mark] = 1; }); while (used['SW' + i]) i++;
      lv.members.push(B.newMember('SW' + i)); st.pristine = false; recalc();
      st.c.members.forEach(function (q, qi) { if (q.li === li && q.mi === lv.members.length - 1) st.sel = qi; }); st.tab = 'members'; refresh();
    }
    else if (a === 'dupm' && m) { var cp = JSON.parse(JSON.stringify(m)); cp.mark = m.mark + ' copy'; delete cp.guid; p.levels[M.li].members.splice(M.mi + 1, 0, cp); recalc(); st.sel = st.sel + 1; refresh(); }
    else if (a === 'delm' && m) ask('Delete ' + (m.mark || 'this member') + '?', '<p>Its bars leave the schedule, the BOQ and the cost.</p>', [{ v: 'yes', t: 'Delete member' }, { v: 'cancel', t: 'Keep it' }]).then(function (v) { if (v !== 'yes') return; p.levels[M.li].members.splice(M.mi, 1); refresh(); });
    else if (a === 'addv' && m) { m.vert.push({ n: 8, dia: 12, zone: 'w', spc: 0 }); refresh(); }
    else if (a === 'delv' && m) { m.vert.splice(+d.i, 1); refresh(); }
    else if (a === 'addl' && m) { m.links.push({ type: 'gen', per: 4, spc: 200, dia: 8, A: 0 }); refresh(); }
    else if (a === 'dell' && m) { m.links.splice(+d.i, 1); refresh(); }
    else if (a === 'addo' && m) { m.manual.push({ desc: 'U-bar', shape: '21', n: 2, dia: 12, len: 0, A: 300, B: 1000, C: 300, D: 0, E: 0, hook: 0 }); refresh(); }
    else if (a === 'delo' && m) { m.manual.splice(+d.i, 1); refresh(); }
    else if (a === 'x-pdf-std' || a === 'x-pdf-full' || a === 'x-pdf-cost') { var kind = a.slice(6), r0 = B.pdfReport(p, st.c, st.K, kind, today()); saveFile(n + (kind === 'std' ? '_BBS_standard_form' : kind === 'full' ? '_BBS_full_data' : '_BOQ_and_cost') + '.pdf', pdfBlob(r0.text), 'application/pdf').then(function () { toast('PDF written: ' + r0.pages + ' A4 page' + (r0.pages === 1 ? '' : 's') + (r0.landscape ? ', landscape' : ', portrait') + '.'); }); }
    else if (a === 'x-pdf-dwg') { var rd = B.pdfDrawings(p, st.c, drawMode(), today()); saveFile(n + '_shop_drawings.pdf', pdfBlob(rd.text), 'application/pdf').then(function () { toast('PDF written: ' + rd.pages + ' A3 sheet' + (rd.pages === 1 ? '' : 's') + '.'); }); }
    else if (a === 'x-xlsx') { if (window.XLSX) saveFile(n + '_BBS.xlsx', workbook()); else toast('The Excel library did not load.'); }
    else if (a === 'x-csv') saveFile(n + '_BBS.csv', B.csv(B.bbsAOA(st.p, st.c)), 'text/csv');
    else if (a === 'x-html') saveFile(n + '_report.html', reportHTML(), 'text/html');
    else if (a === 'x-json') saveFile(n + '_project.json', JSON.stringify(p, null, 1), 'application/json');
    else if (a === 'x-ifc') { var r = B.toIFC(p, st.c, today()); saveFile(n + '_model.ifc', r.text, 'application/x-step').then(function () { toast('IFC written: ' + r.stats.walls + ' walls, ' + r.stats.formwork + ' formwork panels, ' + n0(r.stats.bars) + ' bars.'); }); }
    else if (a === 'x-dxf') { if (!window.JSZip) { toast('The zip library did not load.'); return; } var z = new window.JSZip(), cnt = dxfZip(z); z.generateAsync({ type: 'blob', compression: 'DEFLATE' }).then(function (bl) { return saveFile(n + '_shop_drawings.zip', bl, 'application/zip'); }).then(function () { toast(cnt + ' drawing sheets saved.'); }); }
    else if (a === 'x-all') exportAll();
    else if (a === 'theme') { var cur = document.documentElement.getAttribute('data-theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'), nx = cur === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', nx); try { localStorage.setItem(THEME_KEY, nx); } catch (er) { /* storage unavailable */ } renderTab(); }
    else if (a === 'about') ask('BBS Studio v' + B.VERSION, $('#about').innerHTML, [{ v: 'ok', t: 'Close' }]);
    else if (a === 'new') ask('Start again?', '<p>The current project is cleared from this browser. Save the project file first if you need it again.</p>', [{ v: 'yes', t: 'Clear and start again' }, { v: 'cancel', t: 'Cancel' }]).then(function (v) { if (v !== 'yes') return; try { localStorage.removeItem(KEY); } catch (er) { /* storage unavailable */ } st.p = B.normalise(B.newProject()); st.p.levels[0].members = []; st.pristine = true; st.tab = 'review'; refresh(); });
  });
  // picking a bar: in the drawing, or a row of the schedule
  document.addEventListener('click', function (e) {
    var n = e.target.closest ? e.target.closest('#dwg [data-mark]') : null; if (n) { pickMark(n.getAttribute('data-mark')); return; }
    var r = e.target.closest ? e.target.closest('table.bbs tr[data-hi]') : null;
    if (r) { st.hi = st.hi === r.dataset.hi ? null : r.dataset.hi; var first = null; st.c.rows.forEach(function (x) { if (!first && x.mark === st.hi) first = x; }); if (first && !st.c.members[st.sel].bars.some(function (b) { return b.mark === st.hi; })) st.c.members.forEach(function (M, i) { if (M.id === first.id) st.sel = i; }); renderSide(); renderTab(); }
  });
  // drag and drop anywhere on the page
  ['dragenter', 'dragover'].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); document.body.classList.add('drag'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); if (ev === 'drop' || e.target === document.documentElement || !e.relatedTarget) document.body.classList.remove('drag'); }); });
  document.addEventListener('drop', function (e) { var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (!f) return; if (/\.json$/i.test(f.name)) openProject(f); else importWorkbook(f); });

