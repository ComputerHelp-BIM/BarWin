  /* ---------- exports ---------- */
  function workbook() {
    var X = window.XLSX, p = st.p, c = st.c, wb = X.utils.book_new();
    function add(name, aoa) { var ws = X.utils.aoa_to_sheet(aoa); ws['!cols'] = aoa[0].map(function (h) { return { wch: Math.max(10, String(h).length + 2) }; }); X.utils.book_append_sheet(wb, ws, name); }
    var stdS = [[p.consultant || '', '', 'Client: ' + p.client, '', '', 'Prep. by: ' + p.prep, '', '', 'Dwg no.: ' + p.dwg], ['Site ref: ' + p.name, '', '', '', '', "Chk'd by: " + p.chk, '', '', 'Job no.: ' + p.job], []].concat(B.stdFormAOA(p, c)).concat([[]]).concat(B.stdFormNotes(p).map(function (n) { return [n]; }));
    var wsS = X.utils.aoa_to_sheet(stdS); wsS['!cols'] = B.STD_FORM.map(function (k) { return { wch: k[1] * 2.2 }; }); X.utils.book_append_sheet(wb, wsS, 'BBS standard form');
    add('BBS full data', B.bbsAOA(p, c)); add('Steel by size', B.byDiaAOA(p, c)); add('BOQ', B.boqAOA(c)); add('Cost', B.costAOA(st.K)); add('Cutting plan', B.planAOA(st.plan)); add('Inputs', B.inputAOA(p));
    return X.write(wb, { type: 'array', bookType: 'xlsx' });
  }
  function reportHTML() {
    var p = st.p, c = st.c;
    var dets = c.members.map(function (M) { return M.L > 0 && M.W > 0 && M.type !== 'beam' ? '<div class="det">' + B.toSVG(B.wallDetail(p, M, 1e9, drawMode())) + '</div>' : ''; }).join('');
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc(p.name) + ' - bar bending schedule</title><style>body{font:14px/1.45 Arial,Helvetica,sans-serif;color:#1b2733;margin:24px;max-width:1280px}h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 8px}' +
      'table{border-collapse:collapse;width:100%;font-size:11.5px}th,td{border:1px solid #9aa6ad;padding:3px 6px;text-align:center}th{background:#eef1f3}.scroll{overflow-x:auto}.det{border:1px solid #9aa6ad;margin:12px 0;page-break-inside:avoid}.det svg{width:100%;height:auto;display:block;max-height:95vh}p.m{color:#4a5a68;margin:0}' + B.SVG_CSS_FIXED +
      '@media print{body{margin:8mm}}</style></head><body><h1>' + esc(p.name) + '</h1><p class="m">' + esc([p.client, p.consultant].filter(Boolean).join(' / ')) + ' Issued ' + today() + '. Steel ' + n2(c.total.wt) + ' kg, concrete ' + n2(c.total.conc) + ' m3, formwork ' + n2(c.total.form) + ' m2. Made with BBS Studio v' + B.VERSION + '.</p>' +
      '<h2>Bar bending schedule</h2>' + table(B.stdFormAOA(p, c).map(function (r) { return r.length ? r : ['', '', '', '', '', '', '', '', '', '', '', '', '', '']; })) + B.stdFormNotes(p).map(function (n) { return '<p class="m">' + esc(n) + '</p>'; }).join('') + '<h2>Steel by bar size</h2>' + table(B.byDiaAOA(p, c)) + '<h2>Bill of quantities</h2>' + table(B.boqAOA(c)) + '<h2>Cost</h2>' + table(B.costAOA(st.K)) + '<h2>Shop drawings</h2>' + dets + '</body></html>';
  }
  function dxfZip(z, folder) { var files = B.dxfFiles(TPL, st.p, st.c, MSP, today(), drawMode()); files.forEach(function (f) { z.file((folder || '') + f.name, f.text); }); return files.length; }
  /** The PDF writer returns one byte per character; this turns it into a file. */
  function pdfBlob(text) { var b = new Uint8Array(text.length), i; for (i = 0; i < text.length; i++) b[i] = text.charCodeAt(i) & 255; return new Blob([b], { type: 'application/pdf' }); }
  function exportAll() {
    if (!window.JSZip) { toast('The zip library did not load. Download the files one at a time.'); return; }
    var z = new window.JSZip(), n = slug();
    if (window.XLSX) z.file(n + '_BBS.xlsx', workbook());
    [['std', '_BBS_standard_form'], ['full', '_BBS_full_data'], ['cost', '_BOQ_and_cost']].forEach(function (k) { z.file(n + k[1] + '.pdf', pdfBlob(B.pdfReport(st.p, st.c, st.K, k[0], today()).text)); });
    z.file(n + '_shop_drawings.pdf', pdfBlob(B.pdfDrawings(st.p, st.c, drawMode(), today()).text));
    z.file(n + '_BBS.csv', B.csv(B.bbsAOA(st.p, st.c))); dxfZip(z, 'shop_drawings/'); z.file(n + '_model.ifc', B.toIFC(st.p, st.c, today()).text); z.file(n + '_report.html', reportHTML()); z.file(n + '_project.json', JSON.stringify(st.p, null, 1));
    z.generateAsync({ type: 'blob', compression: 'DEFLATE' }).then(function (b) { return saveFile(n + '_BBS_package.zip', b, 'application/zip'); });
  }

