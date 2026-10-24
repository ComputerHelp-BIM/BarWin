  var API = {
    VERSION: VERSION, DIAS: DIAS, STDS: STDS, LINK_TYPES: LINK_TYPES, SHAPES: SHAPES, SHAPE_CODES: SHAPE_CODES, shapeLength: shapeLength, VP: VP,
    num: num, r2: r2, r3: r3, unitWt: unitWt, bendRadius: bendRadius, bendPath: bendPath, wallRules: wallRules, newProject: newProject, newMember: newMember, normalise: normalise, defaultCost: defaultCost, guessZones: guessZones,
    memberOk: memberOk, vertLayout: vertLayout, buildMember: buildMember, compute: compute, tagText: tagText, importColumnBook: importColumnBook, importBeamBook: importBeamBook,
    cuttingPlan: cuttingPlan, costing: costing, bbsCols: bbsCols, bbsAOA: bbsAOA, STD_FORM: STD_FORM, stdFormAOA: stdFormAOA, stdFormNotes: stdFormNotes, BS_P: BS_P, RUNOUT: RUNOUT, byDiaAOA: byDiaAOA, boqAOA: boqAOA, costAOA: costAOA, planAOA: planAOA, inputAOA: inputAOA, csv: csv,
    placements: placements, Dwg: Dwg, wallDetail: wallDetail, wallPlan: wallPlan, memberSheet: memberSheet, fitSheet: fitSheet, shapeFigure: shapeFigure, shapeSheet: shapeSheet, FIG: FIG, figCode: figCode, figValues: figValues, figLength: figLength, BAR_MODES: BAR_MODES, toPDF: toPDF, pdfReport: pdfReport, pdfDrawings: pdfDrawings, SIZE_COL: SIZE_COL, SIZE_CSS: SIZE_CSS,
    toSVG: toSVG, SVG_CSS_FIXED: SVG_CSS_FIXED, esc: esc, toDXF: toDXF, dxfFiles: dxfFiles, toIFC: toIFC
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.BBS = API;
})(typeof window !== 'undefined' ? window : this);

