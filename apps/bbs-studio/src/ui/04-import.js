  /* ---------- import ---------- */
  function gridOf(ws) { var X = window.XLSX, r = X.utils.decode_range(ws['!ref'] || 'A1'); return X.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: true, range: { s: { r: 0, c: 0 }, e: r.e } }); }
  function importWorkbook(file) {
    if (!window.XLSX) { toast('The Excel library did not load, so workbooks cannot be read.'); return; }
    file.arrayBuffer().then(function (buf) {
      var wb = window.XLSX.read(buf, { type: 'array' }), book = {}; wb.SheetNames.forEach(function (n) { book[n] = gridOf(wb.Sheets[n]); });
      var res = B.importColumnBook(book, wb.SheetNames);
      if (!res.found) { var bres = B.importBeamBook(book, wb.SheetNames); if (bres.found) return importBeams(file, book, wb.SheetNames, bres); }
      if (!res.found) {
        var flat = JSON.stringify(book).slice(0, 400000);
        toast(/Left Supp|BBS DETAIL OF BEAM/i.test(flat) ? 'This looks like a beam workbook, but no sheet has the expected header row ("Sl. No.", then spans marked "Left Supp").' :
          /CANT\. MAIN TOP|END ABU BAR|X-DIRECTION/i.test(flat) ? 'This is a slab workbook. Slabs follow beams; this version reads the wall and the beam workbooks.' : 'No member blocks found. This version reads the column and wall steel-quantity layout (a "Member" header per block).');
        return;
      }
      var count = res.levels.reduce(function (a, l) { return a + l.members.length; }, 0);
      function apply(mode) {
        var p = mode === 'add' ? st.p : B.newProject();
        if (mode !== 'add') { p.levels = []; p.cost = st.p ? st.p.cost : p.cost; }
        p.levels = p.levels.concat(res.levels); if (res.rules) p.rules.wall = Object.assign(B.wallRules(), res.rules);
        if (res.meta.project) { p.name = res.meta.project; p.client = res.meta.client; p.consultant = res.meta.consultant; p.title = res.meta.title; }
        p.source = { file: file.name, kg: res.workbookKg, notes: res.notes, when: today(), added: mode === 'add' };
        st.p = B.normalise(p); st.sel = 0; st.tab = 'review'; st.pristine = false; refresh();
      }
      if (st.pristine || !st.p) { apply('replace'); return; }
      return ask('Import ' + file.name, '<p>Found ' + count + ' wall type' + (count === 1 ? '' : 's') + ' on ' + res.levels.length + ' sheet' + (res.levels.length === 1 ? '' : 's') + '.</p>',
        [{ v: 'replace', t: 'Replace the current project' }, { v: 'add', t: 'Add as more levels' }, { v: 'cancel', t: 'Cancel' }]).then(function (v) { if (v !== 'cancel') apply(v); });
    }).catch(function () { toast('That file could not be read as an Excel workbook.'); });
  }
  /**
   * A beam workbook usually holds one sheet per floor, sometimes for more than one job, and often spare copies of a sheet.
   * So the sheets are listed with what was read from each and whether it agrees with the sheet's own total, and the user picks which to load.
   */
  function importBeams(file, book, names, bres) {
    var body = '<p>Each sheet was read and recalculated row by row. Tick the floors that belong to this project.</p><div class="scroll"><table class="data"><thead><tr><th></th><th>Sheet</th><th>Beams</th><th>Bar rows</th><th>Sheet says (t)</th><th>Read (t)</th><th>Slips</th></tr></thead><tbody>' +
      bres.sheets.map(function (s, i) { return '<tr><td><input type="checkbox" id="bs' + i + '" data-sheet="' + esc(s.name) + '"' + (s.copyOf ? '' : ' checked') + '></td><td class="l"><label for="bs' + i + '">' + esc(s.name.trim()) + (s.copyOf ? ' <em>(copy of ' + esc(s.copyOf) + ')</em>' : '') + '<br><small>' + esc(s.project) + '</small></label></td><td>' + s.members.length + '</td><td>' + s.rows + '</td><td>' + (s.statedT === null ? '' : s.statedT.toFixed(3)) + '</td><td>' + (s.kg / 1000).toFixed(3) + (s.match ? ' \u2713' : s.match === false ? ' differs' : '') + '</td><td>' + (s.issues.length || '') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    var btns = st.pristine || !st.p ? [{ v: 'replace', t: 'Load the ticked sheets' }, { v: 'cancel', t: 'Cancel' }] : [{ v: 'replace', t: 'Replace the current project' }, { v: 'add', t: 'Add to the current project' }, { v: 'cancel', t: 'Cancel' }];
    return ask('Beam workbook: ' + file.name, body, btns).then(function (mode) {
      if (mode === 'cancel') return;
      var pickd = [].slice.call($('#dlg').querySelectorAll('input[data-sheet]')).filter(function (x) { return x.checked; }).map(function (x) { return x.dataset.sheet; });
      if (!pickd.length) { toast('No sheet was ticked, so nothing was loaded.'); return; }
      var res = B.importBeamBook(book, names, { sheets: pickd }), p = mode === 'add' ? st.p : B.newProject(), notes = [], slips = [], kgFix = 0;
      if (mode !== 'add') { p.levels = []; p.cost = st.p ? st.p.cost : p.cost; if (res.meta.name) { p.name = res.meta.name; p.title = res.meta.title; } }
      p.levels = p.levels.concat(res.levels); p.rules.beam = Object.assign({ fix: false }, p.rules.beam || {}, { uw: res.rules.uw });
      res.sheets.forEach(function (s) { if (!s.loaded) return; notes.push(s.name.trim() + ': ' + s.members.length + ' beams, ' + s.rows + ' bar rows, ' + n2(s.kg) + ' kg' + (s.match ? ', which is the sheet\u2019s own total.' : '.')); slips = slips.concat(s.issues.map(function (i) { return Object.assign({ sheet: s.name.trim() }, i); })); kgFix += s.kgFix - s.kg; });
      if (slips.length) notes.push(slips.length + ' slip' + (slips.length === 1 ? '' : 's') + ' found in the workbook, listed below. They are kept as the workbook has them so the totals agree. Correcting them would change the steel by ' + (kgFix >= 0 ? '+' : '') + n2(kgFix) + ' kg; turn that on under Rules.');
      notes.push('Beams have a schedule, steel by size, BOQ, cost and PDFs. Beam drawings, 3D and IFC are the next step.');
      p.source = { file: file.name, kg: (mode === 'add' && st.p.source ? st.p.source.kg : 0) + res.workbookKg, notes: notes, when: today(), added: mode === 'add', slips: slips };
      st.p = B.normalise(p); st.sel = 0; st.tab = 'review'; st.pristine = false; refresh();
    });
  }
  function openProject(file) {
    file.text().then(function (t) { var p = JSON.parse(t); p = upgrade(p); if (!p) throw new Error('x'); st.p = B.normalise(p); st.sel = 0; st.pristine = false; refresh(); toast('Opened ' + file.name + '.'); })
      .catch(function () { toast('That is not a BBS Studio project file from version 0.5 or later.'); });
  }
  function pick(accept, cb) { var i = $('#file'); i.value = ''; i.accept = accept; i.onchange = function () { if (i.files && i.files[0]) cb(i.files[0]); }; i.click(); }

