  /* ---------- SVG ---------- */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function f1(v) { return (Math.round(v * 10) / 10).toString(); }
  function toSVG(d, opts) {
    opts = opts || {};
    var b = d.b, pad = opts.pad === undefined ? Math.max(d.w(), d.h()) * 0.03 : opts.pad;
    if (b[0] > b[2]) return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>';
    var o = ['<svg xmlns="http://www.w3.org/2000/svg" class="dwg" viewBox="' + [b[0] - pad, -b[3] - pad, d.w() + 2 * pad, d.h() + 2 * pad].map(f1).join(' ') + '" role="img" aria-label="' + esc(opts.label || 'Reinforcement detail') + '">'];
    d.p.forEach(function (q) {
      var cls = 'ly-' + q.l + (q.dash ? ' dash' : ''), mk = q.m ? ' data-mark="' + esc(q.m) + '"' : '';
      if (q.t === 'line') o.push('<line class="' + cls + (q.hv ? ' hv' : '') + (q.sz ? ' sz-' + q.sz : '') + '"' + mk + ' x1="' + f1(q.x1) + '" y1="' + f1(-q.y1) + '" x2="' + f1(q.x2) + '" y2="' + f1(-q.y2) + '"/>');
      else if (q.t === 'pl') o.push('<' + (q.closed ? 'polygon' : 'polyline') + ' class="' + cls + (q.sol ? ' sol' : '') + (q.hv ? ' hv' : '') + (q.sz ? ' sz-' + q.sz : '') + (q.lg ? ' lg' : '') + '"' + mk + ' points="' + q.pts.map(function (v) { return f1(v[0]) + ',' + f1(-v[1]); }).join(' ') + '"/>');
      else if (q.t === 'circ') o.push('<circle class="' + cls + (q.fill ? ' fill' : '') + (q.sz ? ' sz-' + q.sz : '') + '"' + mk + ' cx="' + f1(q.x) + '" cy="' + f1(-q.y) + '" r="' + f1(q.r) + '"/>');
      else o.push('<text class="tx-' + q.l + '"' + mk + ' x="' + f1(q.x) + '" y="' + f1(-q.y) + '" font-size="' + f1(q.h * 1.25) + '" text-anchor="' + (q.a === 'c' ? 'middle' : q.a === 'r' ? 'end' : 'start') + '"' + (q.rot ? ' transform="rotate(' + (-q.rot) + ' ' + f1(q.x) + ' ' + f1(-q.y) + ')"' : '') + '>' + esc(q.s) + '</text>');
    });
    o.push('</svg>'); return o.join('');
  }
  var SVG_CSS_FIXED = '.dwg{background:#fff}.dwg line,.dwg polyline,.dwg polygon,.dwg circle{fill:none;stroke:#1b2733;stroke-width:1.2;vector-effect:non-scaling-stroke}' +
    '.dwg .ly-RB{stroke:#c0392b;stroke-width:1.8}.dwg .ly-RL{stroke:#1f6fb2;stroke-width:1.4}.dwg .ly-SH{stroke:#c0392b;stroke-width:2}.dwg .ly-GH{stroke:#9aa6ad;stroke-width:1}' +
    '.dwg .ly-DIM{stroke:#2c7a4b;stroke-width:.8}.dwg .ly-TAG{stroke:#8a6100;stroke-width:.8}.dwg .ly-TBL{stroke:#8a959c;stroke-width:.8}.dwg .ly-TTL{stroke:#1b2733;stroke-width:1}' +
    '.dwg .hv{stroke-width:2.6}.dwg .sol.ly-RB,.dwg .sol.ly-SH{fill:#f3c9c4}.dwg .sol.ly-RL{fill:#cfe2f3}.dwg .ly-CL{stroke:#555;stroke-width:.6}.dwg .dash{stroke-dasharray:6 4}.dwg circle.fill.ly-RB{fill:#c0392b}.dwg circle.fill.ly-DIM{fill:#2c7a4b}.dwg circle.fill.ly-TAG{fill:#8a6100}' +
    '.dwg text{font-family:Arial,sans-serif;fill:#1b2733;stroke:none}.dwg .tx-DIM{fill:#2c7a4b}.dwg .tx-TAG{fill:#8a6100}' + SIZE_CSS;

