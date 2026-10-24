  /* ---- settings as tabs or collapsible groups ---- */
  function syncPanel() {
    var tabs = vals.panel !== 'groups', form = $('#vals'), groups = [].slice.call(form.querySelectorAll('.pg'));
    form.classList.toggle('mode-tabs', tabs);
    $('#pm-' + (tabs ? 'tabs' : 'groups')).checked = true;
    $('#tabbar').hidden = !tabs; $('#grpActs').hidden = tabs;
    if (tabs) {
      groups.forEach(function (g) { g.open = true; g.classList.toggle('on', g.dataset.tab === vals.tab); });
      var nWarn = document.querySelectorAll('#checks li:not(.ok)').length;
      $('#tabbar').innerHTML = TABS.map(function (t) {
        var on = t[0] === vals.tab;
        return '<button type="button" role="tab" id="tab-' + t[0] + '" data-tab="' + t[0] + '" aria-selected="' + on + '" tabindex="' + (on ? 0 : -1) + '">' + t[1] + (t[0] === 'checks' && nWarn ? '<span class="cnt">' + nWarn + '</span>' : '') + '</button>';
      }).join('');
    } else groups.forEach(function (g) { g.classList.remove('on'); });
  }
  function showTab(id, focus) { vals.tab = id; save(); syncPanel(); renderSheet(true); if (focus) { var b = $('#tab-' + id); if (b) b.focus(); } }
  $('#panelMode').addEventListener('change', function (e) {
    vals.panel = e.target.value === 'groups' ? 'groups' : 'tabs'; save(); syncPanel(); renderSheet(true);
    msg(vals.panel === 'tabs' ? 'Settings shown as tabs, one at a time.' : 'Settings shown as groups; click a heading to open or close it.');
  });
  $('#tabbar').addEventListener('click', function (e) { var b = e.target.closest('button[data-tab]'); if (b) showTab(b.dataset.tab); });
  $('#tabbar').addEventListener('keydown', function (e) {
    var i = TABS.map(function (t) { return t[0]; }).indexOf(vals.tab), n = TABS.length;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); showTab(TABS[(i + (e.key === 'ArrowRight' ? 1 : n - 1)) % n][0], true); }
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); showTab(TABS[e.key === 'Home' ? 0 : n - 1][0], true); }
  });
  /** Rebuilds the form (its fields depend on the supports) without losing the field the user was on. */
  function refresh() { var id = document.activeElement && document.activeElement.id; buildForm(); render(); if (id && document.getElementById(id)) document.getElementById(id).focus({ preventScroll: true }); }

