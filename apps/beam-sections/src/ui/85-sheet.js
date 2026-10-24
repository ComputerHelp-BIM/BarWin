  /* ---- the true-scale drawing sheet: DXF, PDF and SVG (BACKLOG C1) ---- */
  // Sheet settings and title block live under their own key, so the firm, the project and who drew it carry over from beam to beam.
  var SHEET_KEY = 'barwin-sheet-v1', CAD = window.BarWinCAD, BSH = window.BeamSheet;
  var SHEET_DEFAULTS = { paper: 'A2', orient: 'landscape', scaleL: 'auto', scaleS: 'auto', brk: true, colour: false,
    firm: '', project: '', client: '', mark: 'B1', title: '', drawingNo: '', rev: '0', drawnBy: '', checkedBy: '', approvedBy: '', date: '', notes: '' };
  var SHEET_TEXT = { firm: 60, project: 80, client: 60, mark: 12, title: 80, drawingNo: 30, rev: 6, drawnBy: 20, checkedBy: 20, approvedBy: 20, date: 20, notes: 1200 };
  /** Saved sheet settings, each checked; anything unusable keeps its default. */
  function loadSheet() {
    var o = Object.assign({}, SHEET_DEFAULTS), s = null;
    try { s = JSON.parse(localStorage.getItem(SHEET_KEY) || 'null'); } catch (e) { s = null; }
    if (!s || typeof s !== 'object') return o;
    if (CAD.SPEC.paper[s.paper]) o.paper = s.paper;
    if (s.orient === 'landscape' || s.orient === 'portrait') o.orient = s.orient;
    ['scaleL', 'scaleS'].forEach(function (k) { if (s[k] === 'auto' || CAD.SPEC.scales.indexOf(+s[k]) >= 0) o[k] = s[k] === 'auto' ? 'auto' : String(+s[k]); });
    ['brk', 'colour'].forEach(function (k) { if (typeof s[k] === 'boolean') o[k] = s[k]; });
    Object.keys(SHEET_TEXT).forEach(function (k) { if (typeof s[k] === 'string') o[k] = s[k].slice(0, SHEET_TEXT[k]); });
    return o;
  }
  var sheetVals = loadSheet();
  function saveSheet() { try { localStorage.setItem(SHEET_KEY, JSON.stringify(sheetVals)); } catch (e) { /* storage unavailable */ } }
  function today() { var d = new Date(); return ('0' + d.getDate()).slice(-2) + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + d.getFullYear(); }

  /** The sheet settings form: built once (it does not depend on the beam). */
  function buildSheetForm() {
    function sel(id, key, label, opts) {
      return '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '" data-sh="' + key + '">' +
        opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(sheetVals[key]) === String(o[0]) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>';
    }
    function txt(key, label, ph, wide) {
      return '<div class="field' + (wide ? ' wide' : '') + '"><label for="sh-' + key + '">' + label + '</label><div class="in tx"><input id="sh-' + key + '" data-sh="' + key + '" maxlength="' + SHEET_TEXT[key] + '" autocomplete="off"' + (ph ? ' placeholder="' + ph + '"' : '') + '></div></div>';
    }
    var papers = Object.keys(CAD.SPEC.paper).map(function (k) { return [k, k + ' (' + CAD.SPEC.paper[k][0] + ' × ' + CAD.SPEC.paper[k][1] + ')']; });
    var scales = [['auto', 'Auto (largest that fits)']].concat(CAD.SPEC.scales.map(function (s) { return [String(s), '1:' + s]; }));
    $('#sheetF').innerHTML =
      sel('sh-paper', 'paper', 'Paper', papers) +
      sel('sh-orient', 'orient', 'Orientation', [['landscape', 'Landscape'], ['portrait', 'Portrait']]) +
      sel('sh-scaleL', 'scaleL', 'L-section scale', scales) +
      sel('sh-scaleS', 'scaleS', 'Sections scale', scales) +
      '<div class="field"><span class="lab">Long beams</span><label class="chk"><input type="checkbox" id="sh-brk" data-sh="brk"> Allow a break line</label></div>' +
      '<div class="field"><span class="lab">PDF and SVG</span><label class="chk"><input type="checkbox" id="sh-colour" data-sh="colour"> In layer colours</label></div>' +
      '<h4 class="sub">Title block</h4>' +
      txt('firm', 'Firm', 'Your firm') + txt('project', 'Project') + txt('client', 'Client') +
      txt('mark', 'Beam mark', 'B1') + txt('title', 'Drawing title', 'BEAM B1 REINFORCEMENT DETAILS', true) +
      txt('drawingNo', 'Drawing no.') + txt('rev', 'Revision') + txt('drawnBy', 'Drawn') + txt('checkedBy', 'Checked') + txt('approvedBy', 'Approved') +
      txt('date', 'Date', today()) +
      '<div class="field wide"><label for="sh-notes">Notes</label><textarea id="sh-notes" data-sh="notes" rows="3" maxlength="' + SHEET_TEXT.notes + '" placeholder="One note per line. Covers, laps, Ld, bent legs and links are noted already."></textarea></div>';
    Object.keys(SHEET_TEXT).forEach(function (k) { var el = $('#sh-' + k); if (el) el.value = sheetVals[k]; });
    $('#sh-brk').checked = sheetVals.brk; $('#sh-colour').checked = sheetVals.colour;
  }

  /** The sheet for the current beam and settings. */
  function makeSheet() {
    var S = sheetVals, mark = S.mark.trim() || 'B1';
    return BSH.buildSheet(vals, {
      paper: S.paper, orient: S.orient, scaleL: S.scaleL, scaleS: S.scaleS, brk: S.brk, app: 'BarWin Beam Sections ' + BS.VERSION,
      notes: S.notes.split(/\r?\n/),
      fields: { firm: S.firm, project: S.project, client: S.client, title: S.title.trim() || 'BEAM ' + mark + ' REINFORCEMENT DETAILS',
        drawingNo: S.drawingNo, rev: S.rev, drawnBy: S.drawnBy, checkedBy: S.checkedBy, approvedBy: S.approvedBy, date: S.date.trim() || today() }
    });
  }
  function sheetVisible() { var g = $('#vals .pg[data-tab="sheet"]'); return !!g && g.offsetParent !== null && g.open; }
  var sheetTimer = 0;
  /** Redraws the preview and the summary, a moment after the last change (only while the Sheet settings are on screen). */
  function renderSheet(now) {
    clearTimeout(sheetTimer);
    if (!sheetVisible()) return;
    sheetTimer = setTimeout(function () {
      var r;
      try { r = makeSheet(); } catch (e) { $('#shSum').textContent = 'The sheet could not be drawn: ' + e.message; return; }
      $('#shPrev').innerHTML = CAD.toSVG(r.sheet, { colour: sheetVals.colour });
      var p = r.sheet.paper;
      $('#shSum').textContent = p.name + ' ' + p.orient + ': L-section 1:' + r.scaleL + (r.sheet.views.length > 1 ? ', sections 1:' + r.scaleS + (r.arrangement === 'beside' ? ' beside it' : ' under it') : '') + (r.broken ? ', with a break line' : '') + '.';
      var al = $('#shAlert'); al.hidden = !r.issues.length;
      al.innerHTML = r.issues.map(function (t) { return '<p>' + t.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</p>'; }).join('');
    }, now ? 0 : 150);
  }
  /** Saves a file the browser downloads. */
  function download(name, text, type) {
    var url = URL.createObjectURL(new Blob([text], { type: type })), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function fileBase() { return (sheetVals.mark.trim() || 'beam').replace(/[^A-Za-z0-9_-]+/g, '_') + (sheetVals.drawingNo.trim() ? '_' + sheetVals.drawingNo.trim().replace(/[^A-Za-z0-9_-]+/g, '_') : '') + '_sheet'; }
  function exportSheet(kind) {
    var r = makeSheet(), base = fileBase(), note = r.issues.length ? ' ' + r.issues[0] : '';
    if (kind === 'dxf') {
      var tpl = $('#cadTpl').textContent.replace(/^\r?\n/, '');
      download(base + '.dxf', CAD.toDXF(r.sheet, tpl), 'application/dxf');
      msg('DXF saved: model space 1:1 in mm, layout SHEET at ' + r.sheet.paper.name + ' with the views at their scales.' + note);
    } else if (kind === 'pdf') { download(base + '.pdf', CAD.toPDF(r.sheet, { colour: sheetVals.colour }), 'application/pdf'); msg('PDF saved, ' + r.sheet.paper.name + ' at full size.' + note); }
    else { download(base + '.svg', CAD.toSVG(r.sheet, { colour: sheetVals.colour }), 'image/svg+xml'); msg('SVG saved, ' + r.sheet.paper.name + ' in millimetres.' + note); }
  }

  $('#sheetG').addEventListener('change', function (e) {
    var i = e.target, k = i.dataset && i.dataset.sh; if (!k) return;
    sheetVals[k] = i.type === 'checkbox' ? i.checked : i.value;
    saveSheet(); renderSheet();
  });
  $('#sheetG').addEventListener('input', function (e) {
    var i = e.target, k = i.dataset && i.dataset.sh; if (!k || i.tagName === 'SELECT' || i.type === 'checkbox') return;
    sheetVals[k] = i.value; saveSheet(); renderSheet();
  });
  $('#sheetG').addEventListener('toggle', function () { renderSheet(true); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button[data-sheet]'); if (!b) return;
    try { exportSheet(b.dataset.sheet); } catch (err) { msg('The sheet could not be saved: ' + err.message, true); }
  });
  buildSheetForm();
