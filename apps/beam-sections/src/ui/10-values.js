  function copyDefaults() { var o = {}, k; for (k in BS.DEFAULTS) o[k] = BS.DEFAULTS[k]; return o; }
  /** Reads this browser's saved values; a save from 0.2 (column left, beam right) is carried over. Anything unusable keeps its example value. */
  function load() {
    var o = copyDefaults();
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!s) { var old = JSON.parse(localStorage.getItem(OLD_KEY) || 'null'); if (old) s = { LcolW: old.colW, span: old.span, RbeamW: old.supW, RbeamD: old.supD, D: old.D, B: old.B, ctop: old.ctop, cbot: old.cbot, cside: old.cside, ccol: old.ccol }; }
      if (s) for (var k in o) {
        if (k === 'typeL' || k === 'typeR') { if (s[k] === 'col' || s[k] === 'beam') o[k] = s[k]; }
        else if (k === 'Lunder' || k === 'Runder') { if (s[k] === 'stop' || s[k] === 'under') o[k] = s[k]; }
        else if (k === 'Lanch' || k === 'Ranch') { if (['auto', 'ld', 'bend', 'bendfull', 'cover'].indexOf(s[k]) >= 0) o[k] = s[k]; }
        else if (k === 'lmode') { if (['single', 'three', 'd2', 'l3', 'pct', 'two'].indexOf(s[k]) >= 0) o[k] = s[k]; }
        else if (k === 'LlapMode' || k === 'RlapMode') { if (['x', 'l4', 'l3', 'p03', 'typed'].indexOf(s[k]) >= 0) o[k] = s[k]; }
        else if (k === 'LblapMode' || k === 'RblapMode') { if (['face', 'x', 'l4', 'l3', 'p03', 'typed'].indexOf(s[k]) >= 0) o[k] = s[k]; }
        else if (k === 'LbxMode' || k === 'RbxMode') { if (BS.BXMODES.hasOwnProperty(s[k])) o[k] = s[k]; }
        else if (k === 'tLapStyle' || k === 'bLapStyle') { if (['inline', 'offset', 'crank'].indexOf(s[k]) >= 0) o[k] = s[k]; }
        else if (k === 'textScale') { var ts = Math.round(+s[k] / 10) * 10; if (ts >= 70 && ts <= 130) o[k] = ts; }
        else if (k === 'bxLayer') { if (s[k] === 'auto' || s[k] === '1' || s[k] === '2') o[k] = s[k]; }
        else if (k === 'LxLayer' || k === 'RxLayer') { if (s[k] === 'auto' || s[k] === '1' || s[k] === '2') o[k] = s[k]; }
        else if (k === 'colors') { o.colors = {}; if (s.colors && typeof s.colors === 'object') BS.GROUPS.forEach(function (G) { if (BS.okColor(s.colors[G.k])) o.colors[G.k] = s.colors[G.k]; }); }
        else if (k === 'LxMode' || k === 'RxMode') { if (BS.XMODES.hasOwnProperty(s[k])) o[k] = s[k]; }
        else if (k === 'Lcolx' || k === 'Rcolx') { if (s[k] === 'ld' || s[k] === 'ld10') o[k] = s[k]; }
        else if (k === 'legMin') { if (BS.LEG_MIN.hasOwnProperty(s[k])) o[k] = s[k]; }
        else if (k === 'panel') { if (s[k] === 'tabs' || s[k] === 'groups') o[k] = s[k]; }
        else if (k === 'tab') { if (TABS.some(function (t) { return t[0] === s[k]; })) o[k] = s[k]; }
        else if (BS.COUNT[k]) { if (parseVal(k, String(s[k])) !== null) o[k] = s[k]; }
        else if (typeof o[k] === 'boolean') { if (typeof s[k] === 'boolean') o[k] = s[k]; }
        else if (s[k] > 0 && s[k] <= 100000) o[k] = Math.round(s[k]);
      }
    } catch (e) { /* storage unavailable: use the example */ }
    return o;
  }
  function save() { syncSame(); try { localStorage.setItem(KEY, JSON.stringify(vals)); } catch (e) { /* storage unavailable */ } }

  /** Reads "450", "450 mm", "45 cm", "0.45 m" or "1,200" as whole millimetres. Returns null when it is not a usable size. */
  function parseMM(t) {
    var m = /^(\d+(?:\.\d+)?)\s*(mm|cm|m)?$/i.exec(String(t).trim().replace(/,/g, ''));
    if (!m) return null;
    var u = (m[2] || 'mm').toLowerCase(), v = Math.round(parseFloat(m[1]) * (u === 'm' ? 1000 : u === 'cm' ? 10 : 1));
    return v > 0 && v <= 100000 ? v : null;
  }
  var HELP = 'Type a size greater than zero, in mm unless you add cm or m, for example 450, 45 cm or 0.45 m.';
  /** Reads a value for key k: a whole count for counts (face bars may be 0, link legs must be 2, 4 or 6), otherwise a size. */
  function parseVal(k, t) {
    if (!BS.COUNT[k]) return parseMM(t);
    var m = /^\s*(\d+)\s*$/.exec(String(t)); if (!m) return null; var n = parseInt(m[1], 10);
    if (k === 'legs') return n === 2 || n === 4 || n === 6 ? n : null;
    if (k === 'lPct') return n >= 1 && n <= 100 ? n : null;   // the span decides the real limits (outOfRange)
    return (k === 'faceN' || k === 'LxN' || k === 'RxN' || k === 'bxN' ? n >= 0 : n >= 1) && n <= 40 ? n : null;
  }
  /** A typed link length or spacing must fit the span; returns an error sentence, or '' when it fits. */
  function outOfRange(k, v) {
    var r = BS.linkRange(Object.assign({}, vals, (function () { var o = {}; o[k] = v; return o; })()))[k]; if (!r) return '';
    var cur = BS.linkRange(vals)[k];
    if (cur[0] > cur[1]) return 'The ' + vals.span + ' span is too short for this link distribution. Choose another distribution or a longer span.';
    var unit = k === 'lPct' ? '%' : '';
    return v < cur[0] || v > cur[1] ? 'The ' + BS.NAMES[k] + ' must be between ' + cur[0] + unit + ' and ' + cur[1] + unit + (k === 'lStart' || k === 'spcS' ? '.' : ' on a ' + vals.span + ' span.') : '';
  }
  /** After any change, pull link lengths back inside their ranges so the drawing never shows zones longer than the span. */
  function fitLinks() {
    var said = [];
    // only the values the current distribution uses; the others keep what the user typed for when they switch back
    var USE = { single: ['lsOne'], three: ['lEnd', 'lsEnd', 'lsMid'], d2: ['lsEnd', 'lsMid'], l3: ['lsEnd', 'lsMid'], pct: ['lPct', 'lsEnd', 'lsMid'], two: ['lLeft', 'lsL', 'lsR'] };
    var keys = ['lStart'].concat(USE[vals.lmode] || USE.three);
    ['L', 'R'].forEach(function (e) {
      if (vals[e + 'xMode'] === 'typed') keys.push(e + 'xLen'); if (vals[e + 'lapMode'] === 'typed') keys.push(e + 'lapLen');
      if (vals[e + 'blapMode'] === 'typed') keys.push(e + 'blapLen'); if (vals[e + 'bxMode'] === 'typed') keys.push(e + 'bxLen');
    });
    keys.forEach(function (k) {
      var r = BS.linkRange(vals)[k]; if (r[0] > r[1]) return;
      var w = Math.min(r[1], Math.max(r[0], vals[k])); if (w !== vals[k]) { vals[k] = w; said.push(BS.NAMES[k] + ' to ' + w); }
    });
    return said.length ? 'To fit the span, changed the ' + said.join(', the ') + '.' : '';
  }
