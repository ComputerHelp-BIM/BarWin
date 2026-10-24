# Beam Sections

**Version 0.18.0 · Active**

Simply supported beam: an L-section plus cross-sections A-A (mid-span), B-B (left end) and C-C (right end), with the reinforcement drawn to the rules in [docs/beam-rules.md](../../docs/beam-rules.md).

- Supports: column / wall or beam at each end (primary, secondary, tertiary beams).
- Links in six distributions, counted and spaced to scale along the span.
- Top and bottom bars by zone (left / mid / right), laps of 50 x the smaller bar in three styles (inline, offset, cranked 1:6).
- Extra top bars per end and extra bottom bars with curtailment; Auto or manual layers; spacer bars.
- Anchorage per support (straight, bent, to cover), Ld and leg dimensions; values edited on the drawing.
- Colour groups with pickers, a Labels switch and text size; Copy SVG with colours baked in.

The drawings on screen are a fixed not-to-scale template: the numbers are real, the geometry is not. The **Sheet** tab draws the same beam true to scale on a sheet with a title block and downloads it as DXF, PDF or SVG; see [the sheet rules](../../docs/beam-rules.md#drawing-sheet-beam-sections-0180).

## Files

| File | Role |
|---|---|
| `src/beams.js` | The drawing module: rules, layout and SVG. UMD, so the page and Node use the same code. Holds `VERSION`. |
| `src/index.html` | The shell: the page with `@@include@@` lines for the brand tokens and strip, `page.css`, `beams.js` and the script sections. |
| `src/sheet.js` | The true-scale sheet: real geometry in mm, layout on paper, scales and break lines. Uses `packages/cad` for DXF, PDF and SVG. |
| `src/page.css` | Page styles, on the brand tokens. |
| `src/ui/NN-*.js` | The page script by topic: setup, values, alerts, colours and view, form, render, panel (tabs / groups), on-drawing editors, form events, copy and start. One scope; keep top-level names unique. |
| `test/logic.test.js` | Rule tests and the freeze probe. |
| `dist/` | Built page and SVGs. Not committed; `npm run build` makes it. |

## Develop

```bash
npm run build        # from the repo root: writes dist/beam-sections.html and the SVGs
npm test             # logic tests
npm run check:dxf    # sample sheets read back with ezdxf
npm run test:e2e     # browser smoke tests
```

Open `dist/beam-sections.html` to try a change. Values are kept in the browser under the key `bbs-beam-sections-v2`; a change that alters the shape of saved values needs a new key or a migration in `load()`.

## Changelog

- **0.18.0** (2026-10-24): true-scale drawing sheet (BACKLOG C1). A Sheet tab: paper A4 to A0, L-section and section scales (auto or 1:10 to 1:100), break lines for long beams, title block, notes; a live preview; DXF (model 1:1, layout with locked viewports, real dimensions), PDF and SVG. Layers and text styles from the office standard. Saved values from 0.17 load unchanged; sheet settings are kept under `barwin-sheet-v1`.
- **0.17.0** (2026-10-24): BarWin look. The BarWin strip at the top links back to all the tools; the page uses the brand colours and Barlow type. Drawings, saved values and outputs unchanged.
- **0.16.0** (2026-10-24): cleaning and visual pass (BACKLOG A1 to A7). Nothing but bars and links inside the beam: laps and cut-offs on rows outside it. A caption per support with the name, the anchorage choice and the Ld notes. Every bent leg dimensioned, extra bars included; outside a support beam where there is room. Shortest bent leg: IS 456, BS 8666, 12 x (default) or 10 x bar size. Editable numbers amber. Settings as tabs or collapsible groups. Saved values from 0.15 load unchanged.
- **0.15.1**: bent leg dimensions. Earlier versions: see `docs/beam-rules.md`.

## Release

1. Bump `VERSION` in `src/beams.js` (patch: fix, minor: feature, major: breaks saved values or outputs).
2. `npm run check`.
3. Commit, then tag `beam-sections@vX.Y.Z`.
4. Republish the page from `dist/beam-sections.html` if it is shared as an artifact.
