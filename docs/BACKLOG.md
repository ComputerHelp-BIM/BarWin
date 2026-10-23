# BarWin backlog

What is left, recorded 2026-10-23. Covers Beam Sections 0.15.1 and the wider BarWin apps. Status is open unless marked.

Suggested order: A (cleaning and visual), then the rest of D, then C (outputs), then B (engineering).

## A. Cleaning and visual (Beam Sections)

| # | Item | Detail |
|---|---|---|
| A1 | Right support crowding | Bottom Ld note ("LD 800 = 275 + 835 LEG") sits close to "SUPPORT BEAM"; top Ld note near the right top tag at large text. |
| A2 | Notes inside the beam | Bottom extra cut-off and lap dimensions ("750 = 0.15L CUT-OFF", "LAP 800") cross the links; the halo helps but it reads busy. |
| A3 | Large text collisions | At 130% text, "COLUMN / WALL" touches the link-zone dimension line; cover values squeeze between tags. |
| A4 | Extra bars' own legs | Extra top bars (e.g. T25) bend into the supports, but only the main bars' legs and Ld are dimensioned. |
| A5 | Red on red | Main top bars are red, close to the red of editable numbers; consider another edit colour (amber / orange) so it never clashes with a bar group. |
| A6 | Long settings panel | 13 groups; move to tabs (Geometry, Top bars, Bottom bars, Links, View) or collapsible groups. |
| A7 | Bent leg rule to confirm | Column bend leg = Ld - straight run, never under 12 x bar size (assumption); support beam bent to cover = min(beam, support depth) - covers. **Waiting on you:** confirm 12 x or another minimum. |

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
| D3 | Page size | Open | `page.html` has grown large (form, alerts, editors); split into modules (form, alerts, on-drawing editors, view) with the build inlining them. |
| D4 | Repo | Done (repo 0.1.0) | Every BarWin app in this repo as its own app. |
| D5 | BBS Studio source | Open | The modular source was lost; `apps/bbs-studio/index.html` (6,600 lines) is now the source. Split it into modules like Beam Sections before large changes. |
| D6 | Apps on the brand | Open | No app uses `packages/brand` yet; each has its own colours and fonts. Move them onto `tokens.css`, keeping the drawing colour groups. |
| D7 | BBS Studio tests | Partly done (repo 0.2.0) | End-to-end smoke tests with a DXF download check are in. Still to add: workbook import totals against the workbook's own, schedule lengths against the CADS RC sample. |
| D8 | Custom domain | Open | e.g. barwin.buildingsoftware.in in place of barwin-ch.vercel.app; needs a DNS record at the domain's registrar. |
