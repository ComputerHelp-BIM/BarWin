  /* ---------- where members stand ---------- */
  /** Where each member instance stands. The workbooks carry no plan positions, so members are lined up in rows by type. */
  function placements(p, c) {
    var out = [], y = 0;
    c.members.forEach(function (m) {
      if (!(m.L > 0 && m.W > 0) || m.type === 'beam') return;
      for (var i = 0; i < m.qty; i++) out.push({ id: m.id, li: m.li, mi: m.mi, k: i, x: i * (m.L + 1200) + m.L / 2, y: y, z: 0 });
      y -= m.W + 2500;
    });
    return out;
  }

