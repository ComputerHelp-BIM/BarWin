  /* ---------- BOQ and rate analysis ---------- */
  /** Rate = (material with wastage + other direct costs) x (1 + overheads) x (1 + profit). GST is added on the total. */
  function costing(p, c, plan) {
    var k = p.cost, S = k.steel, C = k.conc, F = k.form, oh = k.oh / 100, pr = k.profit / 100;
    var steelWaste = S.wasteMode === 'plan' ? plan.total.wastePct : S.waste;
    function item(code, name, unit, qty, lines) {
      var direct = lines.reduce(function (a, l) { return a + l.amount; }, 0), ohAmt = direct * oh, prAmt = (direct + ohAmt) * pr, rate = direct + ohAmt + prAmt;
      return { code: code, name: name, unit: unit, qty: qty, lines: lines, direct: direct, oh: ohAmt, profit: prAmt, rate: rate, amount: qty * rate };
    }
    var items = [
      item('conc', 'Concrete M' + p.grade + ' in walls and columns', 'm3', c.total.conc, [
        { label: 'Ready-mix concrete', amount: C.rate }, { label: 'Wastage ' + r2(C.waste) + '%', amount: C.rate * C.waste / 100 },
        { label: 'Pumping', amount: C.pump }, { label: 'Placing and vibrating labour', amount: C.labour }, { label: 'Curing', amount: C.curing }]),
      item('form', 'Formwork to wall and column faces', 'm2', c.total.form, [
        { label: 'Shuttering material or hire', amount: F.material }, { label: 'Wastage ' + r2(F.waste) + '%', amount: F.material * F.waste / 100 },
        { label: 'Fixing and striking labour', amount: F.labour }, { label: 'Oil, nails and consumables', amount: F.consumables }]),
      item('steel', 'Reinforcement ' + p.steel + ', cut, bent and fixed', 't', c.total.wt / 1000, [
        { label: 'Reinforcing steel', amount: S.rate }, { label: 'Wastage ' + r2(steelWaste) + '%' + (S.wasteMode === 'plan' ? ' (from the cutting plan)' : ''), amount: S.rate * steelWaste / 100 },
        { label: 'Binding wire ' + r2(S.wireQty) + ' kg', amount: S.wireQty * S.wireRate }, { label: 'Cutting, bending and fixing labour', amount: S.labour }, { label: 'Handling and transport', amount: S.handling }])
    ];
    var sub = items.reduce(function (a, i) { return a + i.amount; }, 0), gst = sub * k.gst / 100, rate = {};
    items.forEach(function (i) { rate[i.code] = i.rate; });
    var perMember = c.members.map(function (m) { return { mark: m.mark, level: m.level, qty: m.qty, conc: m.conc, form: m.form, steel: m.wt, amount: m.conc * rate.conc + m.form * rate.form + m.wt / 1000 * rate.steel }; });
    return { items: items, sub: sub, gst: gst, total: sub + gst, steelWaste: steelWaste, perMember: perMember, sample: !!k.sample };
  }

