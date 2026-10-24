# Changelog

Changes to the repository itself: layout, tooling, tests, docs. Each app's own changes are in its README or its About box.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [semver](https://semver.org).

## [0.4.0] - 2026-10-24

### Added
- `scripts/build.js`: one assembler for every app with a `build` section in its `app.json`. A shell page holds `@@include <path>@@` lines, each replaced by that file's text byte for byte; includes nest, and `*` takes every match in name order.
- `packages/brand/partials/`: the BarWin strip (mark, name, "All tools" link home) shared by the active tools.
- Tests (26 logic, 12 browser): BBS Studio engine (BS 8666 lengths, rounding, a made-up column workbook imported and checked against its own total); every include resolves; the strip is on the active tools and not on the frozen ones; the strip links home.

### Changed
- Beam Sections page split into a shell, `page.css` and ten script sections (BACKLOG D3).
- BBS Studio split from one 6,600-line file into `src/` (shell, styles, markup, DXF template, 20 engine and 17 interface sections) with a built `dist/` (BACKLOG D5). Both splits rebuilt byte-identical before any other change.
- Beam Sections 0.17.0 and BBS Studio 0.15.0 on the brand: tokens, Barlow type, the BarWin strip (BACKLOG D6). SS Beam Geometry and footings stay frozen; the shape codes page is unchanged.
- SS Beam Geometry's shell renamed `src/index.html`, using the same assembler; it still builds byte-identical to the frozen page.

### Removed
- `scripts/build-beams.js`, replaced by `scripts/build.js`.

## [0.3.1] - 2026-10-23

### Removed
- Client project files (sample PDFs from a live project, the standard beam DXF) and the client's name, from the repository and its whole history, now that the repository is public. Copies are kept outside git.

### Changed
- Production address is https://barwin-ch.vercel.app (barwin.vercel.app belongs to another Vercel account).

## [0.3.0] - 2026-10-23

### Changed
- Deploys now come from Vercel's GitHub app (the repository is public), so no token is stored in GitHub. Push to `main` deploys production; pull requests get preview links from Vercel.
- Vercel runs `npm test` before every build, so a failing logic test stops the deploy.
- `ci-cd.yml` is now `ci.yml`: tests only. The CLI deploy job is kept in history for a private repo (see `docs/DEPLOY.md`).

## [0.2.0] - 2026-10-23

### Added
- Website (now https://barwin-ch.vercel.app): a homepage with one card per tool (name, status, version, summary), each tool at its own address (`/beam-sections/`, `/bbs-studio/`, ...), a branded 404, favicon.
- `apps/<app>/app.json` and `icon.svg` for every app; the homepage is generated from them and reads each version from the app's source.
- `scripts/build-site.js`: builds `site/`, minifying every page (about 30% smaller, comments removed). Data blocks such as the BBS Studio DXF template are passed through untouched.
- CI/CD (`.github/workflows/ci-cd.yml`): tests, then a protected preview deploy for pull requests and a production deploy for `main`, followed by a smoke test of every page. Only the built site is uploaded to Vercel.
- `vercel.json`: noindex, security headers, clean URLs; Vercel's own Git deploys off.
- Tests: site build and minifier guard (4), homepage (2), BBS Studio and footings end to end with a DXF download check (2), SS Beam Geometry storage key (1).
- `docs/DEPLOY.md`: how deploys work, one-time setup, adding an app, troubleshooting.

### Fixed
- SS Beam Geometry source did not match the frozen page: it saved under Beam Sections' storage key (`bbs-beam-sections-v2`) and had Beam Sections' title. On one site the two apps would have overwritten each other's saved values. The source now builds byte-identical to the frozen page.
- Shape codes version given as engine 1.2.0 in the READMEs; the page is engine 1.3.0.

### Changed
- `ci.yml` replaced by `ci-cd.yml`.

## [0.1.0] - 2026-10-23

### Added
- Monorepo with every BarWin app in its own folder: Beam Sections 0.15.1, SS Beam Geometry 0.4.0 (frozen), BBS Studio 0.14.2, BBS Studio footings 0.4.0 (frozen), BS 8666 shape codes (engine 1.3.0).
- `packages/brand`: logo and icon SVGs, `tokens.css` and `tokens.json` (1.0.0), and the brand canvas source.
- `scripts/build-beams.js`: one build for both beam apps, writing to each app's `dist/` (was two copies writing to a fixed outside folder).
- Tests: 12 logic tests for Beam Sections (`node:test`, includes the freeze probe) and 5 Playwright smoke tests across the apps, replacing the scratch screenshot scripts.
- CI on GitHub Actions: logic and browser tests on every push and pull request.
- Docs: `docs/BACKLOG.md`, `docs/beam-rules.md`, `docs/reference/shape-figure-spec.md`.

### Removed
- 37 hand-kept backups (`beams_v0*.js`, `page_v0*.html`); history now lives in git.
