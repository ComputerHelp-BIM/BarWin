  /**
   * Advice on the link distribution, never a block: end zones that cover the clear span (drawn as one spacing),
   * and two zones with the same spacing, where one spacing over the span says the same thing more simply.
   * Each alert carries the spacing a switch to one spacing would keep.
   */
  function linkAlerts() {
    var out = [], m = vals.lmode, EZ = BS.endZone(vals);
    if (EZ.whole) out.push({ keep: vals.lsEnd, text: (m === 'd2' ? '2 \u00D7 depth = ' + EZ.want + ' at each end' : vals.lPct + '% of the span = ' + EZ.want + ' at each end') +
      ' covers the ' + vals.span + ' clear span (' + EZ.want + ' + ' + EZ.want + ' \u2265 ' + vals.span + '), so no mid zone is left. Links are drawn at one spacing over the span, ' + vals.lsEnd + ' c/c, the end-zone spacing.' });
    else if (BS.isEnds(vals) && vals.lsEnd === vals.lsMid) out.push({ keep: vals.lsEnd, text: 'Ends and mid-span both have ' + vals.lsEnd + ' c/c. One spacing over the span gives the same links more simply.' });
    if (m === 'two' && vals.lsL === vals.lsR) out.push({ keep: vals.lsL, text: 'The left and right zones both have ' + vals.lsL + ' c/c. One spacing over the span gives the same links more simply.' });
    return out;
  }
  /**
   * Advice on the extra top bars, never a block: the two ends' extras overlapping, extras pushed to a second layer,
   * a second layer too tight, and a straight Ld that does not fit the support.
   */
  function barAlerts() {
    var out = [], X = { L: BS.extraTop(vals, 'L'), R: BS.extraTop(vals, 'R') }, side = { L: 'Left', R: 'Right' };
    if (X.L.n && X.R.n && X.L.len + X.R.len > vals.span)
      out.push('The left (' + X.L.len + ') and right (' + X.R.len + ') extra top bars overlap by ' + (X.L.len + X.R.len - vals.span) + ' in the ' + vals.span + ' span. Check the cut-off lengths, or run them full length as main bars.');
    ['L', 'R'].forEach(function (k) {
      var x = X[k]; if (!x.n) return;
      var lay = BS.layersAt(vals, k), mains = lay.row1.filter(function (b) { return !b.x; }).concat(lay.row2.filter(function (b) { return !b.x; }));
      var tag = mains.length + ' main + ' + x.n + '-T' + x.dia, one = lay.gapAll;
      if (lay.bumped)
        out.push(side[k] + ' end: layer 1 was chosen, but ' + tag + ' leave ' + Math.round(one) + ' mm between bars; at least ' + lay.need + ' is needed, so the extra bars go in layer 2 on a T' + lay.need + ' spacer bar.');
      if (lay.second) {
        if (x.n > 1 && lay.gap2 < lay.need) out.push(side[k] + ' end: the second layer of ' + x.n + '-T' + x.dia + ' leaves only ' + Math.round(lay.gap2) + ' mm between bars; at least ' + lay.need + ' is needed. Use fewer or smaller extra bars, or a wider beam.');
      }
      var a = BS.anchorage(vals, k, x.dia); if (!a.fits) out.push(side[k] + ' end, extra top bars: straight Ld needs ' + a.ld + ' but the support gives ' + a.avail + '.');
    });
    // laps where the top bars change: the lap must fit inside the end area, and the two ends must not cross
    var C2 = { L: BS.topChange(vals, 'L'), R: BS.topChange(vals, 'R') };
    ['L', 'R'].forEach(function (k) {
      var c = C2[k]; if (c.ch === 'none') return;
      if (c.lap > c.at) out.push(side[k] + ' end: the ' + c.lap + ' lap (' + vals.lapF + ' \u00D7 T' + Math.min(c.z.d, c.M.d) + ') is longer than the ' + c.at + ' lap point, so it runs to the support face. Move the lap point further into the span.');
    });
    if (C2.L.ch !== 'none' && C2.R.ch !== 'none' && C2.L.at + C2.R.at > vals.span)
      out.push('The left (' + C2.L.at + ') and right (' + C2.R.at + ') lap points cross in the ' + vals.span + ' span. Check the lap points.');
    // bottom: laps, extras and their layer
    var B2 = { L: BS.barChange(vals, 'b', 'L'), R: BS.barChange(vals, 'b', 'R') }, XBa = BS.extraBot(vals);
    ['L', 'R'].forEach(function (k) {
      var c = B2[k]; if (c.ch === 'none' || c.mode === 'face') return;
      if (c.lap > c.at) out.push(side[k] + ' end, bottom: the ' + c.lap + ' lap is longer than the ' + c.at + ' lap point, so it runs to the support face. Use the junction lap or move the lap point.');
    });
    if (B2.L.ch !== 'none' && B2.R.ch !== 'none' && B2.L.at + B2.R.at > vals.span) out.push('The left and right bottom lap points cross in the ' + vals.span + ' span.');
    if (XBa.n) {
      if (XBa.cut.L + XBa.cut.R >= vals.span) out.push('The bottom extra cut-offs (' + XBa.cut.L + ' + ' + XBa.cut.R + ') leave no length in the ' + vals.span + ' span.');
      var bl = BS.botLayersAt(vals, vals.span / 2), tagB = bl.row1.concat(bl.row2).filter(function (b) { return !b.x; }).length + ' main + ' + XBa.n + '-T' + XBa.d;
      if (bl.bumped) out.push('Bottom: layer 1 was chosen, but ' + tagB + ' leave ' + Math.round(bl.gapAll) + ' mm between bars; at least ' + bl.need + ' is needed, so the extra bottom bars go in layer 2 on a T' + bl.need + ' spacer bar.');
      if (bl.second && XBa.n > 1 && bl.gap2 < bl.need) out.push('Bottom: the second layer of ' + XBa.n + '-T' + XBa.d + ' leaves only ' + Math.round(bl.gap2) + ' mm between bars; at least ' + bl.need + ' is needed.');
    }
    return out;
  }
