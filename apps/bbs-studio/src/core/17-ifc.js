  /* ---------- IFC4: concrete, formwork and reinforcement ---------- */
  function ifcGuidMaker(seedText) {
    var CH = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$', a = 2166136261, i;
    for (i = 0; i < seedText.length; i++) { a ^= seedText.charCodeAt(i); a = Math.imul(a, 16777619); }
    function rnd() { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
    return function () { var s = CH.charAt(Math.floor(rnd() * 4)); for (var k = 0; k < 21; k++) s += CH.charAt(Math.floor(rnd() * 64)); return s; };
  }
  /**
   * Each member instance becomes an IfcWall (extruded concrete), an IfcBuildingElementProxy "FORMWORK" (a hollow sleeve on the cast faces,
   * with its area as a quantity) and one IfcReinforcingBar per bar set. Bars are swept disks; copies are mapped items, so the file stays small.
   */
  function toIFC(p, c, dateStr) {
    var out = [], n = 0, R = p.rules.wall, FT = 18;
    function guidOf(key) { return ifcGuidMaker(key)(); }                      // the same element gets the same GlobalId on every export
    function add(s) { n++; out.push('#' + n + '=' + s + ';'); return '#' + n; }
    function f(v) { var s = (Math.round(v * 1000) / 1000).toString(); return /[.e]/.test(s) ? s : s + '.'; }
    function str(s) { return "'" + String(s).replace(/\\/g, '/').replace(/'/g, "''").replace(/[^\x20-\x7e]/g, '?') + "'"; }
    function pt(v) { return add('IFCCARTESIANPOINT((' + v.map(f).join(',') + '))'); }
    var O = pt([0, 0, 0]), DZ = add('IFCDIRECTION((0.,0.,1.))'), AX = add('IFCAXIS2PLACEMENT3D(' + O + ',$,$)'), O2 = add('IFCCARTESIANPOINT((0.,0.))'), AX2 = add('IFCAXIS2PLACEMENT2D(' + O2 + ',$)');
    var units = add('IFCUNITASSIGNMENT((' + [add('IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.)'), add('IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)'), add('IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.)'),
      add('IFCSIUNIT(*,.MASSUNIT.,.KILO.,.GRAM.)'), add('IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.)')].join(',') + '))');
    var ctx = add("IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-5," + AX + ',$)'), body = add("IFCGEOMETRICREPRESENTATIONSUBCONTEXT('Body','Model',*,*,*,*," + ctx + ',$,.MODEL_VIEW.,$)');
    var seq = 0; function guid() { return guidOf(p.guid + '|rel|' + (seq++)); }
    var proj = add('IFCPROJECT(' + str(p.guid) + ',$,' + str(p.name) + ',$,$,$,$,(' + ctx + '),' + units + ')');
    function lp(rel, v) { return add('IFCLOCALPLACEMENT(' + (rel || '$') + ',' + (v ? add('IFCAXIS2PLACEMENT3D(' + pt(v) + ',$,$)') : AX) + ')'); }
    function agg(parent, kids) { add('IFCRELAGGREGATES(' + str(guid()) + ',$,$,$,' + parent + ',(' + kids.join(',') + '))'); }
    var siteLP = lp(null), site = add('IFCSITE(' + str(guid()) + ",$,'Site',$,$," + siteLP + ',$,$,.ELEMENT.,$,$,$,$,$)');
    var bldLP = lp(siteLP), bld = add('IFCBUILDING(' + str(guid()) + ',$,' + str(p.name) + ',$,$,' + bldLP + ',$,$,.ELEMENT.,$,$,$)');
    agg(proj, [site]); agg(site, [bld]);
    var ID = add('IFCCARTESIANTRANSFORMATIONOPERATOR3D($,$,' + O + ',$,$)'), concMat = add('IFCMATERIAL(' + str('Concrete M' + p.grade) + ',$,$)'), steelMat = add('IFCMATERIAL(' + str('Steel ' + p.steel) + ',$,$)');
    function qto(name, list) { return add('IFCELEMENTQUANTITY(' + str(guid()) + ',$,' + str(name) + ',$,$,(' + list.join(',') + '))'); }
    function defines(objs, def) { add('IFCRELDEFINESBYPROPERTIES(' + str(guid()) + ',$,$,$,(' + objs.join(',') + '),' + def + ')'); }
    function pv(name, type, val) { return add('IFCPROPERTYSINGLEVALUE(' + str(name) + ',$,' + type + '(' + val + '),$)'); }
    var storeys = [], walls = [], barsAll = [], elev = 0, place = placements(p, c), stats = { walls: 0, formwork: 0, barSets: 0, bars: 0 };
    p.levels.forEach(function (lv, li) {
      var stLP = lp(bldLP, [0, 0, elev]), st = add('IFCBUILDINGSTOREY(' + str(lv.guid) + ',$,' + str(lv.name) + ',$,$,' + stLP + ',$,$,.ELEMENT.,' + f(elev) + ')'), els = [];
      storeys.push(st);
      c.members.filter(function (mem) { return mem.li === li; }).forEach(function (mem) {
        var m = lv.members[mem.mi]; if (!memberOk(m) || m.type === 'beam') return;
        var H = mem.H, setMaps = [];
        // geometry shared by every instance of this type: the same centre-lines the drawings and the 3D view use, bends sampled as short chords
        mem.bars.forEach(function (bar) {
          if (!bar.protos.length) return;
          var items = [], s = { bar: bar };
          bar.protos.forEach(function (pr) {
            var line = add('IFCPOLYLINE((' + bendPath(pr.verts, bar.rc, 3).pts.map(pt).join(',') + '))'), disk = add('IFCSWEPTDISKSOLID(' + line + ',' + f(s.bar.dia / 2) + ',$,$,$)');
            var map = add('IFCREPRESENTATIONMAP(' + AX + ',' + add("IFCSHAPEREPRESENTATION(" + body + ",'Body','AdvancedSweptSolid',(" + disk + '))') + ')');
            pr.places.forEach(function (q) { items.push(add('IFCMAPPEDITEM(' + map + ',' + add('IFCCARTESIANTRANSFORMATIONOPERATOR3D($,$,' + pt(q) + ',$,$)') + ')')); });
          });
          var rep = add("IFCSHAPEREPRESENTATION(" + body + ",'Body','MappedRepresentation',(" + items.join(',') + '))');
          setMaps.push({ s: s, map: add('IFCREPRESENTATIONMAP(' + AX + ',' + rep + ')'), bars: [] });
        });
        var wallsOfType = [], formsOfType = [];
        place.filter(function (q) { return q.id === mem.id; }).forEach(function (q) {
          var mLP = lp(stLP, [q.x, q.y, q.z]), name = m.mark + (mem.qty > 1 ? ' #' + (q.k + 1) : '');
          var solid = add('IFCEXTRUDEDAREASOLID(' + add('IFCRECTANGLEPROFILEDEF(.AREA.,$,' + AX2 + ',' + f(m.L) + ',' + f(m.W) + ')') + ',' + AX + ',' + DZ + ',' + f(H) + ')');
          var shape = add('IFCPRODUCTDEFINITIONSHAPE($,$,(' + add("IFCSHAPEREPRESENTATION(" + body + ",'Body','SweptSolid',(" + solid + '))') + '))');
          var wall = add('IFCWALL(' + str(q.k ? guidOf(m.guid + '|wall|' + q.k) : m.guid) + ',$,' + str(name) + ',' + str(m.L + ' x ' + m.W + ' x ' + H) + ',$,' + mLP + ',' + shape + ',' + str(m.mark) + ',.SHEAR.)');
          els.push(wall); walls.push(wall); wallsOfType.push(wall); stats.walls++;
          var fsolid = add('IFCEXTRUDEDAREASOLID(' + add('IFCRECTANGLEHOLLOWPROFILEDEF(.AREA.,$,' + AX2 + ',' + f(m.L + 2 * FT) + ',' + f(m.W + 2 * FT) + ',' + f(FT) + ',$,$)') + ',' + AX + ',' + DZ + ',' + f(H) + ')');
          var fshape = add('IFCPRODUCTDEFINITIONSHAPE($,$,(' + add("IFCSHAPEREPRESENTATION(" + body + ",'Body','SweptSolid',(" + fsolid + '))') + '))');
          var form = add('IFCBUILDINGELEMENTPROXY(' + str(guidOf(m.guid + '|form|' + q.k)) + ',$,' + str('Formwork ' + name) + ",$,'FORMWORK'," + mLP + ',' + fshape + ',' + str(m.mark) + ',.USERDEFINED.)');
          els.push(form); formsOfType.push(form); stats.formwork++;
          setMaps.forEach(function (sm) {
            var b = sm.s.bar, rep = add("IFCSHAPEREPRESENTATION(" + body + ",'Body','MappedRepresentation',(" + add('IFCMAPPEDITEM(' + sm.map + ',' + ID + ')') + '))');
            var bar = add('IFCREINFORCINGBAR(' + str(guidOf(b.uid + '|' + q.k)) + ',$,' + str(name + ' ' + b.desc + ' ' + STDS[p.standard].prefix + b.dia + ' mk ' + b.mark) + ',' + str(b.n + ' no. shape ' + b.shape) + ',$,' + mLP + ',' + add('IFCPRODUCTDEFINITIONSHAPE($,$,(' + rep + '))') + ',' + str(b.mark) + ',' +
              str(p.steel) + ',' + f(b.dia) + ',' + (Math.PI * b.dia * b.dia / 4 / 1e6).toExponential(6).toUpperCase() + ',' + f(b.len) + ',' + (b.role === 'MAIN' ? '.MAIN.' : '.LIGATURE.') + ',.TEXTURED.)');
            els.push(bar); barsAll.push(bar); sm.bars.push(bar); stats.barSets++; stats.bars += b.n;
          });
        });
        if (wallsOfType.length) {
          defines(wallsOfType, qto('Qto_WallBaseQuantities', [add("IFCQUANTITYLENGTH('Length',$,$," + f(m.L) + ',$)'), add("IFCQUANTITYLENGTH('Width',$,$," + f(m.W) + ',$)'), add("IFCQUANTITYLENGTH('Height',$,$," + f(H) + ',$)'),
            add("IFCQUANTITYVOLUME('NetVolume',$,$," + f(m.L * m.W * H / 1e9) + ',$)'), add("IFCQUANTITYAREA('NetSideArea',$,$," + f(m.L * H / 1e6) + ',$)'), add("IFCQUANTITYWEIGHT('ReinforcementWeight',$,$," + f(mem.wt / mem.qty) + ',$)')]));
          defines(formsOfType, qto('BBS_FormworkQuantities', [add("IFCQUANTITYAREA('ContactArea',$,$," + f(2 * (m.L + m.W) * H / 1e6) + ',$)')]));
          setMaps.forEach(function (sm) {
            var b = sm.s.bar; if (!sm.bars.length) return;
            defines(sm.bars, add('IFCPROPERTYSET(' + str(guid()) + ",$,'BBS_Reinforcement',$,(" + [pv('BarMark', 'IFCLABEL', str(b.mark)), pv('ShapeCode', 'IFCLABEL', str(b.shape)), pv('BarCount', 'IFCINTEGER', b.n), pv('CutLength', 'IFCLENGTHMEASURE', f(b.len)), pv('FormerDiameter', 'IFCLENGTHMEASURE', f(b.former)), pv('Standard', 'IFCLABEL', str(STDS[p.standard].name)),
              pv('DimA', 'IFCLENGTHMEASURE', f(b.dims.A || 0)), pv('DimB', 'IFCLENGTHMEASURE', f(b.dims.B || 0)), pv('DimC', 'IFCLENGTHMEASURE', f(b.dims.C || 0)), pv('DimD', 'IFCLENGTHMEASURE', f(b.dims.D || 0)),
              pv('Spacing', 'IFCLENGTHMEASURE', f(b.spc || 0)), pv('WeightPerMember', 'IFCMASSMEASURE', f(b.wt / b.qty))].join(',') + '))'));
          });
        }
      });
      if (els.length) add('IFCRELCONTAINEDINSPATIALSTRUCTURE(' + str(guid()) + ',$,$,$,(' + els.join(',') + '),' + st + ')');
      elev += lv.H;
    });
    agg(bld, storeys);
    if (walls.length) add('IFCRELASSOCIATESMATERIAL(' + str(guid()) + ',$,$,$,(' + walls.join(',') + '),' + concMat + ')');
    if (barsAll.length) add('IFCRELASSOCIATESMATERIAL(' + str(guid()) + ',$,$,$,(' + barsAll.join(',') + '),' + steelMat + ')');
    var head = "ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('ViewDefinition [ReferenceView_V1.2]'),'2;1');\nFILE_NAME(" + str(p.name + '.ifc') + ',' + str((dateStr || '2026-01-01') + 'T00:00:00') + ",(''),(''),'BBS Studio " + VERSION + "','BBS Studio " + VERSION + "','');\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\n";
    return { text: head + out.join('\n') + '\nENDSEC;\nEND-ISO-10303-21;\n', entities: n, stats: stats };
  }

