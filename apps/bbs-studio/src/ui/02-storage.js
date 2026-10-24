  /* ---------- storage ---------- */
  function load() {
    try { var raw = localStorage.getItem(KEY) || localStorage.getItem(OLDKEYS[0]) || localStorage.getItem(OLDKEYS[1]); if (raw) { var p = upgrade(JSON.parse(raw)); if (p) { st.pristine = false; return B.normalise(p); } } } catch (e) { /* empty or blocked storage */ }
    return null;
  }
  /** Accepts project files from 0.5 onwards. Files from before 0.7 carried the old IS bend radii (4d and 6d); they take the new default of 2d. */
  function upgrade(p) {
    if (!p || p.app !== 'bbs-studio' || [5, 6, 7].indexOf(p.schema) < 0) return null;
    if (p.schema < 7 && p.rules && p.rules.wall && p.rules.wall.radius) delete p.rules.wall.radius.IS;
    p.schema = 7; return p;
  }
  /** The four presentations, shared by the wall drawings and the shape-code figures. */
  function modeButtons() { return '<div class="seg" role="group" aria-label="Bar presentation">' + B.BAR_MODES.map(function (m) { return '<button data-bar2d="' + m[0] + '" aria-pressed="' + (st.bar2d === m[0]) + '">' + m[1] + '</button>'; }).join('') + '</div>'; }
  /** The mode handed to the wall drawings: one of the four bar presentations, with '@pres' added for the presentation view. */
  function drawMode() { return st.bar2d + (st.size2d === 'pres' ? '@pres' : ''); }
  function sizeButtons() { return '<div class="seg" role="group" aria-label="View size"><button data-size2d="real" aria-pressed="' + (st.size2d === 'real') + '">Real view</button><button data-size2d="pres" aria-pressed="' + (st.size2d === 'pres') + '">Presentation view</button></div>'; }
  function sizeLegend(M) { var seen = {}, S = B.STDS[st.p.standard]; M.bars.forEach(function (b) { if (b.protos.length) seen[b.dia] = 1; });
    return '<div class="szleg" aria-label="Bar size colours">' + Object.keys(seen).map(Number).sort(function (a, b) { return a - b; }).map(function (k) { return '<span><i style="background:' + B.SIZE_COL[k][0] + '"></i>' + S.prefix + k + '</span>'; }).join('') + '</div>'; }
  function modeClass() { var k = B.BAR_MODES.filter(function (m) { return m[0] === st.bar2d; })[0]; return k ? k[2] : 'm1'; }
  (function () { var el = document.createElement('style'); el.textContent = B.SIZE_CSS; document.head.appendChild(el); })();   // a colour per bar size, shared with the drawings
  var saveTimer = null;
  function recalc() {
    st.c = B.compute(st.p); st.plan = B.cuttingPlan(st.p, st.c); st.K = B.costing(st.p, st.c, st.plan);
    // the same project by the other length method, for the comparison on Review (hook legs differ between methods, so it is a full recalculation)
    var q = JSON.parse(JSON.stringify(st.p)), by = st.p.rules.wall.lengthBy; q.rules.wall.lengthBy = by === 'standard' ? 'workbook' : 'standard'; var o = B.compute(B.normalise(q)).total.wt;
    st.kgWb = by === 'standard' ? o : st.c.total.wt; st.kgStd = by === 'standard' ? st.c.total.wt : o;
    if (st.sel >= st.c.members.length) st.sel = Math.max(0, st.c.members.length - 1);
    clearTimeout(saveTimer); saveTimer = setTimeout(function () { try { localStorage.setItem(KEY, JSON.stringify(st.p)); } catch (e) { /* storage unavailable */ } }, 400);
  }

