  /* ---------- vector and bend geometry: every bar is a true centre-line with circular bends ---------- */
  function vsub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function vadd(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function vmul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function vlen(a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]); }
  /**
   * verts = corner points of the bar centre-line (legs meeting at sharp corners); rc = bend radius to the bar centre (inside radius + d/2).
   * Returns the centre-line with each corner replaced by a circular arc: pts = sampled polyline, len = exact developed length.
   */
  function bendPath(verts, rc, perQuarter) {
    var n = verts.length, tight = false, i, j, U = [], LEN = [], phi = [], t = []; perQuarter = perQuarter || 6;
    for (i = 0; i < n - 1; i++) { var e = vsub(verts[i + 1], verts[i]), l = vlen(e); LEN.push(l); U.push(l > 1e-9 ? vmul(e, 1 / l) : [0, 0, 0]); }
    for (i = 1; i < n - 1; i++) { var cs = Math.max(-1, Math.min(1, U[i - 1][0] * U[i][0] + U[i - 1][1] * U[i][1] + U[i - 1][2] * U[i][2])); phi[i] = Math.acos(cs); t[i] = phi[i] > 1e-4 && LEN[i - 1] > 1e-6 && LEN[i] > 1e-6 ? rc * Math.tan(phi[i] / 2) : 0; }
    // where the two bends at the ends of a leg need more than the leg has, both are tightened in proportion; an end leg gives its bend nearly all of itself
    for (i = 0; i < n - 1; i++) {
      var ta = i > 0 ? t[i] : 0, tb = i < n - 2 ? t[i + 1] : 0, room = 0.98 * LEN[i];
      if (ta + tb > room && ta + tb > 0) { var k = room / (ta + tb); if (i > 0) t[i] = Math.min(t[i], ta * k); if (i < n - 2) t[i + 1] = Math.min(t[i + 1], tb * k); tight = true; }
    }
    var pts = [verts[0]], len = 0, last = verts[0];
    for (i = 1; i < n - 1; i++) {
      if (!(t[i] > 0)) { if (phi[i] > 1e-4) { len += vlen(vsub(verts[i], last)); pts.push(verts[i]); last = verts[i]; } continue; }
      var p1 = verts[i], ua = vmul(U[i - 1], -1), ub = U[i], r = t[i] / Math.tan(phi[i] / 2);
      var S = vadd(p1, vmul(ua, t[i])), E = vadd(p1, vmul(ub, t[i])), bis = vadd(ua, ub), C = vadd(p1, vmul(bis, r / Math.cos(phi[i] / 2) / vlen(bis)));
      len += vlen(vsub(S, last)); pts.push(S);
      var A0 = vsub(S, C), B0 = vsub(E, C), steps = Math.max(2, Math.ceil(phi[i] / (Math.PI / 2) * perQuarter)), sn = Math.sin(phi[i]);
      for (j = 1; j <= steps; j++) { var u = j / steps; pts.push(vadd(C, vadd(vmul(A0, Math.sin((1 - u) * phi[i]) / sn), vmul(B0, Math.sin(u * phi[i]) / sn)))); }
      len += r * phi[i]; last = E;
    }
    len += vlen(vsub(verts[n - 1], last)); pts.push(verts[n - 1]);
    return { pts: pts, len: len, tight: tight };
  }

