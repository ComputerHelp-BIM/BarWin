  /* ---- editing a number on the drawing: an input laid over the label ---- */
  var ed = document.createElement('input'), cur = null;
  ed.className = 'dim-ed'; ed.id = 'dimEditor'; ed.hidden = true; ed.setAttribute('inputmode', 'decimal'); ed.setAttribute('autocomplete', 'off');
  function openEd(g) {
    var sheet = g.closest('.sheet'), r = g.querySelector('text').getBoundingClientRect(), b = sheet.getBoundingClientRect(), w = Math.max(88, r.width + 32);
    sheet.appendChild(ed);
    ed.style.width = w + 'px';
    ed.style.left = Math.max(0, r.left - b.left + r.width / 2 - w / 2) + 'px';
    ed.style.top = (r.top - b.top + r.height / 2 - 17) + 'px';
    cur = { k: g.dataset.k }; ed.classList.toggle('cvr', !!BS.COVER[cur.k]);
    ed.value = vals[cur.k]; ed.setAttribute('aria-label', 'New ' + BS.NAMES[cur.k] + (BS.COUNT[cur.k] ? '' : ' in mm'));
    var rr = BS.linkRange(vals)[cur.k]; ed.placeholder = rr ? rr[0] + ' to ' + rr[1] : ''; ed.title = rr ? 'Between ' + rr[0] + ' and ' + rr[1] : ''; ed.removeAttribute('aria-invalid');
    ed.hidden = false; ed.focus(); ed.select();
  }
  function closeEd(commit, fromBlur) {
    if (!cur) return;
    var k = cur.k;
    if (commit) {
      var v = parseVal(k, ed.value);
      if (v === null) {
        if (!fromBlur) { ed.setAttribute('aria-invalid', 'true'); msg(helpFor(k), true); return; }
        msg('"' + ed.value + '" is not usable, so the ' + BS.NAMES[k] + ' stays ' + vals[k] + (BS.COUNT[k] ? '.' : ' mm.'), true); commit = false;
      }
      var bad = commit ? outOfRange(k, v) : '';
      if (bad) { if (!fromBlur) { ed.setAttribute('aria-invalid', 'true'); msg(bad, true); return; } msg(bad + ' It stays ' + vals[k] + '.', true); commit = false; }
      if (commit) { vals[k] = v; if (apartFromMid(k)) buildForm(); var fit = fitLinks(); save(); msg(cap(BS.NAMES[k]) + ' set to ' + v + (BS.COUNT[k] ? '.' : ' mm.') + (fit ? ' ' + fit : '')); }
    }
    cur = null; ed.hidden = true; render();
    if (!fromBlur) { var g = document.querySelector('.ed[data-k="' + k + '"]'); if (g) g.focus({ preventScroll: true }); }
  }
  ed.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); closeEd(true); } else if (e.key === 'Escape') { e.preventDefault(); closeEd(false); } });
  ed.addEventListener('blur', function () { closeEd(true, true); });
  document.addEventListener('click', function (e) { var g = e.target.closest && e.target.closest('.dw .ed'); if (g) openEd(g); });
  /* ---- anchorage choice on the drawing: click the note under a support's name ---- */
  var chEd = document.createElement('select'), chK = null;
  chEd.className = 'ch-ed'; chEd.id = 'anchChoice'; chEd.hidden = true;
  function anchOptions(k) {
    if (vals['type' + k] === 'beam') return [['auto|', 'Auto (by support width)'], ['bendfull|', 'Bent to the cover'], ['ld|', 'Straight Ld'], ['cover|', 'Straight to the cover']];
    return [['auto|ld', 'Auto, Ld'], ['auto|ld10', 'Auto, Ld + 10\u00D8'], ['ld|ld', 'Straight Ld'], ['ld|ld10', 'Straight Ld + 10\u00D8'], ['bend|ld', 'Bent, Ld'], ['bend|ld10', 'Bent, Ld + 10\u00D8']];
  }
  function openCh(g) {
    var k = g.dataset.ch, sheet = g.closest('.sheet'), r = g.getBoundingClientRect(), b = sheet.getBoundingClientRect();
    var cur2 = (['auto', 'ld', 'bend', 'bendfull', 'cover'].indexOf(vals[k + 'anch']) >= 0 ? vals[k + 'anch'] : 'auto') + '|' + (vals['type' + k] === 'beam' ? '' : vals[k + 'colx'] === 'ld10' ? 'ld10' : 'ld');
    chEd.innerHTML = anchOptions(k).map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur2 ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');
    chEd.setAttribute('aria-label', (k === 'L' ? 'Left' : 'Right') + ' end anchorage');
    sheet.appendChild(chEd); chK = k;
    chEd.style.left = Math.max(0, r.left - b.left + r.width / 2 - 120) + 'px'; chEd.style.top = (r.top - b.top + r.height / 2 - 17) + 'px'; chEd.style.width = '240px';
    chEd.hidden = false; chEd.focus(); try { chEd.showPicker(); } catch (x) { /* older browsers: the list opens on the next click or arrow key */ }
  }
  function closeCh(commit) {
    if (!chK) return; var k = chK; chK = null; chEd.hidden = true;
    if (commit) {
      var p2 = chEd.value.split('|'); vals[k + 'anch'] = p2[0]; if (p2[1]) vals[k + 'colx'] = p2[1]; save(); refresh();
      msg((k === 'L' ? 'Left' : 'Right') + ' end anchorage: ' + chEd.options[chEd.selectedIndex].text.toLowerCase() + '.');
    }
    var g = document.querySelector('.ch[data-ch="' + k + '"]'); if (g) g.focus({ preventScroll: true });
  }
  chEd.addEventListener('change', function () { closeCh(true); });
  chEd.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); closeCh(false); } else if (e.key === 'Enter') { e.preventDefault(); closeCh(true); } });
  chEd.addEventListener('blur', function () { if (chK) closeCh(false); });
  document.addEventListener('click', function (e) { var g = e.target.closest && e.target.closest('.dw .ch'); if (g) openCh(g); });
  document.addEventListener('keydown', function (e) { var g = e.target.closest && e.target.closest('.dw .ch'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openCh(g); } });
  function toggleSec(x) { var k = x.dataset.s; vals['show' + k] = !vals['show' + k]; save(); render(); msg('Section ' + k + '-' + k + (vals['show' + k] ? ' shown.' : ' hidden.')); var n = document.querySelector('.sx[data-s="' + k + '"]'); if (n) n.focus({ preventScroll: true }); }
  document.addEventListener('click', function (e) { var x = e.target.closest && e.target.closest('.dw .sx'); if (x) toggleSec(x); });
  document.addEventListener('keydown', function (e) { var x = e.target.closest && e.target.closest('.dw .sx'); if (x && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); toggleSec(x); } });
  document.addEventListener('keydown', function (e) { var g = e.target.closest && e.target.closest('.dw .ed'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openEd(g); } });

