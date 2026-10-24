  function render() {
    $('#sheetL').innerHTML = BS.lSection(vals, { ia: true });
    var shown = ['B', 'A', 'C'].filter(function (k) { return vals['show' + k]; });
    $('#secs').innerHTML = shown.length ? shown.map(function (k) {
      return '<figure class="view x"><figcaption><h2>Section ' + k + '-' + k + '</h2><small>' + { A: 'Cut at mid-span', B: 'Near the left end', C: 'Near the right end' }[k] + '</small><button type="button" class="mini" data-act="copyX" data-s="' + k + '">Copy SVG</button></figcaption>' +
        '<div class="sheet"><div class="svgbox">' + BS.xSection(vals, { ia: true, letter: k }) + '</div></div></figure>';
    }).join('') : '<p class="none">No cross-sections shown. Tick the box under a section mark on the L-section to show one.</p>';
    [].forEach.call(document.querySelectorAll('#vals input[data-k]'), function (i) { if (document.activeElement !== i) { i.value = vals[i.dataset.k]; i.removeAttribute('aria-invalid'); } });
    var w = function (k) { return vals[k + (vals['type' + k] === 'col' ? 'colW' : 'beamW')]; };
    $('#overall').textContent = (w('L') + vals.span + w('R')) + ' mm';
    ['L', 'R'].forEach(function (k) {
      var el = $('#note' + k); if (!el) return;
      var kase = BS.supportCase(vals, k); el.textContent = kase === 'flush' ? 'Same as the beam: drawn flush' : kase === 'deeper' ? 'Deeper than the beam: drawn 200 deeper' : 'Shallower than the beam: drawn 200 shallower';
      $('#und' + k).hidden = kase !== 'shallower';
    });
    var RG = BS.linkRange(vals); [].forEach.call(document.querySelectorAll('small.rng'), function (el) { var r = RG[el.id.slice(3)]; var u = el.id === 'rg-lPct' ? '%' : ''; el.textContent = r[0] <= r[1] ? 'Valid ' + r[0] + u + ' to ' + r[1] + u : 'Span too short'; });
    // top bar zones and laps
    ['t', 'b'].forEach(function (sd) {
      ['L', 'R'].forEach(function (k) {
        var c = BS.barChange(vals, sd, k), el = $('#tz' + k + sd), lp = $('#lp' + k + sd); if (!el) return;
        el.textContent = c.ch === 'none' ? 'Runs through from mid, no lap' : c.z.n + '-T' + c.z.d + ' here; ' + (c.ch === 'dia' ? 'all bars lap' : 'common bars run through, the rest lap or stop');
        if (lp) lp.textContent = c.ch === 'none' ? 'Not used while the end runs through' : c.mode === 'face' ? 'Lap ' + c.lap + ' from the support face into the span' : c.at + ' mm from the face' + (c.basis && c.mode !== 'typed' ? ' (' + c.basis + ')' : '') + '; lap ' + c.lap + ', ending here';
      });
    });
    var XBn = BS.extraBot(vals);
    ['L', 'R'].forEach(function (k) { var el = $('#bxh' + k); if (el) el.textContent = XBn.n ? XBn.cut[k] + ' mm from the face' : 'No bottom extras'; });
    if ($('#bxl')) { var bl0 = BS.botLayersAt(vals, vals.span / 2); $('#bxl').textContent = !XBn.n ? '' : (bl0.second ? 'Layer 2, on spacer bars' : 'Layer 1, with the main bars') + (bl0.bumped ? ' (layer 1 too tight)' : vals.bxLayer === 'auto' ? ' (auto)' : ' (chosen)'); }
    // extra top bars: the length each end gets, and whether they share the main bars' layer
    ['L', 'R'].forEach(function (k) {
      var x = BS.extraTop(vals, k), el = $('#xh' + k); if (!el) return;
      if (!x.n) { el.textContent = 'No extra bars at this end'; return; }
      var lay = BS.layersAt(vals, k);
      el.textContent = (x.basis ? x.basis + ' = ' + x.len + ' mm' : x.len + ' mm') + ' from the face; ' + (lay.second ? 'layer 2, on spacer bars' : 'layer 1, with the main bars') + (lay.bumped ? ' (layer 1 too tight)' : vals[k + 'xLayer'] === 'auto' ? ' (auto)' : ' (chosen)');
    });
    // anchorage, as worked out for each end
    var AN = { ld: 'straight Ld', bend: 'bent', bendfull: 'bent to the cover', cover: 'straight to the cover' };
    ['L', 'R'].forEach(function (k) {
      var at = BS.anchorage(vals, k, vals.topDia), ab = BS.anchorage(vals, k, vals.botDia), el = $('#an' + k); if (!el) return;
      el.textContent = 'Ld ' + at.ld + (ab.ld !== at.ld ? ' / ' + ab.ld : '') + ', support gives ' + at.avail + '. Auto: ' + AN[at.auto] + (ab.auto !== at.auto ? ' top, ' + AN[ab.auto] + ' bottom' : '') + '.';
    });
    if ($('#legMinHow')) { var lm1 = BS.legMin(vals, vals.topDia); $('#legMinHow').textContent = BS.LEG_MIN[lm1.mode] + '; T' + vals.topDia + ': ' + lm1.min + ' mm'; }
    // checks a detailer would make: bar spacing, legs against bars, straight anchorage that does not fit
    var C = [], Bw = vals.B - 2 * vals.cside - 2 * vals.ldia;
    var ZC = [['top', vals.topN, vals.topDia], ['bottom', vals.botN, vals.botDia]];
    ['L', 'R'].forEach(function (k) {
      if (vals[k + 'tSame'] === false) ZC.push([(k === 'L' ? 'left end top' : 'right end top'), vals[k + 'tN'], vals[k + 'tDia']]);
      if (vals[k + 'bSame'] === false) ZC.push([(k === 'L' ? 'left end bottom' : 'right end bottom'), vals[k + 'bN'], vals[k + 'bDia']]);
    });
    ZC.forEach(function (r) {
      if (r[1] < 2) return; var gap = (Bw - r[1] * r[2]) / (r[1] - 1), need = Math.max(r[2], 25);
      if (gap < need) C.push(cap(r[0]) + ' bars: ' + r[1] + '-T' + r[2] + ' in a ' + vals.B + ' wide beam leave ' + Math.round(gap) + ' mm between bars; at least ' + need + ' is needed. Use fewer bars, a larger size, or a second layer.');
    });
    if (vals.legs > Math.min(vals.topN, vals.botN)) C.push(vals.legs + '-legged links need at least ' + vals.legs + ' bars top and bottom to wrap; there are ' + vals.topN + ' top and ' + vals.botN + ' bottom.');
    var need = vals.lmode === 'three' ? 'lEnd' : vals.lmode === 'pct' ? 'lPct' : vals.lmode === 'two' ? 'lLeft' : null; if (need && RG[need][0] > RG[need][1]) C.push('The ' + vals.span + ' span is too short for this link distribution; use one spacing over the span.');
    var EZ = BS.endZone(vals), AL = linkAlerts(), XA = barAlerts();
    // the alert over the drawing (links with a one-click switch, then top bars); the same advice is listed under Checks
    $('#lkAlert').hidden = !(AL.length || XA.length);
    $('#lkAlert').innerHTML = AL.map(function (a) { return '<p><b>Links</b>' + a.text + '</p>'; }).join('') +
      (AL.length ? '<button type="button" class="mini" data-act="toSingle">Switch to one spacing over the span</button>' : '') +
      XA.map(function (t) { return '<p><b>Bars</b>' + t + '</p>'; }).join('');
    AL.forEach(function (a) { C.push({ warn: a.text }); });
    XA.forEach(function (t) { C.push({ warn: t }); });
    if (vals.D > 750 && vals.faceN === 0) C.push('The beam is deeper than 750 mm, so face bars are usually needed on each side.');
    ['L', 'R'].forEach(function (k) { [['top', BS.barZone(vals, 't', k).d], ['bottom', BS.barZone(vals, 'b', k).d]].forEach(function (r) { var a = BS.anchorage(vals, k, r[1]); if (!a.fits) C.push((k === 'L' ? 'Left' : 'Right') + ' end, ' + r[0] + ' bars: straight Ld needs ' + a.ld + ' but the support gives ' + a.avail + '.'); }); });
    // real link count, zone by zone, with the spacing each zone actually gets (never wider than typed)
    var LKL = BS.linkLayout(vals);
    if ($('#lkEnd')) { $('#lkEnd').textContent = Math.round(EZ.len) + ' mm'; $('#lkEndHow').textContent = (vals.lmode === 'd2' ? '2 \u00D7 ' + vals.D + ' depth' : vals.lmode === 'l3' ? vals.span + ' span / 3' : vals.lPct + '% of ' + vals.span) + (EZ.whole ? '; ends cover the span' : ''); }
    $('#lkTotal').textContent = LKL.total + ' nos';
    $('#lkHow').textContent = LKL.zones.filter(function (z) { return z.n > 0; }).map(function (z) { return z.n + ' @ ' + Math.round(z.pitch); }).join(' + ') + ' actual c/c; first and last ' + vals.lStart + ' from the support faces';
    $('#checks').innerHTML = C.length ? C.map(function (t) { return t.warn ? '<li class="warn">' + t.warn + '</li>' : '<li>' + t + '</li>'; }).join('') : '<li class="ok">No problems found.</li>';
    if (vals.panel !== 'groups') syncPanel();
    var K = KIND[BS.beamClass(vals)];
    $('#kind').innerHTML = '<b>' + K[0] + '</b> &middot; ' + K[1];
    $('#lcap').textContent = cap(ENDS[vals.typeL]) + ' left, ' + ENDS[vals.typeR] + ' right';
  }
