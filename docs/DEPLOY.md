# Deploying BarWin

Live site: **https://barwin-ch.vercel.app** (Vercel project `barwin`, team Computer Help, linked to this repo).

## How it works

```
push to main ──► Vercel: npm test ──► build site/ ──► production (https://barwin-ch.vercel.app)
             └─► GitHub Actions CI: logic tests + browser tests on the built site

pull request ──► Vercel: preview deploy (needs a Vercel login; Vercel posts the link on the PR)
             └─► GitHub Actions CI: the same tests
```

- **Vercel deploys from Git.** The repository is public, so Vercel's GitHub app builds and deploys every push with no token stored in GitHub. (On the Hobby plan this only works for public repositories; see "If the repo goes private".)
- **Vercel runs the logic tests first** (`npm test && npm run build:site`), so a broken rule check fails the build and production keeps the last good version.
- **GitHub Actions runs the browser tests** ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)), including a real BBS Studio run that downloads the DXF and checks it is well-formed. These run alongside the deploy, not before it: merge pull requests only when CI is green.
- Pull requests from forks are not deployed until someone on the team approves them in Vercel.

## What is published

`npm run build:site` writes `site/`:

| Path | What |
|---|---|
| `/` | Homepage: one card per app, from each `apps/<app>/app.json` |
| `/<app>/` | The app, minified (about 30% smaller, comments removed) |
| `/brand/` | Mark and icons |
| `404.html` | Branded not-found page |

Data blocks such as the BBS Studio DXF template pass through the minifier untouched (tested).

Every response carries `X-Robots-Tag: noindex, nofollow`, so search engines leave the site out. To let it be found, remove that header from `vercel.json` and the robots meta tags from `site-src/`.

## Rolling back

Vercel → project `barwin` → Deployments → pick the last good one → Promote to Production. Then fix forward on `main`.

## Adding an app

1. Put it in `apps/<slug>/` (lowercase words joined by hyphens; the slug becomes the URL).
2. Add `apps/<slug>/app.json`:
   ```json
   {
     "name": "My Tool",
     "status": "active",
     "order": 60,
     "summary": "One or two sentences for the card.",
     "features": ["Short tag", "Another"],
     "entry": "index.html",
     "version": { "file": "index.html", "pattern": "VERSION = '(\\d+\\.\\d+\\.\\d+)'" }
   }
   ```
   `status`: `active` or `reference` go under Tools, `frozen` under Archive. The version is read from the source, so the card never shows a stale number.
3. Optionally add `apps/<slug>/icon.svg` (64 × 64 grid, `currentColor` lines, `class="dot"` for the accent dot).
4. If the app is kept as pieces, add a build section to `app.json` and point `entry` at the built file:
   ```json
   "entry": "dist/my-tool.html",
   "build": { "outputs": { "dist/my-tool.html": "src/index.html" } }
   ```
   `src/index.html` is the shell; each line `@@include <path>@@` is replaced by that file's text (paths relative to the including file, `*` takes every match in name order). `npm run build` picks the app up on its own. See the header of `scripts/build.js`.
   To show the BarWin strip, include `packages/brand/tokens.css` and `partials/app-bar.css` in the page's styles and `partials/app-bar.html` at the top of the body.
5. `npm run check`, commit, push. The card and the page appear on the next deploy.

## Local preview

```bash
npm run build:site                      # site/, minified as on Vercel
node scripts/build-site.js --no-minify  # same, unminified, to rule out the minifier
npx serve site                          # any static server; open http://localhost:3000
```

## If the repo goes private

Vercel's Hobby plan will not build commits by collaborators on a private repository, so Git deploys would stop. Switch to deploying from GitHub Actions with the Vercel CLI instead: the deploy job is in git history (commit `0d0fb52`, `.github/workflows/ci-cd.yml`). Restore it, add the repository secret `VERCEL_TOKEN` (a token scoped to the Computer Help team), and set `"git": { "deploymentEnabled": false }` in `vercel.json` so the two paths do not both deploy.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Vercel build fails at `npm test` | A logic test failed; the log in Vercel names it. Run `npm test` locally. |
| CI is red but the site deployed | A browser test failed after the deploy. Roll back if the live site is affected, then fix. |
| A page works in the repo but not on the site | Build with `node scripts/build-site.js --no-minify`; if that works, it is a minifier problem. |
| No deploy after a push | Check the Vercel GitHub app still has access to this repo (GitHub → Settings → Applications). |
