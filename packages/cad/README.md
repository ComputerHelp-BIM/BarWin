# BarWin CAD sheets

**Version 1.0.0**

One drawing model, three outputs of the same sheet, with no dependencies (the page and Node share `cad.js`):

- **DXF**, AutoCAD 2010 format: every view 1:1 in millimetres in model space; a layout **SHEET** at the chosen paper size holds the frame, the title block and one locked viewport per view at that view's scale. Dimensions are real DIMENSION entities in a style per scale (`BARWIN-25` and so on), so they stay 2.5 mm on paper after an edit.
- **PDF**, one vector page at full paper size, built-in Helvetica.
- **SVG**, in millimetres.

The model is documented at the top of `cad.js`: a sheet has a paper size, views (entities in model space, a scale, and the model window each viewport shows) and paper entities. Text heights are given on paper and grow with each view's scale.

## Files

| File | Role |
|---|---|
| `cad.js` | The writers (`toDXF`, `toPDF`, `toSVG`), dimension geometry, the ISO 5457 frame and title block (`titleBlock`), paper sizes. Holds `VERSION`. |
| `layers.json` | Layers, colours, lineweights, scales, paper sizes, text and dimension settings. Taken from the office standard beam DXF (kept outside this public repository). `cad.js` keeps a copy; a test holds the two equal. |
| `template.dxf` | The empty drawing every DXF is written into: header, linetypes, text styles, layers, dimension styles, arrow block, layout SHEET. Tokens (`{{PW}}`, `{{ENTITIES}}`, ...) mark what `toDXF` fills. |
| `tools/make_template.py` | Builds `template.dxf` with ezdxf 1.4.4 (`npm run template:dxf`). Run it after changing `layers.json`; the output is reproducible. |
| `test/` | Writer tests and `dxf-check.js`, the structural DXF check other tests reuse. |

## Using it in an app

Include `cad.js` in the page's script and the template as a data block, then:

```js
var sheet = { paper: BarWinCAD.paper('A2'), views: [...], ents: BarWinCAD.titleBlock(paper, fields, notes).ents };
var dxf = BarWinCAD.toDXF(sheet, document.getElementById('cadTpl').textContent.replace(/^\n/, ''));
```

See `apps/beam-sections/src/sheet.js` for a full sheet and `apps/beam-sections/src/index.html` for the includes.

## Checking a DXF

`npm run check:dxf` writes sample sheets and reads them back with ezdxf (recover and audit). The files still need opening in AutoCAD 2021 / 2025+, ZWCAD 2026 and the cad2bim viewer before a release that changes the DXF.
