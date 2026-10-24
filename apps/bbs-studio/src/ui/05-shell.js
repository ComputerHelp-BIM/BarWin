  /* ---------- shell ---------- */
  function renderTop() {
    var c = st.c, has = c && c.members.length;
    $('#ptitle').textContent = st.p ? st.p.name : '';
    $('#kpis').innerHTML = has ? '<span><b>' + n3(c.total.wt / 1000) + ' t</b> steel</span><span><b>' + n2(c.total.conc) + ' m\u00B3</b> concrete</span><span><b>' + n0(c.total.form) + ' m\u00B2</b> formwork</span><span><b>' + money(st.K.total) + '</b> estimate</span>' : '';
    $('#tabs').innerHTML = TABS.map(function (t) { return '<button role="tab" data-tab="' + t[0] + '" aria-selected="' + (st.tab === t[0]) + '">' + t[1] + (t[0] === 'review' && c.warnings.filter(function (w) { return w.level === 'error'; }).length ? ' <i class="dot" title="problems to look at"></i>' : '') + '</button>'; }).join('');
  }
  function renderSide() {
    var p = st.p, h = '';
    p.levels.forEach(function (lv, li) {
      h += '<h3>' + esc(lv.name) + '</h3><ul>';
      st.c.members.forEach(function (m, i) { if (m.li !== li) return; h += '<li><button class="mb" data-sel="' + i + '" aria-current="' + (i === st.sel) + '"><strong>' + esc(m.mark || '(no mark)') + '</strong><span>' + m.L + ' x ' + m.W + '</span><span>' + m.qty + ' no.</span><span class="kg">' + n0(m.wt) + ' kg</span></button></li>'; });
      h += '</ul>';
    });
    $('#side').innerHTML = '<div class="side-h"><h2>Members</h2><button data-act="addm">Add</button></div>' + h;
    $('#pick').innerHTML = st.c.members.map(function (m, i) { return '<option value="' + i + '"' + (i === st.sel ? ' selected' : '') + '>' + esc(m.mark) + '  (' + m.L + ' x ' + m.W + ', ' + m.qty + ' no.)</option>'; }).join('');
  }

