# Beam apps: agreed rules

The rules behind [SS Beam Geometry](../apps/ss-beam-geometry) (geometry, frozen at 0.4.0) and [Beam Sections](../apps/beam-sections) (reinforcement, 0.18.0). Each rule here is one the user set or approved; the tests in `apps/beam-sections/test` pin the key ones.

# Geometry (SS Beam Geometry 0.4.0, frozen 2026-10-16)

## Views
- L-section plus cross-sections A-A (mid-span), B-B (near left end), C-C (near right end), all looking right.
- Each section mark has a SHOW tick box under it; a hidden section's mark fades on screen and is left out of an exported L-section.
- Not to scale (NTS). Geometry is a fixed template; typed values change only the numbers, with the exceptions below.

## Supports (four arrangements)

| Left end | Right end | Beam class |
|---|---|---|
| Column / wall | Column / wall | Primary |
| Column / wall | Beam | Secondary |
| Beam | Column / wall | Secondary |
| Beam | Beam | Tertiary |

- Column / wall end: drawn 900 wide, broken top and bottom, label "COLUMN / WALL".
- Beam end: drawn 500 wide (any typed width), label "SUPPORT BEAM", tops always flush.
- Support beam depth vs main beam depth, per end: equal = flush; support deeper = drawn 200 deeper; support shallower = drawn 200 shallower, with a choice of the main beam stopping at the support face or running under it to the far face.

## Line conventions
- Concrete outline: faded grey, solid where a face is in the open.
- Junction between two elements: dashed grey. No hatching in any view.
- Cover line: thin green dashed, the combined outline offset inwards, trimmed cleanly at every junction.

## Editable values (red = size, green = cover)
- Per end: column / wall width, or support beam width and depth; each end keeps both sets when switched.
- Clear span, beam depth, beam width. The main beam depth is dimensioned in the cross-sections only (removed from the L-section in Beam Sections 0.10.1); a support beam's own depth stays beside it in the L-section.
- Covers: beam top 25, bottom 40, sides 25, column / wall 40. In the L-section each cover dimension sits at the x furthest from the section marks and the tags on its own side of the beam.
- Overall length = left end + span + right end, worked out. Sizes accept mm, cm or m.

## Sections A-A / B-B / C-C
- Rectangle, no hatch, green dashed cover line; width above, depth beside; top and bottom cover on the left; one side cover underneath.

## DXF export (decided 2026-10-16)
- True scale from the real numbers: real geometry and measuring dimensions, not the on-screen template.
- Target CAD: AutoCAD 2021 and 2025+ mostly; ZWCAD 2026 rarely; cad2bim viewer sometimes. Test the DXF in these.
- The sheet carries a full title block (project, beam mark, drawn by, date, scale and the rest).

## Drawing scales (decided 2026-10-16; built in Beam Sections 0.18.0, BACKLOG C1)
- NTS stays the on-screen default; scaled modes draw true geometry from the real numbers.
- Outputs: PDF, SVG and especially DXF. Separate scales for the L-section and the cross-sections (1:100 to 1:10). Paper sizes A4 to A0.
- DXF: everything 1:1 in model space; a paper-space layout of the chosen sheet holds viewports at each view's scale.
- Text and dimensions a fixed size on paper (about 2.5 mm). A view that does not fit: alert to pick a smaller scale, or offer a break line in the span. Alert, never block.

# Reinforcement (Beam Sections 0.16.0)

## Drawing layout (0.16.0)
- Inside the beam only bars and links are drawn. Every dimension and note sits on a row outside it.
- Above the beam, from the beam up: top tags, section marks, top laps ("LAP 800", when an end laps), extra-bar lengths, lap points, the chain, the overall length.
- Below the beam: bottom tags, then the bottom extras' cut-offs and the bottom laps on their own rows; section marks, link zones and the title move down to make room.
- A label wider than its dimension stays on the span side, never over a support face. A long note over the extras runs out over the support instead.
- Each support has a caption block aligned away from the beam: its name, the anchorage choice (a menu), then one Ld note each for the top, bottom and extra bars; identical notes share a line ("TOP & BOT").
- The top cover value sits above the tag row on a longer leader, the bottom one at the cut-off row's height, so only the leader has to pass between tags. Both keep clear of section marks and of the bottom dimension labels.
- Editable numbers are amber with a dashed underline (no bar group uses amber); covers stay green; red is kept for values that cannot be used.
- Settings panel: Tabs (Geometry, Main bars, Top bars, Bottom bars, Anchorage, Links, Checks) or collapsible Groups, switched at the top of the panel and remembered. The Checks tab shows the number of warnings.

## View controls (0.15.0)
- "Labels" checkbox above the drawings: off hides bar tags, notes, section bar lists and the Ld, leg, lap and cut-off dimensions in one click; geometry dimensions, section marks and titles stay. Applies to the L-section, the cross-sections and copied SVGs.
- Text size 70% to 130% (default 100%) for every drawing. Link-zone notes that would touch drop a line, and the title moves down to suit.

## Links
- Six distributions: one spacing over the span; ends and mid-span with the end zone typed; ends 2 x depth; ends L/3; ends % of span (default 25); left and right.
- Typed zone lengths and spacings limited to valid values for the span (grey min / max). First and last link 25 to 100 from the faces, default 50.
- Link count: spaces = ceil(length / spacing), links = spaces + 1; boundary links shared. Example: 5000 span, 1800 ends @ 100, mid @ 150 gives 19 + 9 + 19 = 47.
- In section: on the cover line, closed with two 135 degree hooks; 4 and 6 legs add inner U links.
- Alerts (never restrict): 2D + 2D reaching the span, or % of 50 and over, gives one spacing with an alert; the same spacing in two zones suggests one spacing (one-click switch).

## Main bars and anchorage
- Anchorage straight or bent by support width, automatic with a per-end override; Ld = ldF (50) x bar size from the face. Column: Ld or Ld + 10 x bar size. Beam end: bent to cover, straight Ld, or straight to cover.
- L-section: each support shows its own top bar's anchorage above the beam and its own bottom bar's below ("LD 800" when straight, the straight run when bent); under a deeper support beam the bottom one goes below the support. The full sum is in the support's caption: "LD 800 = 50 x T16", "LD 800: 275 + 835 LEG", "STRAIGHT 275 TO COVER (LD 800)".
- Bent leg: every bent leg has its own vertical dimension, extra top bars included (0.16.0). Inside a column or wall the dimensions step in from the bars; at a support beam they sit outside its outer face (with extension lines), and the support's depth dimension moves out beyond them.
- Leg rule: at a column / wall, leg = Ld - straight run (support width - cover), never less than the chosen minimum (0.16.0, user's choice of four):
  - IS 456: 8 x bar size (a 90 degree bend develops 8 x bar size, cl. 26.2.2.1 b);
  - BS 8666: the minimum end projection P of Table 2 (8: 115, 10: 120, 12: 125, 16: 130, 20: 190, 25: 240, 32: 305, 40: 380, 50: 475; other sizes radius + bar + 5 x bar, rounded up to 5);
  - 12 x bar size (the default, confirmed by the user);
  - 10 x bar size.
  When the minimum sets the leg, the note says so: "LD 1000: 860 + 240 LEG (MIN 12Ø)".
- Bent to cover at a support beam: leg = min(beam depth, support depth) - top cover - bottom cover. Bend deductions are not yet included (they belong to cutting lengths in the BBS, BACKLOG B5).
- The note under each support name is a menu on the drawing (Auto / Straight / Bent, Ld or Ld + 10 x bar size at a column).

## Bars along the span, top and bottom
- Left, mid and right zones each have their own count and size, top and bottom separately; ends "Same as mid" by default; editing an end's numbers sets it apart.
- Lap length = lapF (50) x the smaller bar at the change; the lap lies inside the end area, ending at the lap point.
- Top lap point: extra bars' cut-off (default; L/4 if none), L/4, L/3, 0.3L, typed. Bottom lap point: at the junction (default; the lap starts at the face), bottom extras' cut-off, L/4, L/3, 0.3L, typed.
- Bar run rule: bars of the same size run through; only added or different bars lap or stop.
- Lap styles, separate top and bottom: inline (default; one line with a tick at each lap end leaning into the beam), offset (side by side), cranked 1:6 (the bar going into mid-span sits one bar off the line over the lap and cranks back at 1:6).
- Tags: top above the beam (left / mid / right, "4-T16 TOP + 2-T25 EXTRA" at an end with extras); bottom below the beam ("3-T16 BOTTOM + 3-T20 EXTRA" mid); face tag inside.

## Extra bars and layers
- Extra top bars per end: count, size, length from the face (L/4, L/3, 0.3L, typed). Extra bottom bars over mid-span: count, size, cut-off from each face (0.1L, 0.15L default, L/5, L/4, L/7, typed).
- Layer choice (top per end, bottom one): Auto, Layer 1, Layer 2. Main bars always stay in layer 1 (corner bars main; extras shared out evenly, leftovers mirrored from the middle).
- Layer rule (0.15.0): Auto moves extras to layer 2 quietly when the clear gap is under max(largest bar, 25), with no alert. Layer 1 chosen but too tight: the extras still go to layer 2, and an alert says so. A second layer still too tight keeps its alert.
- Spacer / pin bars wherever a second layer exists: size max(25, largest bar), cover to cover (length B - 2 x side cover), no further apart than the typed spacing (default 1000), at least two per run.

## Bar colour groups (vivid defaults, 0.15.0)
- Main top red, extra top magenta, main bottom blue, extra bottom cyan, face violet, links end zone green, links mid zone lime green, spacer / pin bar orange; brighter variants in dark mode.
- Lines, dots, links and tag / list text take their group colour; editable numbers stay the edit colour, underlined. Legend under the L-section with colour pickers and reset; copied SVGs bake in the colours.

# Drawing sheet (Beam Sections 0.18.0)

## What it is
- The beam drawn true to scale from the real numbers, on a sheet with a title block: the L-section at one scale, the shown sections at another (1:10, 1:15, 1:20, 1:25, 1:30, 1:40, 1:50, 1:75, 1:100), A4 to A0, landscape or portrait. The on-screen drawings stay the not-to-scale template.
- Downloads: DXF, PDF and SVG of the same sheet. Settings and title block are kept in the browser under their own key, so the firm and project carry over from beam to beam.

## Matching the office standard beam DXF
- Layers (colour): FRAMING (7) concrete and dimensions, BEAM R (1) all beam bars, STIRRUPS (3) links, SPACER BAR (3), COVERS (2) cover lines, TEXT (1) tags and notes, COLUMN (6) view titles and section marks. Added: TITLE (7) frame and title block, VIEWPORT (8, not plotted).
- Text: romans.shx (style ROMANS), titles romanc.shx (style RC); 2.5 mm notes, 4.25 mm view titles. Dimensions: closed blank arrows, text above the line, dimension line colour 4, extension lines 2, text 3, whole millimetres.
- Departures from the standard, on purpose: model space is 1:1 in mm (the standard is drawn 10 times size with a 0.1 measurement factor); views sit in a paper-space layout; cover lines are dashed; layer lineweights are set so a monochrome plot reads (bars 0.5, outlines 0.25, cover 0.13); sections are not hatched (the agreed rule for every view).

## Layout rules
- Auto scales: the L-section as large as fits whole, then the sections as large as fits, never smaller than the L-section; the sections go under the L-section or beside it, whichever lets the drawing be larger.
- A long beam that will not fit whole at any scale (or at the chosen scale) gets a break line in the span, clear of the section marks: one break, or one each side of A-A when one is not enough. Turning breaks off gives an alert instead. A sheet too small for any scale is still drawn, with an alert to pick a larger sheet: alert, never block.
- Inside the beam: bars and links only, as on screen. Tags, laps, cut-offs, extra lengths, link zones, Ld and leg dimensions and support captions sit on rows outside it, sized on paper. Covers are dimensioned in the sections and listed in the notes.
- Where a real offset would vanish on paper (laps side by side, extras beside the main bars, a bottom bar's bend inside the top bar's), it is drawn 1 mm on paper (2 mm for a second layer). Dimensions always state the true value.
- Bends are drawn at the BS 8666 minimum radius (2 x bar to 16, 3.5 x above); no bend deduction is made (BACKLOG B5). Link hooks: 135 degrees, 6 x link size and at least 65 mm (IS 13920).
- Notes written for every sheet: dimensions in mm, the covers, lap and Ld multiples, the bent-leg minimum, the links; the user's own notes follow.
