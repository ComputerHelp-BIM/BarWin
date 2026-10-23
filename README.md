# BarWin

Reinforcement detailing apps by Computer Help: beam drawings, bar bending schedules, BS 8666 shape codes, and the BarWin brand they share.

Every app is a single HTML page that opens straight from disk in any modern browser. Nothing to install to use them; Node is only needed to build Beam Sections and run the tests.

## Apps

| App | Folder | Version | Status | What it is |
|---|---|---|---|---|
| Beam Sections | [`apps/beam-sections`](apps/beam-sections) | 0.15.1 | Active | Simply supported beam: L-section and sections A-A / B-B / C-C with links, top and bottom bars by zone, laps, extras, layers, anchorage. |
| SS Beam Geometry | [`apps/ss-beam-geometry`](apps/ss-beam-geometry) | 0.4.0 | Frozen | The approved geometry-only template (concrete and covers, no steel) that Beam Sections grew from. |
| BBS Studio | [`apps/bbs-studio`](apps/bbs-studio) | 0.14.2 | Active | Reads the steel quantity workbook; walls, columns, beams (step 1). Schedule, shop drawings, 3D, IFC, BOQ, cost, PDFs, DXF. |
| BBS Studio, footings | [`apps/bbs-studio-footings`](apps/bbs-studio-footings) | 0.4.0 | Frozen | The earlier footing-only BBS Studio, kept at its own version. |
| BS 8666 shape codes | [`apps/shape-codes`](apps/shape-codes) | engine 1.2.0 | Reference | All 35 BS 8666:2020 codes plus 51A, in four presentations. The approved figure style. |
| BarWin brand | [`packages/brand`](packages/brand) | 1.0.0 | Active | Logo, app icon, colour and type tokens, and the brand canvas source. |

## Quick start

```bash
# once
npm install
npx playwright install chromium     # browser for the smoke tests

npm run build       # Beam Sections and SS Beam Geometry -> apps/*/dist/
npm test            # logic tests (node:test, no browser)
npm run test:e2e    # builds, then opens every app in Chromium and checks it
npm run check       # both
```

To use an app: open `apps/<app>/index.html`, or for the two beam apps, `apps/<app>/dist/<app>.html` after `npm run build`.

## Layout

```
apps/
  beam-sections/        src/ (beams.js drawing module, page.html shell), test/, dist/ (built, not committed)
  ss-beam-geometry/     src/, dist/ (frozen)
  bbs-studio/           index.html
  bbs-studio-footings/  index.html (frozen)
  shape-codes/          index.html
packages/
  brand/                tokens.css, tokens.json, assets/*.svg, canvas/ (brand board source)
docs/
  BACKLOG.md            what is left: visual, engineering, outputs, housekeeping
  beam-rules.md         every agreed rule for the beam apps
  reference/            sample PDFs, the standard beam DXF, the shape-figure spec
scripts/build-beams.js  builds a beam app into its dist/
tests/e2e/              Playwright smoke tests
```

## Versioning

Each app keeps its own [semantic version](https://semver.org) (major.minor.patch), shown in the app and set in one place:

| App | Version lives in |
|---|---|
| Beam Sections, SS Beam Geometry | `VERSION` in `src/beams.js` |
| BBS Studio, footings | `VERSION` in `index.html`, changelog in its About box |
| Shape codes | the engine comment at the top of the script |
| Brand | `version` in `tokens.json` and the header of `tokens.css` |

Releases are tagged per app: `beam-sections@v0.15.1`, `bbs-studio@v0.14.2`, and so on. The repository's own version in `package.json` covers the tooling only. Repository changes are in [CHANGELOG.md](CHANGELOG.md).

## Working on it

- Branch from `main`, one change per branch, then a pull request.
- Commits are signed (SSH) so GitHub shows them as Verified.
- Bump the app's version in the same commit as the change: patch for fixes, minor for new features, major for anything that changes saved values or outputs people rely on.
- `npm run check` before pushing; CI runs the same on every push and pull request.
