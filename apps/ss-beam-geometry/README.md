# SS Beam Geometry

**Version 0.4.0 · Frozen (2026-10-16)**

The approved geometry-only template for simply supported beams, before reinforcement: L-section and sections A-A / B-B / C-C, the four support arrangements, junction and cover-line conventions. Beam Sections was built on top of it.

Kept as it was approved, so the geometry rules have a fixed reference. Do not develop here; changes go into [Beam Sections](../beam-sections). The rules are in [docs/beam-rules.md](../../docs/beam-rules.md).

- `src/beams.js` drawing module, `src/page.html` page shell.
- `npm run build` (repo root) writes `dist/ss-beam-geometry.html` and the SVGs.
- Saved values use the browser key `bbs-ss-beam-geometry-v040`, separate from Beam Sections.
