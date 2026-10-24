  /* ---------- DXF (entities injected into an ezdxf-built R2010 skeleton) ---------- */
  var LAYER = { OUT: 'CONCRETE', RB: 'MAIN BARS', RL: 'LINKS', SH: 'BAR SHAPES', GH: 'BARS BELOW', CL: 'BAR CENTRE', TTL: 'S070T_Text', DIM: 'dim', TAG: 'TEXT', TXT: 'TEXT', TBL: 'BBS TABLE', TBT: 'BBS TEXT' };
  // real view: one layer per bar size, so sizes can be isolated, recoloured or frozen in CAD
  Object.keys(SIZE_COL).forEach(function (k) { LAYER['D' + k] = 'BAR-' + ('0' + k).slice(-2); });
  var SCALES = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000], VP = { w: 791, h: 504 };
  function dxfText(s) { return String(s).replace(/[\r\n]+/g, ' ').replace(/[^\x20-\x7e]/g, function (ch) { return '\\U+' + ('0000' + ch.charCodeAt(0).toString(16).toUpperCase()).slice(-4); }); }
  function n6(v) { return (Math.round(v * 1000) / 1000).toString(); }
  /** Picks the sheet scale so everything fits the A1 viewport, with 2.5 mm text on paper. */
  function fitSheet(build) {
    var s = 25, d = null, i, need, s2;
    for (i = 0; i < 6; i++) {
      d = build(2.5 * s); need = Math.max(d.w() / VP.w, d.h() / VP.h) * 1.04;
      s2 = SCALES.filter(function (v) { return v >= need; })[0] || Math.ceil(need / 1000) * 1000;
      if (s2 === s || (s2 < s && i > 0)) return { dwg: d, scale: s };
      s = s2;
    }
    return { dwg: build(2.5 * s), scale: s };
  }
  /** One drawing sheet. build(T) returns the drawing for text height T (model mm); the scale is chosen so it fits A1 with 2.5 mm text. */
  function toDXF(template, p, build, msOwner, dateStr, sheetTitle) {
    var fit = fitSheet(build), d = fit.dwg, s = fit.scale, h = 0x1000, out = [];
    function head(type, layer, dash) { out.push('  0', type, '  5', (h++).toString(16).toUpperCase(), '330', msOwner, '100', 'AcDbEntity', '  8', LAYER[layer] || '0'); if (dash) out.push('  6', 'DASHED', ' 48', n6(s / 25)); }
    d.p.forEach(function (q) {
      if (q.t === 'line') { head('LINE', q.sz ? 'D' + q.sz : q.l, q.dash); out.push('100', 'AcDbLine', ' 10', n6(q.x1), ' 20', n6(q.y1), ' 30', '0', ' 11', n6(q.x2), ' 21', n6(q.y2), ' 31', '0'); }
      else if (q.t === 'pl') { head('LWPOLYLINE', q.sz ? 'D' + q.sz : q.l, q.dash); out.push('100', 'AcDbPolyline', ' 90', String(q.pts.length), ' 70', q.closed ? '1' : '0'); q.pts.forEach(function (v) { out.push(' 10', n6(v[0]), ' 20', n6(v[1])); }); }
      else if (q.t === 'circ') {
        if (q.fill) { head('LWPOLYLINE', q.sz ? 'D' + q.sz : q.l); out.push('100', 'AcDbPolyline', ' 90', '2', ' 70', '1', ' 43', n6(q.r), ' 10', n6(q.x - q.r / 2), ' 20', n6(q.y), ' 42', '1', ' 10', n6(q.x + q.r / 2), ' 20', n6(q.y), ' 42', '1'); }
        else { head('CIRCLE', q.sz ? 'D' + q.sz : q.l); out.push('100', 'AcDbCircle', ' 10', n6(q.x), ' 20', n6(q.y), ' 30', '0', ' 40', n6(q.r)); }
      } else {
        head('TEXT', q.l); out.push('100', 'AcDbText', ' 10', n6(q.x), ' 20', n6(q.y), ' 30', '0', ' 40', n6(q.h), '  1', dxfText(q.s));
        if (q.rot) out.push(' 50', n6(q.rot));
        out.push('  7', 'BBS'); if (q.a !== 'l') out.push(' 72', q.a === 'c' ? '1' : '2', ' 11', n6(q.x), ' 21', n6(q.y), ' 31', '0'); out.push('100', 'AcDbText');
      }
    });
    var at = template.indexOf('\nENTITIES\n'); if (at < 0) throw new Error('DXF template has no ENTITIES section'); at += '\nENTITIES\n'.length;
    var body = template.slice(0, at) + out.join('\n') + '\n' + template.slice(at), R = p.rules.wall;
    var rep = { '__VCX__': n6((d.b[0] + d.b[2]) / 2), '__VCY__': n6((d.b[1] + d.b[3]) / 2), '__VH__': n6(VP.h * s), '__HANDSEED__': (h + 16).toString(16).toUpperCase(),
      '__PROJECT__': dxfText(p.name).slice(0, 70), '__STD__': dxfText((sheetTitle || '') + '   ' + STDS[p.standard].name).slice(0, 44), '__SCALE__': '1:' + s, '__DATE__': dxfText(dateStr || ''), '__VERSION__': 'BBS Studio v' + VERSION };
    Object.keys(rep).forEach(function (k) { body = body.split(k).join(rep[k]); });
    return { text: body, scale: s, entities: d.p.length };
  }

  /** The shop drawing set: one sheet per wall type (detail plus its own bar list), then the full schedule split over as many sheets as it needs. */
  function dxfFiles(template, p, c, msOwner, dateStr, mode) {
    var files = [], n = 0;
    c.members.forEach(function (mem) {
      if (!(mem.L > 0 && mem.W > 0) || mem.type === 'beam') return;   // beam drawings are not built yet
      var r = toDXF(template, p, function (T) { return memberSheet(p, c, mem, T, mode); }, msOwner, dateStr, mem.mark);
      files.push({ name: pad2(++n) + '_' + String(mem.mark).replace(/[^A-Za-z0-9_-]+/g, '_') + '.dxf', text: r.text, scale: r.scale, title: mem.mark });
    });
    var rs = toDXF(template, p, function (T) { return shapeSheet(T, mode, p); }, msOwner, dateStr, 'Shape codes'); files.push({ name: 'BS8666_shape_codes.dxf', text: rs.text, scale: rs.scale, title: 'Shape codes' });
    var body = stdFormAOA(p, c), per = 180, parts = Math.max(1, Math.ceil((body.length - 1) / per)), i;
    for (i = 0; i < parts; i++) (function (i) {
      var rows = [body[0]].concat(body.slice(1 + i * per, 1 + (i + 1) * per));
      var r = toDXF(template, p, function (T) { return scheduleSheet(p, c, rows, T, i + 1, parts); }, msOwner, dateStr, 'Schedule ' + (i + 1) + '/' + parts);
      files.push({ name: 'BBS_schedule_' + (i + 1) + '.dxf', text: r.text, scale: r.scale, title: 'Schedule ' + (i + 1) });
    })(i);
    return files;
  }

