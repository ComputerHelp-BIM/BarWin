  /* ---------- 3D ---------- */
  var T3 = null;
  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function init3D() {
    if (T3 || !window.THREE) return !!T3;
    var THREE = window.THREE, canvas = $('#c3d');
    try {
      var r = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true }), cam = new THREE.PerspectiveCamera(35, 1, 10, 1e7); cam.up.set(0, 0, 1);
      var scene = new THREE.Scene(), grp = new THREE.Group(); scene.add(grp); scene.add(new THREE.AmbientLight(0xffffff, 0.75)); var dl = new THREE.DirectionalLight(0xffffff, 0.7); dl.position.set(1, -2, 3); scene.add(dl);
      var ctl = THREE.OrbitControls ? new THREE.OrbitControls(cam, canvas) : null;
      T3 = { r: r, cam: cam, scene: scene, grp: grp, ctl: ctl }; if (ctl) ctl.addEventListener('change', draw3D);
      if (window.ResizeObserver) new ResizeObserver(function () { if ($('#slot3d')) { size3D(); draw3D(); } }).observe($('#stage3d'));
    } catch (e) { T3 = null; return false; }
    return true;
  }
  function size3D() { var box = $('#stage3d'), w = Math.max(200, box.clientWidth || 800), h = Math.max(200, box.clientHeight || 600); T3.r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); T3.r.setSize(w, h, false); T3.cam.aspect = w / h; T3.cam.updateProjectionMatrix(); }
  function draw3D() { if (T3) T3.r.render(T3.scene, T3.cam); }
  function build3D() {
    var msg = $('#msg3d');
    if (!init3D()) { if (msg) msg.textContent = '3D is unavailable: the 3D library or WebGL did not load in this browser.'; return; }
    var THREE = window.THREE, p = st.p, c = st.c, root = T3.grp, single = st.mode3 === 'sel';
    root.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); while (root.children.length) root.remove(root.children[0]);
    T3.scene.background = new THREE.Color(cssVar('--panel') || '#ffffff');
    var colV = new THREE.Color(cssVar('--rebar')), colL = new THREE.Color(cssVar('--link')), colH = new THREE.Color(cssVar('--hi')), colG = new THREE.Color(cssVar('--ghost')), ink = new THREE.LineBasicMaterial({ color: new THREE.Color(cssVar('--ink')) });
    var conc = new THREE.MeshBasicMaterial({ color: new THREE.Color(cssVar('--concrete')), transparent: true, opacity: 0.12, depthWrite: false }), formM = new THREE.MeshBasicMaterial({ color: new THREE.Color(cssVar('--form')), transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
    var mats = { v: new THREE.MeshLambertMaterial({ color: colV }), l: new THREE.MeshLambertMaterial({ color: colL }), h: new THREE.MeshLambertMaterial({ color: colH }) }, segs = { v: [], l: [], h: [], g: [] }, bars = 0;
    function v3(a) { return new THREE.Vector3(a[0], a[1], a[2]); }
    var list = single ? (mem() ? [{ id: mem().id, x: 0, y: 0, z: 0 }] : []) : B.placements(p, c);
    list.forEach(function (pl) {
      var M = c.members.filter(function (q) { return q.id === pl.id; })[0], g = new THREE.Group(); g.position.set(pl.x, pl.y, pl.z); root.add(g);
      var bg = new THREE.BoxGeometry(M.L, M.W, M.H), bm = new THREE.Mesh(bg, conc); bm.position.z = M.H / 2; g.add(bm); var be = new THREE.LineSegments(new THREE.EdgesGeometry(bg), ink); be.position.z = M.H / 2; g.add(be);
      if (st.fw) { var fm = new THREE.Mesh(new THREE.BoxGeometry(M.L + 36, M.W + 36, M.H), formM); fm.position.z = M.H / 2; g.add(fm); }
      M.ghosts.forEach(function (gh) { segs.g.push(pl.x + gh.pts[0][0], pl.y + gh.pts[0][1], pl.z + gh.pts[0][2], pl.x + gh.pts[1][0], pl.y + gh.pts[1][1], pl.z + gh.pts[1][2]); });
      M.bars.forEach(function (b) {
        var key = b.mark === st.hi ? 'h' : b.role === 'MAIN' ? 'v' : 'l';
        b.protos.forEach(function (pr) {
          bars += pr.places.length;
          if (single && st.solid) {     // the same centre-line as the drawing and the IFC file, swept to the bar diameter
            var path = new THREE.CurvePath(), i; for (i = 0; i < pr.pts.length - 1; i++) path.add(new THREE.LineCurve3(v3(pr.pts[i]), v3(pr.pts[i + 1])));
            var geo = new THREE.TubeGeometry(path, Math.max(1, (pr.pts.length - 1) * 2), b.dia / 2, 6, false), im = new THREE.InstancedMesh(geo, mats[key], pr.places.length), mx = new THREE.Matrix4();
            pr.places.forEach(function (q, k) { mx.makeTranslation(q[0], q[1], q[2]); im.setMatrixAt(k, mx); }); im.instanceMatrix.needsUpdate = true; g.add(im);
          } else {
            var arr = segs[key];
            pr.places.forEach(function (q) { for (var i = 0; i < pr.pts.length - 1; i++) arr.push(pl.x + q[0] + pr.pts[i][0], pl.y + q[1] + pr.pts[i][1], pl.z + q[2] + pr.pts[i][2], pl.x + q[0] + pr.pts[i + 1][0], pl.y + q[1] + pr.pts[i + 1][1], pl.z + q[2] + pr.pts[i + 1][2]); });
          }
        });
      });
    });
    [['v', colV], ['l', colL], ['h', colH], ['g', colG]].forEach(function (k) { if (!segs[k[0]].length) return; var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(segs[k[0]], 3)); root.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: k[1] }))); });
    size3D();
    var box = new THREE.Box3().setFromObject(root);
    if (!box.isEmpty() && (st.fit3d !== false)) {
      var ce = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length() / 2, dist = r / Math.sin(T3.cam.fov * Math.PI / 360) * 1.15;
      T3.cam.position.set(ce.x + dist * 0.5, ce.y - dist * 0.75, ce.z + dist * 0.42); T3.cam.near = dist / 400; T3.cam.far = dist * 20; T3.cam.updateProjectionMatrix(); if (T3.ctl) { T3.ctl.target.copy(ce); T3.ctl.update(); } else T3.cam.lookAt(ce);
    }
    st.fit3d = true;
    if (msg) msg.textContent = 'Drag to turn, scroll or pinch to zoom in on the hooks and cranks. ' + n0(bars) + ' bars' + (single ? ' as solids with true bend radii; red vertical, blue rings and ties, grey lines are bars continuing from the storey below' + (st.hi ? ', yellow is mark ' + st.hi : '') + '.' : ' as centre-lines. Your workbook has no plan positions, so members are lined up by type.');
    draw3D();
  }


