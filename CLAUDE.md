# BarWin: notes for Claude

Read this first, then `docs/BACKLOG.md` (what is next) and `docs/beam-rules.md` (every rule the owner has set for the beam apps). Each app's `README.md` has its files, its changelog and how to release it.

## The owner's standing rules

- **Commits** are authored as `Zxaidman <shaikhzaid81.20@gmail.com>`, never as Claude. End each commit message with the attribution lines your session gives you (Co-Authored-By and Claude-Session). The owner wants Verified (SSH-signed) commits; sign when a signing key is available.
- **Work on `main` on GitHub.** The owner does not keep a local clone; GitHub is the only copy. Push finished work to `main`. Vercel deploys every push to `main` and runs `npm test` first, so a failing test stops the deploy.
- **Semantic versioning** for every app and package: MAJOR.MINOR.PATCH (patch: fix; minor: feature; major: breaks saved values or outputs). Bump the version in the source file named in the app's `app.json`, add a changelog line in the app's README (or About box), and a repo entry in `CHANGELOG.md` for repo-level changes.
- **Ask before building** when a requirement is unclear; the owner likes to settle design through short sets of clarifying questions. State assumptions; never invent requirements.
- **Production-ready work**: tests with every change, docs kept current, and say so when there is a better approach than the one asked for.
- **No client files in this repo.** The repository is public. Project drawings, PDFs and the office standard beam DXF stay outside git; tests and docs use made-up sample data only.
- **Never print or ask for credentials or secrets.**
- When giving terminal commands to the owner, give both Windows PowerShell and Android Termux versions.

## Layout

```
apps/<app>/            app.json (homepage card, version source, build outputs), icon.svg, src/, test/, dist/ (built, not committed)
  beam-sections/       active; src/beams.js (drawing module), src/sheet.js (true-scale sheet), src/ui/*.js, page.css
  bbs-studio/          active; src/core/*.js (engine), src/ui/*.js, markup.html, styles.css, dxf-template.dxf
  shape-codes/         BS 8666 reference figures, single file
  ss-beam-geometry/    frozen 0.4.0: do not change
  bbs-studio-footings/ frozen 0.4.0: do not change
packages/brand/        tokens.css / tokens.json, partials/ (the BarWin strip on active tools)
packages/cad/          cad.js: one sheet model to DXF / PDF / SVG; template.dxf; layers.json; tools/make_template.py
site-src/              homepage and 404 templates
scripts/               build.js (assembler), build-site.js, dxf-samples.js, check_dxf.py
tests/e2e/             Playwright tests, run against the built site
docs/                  BACKLOG, beam-rules, DEPLOY, reference/
```

Pages are assembled, not bundled: `src/index.html` is a shell whose `@@include <path>@@` lines are replaced byte for byte by the named files (paths relative to the including file; `*` takes every match in name order). Script sections share one scope; keep top-level names unique. See the header of `scripts/build.js`.

## Commands

```bash
npm ci                          # once
npm run build                   # assemble apps into apps/*/dist/
npm test                        # logic tests (node:test): apps, packages, scripts
npm run test:e2e                # build the site, then Playwright on site/ (needs: npx playwright install chromium)
npm run check:dxf               # sample DXF sheets read back by ezdxf (needs: pip install ezdxf==1.4.4)
npm run template:dxf            # rebuild packages/cad/template.dxf after changing layers.json
```

CI (`.github/workflows/ci.yml`) runs all three test steps on every push and pull request. Live site: https://barwin-ch.vercel.app (unlisted). Deploy details: `docs/DEPLOY.md`.

## Before you push

1. `npm test`, `npm run check:dxf` and `npm run test:e2e` pass.
2. Versions bumped and changelogs updated; `docs/BACKLOG.md` status updated for any item worked on.
3. Rules the owner set or changed in the session are recorded in `docs/beam-rules.md` (or the app's README).
4. After pushing, check the CI run and that the live homepage shows the new build and version.

## Engineering basis (agreed)

- Codes: IS 456 + IS 2502 by default, switchable to BS 8110 + BS 8666.
- DXF targets: AutoCAD 2021 and 2025+, ZWCAD 2026, the cad2bim viewer. DXF sheets: model space 1:1 in mm, a paper-space layout with locked viewports per view.
- Shortest bent leg: IS 456 (8 x bar), BS 8666 (P, Table 2), 12 x bar (default), 10 x bar.
- Closed links have 135 degree hooks (never the BS 90 degree form).
