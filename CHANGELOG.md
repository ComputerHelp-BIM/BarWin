# Changelog

Changes to the repository itself: layout, tooling, tests, docs. Each app's own changes are in its README or its About box.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [semver](https://semver.org).

## [0.2.0] - 2026-10-23

### Added
- Website at https://barwin.vercel.app: a homepage with one card per tool (name, status, version, summary), each tool at its own address (`/beam-sections/`, `/bbs-studio/`, ...), a branded 404, favicon.
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
- Docs: `docs/BACKLOG.md`, `docs/beam-rules.md`, and the reference files (sample PDFs, standard beam DXF, shape-figure spec).

### Removed
- 37 hand-kept backups (`beams_v0*.js`, `page_v0*.html`); history now lives in git.
