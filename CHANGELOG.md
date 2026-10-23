# Changelog

Changes to the repository itself: layout, tooling, tests, docs. Each app's own changes are in its README or its About box.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [semver](https://semver.org).

## [0.1.0] - 2026-10-23

### Added
- Monorepo with every BarWin app in its own folder: Beam Sections 0.15.1, SS Beam Geometry 0.4.0 (frozen), BBS Studio 0.14.2, BBS Studio footings 0.4.0 (frozen), BS 8666 shape codes (engine 1.2.0).
- `packages/brand`: logo and icon SVGs, `tokens.css` and `tokens.json` (1.0.0), and the brand canvas source.
- `scripts/build-beams.js`: one build for both beam apps, writing to each app's `dist/` (was two copies writing to a fixed outside folder).
- Tests: 12 logic tests for Beam Sections (`node:test`, includes the freeze probe) and 5 Playwright smoke tests across the apps, replacing the scratch screenshot scripts.
- CI on GitHub Actions: logic and browser tests on every push and pull request.
- Docs: `docs/BACKLOG.md`, `docs/beam-rules.md`, and the reference files (sample PDFs, standard beam DXF, shape-figure spec).

### Removed
- 37 hand-kept backups (`beams_v0*.js`, `page_v0*.html`); history now lives in git.
