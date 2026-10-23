# Deploying BarWin

Live site: **https://barwin.vercel.app** (Vercel project `barwin`, team Computer Help).

## How it works

```
pull request ──► Test ──► Deploy preview      (protected: needs a Vercel login; link in the run summary)
push to main ──► Test ──► Deploy production   (https://barwin.vercel.app) ──► smoke test every page
```

Defined in [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml).

- **Test**: logic tests, then the site is built and every page is opened in Chromium. Includes a real BBS Studio run that downloads the DXF and checks it is well-formed.
- **Deploy**: the Vercel CLI builds the site on the GitHub runner and uploads only the result (`vercel deploy --prebuilt`). The repository, docs and reference files never reach Vercel.
- Vercel's own Git deploys are switched off (`"git": {"deploymentEnabled": false}` in `vercel.json`), so nothing goes live without passing the tests. This also avoids the Hobby plan's block on deploying commits from collaborators on a private repo.
- A failed test stops the deploy; production keeps the last good version.

## What is published

`npm run build:site` writes `site/`:

| Path | What |
|---|---|
| `/` | Homepage: one card per app, from each `apps/<app>/app.json` |
| `/<app>/` | The app, minified (comments removed, code compressed) |
| `/brand/` | Mark and icons |
| `404.html` | Branded not-found page |

The apps run in the browser, so visitors receive their code; minifying makes it hard to read but cannot hide it. Data blocks such as the DXF template are passed through the minifier untouched (tested).

Every response carries `X-Robots-Tag: noindex, nofollow`, so search engines leave the site out. To let it be found, remove that header from `vercel.json` and the robots meta tags from `site-src/`.

## One-time setup

1. **Token.** At vercel.com → Account Settings → Tokens, create a token with scope **Computer Help** and an expiry you are happy to renew.
2. **Secret.** In GitHub: ComputerHelp-BIM/BarWin → Settings → Secrets and variables → Actions → New repository secret: name `VERCEL_TOKEN`, value the token.
3. **First deploy.** Actions → CI/CD → Run workflow (branch `main`), or push to `main`.

The team and project IDs are in the workflow file; they are identifiers, not secrets.

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
4. If the app needs a build step, add it to `npm run build` and point `entry` at the built file.
5. `npm run check`, commit, push. The card, the page and the production smoke test pick it up automatically.

## Local preview

```bash
npm run build:site                    # site/, minified as on Vercel
node scripts/build-site.js --no-minify  # same, unminified, to rule out the minifier
npx serve site                        # any static server; open http://localhost:3000
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| Deploy fails with "VERCEL_TOKEN missing" | Add the secret (setup step 2) and re-run the workflow. |
| Deploy fails with 401 / 403 from Vercel | The token expired or lacks the Computer Help scope; create a new one and update the secret. |
| Smoke test fails after deploy | The page did not return 200; open the deployment link in the run summary. Production still serves it, so roll back in Vercel (Deployments → previous → Promote) while you fix it. |
| A page works in the repo but not on the site | Build with `node scripts/build-site.js --no-minify`; if that works, it is a minifier problem. |
