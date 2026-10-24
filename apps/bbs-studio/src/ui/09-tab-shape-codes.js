  /* ---------- tab: shape codes ---------- */
  function renderShapes() {
    var p = st.p, used = {}; st.c.rows.forEach(function (r) { var k = r.shape; used[k] = (used[k] || 0) + r.total; });
    return '<section class="card"><div class="card-h"><h2>Shape codes</h2>' + modeButtons() + '</div><p class="hint">All 35 BS 8666 codes and the hooked link 51A, each as a bar of real thickness in the plane it is bent in and from above. Bars bent in more than one plane get one pictorial view. Dimensions run to the outside faces; brackets mark the run-out. ' +
      'This project uses ' + Object.keys(used).sort().map(function (k) { return k + ' (' + n0(used[k]) + ' bars)'; }).join(', ') + '.</p>' +
      '<div id="shapesheet" class="figs ' + modeClass() + '">' + B.FIG.DEFS.map(function (D) { return '<article' + (used[D.code] ? ' class="used"' : '') + '><h3>Shape code ' + D.code + (used[D.code] ? ' <span>in use</span>' : '') + '</h3><p class="nm">' + esc(D.name) + '</p>' + B.FIG.figureSVG(D) +
        '<p class="fm">L = ' + esc(D.f) + ' = <b>' + B.figLength(p, D) + ' mm</b> for ' + (D.code === '51A' ? 'T' : 'H') + D.d + '</p></article>'; }).join('') + '</div>' +
      '<p class="hint">Closed links are drawn as they sit on site: the lapped legs lie against the sides. 51A is the link used under IS codes; it is not a BS 8666 shape, so its length is the centre-line length. The cross tie on wall drawings is scheduled as 99. The same figures go on the shop drawings and into the DXF shape-code sheet, in the presentation chosen here.</p></section>';
  }

