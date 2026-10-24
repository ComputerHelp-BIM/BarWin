  /* ---------- standards and rules ---------- */
  var DIAS = [8, 10, 12, 16, 20, 25, 32];
  /** Minimum bend (former) radius, inside of bend. BS 8666:2020 Table 2; IS 2502 k-factor for cold-worked / HYSD bars. Both editable in Rules. */
  var STDS = {
    BS: { name: 'BS 8666:2020', prefix: 'H', round: 25, rSmall: 2, rLarge: 3.5, rSplit: 16 },
    IS: { name: 'IS 2502 / SP 34', prefix: 'T', round: 5, rSmall: 2, rLarge: 2, rSplit: 25 }    // 2d inside radius at every size, as drawn in the user's own detailing DXF
  };
  /** BS 8666 Table 2, minimum end projection P (mm): general, and for links where the bend is under 150 degrees. Checked against a CADS RC schedule (H10 link legs 130, H10 general 120). */
  var BS_P = { general: { 6: 110, 8: 115, 10: 120, 12: 125, 16: 130, 20: 190, 25: 240, 32: 305, 40: 380, 50: 475 }, link: { 6: 110, 8: 115, 10: 130, 12: 160, 16: 210, 20: 290, 25: 365, 32: 465, 40: 580, 50: 725 } };
  /** Which dimension is the run-out, shown in brackets on a standard schedule. */
  var RUNOUT = {};   // filled from the shape library below
  function wallRules() {
    return { lap: 50, hook: 10, hookMinLeg: 75, hookMinDia: 8, hookExt: 6, hookExtMin: 65, linkEnds: 'hook135', tieHooks: 'same', cover: 40, crank: 14, crankRound: 5, crankSlope: 10, noCrankFrom: 32, round: 0, density: 7.85, vertStart: 'mid', lengthBy: 'workbook',
      ded: { '0': 0, '11': 2, '21': 4, '24': 2, '26': 2, '31': 8, '99': 5, '46': 1, '51': 12, '51A': 4, '56': 8 },
      radius: { BS: { rSmall: 2, rLarge: 3.5, rSplit: 16 }, IS: { rSmall: 2, rLarge: 2, rSplit: 25 } } };
  }
  function unitWt(R, d) { return Math.PI * d * d / 4 * R.density / 1000; }
  function ceilTo(v, m) { return m > 0 ? Math.ceil(v / m - 1e-9) * m : v; }
  function num(v, def) { var n = parseFloat(v); return isFinite(n) ? n : (def || 0); }
  function r2(v) { return Math.round(v * 100) / 100; }
  function r3(v) { return Math.round(v * 1000) / 1000; }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  /** Inside bend radius for a bar size under the project's standard. */
  function bendRadius(p, d) { var q = p.rules.wall.radius[p.standard]; return (d <= q.rSplit ? q.rSmall : q.rLarge) * d; }
  var LINK_TYPES = {
    box: { label: 'Box ring', shape: '51' }, conf: { label: 'Confining tie', shape: '99' }, master: { label: 'Master ring', shape: '51' }, gen: { label: 'General tie', shape: '99' }
  };


