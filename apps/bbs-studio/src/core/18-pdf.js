  /* ---------- PDF: A4 pages with tables that always fit the page width. No library: plain PDF 1.4 with the built-in Helvetica. ---------- */
  var HELV = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
  /** Text as the PDF's WinAnsi encoding can show it. The rupee sign is not in the built-in fonts, so amounts are headed "Rs". */
  function pdfText(s) {
    return String(s === null || s === undefined ? '' : s).replace(/\u20B9\s?/g, 'Rs ').replace(/[\u2013\u2014]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\u2022/g, '\u00B7').replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '?');
  }
  function pdfW(s, size, bold) { var w = 0, i, c; for (i = 0; i < s.length; i++) { c = s.charCodeAt(i); w += c >= 32 && c <= 126 ? HELV[c - 32] : 556; } return w / 1000 * size * (bold ? 1.08 : 1); }
  function pdfEsc(s) { return s.replace(/[\\()]/g, '\\$&').replace(/[\u0080-\u00FF]/g, function (ch) { return '\\' + ('00' + ch.charCodeAt(0).toString(8)).slice(-3); }); }
  function pdfNumeric(s) { return /\d/.test(s) && /^[\s\d.,()%+\-xX*\/:]*$/.test(s); }
  /** Wraps finished page content in a PDF 1.4 file: catalogue, the two built-in fonts, one page object per page, cross-reference table. */
  function pdfFile(pageStreams, PW, PH, title) {
    var objs = [], out = '%PDF-1.4\n%\u00E2\u00E3\u00CF\u00D3\n', off = [], kids = [];
    function add(s) { objs.push(s); return objs.length; }
    add('<< /Type /Catalog /Pages 2 0 R >>'); add('');
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    pageStreams.forEach(function (s) { var c = add('<< /Length ' + s.length + ' >>\nstream\n' + s + '\nendstream'); kids.push(add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + c + ' 0 R >>')); });
    objs[1] = '<< /Type /Pages /Kids [' + kids.map(function (k) { return k + ' 0 R'; }).join(' ') + '] /Count ' + kids.length + ' >>';
    objs.forEach(function (s, i) { off.push(out.length); out += (i + 1) + ' 0 obj\n' + s + '\nendobj\n'; });
    var xref = out.length; out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + off.map(function (o) { return ('0000000000' + o).slice(-10) + ' 00000 n \n'; }).join('');
    return out + 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R /Info << /Title (' + pdfEsc(pdfText(title)) + ') /Producer (BBS Studio ' + VERSION + ') >> >>\nstartxref\n' + xref + '\n%%EOF\n';
  }
  /**
   * Builds a PDF. doc = { title, sub, meta: [[label, value]...], blocks: [...], foot }.
   * A block is { table: { title, head: [...], rows: [[...]], align: 'auto' | 'center', bold: [row indexes], notes: [...] } } or { text: [lines] } or { gap: pt }.
   * The page is A4 with 15 mm margins. Each table takes the full width between the margins: its type size is reduced until every column fits,
   * and if that would go below a readable size the whole document turns landscape. Header rows repeat on every page.
   */
  function toPDF(doc) {
    var MM = 72 / 25.4, M = 15 * MM, BASE = 8.5, MIN = 5.6, PAD = 3;
    function words(s) { return s.split(/\s+/).filter(Boolean); }
    /** Breaks text into lines no wider than maxW. A single word longer than the line is cut, so nothing can run past its box. */
    function wrap(s, size, bold, maxW) {
      var out = [], cur = '';
      words(pdfText(s)).forEach(function (wd) {
        while (pdfW(wd, size, bold) > maxW && wd.length > 1) { var k = wd.length - 1; while (k > 1 && pdfW(wd.slice(0, k), size, bold) > maxW) k--; if (cur) { out.push(cur); cur = ''; } out.push(wd.slice(0, k)); wd = wd.slice(k); }
        var t = cur ? cur + ' ' + wd : wd; if (!cur || pdfW(t, size, bold) <= maxW) cur = t; else { out.push(cur); cur = wd; }
      });
      if (cur) out.push(cur); return out.length ? out : [''];
    }
    /** One line that must fit maxW: shortened with two dots if it does not. */
    function fit(s, size, bold, maxW) { s = pdfText(s); if (pdfW(s, size, bold) <= maxW) return s; while (s.length > 1 && pdfW(s + '..', size, bold) > maxW) s = s.slice(0, -1); return s + '..'; }
    /** Column widths and type size for one table in a given width. */
    function plan(t, avail) {
      var n = t.head.length, size = BASE, k, w, total, i;
      for (k = 0; k < 6; k++) {
        w = []; for (i = 0; i < n; i++) {
          var hw = Math.max.apply(null, words(pdfText(t.head[i])).map(function (x) { return pdfW(x, size, true); }).concat([0])), cw = 0;
          t.rows.forEach(function (r) { if (r.length) cw = Math.max(cw, pdfW(pdfText(r[i]), size, t.bold && false)); });
          w.push(Math.max(hw, cw) + 2 * PAD);
        }
        total = w.reduce(function (a, b) { return a + b; }, 0); if (total <= avail + 0.01) break; size = Math.floor(size * avail / total * 10) / 10 - (k ? 0.1 : 0);
      }
      var f = avail / total; return { size: size, w: w.map(function (x) { return x * f; }), fits: total <= avail + 0.01 };
    }
    function need(land) { var avail = (land ? 841.89 : 595.28) - 2 * M, worst = BASE; doc.blocks.forEach(function (b) { if (b.table) worst = Math.min(worst, plan(b.table, avail).size); }); return worst; }
    var land = doc.landscape === true || (doc.landscape !== false && need(false) < 6.6), PW = land ? 841.89 : 595.28, PH = land ? 595.28 : 841.89, AV = PW - 2 * M;
    var pages = [], ops = null, y = 0;
    function txt(x, yy, s, size, bold, align, w) { s = pdfText(s); if (!s) return; var tw = pdfW(s, size, bold) / (bold ? 1.08 : 1) * (bold ? 1.04 : 1), xx = align === 'r' ? x + w - tw : align === 'c' ? x + (w - tw) / 2 : x; ops.push('BT /F' + (bold ? 2 : 1) + ' ' + size + ' Tf ' + xx.toFixed(2) + ' ' + yy.toFixed(2) + ' Td (' + pdfEsc(s) + ') Tj ET'); }
    function line(x1, y1, x2, y2, lw, grey) { ops.push((grey === undefined ? 0 : grey) + ' G ' + (lw || 0.4) + ' w ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' m ' + x2.toFixed(2) + ' ' + y2.toFixed(2) + ' l S'); }
    function fill(x, yy, w, h, grey) { ops.push(grey + ' g ' + x.toFixed(2) + ' ' + yy.toFixed(2) + ' ' + w.toFixed(2) + ' ' + h.toFixed(2) + ' re f 0 g'); }
    function newPage() {
      ops = []; pages.push(ops); y = PH - M;
      // title on the left, the firm's name on the right; if the two would meet, the name drops to its own line
      var tw = pdfW(pdfText(doc.title), 13, true), sw = doc.sub ? pdfW(pdfText(doc.sub), 8.5, false) : 0;
      txt(M, y - 11, fit(doc.title, 13, true, AV), 13, true);
      if (doc.sub) { if (tw + sw + 14 <= AV) txt(M, y - 11, doc.sub, 8.5, false, 'r', AV); else { y -= 12; txt(M, y - 11, fit(doc.sub, 8.5, false, AV), 8.5, false); } }
      y -= 17;
      if (doc.meta && doc.meta.length) {                       // the sheet header: label and value pairs, three to a row, in a ruled box. Long values wrap inside their own cell.
        var per = 3, nr = Math.ceil(doc.meta.length / per), cw = AV / per, LH = 9.4, cells = doc.meta.map(function (m) { var lab = pdfText(m[0]) + ':', lw = pdfW(lab + '  ', 7.2, false); return { lab: lab, lw: lw, lines: wrap(m[1], 7.6, true, cw - 2 * PAD - lw) }; }), ry = [y], r, i;
        for (r = 0; r < nr; r++) { var mx = 1; for (i = r * per; i < Math.min(doc.meta.length, (r + 1) * per); i++) mx = Math.max(mx, cells[i].lines.length); ry.push(ry[r] - (mx * LH + 3.6)); }
        cells.forEach(function (c, k) { var cx = M + (k % per) * cw, top = ry[Math.floor(k / per)]; txt(cx + PAD, top - 9, c.lab, 7.2, false); c.lines.forEach(function (ln, j) { txt(cx + PAD + c.lw, top - 9 - j * LH, ln, 7.6, true); }); });
        for (r = 0; r <= nr; r++) line(M, ry[r], M + AV, ry[r], r === 0 || r === nr ? 0.8 : 0.3);
        for (i = 0; i <= per; i++) line(M + i * cw, ry[0], M + i * cw, ry[nr], i === 0 || i === per ? 0.8 : 0.3);
        y = ry[nr];
      } else line(M, y, M + AV, y, 0.8);
      y -= 10;
    }
    function table(t) {
      var P = plan(t, AV), size = P.size, w = P.w, n = t.head.length, rh = size * 1.62, lh = size * 1.12, x0 = M, i;
      var headLines = t.head.map(function (hd, ci) { return wrap(hd, size, true, w[ci] - 2 * PAD + 0.5); });
      var hh = Math.max.apply(null, headLines.map(function (l) { return l.length; })) * lh + size * 0.7, xs = [x0]; for (i = 0; i < n; i++) xs.push(xs[i] + w[i]);
      function head() {
        fill(x0, y - hh, AV, hh, 0.9);
        headLines.forEach(function (ls, ci) { var top = y - (hh - ls.length * lh) / 2 - size * 0.86; ls.forEach(function (s, k) { txt(xs[ci], top - k * lh, s, size, true, 'c', w[ci]); }); });
        var yT = y; y -= hh; line(x0, yT, x0 + AV, yT, 0.8); line(x0, y, x0 + AV, y, 0.8); return yT;
      }
      function close(yT) { for (i = 0; i <= n; i++) line(xs[i], yT, xs[i], y, i === 0 || i === n ? 0.8 : 0.25, i === 0 || i === n ? 0 : 0.45); line(x0, y, x0 + AV, y, 0.8); }
      if (t.title) { if (y - (hh + rh * 3 + 16) < M + 14) newPage(); txt(x0, y - 9, fit(t.title, 10, true, AV), 10, true); y -= 15; }
      else if (y - (hh + rh * 2) < M + 14) newPage();
      var yT = head();
      t.rows.forEach(function (r, ri) {
        var h = r.length ? rh : rh * 0.55;
        if (y - h < M + 14) { close(yT); newPage(); yT = head(); }
        if (r.length) {
          var bold = t.bold && t.bold.indexOf(ri) >= 0; if (bold) fill(x0, y - h, AV, h, 0.95);
          r.forEach(function (v, ci) { if (ci >= n) return; var s = pdfText(v), al = t.align === 'center' ? 'c' : pdfNumeric(s) ? 'r' : 'l';
            if (pdfW(s, size, bold) > w[ci] - 2 * PAD + 0.6) { while (s.length > 1 && pdfW(s + '..', size, bold) > w[ci] - 2 * PAD) s = s.slice(0, -1); s += '..'; }
            txt(xs[ci] + PAD, y - h + size * 0.5, s, size, bold, al, w[ci] - 2 * PAD); });
        }
        y -= h; line(x0, y, x0 + AV, y, 0.25, 0.6);
      });
      close(yT); y -= 6;
      (t.notes || []).forEach(function (s) { wrap(s, 7.4, false, AV).forEach(function (ln) { if (y - 10 < M + 14) newPage(); txt(x0, y - 8, ln, 7.4, false); y -= 10.5; }); });
      y -= 8;
    }
    newPage();
    doc.blocks.forEach(function (b) {
      if (b.table) table(b.table);
      else if (b.text) b.text.forEach(function (s) { wrap(s, b.size || 8.5, !!b.bold, AV).forEach(function (ln) { if (y - 11 < M + 14) newPage(); txt(M, y - 9, ln, b.size || 8.5, !!b.bold); y -= (b.size || 8.5) * 1.4; }); });
      else if (b.gap) y -= b.gap;
    });
    pages.forEach(function (o, i) { ops = o; line(M, M + 4, M + AV, M + 4, 0.4, 0.5); var pn = 'Page ' + (i + 1) + ' of ' + pages.length; txt(M, M - 5, fit(doc.foot || '', 7, false, AV - pdfW(pn, 7, false) - 16), 7, false); txt(M, M - 5, pn, 7, false, 'r', AV); });
    var out = pdfFile(pages.map(function (o) { return o.join('\n'); }), PW, PH, doc.title);
    return { text: out, pages: pages.length, landscape: land };
  }
  /** The three schedule and cost documents. kind: 'std' (standard form), 'full' (every column), 'cost' (bill of quantities, cost summary and rate analysis). */
  function pdfReport(p, c, K, kind, dateStr) {
    var S = STDS[p.standard], R = p.rules.wall, foot = S.name + '  -  ' + (dateStr || '') + '  -  BBS Studio ' + VERSION + (p.name ? '  -  ' + p.name : '');
    var meta = [['Client', p.client], ['Prep. by', p.prep], ['Dwg no.', p.dwg], ['Site ref', p.name], ["Chk'd by", p.chk], ['Job no.', p.job]];
    if (kind === 'std') { var a = stdFormAOA(p, c);
      return toPDF({ title: 'Bar bending schedule', sub: p.consultant || '', meta: meta, foot: foot, landscape: false, blocks: [{ table: { head: a[0], rows: a.slice(1), align: 'center', notes: stdFormNotes(p).concat(['Total ' + r2(c.total.wt) + ' kg.  Lap ' + R.lap + 'd, cover ' + R.cover + ' mm.']) } }] }); }
    if (kind === 'full') { var f = bbsAOA(p, c), last = f.length - 2;
      return toPDF({ title: 'Bar bending schedule, full data', sub: p.consultant || '', meta: meta, foot: foot, blocks: [{ table: { head: f[0], rows: f.slice(1), notes: ['Length is by ' + (R.lengthBy === 'standard' ? S.name : 'the workbook method') + '. The last three columns give the length by all three methods.'] } }, { table: { title: 'Steel by bar size', head: byDiaAOA(p, c)[0], rows: byDiaAOA(p, c).slice(1) } }] }); }
    function money(v) { return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
    var b = boqAOA(c), items = K.items.map(function (i) { return [i.name, i.unit.replace('m3', 'm\u00B3').replace('m2', 'm\u00B2'), r3(i.qty), r2(i.rate), money(i.amount)]; });
    items.push(['Sub-total', '', '', '', money(K.sub)], ['GST ' + p.cost.gst + '%', '', '', '', money(K.gst)], ['Total', '', '', '', money(K.total)]);
    var blocks = [];
    if (K.sample) blocks.push({ text: ['Sample rates: the rates in this document are placeholders, not market rates. Replace them under BOQ and cost.'], bold: true }, { gap: 6 });
    blocks.push({ table: { title: 'Bill of quantities', head: b[0].map(function (h) { return h.replace('m3', 'm\u00B3').replace('m2', 'm\u00B2'); }), rows: b.slice(1), bold: [b.length - 2] } });
    blocks.push({ table: { title: 'Cost summary', head: ['Item', 'Unit', 'Quantity', 'Rate (Rs)', 'Amount (Rs)'], rows: items, bold: [items.length - 3, items.length - 1], notes: ['Rate = (material with wastage + other direct costs) x (1 + overheads ' + p.cost.oh + '%) x (1 + profit ' + p.cost.profit + '%). GST ' + p.cost.gst + '% is added to the sub-total.'] } });
    K.items.forEach(function (i) {
      var rows = i.lines.map(function (l) { return [l.label, r2(l.amount)]; }); rows.push(['Direct cost', r2(i.direct)], ['Overheads ' + p.cost.oh + '%', r2(i.oh)], ['Profit ' + p.cost.profit + '%', r2(i.profit)], ['Rate per ' + i.unit, r2(i.rate)]);
      blocks.push({ table: { title: 'Rate analysis: ' + i.name + ', per ' + i.unit, head: ['Component', 'Amount (Rs)'], rows: rows, bold: [rows.length - 4, rows.length - 1] } });
    });
    return toPDF({ title: 'Bill of quantities and cost', sub: p.consultant || '', meta: meta, foot: foot, blocks: blocks });
  }

  /**
   * The shop drawings as a vector PDF: one A3 landscape page per wall type, drawn to a standard scale, with the bar list beside it.
   * Lines stay lines and text stays text, so the sheets stay sharp at any zoom and print cleanly at A3 or reduced to A4.
   */
  function pdfDrawings(p, c, mode, dateStr) {
    var MM = 72 / 25.4, PW = 1190.55, PH = 841.89, M = 12 * MM, TB = 16 * MM, AW = PW - 2 * M, AH = PH - 2 * M - TB, pages = [], S = STDS[p.standard];
    var INK = { OUT: '#1b2733', RB: '#c0392b', RL: '#1f6fb2', SH: '#c0392b', GH: '#9aa6ad', CL: '#666666', DIM: '#2c7a4b', TAG: '#8a6100', TXT: '#1b2733', TTL: '#1b2733', TBL: '#8a959c', TBT: '#1b2733' };
    var LW = { OUT: 0.7, RB: 0.6, RL: 0.5, SH: 0.6, GH: 0.35, CL: 0.25, DIM: 0.3, TAG: 0.3, TBL: 0.3 };
    function rgb(hex, tint) { var n = parseInt(hex.slice(1), 16), v = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (x) { return ((tint ? x + (255 - x) * tint : x) / 255).toFixed(3); }); return v.join(' '); }
    function n2s(v) { return (Math.round(v * 100) / 100).toString(); }
    var list = c.members.filter(function (m) { return m.L > 0 && m.W > 0 && m.bars.length && m.type !== 'beam'; });
    list.forEach(function (mem, pi) {
      var scales = [5, 10, 20, 25, 50, 75, 100, 150, 200, 250, 500], sc = 500, d = null, i;
      for (i = 0; i < scales.length; i++) { d = memberSheet(p, c, mem, 2.5 * scales[i], mode); if (d.w() / scales[i] * MM <= AW && d.h() / scales[i] * MM <= AH) { sc = scales[i]; break; } }
      var k = MM / sc, ox = M + (AW - d.w() * k) / 2 - d.b[0] * k, oy = M + TB + (AH - d.h() * k) / 2 - d.b[1] * k, o = [];
      function X(x) { return n2s(ox + x * k); } function Y(y) { return n2s(oy + y * k); }
      d.p.forEach(function (q) {
        var col = q.sz && SIZE_COL[q.sz] ? SIZE_COL[q.sz][0] : (INK[q.l] || '#1b2733'), lw = q.hv ? 1.3 : (LW[q.l] || 0.4);
        if (q.t === 'text') {
          var fs = q.h * 1.25 * k, s = pdfText(q.s), w = pdfW(s, fs, false), dx = q.a === 'c' ? -w / 2 : q.a === 'r' ? -w : 0, r = (q.rot || 0) * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r);
          o.push(rgb(col) + ' rg BT /F1 ' + n2s(fs) + ' Tf ' + n2s(cs) + ' ' + n2s(sn) + ' ' + n2s(-sn) + ' ' + n2s(cs) + ' ' + n2s(ox + q.x * k + dx * cs) + ' ' + n2s(oy + q.y * k + dx * sn) + ' Tm (' + pdfEsc(s) + ') Tj ET'); return;
        }
        var head = rgb(col) + ' RG ' + lw + ' w ' + (q.dash ? '[3 2] 0 d ' : '[] 0 d '), path;
        if (q.t === 'line') { o.push(head + X(q.x1) + ' ' + Y(q.y1) + ' m ' + X(q.x2) + ' ' + Y(q.y2) + ' l S'); return; }
        if (q.t === 'circ') { var cx = ox + q.x * k, cy = oy + q.y * k, rr = q.r * k, c4 = rr * 0.5523;
          path = n2s(cx + rr) + ' ' + n2s(cy) + ' m ' + [[cx + rr, cy + c4, cx + c4, cy + rr, cx, cy + rr], [cx - c4, cy + rr, cx - rr, cy + c4, cx - rr, cy], [cx - rr, cy - c4, cx - c4, cy - rr, cx, cy - rr], [cx + c4, cy - rr, cx + rr, cy - c4, cx + rr, cy]].map(function (b) { return b.map(n2s).join(' ') + ' c'; }).join(' ');
          o.push(head + (q.fill ? rgb(col) + ' rg ' + path + ' b' : path + ' s')); return; }
        path = q.pts.map(function (pt, j) { return X(pt[0]) + ' ' + Y(pt[1]) + (j ? ' l' : ' m'); }).join(' ');
        o.push(head + (q.sol || q.lg ? rgb(col, q.lg ? 0 : 0.72) + ' rg ' + path + ' b' : path + (q.closed ? ' s' : ' S')));
      });
      // title strip along the bottom of the sheet
      var ty = M + TB - 4, cells = [[p.name || 'Project', 0.34], ['Wall ' + mem.mark + '  (' + mem.L + ' x ' + mem.W + ', ' + mem.qty + ' no.)', 0.26], ['Scale 1:' + sc + ' at A3', 0.12], [S.name, 0.12], [(dateStr || ''), 0.08], ['Sheet ' + (pi + 1) + ' of ' + list.length, 0.08]], x = M;
      o.push('0.106 0.153 0.2 RG 0.8 w [] 0 d ' + n2s(M) + ' ' + n2s(M) + ' ' + n2s(AW) + ' ' + n2s(PH - 2 * M) + ' re S ' + n2s(M) + ' ' + n2s(ty) + ' m ' + n2s(M + AW) + ' ' + n2s(ty) + ' l S');
      cells.forEach(function (cl, j) { var w = AW * cl[1], s = pdfText(cl[0]), fs = 9; while (fs > 5 && pdfW(s, fs, j < 2) > w - 10) fs -= 0.5; while (s.length > 2 && pdfW(s, fs, j < 2) > w - 10) s = s.slice(0, -1);
        o.push('0.106 0.153 0.2 rg BT /F' + (j < 2 ? 2 : 1) + ' ' + fs + ' Tf ' + n2s(x + 5) + ' ' + n2s(M + (TB - 4) / 2 - 3) + ' Td (' + pdfEsc(s) + ') Tj ET'); if (j) o.push('0.3 w ' + n2s(x) + ' ' + n2s(M) + ' m ' + n2s(x) + ' ' + n2s(ty) + ' l S'); x += w; });
      pages.push(o.join('\n'));
    });
    if (!pages.length) pages.push('BT /F1 12 Tf 60 780 Td (No members to draw.) Tj ET');
    return { text: pdfFile(pages, PW, PH, (p.name || 'Project') + ' shop drawings'), pages: pages.length };
  }

