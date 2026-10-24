# BBS Studio

**Version 0.15.0 · Active**

Steel schedules from the steel quantity workbook. Drop the column and wall workbook (or the beam workbook) and the app reads the typed inputs, checks its totals against the workbook's own, and builds:

- the bar bending schedule, in standard form (CADS RC layout) and full data;
- shop drawings, a 3D view and an IFC4 model with concrete, formwork and reinforcement;
- BOQ, rate analysis and cost; cutting plan;
- downloads: Excel, PDF (schedule, full data, BOQ and cost, shop drawings), DXF, IFC, zip of everything.

Covers shear walls, core walls and columns; beams at step 1 (schedule, BOQ, cost, PDFs; drawings and 3D to follow). IS 2502 and BS 8666:2020 switchable. The full changelog is in the app's About box.

## Files

| Path | Role |
|---|---|
| `src/index.html` | The shell: head, fonts, CDN libraries and the include lines. |
| `src/styles.css`, `src/markup.html` | Styles and the page body (header, About box with the changelog). |
| `src/dxf-template.dxf` | The DXF header template, kept as a data block (the site build leaves it untouched). |
| `src/core/NN-*.js` | The engine, by topic: standards, bend geometry, shape codes, model, wall / column / beam workbooks, cutting plan, BOQ, drawings, SVG, DXF, IFC, PDF. `00-module.js` holds `VERSION`. |
| `src/ui/NN-*.js` | The interface: storage, import, tabs, 3D, exports, start-up. |
| `src/core.js` | Assembles the engine alone into `dist/bbs-core.js` (Node and tests). |
| `test/core.test.js` | Engine tests on made-up data. |
| `dist/` | Built page and core. Not committed; `npm run build` makes them. |

The sections share one script scope (they are parts of one script, not modules), so keep top-level names unique. The page loads SheetJS 0.18.5, JSZip 3.10.1 and three.js r128 (with OrbitControls) from public CDNs, so the first open needs internet.

## Develop

```bash
npm run build      # from the repo root: writes dist/bbs-studio.html and dist/bbs-core.js
npm test           # engine tests
npm run test:e2e   # browser tests, including a DXF download
```

## Release

Bump `VERSION` in `src/core/00-module.js` (and the version in the comment at the top of `src/ui/00-setup.js`), add a line to the About changelog in `src/markup.html`, `npm run check`, commit, tag `bbs-studio@vX.Y.Z`.

Project files used to check the outputs are kept outside this public repository; tests use made-up data only.
