# Beam Sections

**Version 0.17.0 · Active**

Simply supported beam: an L-section plus cross-sections A-A (mid-span), B-B (left end) and C-C (right end), with the reinforcement drawn to the rules in [docs/beam-rules.md](../../docs/beam-rules.md).

- Supports: column / wall or beam at each end (primary, secondary, tertiary beams).
- Links in six distributions, counted and spaced to scale along the span.
- Top and bottom bars by zone (left / mid / right), laps of 50 x the smaller bar in three styles (inline, offset, cranked 1:6).
- Extra top bars per end and extra bottom bars with curtailment; Auto or manual layers; spacer bars.
- Anchorage per support (straight, bent, to cover), Ld and leg dimensions; values edited on the drawing.
- Colour groups with pickers, a Labels switch and text size; Copy SVG with colours baked in.

The drawing is a fixed not-to-scale template: the numbers are real, the geometry is not. True-scale sheets (DXF, PDF, SVG) are the next output milestone, see [BACKLOG C1](../../docs/BACKLOG.md).

## Files

| File | Role |
|---|---|
| `src/beams.js` | The drawing module: rules, layout and SVG. UMD, so the page and Node use the same code. Holds `VERSION`. |
| `src/index.html` | The shell: the page with `@@include@@` lines for the brand tokens and strip, `page.css`, `beams.js` and the script sections. |
| `src/page.css` | Page styles, on the brand tokens. |
| `src/ui/NN-*.js` | The page script by topic: setup, values, alerts, colours and view, form, render, panel (tabs / groups), on-drawing editors, form events, copy and start. One scope; keep top-level names unique. |
| `test/logic.test.js` | Rule tests and the freeze probe. |
| `dist/` | Built page and SVGs. Not committed; `npm run build` makes it. |

## Develop

```bash
npm run build        # from the repo root: writes dist/beam-sections.html and the SVGs
npm test             # logic tests
npm run test:e2e     # browser smoke tests
```

Open `dist/beam-sections.html` to try a change. Values are kept in the browser under the key `bbs-beam-sections-v2`; a change that alters the shape of saved values needs a new key or a migration in `load()`.

## Changelog

- **0.17.0** (2026-10-24): BarWin look. The BarWin strip at the top links back to all the tools; the page uses the brand colours and Barlow type. Drawings, saved values and outputs unchanged.
- **0.16.0** (2026-10-24): cleaning and visual pass (BACKLOG A1 to A7). Nothing but bars and links inside the beam: laps and cut-offs on rows outside it. A caption per support with the name, the anchorage choice and the Ld notes. Every bent leg dimensioned, extra bars included; outside a support beam where there is room. Shortest bent leg: IS 456, BS 8666, 12 x (default) or 10 x bar size. Editable numbers amber. Settings as tabs or collapsible groups. Saved values from 0.15 load unchanged.
- **0.15.1**: bent leg dimensions. Earlier versions: see `docs/beam-rules.md`.

## Release

1. Bump `VERSION` in `src/beams.js` (patch: fix, minor: feature, major: breaks saved values or outputs).
2. `npm run check`.
3. Commit, then tag `beam-sections@vX.Y.Z`.
4. Republish the page from `dist/beam-sections.html` if it is shared as an artifact.
