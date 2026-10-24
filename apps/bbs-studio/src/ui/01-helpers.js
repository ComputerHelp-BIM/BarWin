  /* ---------- helpers ---------- */
  function n0(v) { return Math.round(v).toLocaleString('en-IN'); }
  function n2(v) { return (Math.round(v * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function n3(v) { return (Math.round(v * 1000) / 1000).toLocaleString('en-IN', { maximumFractionDigits: 3 }); }
  function money(v) { return '\u20B9 ' + n0(v); }
  var toastTimer = null;
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('on'); }, 5000); }
  function ask(title, bodyHTML, buttons) {
    return new Promise(function (res) {
      var d = $('#dlg');
      d.innerHTML = '<h2>' + esc(title) + '</h2><div class="dlg-body">' + bodyHTML + '</div><div class="dlg-btns">' + buttons.map(function (b, i) { return '<button data-v="' + esc(b.v) + '"' + (i === 0 ? ' class="primary"' : '') + '>' + esc(b.t) + '</button>'; }).join('') + '</div>';
      function done(v) { d.removeEventListener('click', onClick); d.removeEventListener('cancel', onCancel); if (d.open) d.close(); res(v); }
      function onClick(e) { var b = e.target.closest('button[data-v]'); if (b) done(b.dataset.v); }
      function onCancel(e) { e.preventDefault(); done('cancel'); }
      d.addEventListener('click', onClick); d.addEventListener('cancel', onCancel);
      if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    });
  }
  function slug() { return (st.p.name || 'project').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'project'; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function table(aoa, cls) {
    return '<div class="scroll"><table class="data ' + (cls || '') + '"><thead><tr>' + aoa[0].map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      aoa.slice(1).map(function (r) { return r.length ? '<tr' + (/^total|^sub-total|^gst/i.test(String(r[0])) ? ' class="tot"' : '') + '>' + r.map(function (v) { return '<td>' + esc(typeof v === 'number' ? v.toLocaleString('en-IN', { maximumFractionDigits: 3 }) : (v === undefined || v === null ? '' : v)) + '</td>'; }).join('') + '</tr>' : ''; }).join('') + '</tbody></table></div>';
  }
  function opts(arr, cur, label) { return arr.map(function (v) { return '<option value="' + esc(v) + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + esc(label ? label(v) : v) + '</option>'; }).join(''); }
  /** A typed input. id is unique per field so focus survives a redraw. */
  function inp(id, v, attrs, type) { return '<input class="in" type="' + (type || 'text') + '" ' + (type ? '' : 'inputmode="decimal" ') + 'autocomplete="off" data-id="' + id + '" value="' + esc(v) + '" ' + (attrs || '') + '>'; }
  function sel(id, options, cur, label, attrs) { return '<select class="in" data-id="' + id + '" ' + (attrs || '') + '>' + opts(options, cur, label) + '</select>'; }
  function fld(label, control, hint) { return '<label class="f"><span>' + label + '</span>' + control + (hint ? '<small>' + hint + '</small>' : '') + '</label>'; }
  function mem() { return st.c.members[st.sel]; }
  function memSrc(m) { m = m || mem(); return m ? st.p.levels[m.li].members[m.mi] : null; }

