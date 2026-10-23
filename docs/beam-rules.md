# Beam apps: agreed rules

The rules behind [SS Beam Geometry](../apps/ss-beam-geometry) (geometry, frozen at 0.4.0) and [Beam Sections](../apps/beam-sections) (reinforcement, 0.15.1). Each rule here is one the user set or approved; the tests in `apps/beam-sections/test` pin the key ones.

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

## Drawing scales (decided 2026-10-16; built with the DXF milestone, BACKLOG C1)
- NTS stays the on-screen default; scaled modes draw true geometry from the real numbers.
- Outputs: PDF, SVG and especially DXF. Separate scales for the L-section and the cross-sections (1:100 to 1:10). Paper sizes A4 to A0.
- DXF: everything 1:1 in model space; a paper-space layout of the chosen sheet holds viewports at each view's scale.
- Text and dimensions a fixed size on paper (about 2.5 mm). A view that does not fit: alert to pick a smaller scale, or offer a break line in the span. Alert, never block.

# Reinforcement (Beam Sections 0.15.1)

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
- L-section: each support shows its own top bar's anchorage above the beam and its own bottom bar's below. Straight: "LD 800" with "50 x T16". Bent / to cover: the straight run with "LD 800 = 860 + 192 LEG" or "TO COVER".
- Bent leg (0.15.1): a vertical dimension beside each drawn leg with its length, value on the side away from the bar. Leg rule (assumption, to confirm, BACKLOG A7): at a column / wall, leg = Ld - straight run (support width - cover), never less than 12 x bar size; bent to cover at a support beam, leg = min(beam depth, support depth) - top cover - bottom cover. Bend deductions not yet included (they belong to cutting lengths in the BBS).
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
