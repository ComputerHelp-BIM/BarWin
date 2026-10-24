  /* ---------- drawing primitives ---------- */
  function Dwg() { this.p = []; this.b = [1e12, 1e12, -1e12, -1e12]; }
  Dwg.prototype.ext = function (x, y) { var b = this.b; if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; };
  Dwg.prototype.line = function (l, x1, y1, x2, y2, dash) { this.p.push({ t: 'line', l: l, x1: x1, y1: y1, x2: x2, y2: y2, dash: !!dash }); this.ext(x1, y1); this.ext(x2, y2); return this; };
  Dwg.prototype.pl = function (l, pts, closed, dash) { var s = this; this.p.push({ t: 'pl', l: l, pts: pts, closed: !!closed, dash: !!dash }); pts.forEach(function (q) { s.ext(q[0], q[1]); }); return this; };
  Dwg.prototype.circ = function (l, x, y, r, fill) { this.p.push({ t: 'circ', l: l, x: x, y: y, r: r, fill: !!fill }); this.ext(x - r, y - r); this.ext(x + r, y + r); return this; };
  Dwg.prototype.text = function (l, x, y, h, s, a, rot) {
    s = String(s); a = a || 'l'; rot = rot || 0;
    this.p.push({ t: 'text', l: l, x: x, y: y, h: h, s: s, a: a, rot: rot });
    var w = 0.62 * h * s.length, o = a === 'c' ? -w / 2 : a === 'r' ? -w : 0;
    if (rot) { this.ext(x - h, y + o); this.ext(x, y + o + w); } else { this.ext(x + o, y); this.ext(x + o + w, y + h); }
    return this;
  };
  Dwg.prototype.add = function (o, dx, dy) {
    var s = this;
    o.p.forEach(function (q) {
      var c = Object.assign({}, q);
      if (c.t === 'line') { c.x1 += dx; c.x2 += dx; c.y1 += dy; c.y2 += dy; }
      else if (c.t === 'pl') c.pts = c.pts.map(function (v) { return [v[0] + dx, v[1] + dy]; });
      else { c.x += dx; c.y += dy; }
      s.p.push(c);
    });
    this.ext(o.b[0] + dx, o.b[1] + dy); this.ext(o.b[2] + dx, o.b[3] + dy); return this;
  };
  Dwg.prototype.w = function () { return this.b[2] - this.b[0]; };
  Dwg.prototype.h = function () { return this.b[3] - this.b[1]; };
  function rect(x1, y1, x2, y2) { return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]; }
  function dimH(d, x1, x2, y, T, label) {
    var k = 0.35 * T;
    d.line('DIM', x1, y, x2, y).line('DIM', x1 - k, y - k, x1 + k, y + k).line('DIM', x2 - k, y - k, x2 + k, y + k);
    d.line('DIM', x1, y - k, x1, y + 2 * k).line('DIM', x2, y - k, x2, y + 2 * k);
    d.text('DIM', (x1 + x2) / 2, y + 0.35 * T, T, label, 'c');
  }
  function dimV(d, x, y1, y2, T, label) {
    var k = 0.35 * T;
    d.line('DIM', x, y1, x, y2).line('DIM', x - k, y1 - k, x + k, y1 + k).line('DIM', x - k, y2 - k, x + k, y2 + k);
    d.line('DIM', x - k, y1, x + 2 * k, y1).line('DIM', x - k, y2, x + 2 * k, y2);
    d.text('DIM', x - 0.35 * T, (y1 + y2) / 2, T, label, 'c', 90);
  }

