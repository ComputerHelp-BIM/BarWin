  /* ---- the form: what each end rests on, then the sizes ---- */
  $('#vals').addEventListener('change', function (e) {
    var i = e.target;
    if (i.dataset && i.dataset.same) {
      var kk = i.dataset.same, ek = kk[0], sd2 = kk[1]; vals[ek + sd2 + 'Same'] = i.checked; syncSame(); save(); refresh();
      var mz = sd2 === 't' ? vals.topN + '-T' + vals.topDia : vals.botN + '-T' + vals.botDia;
      msg((ek === 'L' ? 'Left' : 'Right') + ' end ' + (sd2 === 't' ? 'top' : 'bottom') + ' bars: ' + (i.checked ? 'the same as mid, ' + mz + ', running through.' : 'set apart from mid; change the count or size here or on the drawing.'));
      return;
    }
    if (i.name === 'typeL' || i.name === 'typeR') {
      vals[i.name] = i.value; vals[i.name.slice(-1) + 'anch'] = 'auto'; save(); refresh();
      var K = KIND[BS.beamClass(vals)]; msg((i.name === 'typeL' ? 'Left' : 'Right') + ' end now rests on a ' + ENDS[i.value] + '. This is a ' + K[0].toLowerCase() + '.');
      return;
    }
    if (i.dataset && i.dataset.x) {
      vals[i.dataset.x] = i.value; var f4 = fitLinks(); save(); refresh();
      var x = BS.extraTop(vals, i.dataset.x[0]), sd = i.dataset.x[0] === 'L' ? 'Left' : 'Right';
      var xk = i.dataset.x, txt2 = i.options[i.selectedIndex].text.toLowerCase();
      if (xk === 'bxLayer') msg('Bottom extra bars: ' + txt2 + '.');
      else if (/LapStyle$/.test(xk)) msg((xk[0] === 't' ? 'Top' : 'Bottom') + ' laps drawn ' + txt2 + '.');
      else if (/bxMode$/.test(xk)) msg(sd + ' bottom extra cut-off: ' + (vals[xk] === 'typed' ? 'type it in mm from the support face.' : BS.extraBot(vals).cut[xk[0]] + ' mm from the face (' + txt2 + ').'));
      else if (/Layer$/.test(xk)) msg(sd + ' extra top bars: ' + txt2 + '.');
      else if (/lapMode$/.test(xk)) { var sdx = /^[LR]b/.test(xk) ? 'b' : 't', lc = BS.barChange(vals, sdx, xk[0]); msg(sd + (sdx === 'b' ? ' bottom' : ' top') + ' lap point: ' + (vals[xk] === 'typed' ? 'type it in mm from the support face' : lc.mode === 'face' ? 'at the junction, the lap runs ' + (lc.lap || vals.lapF + ' \u00D7 bar') + ' from the face' : lc.at + ' mm from the support face') + (lc.ch === 'none' ? ' (used once this end\u2019s bars differ from mid).' : '.')); }
      else msg(sd + ' extra top bars: ' + (x.basis ? x.basis + ' = ' + x.len + ' mm' : 'type the length') + ' from the support face.' + (f4 ? ' ' + f4 : ''));
      return;
    }
    if (i.dataset && i.dataset.opt) { vals[i.dataset.opt] = i.value; save(); render(); msg('Shortest bent leg: ' + i.options[i.selectedIndex].text + '. Legs shorter than this are lengthened to it.'); return; }
    if (i.dataset && i.dataset.c) { vals[i.dataset.c] = i.value; save(); render(); msg((i.dataset.c[0] === 'L' ? 'Left' : 'Right') + ' end anchorage: ' + i.options[i.selectedIndex].text.toLowerCase() + '.'); return; }
    if (i.name === 'Lcolx' || i.name === 'Rcolx') { vals[i.name] = i.value; save(); render(); msg((i.name[0] === 'L' ? 'Left' : 'Right') + ' column or wall: anchorage ' + (i.value === 'ld10' ? 'Ld + 10 x bar size.' : 'Ld.')); return; }
    if (i.name === 'lmode') { vals.lmode = i.value; var fit2 = fitLinks(); save(); refresh(); msg('Links: ' + i.nextElementSibling.textContent.toLowerCase() + '.' + (fit2 ? ' ' + fit2 : '')); return; }
    if (i.name === 'Lunder' || i.name === 'Runder') { vals[i.name] = i.value; save(); render(); msg((i.name === 'Lunder' ? 'Left' : 'Right') + ' end: the beam ' + (i.value === 'under' ? 'runs under the support beam to its far face.' : 'stops at the support beam\u2019s face.')); return; }
    var k = i.dataset && i.dataset.k; if (!k) return;
    var v = parseVal(k, i.value);
    if (v === null) { i.setAttribute('aria-invalid', 'true'); msg(helpFor(k), true); return; }
    var bad = outOfRange(k, v); if (bad) { i.setAttribute('aria-invalid', 'true'); msg(bad, true); return; }
    i.removeAttribute('aria-invalid'); vals[k] = v; apartFromMid(k); var fit = fitLinks(); msg(fit); save(); render(); i.value = vals[k];
  });
  $('#vals').addEventListener('submit', function (e) { e.preventDefault(); });

