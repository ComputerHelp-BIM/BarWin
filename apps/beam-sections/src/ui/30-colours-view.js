  /** The user's colour picks override the theme's colour for that group (in both themes); no pick = the theme's colour. */
  function applyColors() {
    var st = document.documentElement.style;
    BS.GROUPS.forEach(function (G) { if (BS.okColor(vals.colors[G.k])) st.setProperty('--b-' + G.k, vals.colors[G.k]); else st.removeProperty('--b-' + G.k); });
  }
  /** Legend under the L-section: one swatch per group; clicking a swatch picks its colour. */
  function buildLegend() {
    var cs = getComputedStyle(document.documentElement), used = {};   // every group is in use now that bottom extras exist
    $('#legend').innerHTML = BS.GROUPS.map(function (G) {
      var cur = (vals.colors[G.k] || cs.getPropertyValue('--b-' + G.k) || G.light).trim(), hex = /^#[0-9a-f]{6}$/i.test(cur) ? cur : G.light;
      return '<label' + (used[G.k] === false ? ' class="unused" title="Used when bottom extra bars are added"' : '') + '><input type="color" data-col="' + G.k + '" value="' + hex + '" aria-label="' + G.name + ' colour">' + G.name + (used[G.k] === false ? ' (not used yet)' : '') + '</label>';
    }).join('') + '<button type="button" class="mini" data-act="resetColors">Reset colours</button>';
  }
  // view: labels on or off, text size; both apply to the L-section and every cross-section, and to copied SVGs
  function syncView() { $('#vLabels').checked = vals.showLabels !== false; $('#vText').value = vals.textScale; $('#vTextOut').textContent = vals.textScale + '%'; }
  $('#vLabels').addEventListener('change', function () { vals.showLabels = this.checked; save(); render(); msg(this.checked ? 'Labels shown.' : 'Labels hidden: bar tags, notes, bar lists and the Ld, lap and cut-off dimensions. Tick Labels to bring them back.'); });
  $('#vText').addEventListener('input', function () { vals.textScale = +this.value; $('#vTextOut').textContent = this.value + '%'; save(); render(); });
  document.addEventListener('input', function (e) {
    var i = e.target; if (!i.dataset || !i.dataset.col) return;
    vals.colors[i.dataset.col] = i.value; save(); applyColors();
  });
  document.addEventListener('change', function (e) {
    var i = e.target; if (!i.dataset || !i.dataset.col) return;
    var G = BS.GROUPS.filter(function (g) { return g.k === i.dataset.col; })[0]; msg(G.name + ' colour set to ' + i.value + '. Copied SVGs use it too.');
  });
  // the legend's default swatches follow the theme
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { buildLegend(); }); } catch (e) { /* older browsers: the swatches update on the next reload */ }
