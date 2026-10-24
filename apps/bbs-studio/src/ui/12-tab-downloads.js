  /* ---------- tab: downloads ---------- */
  function renderOut() {
    var c = st.c, errs = c.warnings.filter(function (w) { return w.level === 'error'; }).length, n = c.members.filter(function (m) { return m.L > 0 && m.W > 0; }).length;
    var rows = [
      ['x-all', 'Everything in one zip', 'The four PDFs, workbook, CSV, all shop drawings, IFC model, HTML report and the project file.', 'Download everything', 1],
      ['x-pdf-std', 'Schedule, standard form (PDF)', 'A4 portrait, laid out like your CADS RC schedule sheet, with the header block, notes and page numbers. Every column fits the page width.', 'Download PDF'],
      ['x-pdf-full', 'Schedule, full data (PDF)', 'A4 landscape: every column, including the three lengths, weights and former diameters, plus steel by bar size.', 'Download PDF'],
      ['x-pdf-cost', 'BOQ and cost (PDF)', 'A4 portrait: bill of quantities, cost summary and the rate analysis for concrete, formwork and steel.', 'Download PDF'],
      ['x-pdf-dwg', 'Shop drawings (vector PDF)', 'A3 landscape, one wall type per page at a standard scale, with sections, elevation, bar shapes and bar list. Lines and text stay vector, so it is sharp at any zoom and prints cleanly at A3 or reduced to A4. Drawn as on screen.', 'Download PDF'],
      ['x-xlsx', 'Excel workbook', 'Bar schedule, steel by size, BOQ, cost and rate analysis, cutting plan, and the inputs.', 'Download Excel'],
      ['x-dxf', 'Shop drawings (DXF)', n + ' sheets, one per wall type with its sections, elevation, bar shapes and bar list, then the shape-code sheet and the full schedule. Bars are drawn as on screen (' + (st.size2d === 'pres' ? 'presentation view, ' : 'real view, ') + B.BAR_MODES.filter(function (m) { return m[0] === st.bar2d; })[0][1].toLowerCase() + ', one layer per bar size' + '). One zip.', 'Download drawings'],
      ['x-ifc', 'IFC model', 'IFC4 with concrete walls, formwork panels and every bar set, with quantities attached. Arrives in a zip inside Claude.', 'Download IFC'],
      ['x-html', 'HTML report', 'Schedule, BOQ, cost and every drawing on one page. Open it and print to make a PDF.', 'Download report'],
      ['x-csv', 'CSV schedule', 'The bar schedule only, for other software.', 'Download CSV'],
      ['x-json', 'Project file', 'Everything you typed, to reopen later with Open project.', 'Save project']
    ];
    return '<section class="card"><h2>Downloads</h2><p class="hint">' + c.total.members + ' members, ' + n2(c.total.wt) + ' kg of steel.' + (errs ? ' <strong class="errtxt">' + errs + ' problem' + (errs === 1 ? '' : 's') + ' on the Review tab should be settled before these files are issued.</strong>' : '') + '</p>' +
      '<ul class="outs">' + rows.map(function (r) { return '<li><div><h3>' + r[1] + '</h3><p>' + r[2] + '</p></div><button data-act="' + r[0] + '"' + (r[4] ? ' class="primary"' : '') + '>' + r[3] + '</button></li>'; }).join('') + '</ul></section>';
  }

