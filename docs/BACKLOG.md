# BarWin backlog

What is left, recorded 2026-10-23. Covers Beam Sections 0.15.1 and the wider BarWin apps. Status is open unless marked.

Suggested order: A (cleaning and visual), then the rest of D, then C (outputs), then B (engineering).

## A. Cleaning and visual (Beam Sections)

All done in Beam Sections 0.16.0 (2026-10-24).

| # | Item | Status | What was done |
|---|---|---|---|
| A1 | Right support crowding | Done | Ld notes moved into a caption block per support, aligned away from the beam; leg dimensions outside a support beam. |
| A2 | Notes inside the beam | Done | Laps and cut-offs on their own rows outside the beam; only bars and links inside. |
| A3 | Large text collisions | Done | Captions aligned away from the span; cover values lifted beyond the tag rows; labels kept inside the span; text-sized halo. |
| A4 | Extra bars' own legs | Done | Extra top bars get their own leg dimension and their own Ld note. |
| A5 | Red on red | Done | Editable numbers amber with a dashed underline; red only for unusable values. |
| A6 | Long settings panel | Done | Tabs or collapsible Groups, switchable and remembered. The user will decide which to keep, and has an idea of his own to bring. |
| A7 | Bent leg minimum | Done | Four rules: IS 456 (8 x bar), BS 8666 (P, Table 2), 12 x (default), 10 x. |

## B. Engineering not covered yet

| # | Item | Detail |
|---|---|---|
| B1 | Concrete and steel grade | Ld is a fixed 50 x bar size; should come from grades (IS 456 / BS 8110 / EC2 as chosen), with the Ld + 10 x option kept. |
| B2 | Code checks | Max link spacing (e.g. 0.75d or 300), min / max steel, lap staggering (share of bars lapped at one section). Min bar spacing is already checked. |
| B3 | Face bars | No laps along the span, anchorage fixed at 150 into the support; no size or anchorage choice. |
| B4 | Side-face ties | S-hooks / pin links tying face bars on deep beams are not drawn or scheduled. |
| B5 | Bend deductions | Leg and Ld values ignore bend allowances; belongs with cutting lengths (C2). |

## C. Outputs (agreed)

| # | Item | Detail |
|---|---|---|
| C1 | True-scale drawing sheets | DXF (model space 1:1, paper-space layout with viewports), PDF and SVG; separate scales for the L-section and the sections (1:100 to 1:10); A4 to A0; full title block; break line or a "pick a smaller scale" alert when a view does not fit; text about 2.5 mm on paper. Test in AutoCAD 2021 / 2025+, ZWCAD 2026 and the cad2bim viewer. Reference: the standard beam DXF, kept outside the repo (see [reference](reference/README.md)). |
| C2 | Bar schedule | Bar marks, BS 8666 / IS shape codes, cutting lengths with bend deductions, weights, linked to BBS Studio (one data model with the drawing). |

## D. Housekeeping

| # | Item | Status | Detail |
|---|---|---|---|
| D1 | Old backups | Done (repo 0.1.0) | 37 `beams_v*.js` / `page_v*.html` backups dropped; history is in git. |
| D2 | Tests | Done (repo 0.1.0) | Logic tests with the freeze probe (`apps/beam-sections/test`) and Playwright smoke tests (`tests/e2e`), run in CI. |
| D3 | Page size | Done (repo 0.4.0) | Beam Sections' page is now a shell, `page.css` and ten numbered script sections in `src/ui/`, assembled by `scripts/build.js` byte for byte. |
| D4 | Repo | Done (repo 0.1.0) | Every BarWin app in this repo as its own app. |
| D5 | BBS Studio source | Done (repo 0.4.0) | Split into `src/`: shell, styles, markup, DXF template, 20 engine sections (`core/`) and 17 UI sections (`ui/`). The rebuilt page and `bbs-core.js` were byte-identical to the single file before any change. |
| D6 | Apps on the brand | Done (Beam Sections 0.17.0, BBS Studio 0.15.0) | Both active tools use `tokens.css`, Barlow type and the BarWin strip linking home; drawing colour groups unchanged. Frozen apps and the shape codes page stay as published. |
| D7 | BBS Studio tests | Done (repo 0.4.0) | End-to-end smoke tests with a DXF download check; engine tests (`apps/bbs-studio/test`) for BS 8666 shape lengths, rounding, and a made-up column workbook imported and checked against its own total. |
| D8 | Custom domain | Open | e.g. barwin.buildingsoftware.in in place of barwin-ch.vercel.app; needs a DNS record at the domain's registrar. |
