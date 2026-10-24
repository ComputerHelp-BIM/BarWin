  /* ---- copy as a standalone SVG ---- */
  function copy(svg, name) {
    var out = $('#svgOut');
    function fallback() { out.hidden = false; out.value = svg; out.focus(); out.select(); msg('Copying is blocked here. The ' + name + ' SVG is selected in the box below; copy it from there.'); }
    try { navigator.clipboard.writeText(svg).then(function () { out.hidden = true; msg(name + ' SVG copied, with the current numbers.'); }, fallback); } catch (e) { fallback(); }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button[data-act]'); if (!b) return;
    var a = b.dataset.act;
    if (a === 'copyL') copy(BS.lSection(vals, { style: BS.exportCSS(vals.colors) }), 'L-section');
    else if (a === 'copyX') copy(BS.xSection(vals, { style: BS.exportCSS(vals.colors), letter: b.dataset.s }), 'Section ' + b.dataset.s + '-' + b.dataset.s);
    else if (a === 'openAll' || a === 'closeAll') { [].forEach.call(document.querySelectorAll('#vals .pg'), function (g) { g.open = a === 'openAll'; }); }
    else if (a === 'resetColors') { vals.colors = {}; save(); applyColors(); buildLegend(); msg('Bar colours back to the defaults for this theme.'); }
    else if (a === 'toSingle') {
      var AL = linkAlerts(); if (!AL.length) return;
      vals.lmode = 'single'; vals.lsOne = AL[0].keep; var f3 = fitLinks(); save(); refresh();
      msg('Links: one spacing over the span, ' + vals.lsOne + ' c/c.' + (f3 ? ' ' + f3 : '') + ' The earlier zone values are kept if you switch back.');
    }
    else if (a === 'reset') { vals = copyDefaults(); save(); refresh(); msg('Back to the example: a secondary beam, 900 column or wall on the left, 300 x 900 beam on the right, 5000 span, 300 x 900 beam, covers 25 top, 40 bottom, 25 sides, 40 column, all three sections shown.'); }
  });

  fitLinks(); save();   // a value saved by an older version that no longer fits the span is pulled back into range
  applyColors(); buildLegend(); syncView();
  refresh(); syncPanel();
})();
