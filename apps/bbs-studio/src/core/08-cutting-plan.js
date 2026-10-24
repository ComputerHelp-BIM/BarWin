  /* ---------- cutting plan with offcut reuse (best-fit decreasing; a heuristic, not a proven minimum) ---------- */
  function parseInventory(text) {
    var out = {};
    String(text || '').split(/[;\n]+/).forEach(function (part) {
      var m = part.split(':'); if (m.length < 2) return;
      var d = parseInt(m[0].replace(/[^0-9]/g, ''), 10); if (!d) return;
      m[1].split(/[, ]+/).forEach(function (v) { var n = num(v); if (n > 0) (out[d] || (out[d] = [])).push(n); });
    });
    return out;
  }
  function cuttingPlan(p, c) {
    var R = p.rules.wall, inv = parseInventory(p.inventory), pieces = {}, out = [], T = { issued: 0, scrap: 0, need: 0, newBars: 0 };
    c.rows.forEach(function (r) {
      if (r.len > p.stock || !(r.len > 0)) return;
      var a = pieces[r.dia] || (pieces[r.dia] = {}), k = r.mark + '@' + r.len;
      a[k] = (a[k] || 0) + r.total;
    });
    Object.keys(pieces).map(Number).sort(function (a, b) { return a - b; }).forEach(function (dia) {
      var kinds = Object.keys(pieces[dia]).map(function (k) { var s = k.split('@'); return { mark: s[0], len: +s[1], n: pieces[dia][k] }; }).sort(function (a, b) { return b.len - a.len; });
      var bins = (inv[dia] || []).slice().sort(function (a, b) { return a - b; }).map(function (l) { return { src: 'offcut', len: l, left: l, cuts: {} }; });
      kinds.forEach(function (kd) {
        for (var i = 0; i < kd.n; i++) {
          var best = null;
          for (var j = 0; j < bins.length; j++) { var b = bins[j]; if (b.left >= kd.len && (!best || b.left < best.left)) best = b; }
          if (!best) {   // open as many identical new bars as this length needs in one go, so large jobs stay fast
            best = { src: 'new', len: p.stock, left: p.stock, cuts: {} }; bins.push(best);
          }
          var key = kd.mark + '@' + kd.len; best.cuts[key] = (best.cuts[key] || 0) + 1; best.left -= kd.len;
        }
      });
      var issued = 0, scrap = 0, need = 0, reusable = [], newBars = 0, offUsed = 0, pat = {}, patterns = [];
      bins.forEach(function (b) {
        var keys = Object.keys(b.cuts); if (!keys.length) return;
        issued += b.len; if (b.src === 'new') newBars++; else offUsed++;
        keys.forEach(function (k) { need += b.cuts[k] * +k.split('@')[1]; });
        if (b.left >= p.minOffcut) reusable.push(Math.round(b.left)); else scrap += b.left;
        var desc = keys.map(function (k) { var s = k.split('@'); return b.cuts[k] + ' x ' + Math.round(+s[1]) + ' (mk ' + s[0] + ')'; }).join(' + '), pk = b.src + '|' + b.len + '|' + desc;
        if (!pat[pk]) { pat[pk] = { src: b.src, len: b.len, desc: desc, left: b.left, count: 0 }; patterns.push(pat[pk]); }
        pat[pk].count++;
      });
      var w = unitWt(R, dia);
      out.push({ dia: dia, newBars: newBars, offcutsUsed: offUsed, issued: issued, need: need, scrap: scrap, reusable: reusable, wastePct: issued ? scrap / issued * 100 : 0,
        kg: issued / 1000 * w, scrapKg: scrap / 1000 * w, needKg: need / 1000 * w, patterns: patterns });
      T.issued += issued / 1000 * w; T.scrap += scrap / 1000 * w; T.need += need / 1000 * w; T.newBars += newBars;
    });
    T.wastePct = T.issued ? T.scrap / T.issued * 100 : 0;
    return { groups: out, total: T };
  }

