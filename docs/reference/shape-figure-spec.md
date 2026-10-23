# BBS Studio shape-code figures: drawing specification (v1.2.0)

This is the fixed convention for every shape-code figure. Hand it to any session, with `bs8666-shape-codes.html`, to get identical drawings.

## Geometry
- Figures are schematic, not to scale: bar thickness 14 units, inside bend radius 28 units (2 x thickness), centre-line radius 35.
- Bends are concentric arcs. Ends are cut square.
- A stated radius (code 12) or semi-circular bend (code 13) uses its own radius.
- Every figure is drawn from one definition of the bar (centre-line vertices in the plane of bending). Side view and plan view both come from it.

## Views
- Side view: the bar in its plane of bending. Carries every dimension.
- Plan view: the same bar from above. A bar bent in one plane is a straight strip between its extreme faces.
  - Leg standing towards the viewer: round end, cut face shown as a full circle.
  - Bend returning over the bar: round end; the upper leg's cut end is a line across the strip.

## Presentations (outline is the default)
1. Outline: bar edges only.
2. Solid: outline with a grey fill.
3. Solid + centre-line: as 2 with a chain-dotted centre-line running 9 units past each end.
4. Line, dot at bend: one heavy line (3.2 wide) on the centre-line. In plan, a dot (radius 4.5) wherever the bar leaves the plan; a short tick where an upper leg ends.

## Dimensions
- Measured to the outside faces of the bar, as BS 8666.
- Label is letter and value: `A=900`. A run-out dimension keeps its brackets: `(B)=1350`.
- Inclined legs are dimensioned along the slope; the overall height is a separate dimension.
- Extension lines start 4 units clear of the bar; arrowheads both ends.

## Layout
- Sheet width 380 units. Each figure: title, "Side view", the side view, "Plan view", the plan, then the length formula.
- Every figure is measured after drawing and fitted inside the sheet with a 10 unit margin, in all four presentations. Nothing may be clipped.

## Rules added in v1.1.0
- A leg dimension runs to the outside of a bend of 90 degrees or more, to the intersection point at a shallower bend, and to the cut at a free end.
- The plan view is worked out from the side view, never drawn by hand: square end where a level leg is cut, round end at a bend or upright leg, circle where an upright leg points at the viewer, cut line where an upper leg ends over the bar, dot at every bend.
- Codes 75 and 77 lead with the view that shows the shape (plan for the ring, side for the helix) and pair it with the other.
- Code 98 is bent in two planes: its feet show as circles in the side view and as a Z in plan.
- Two facing labels are slid apart along their dimension lines; nothing else moves.

## Rules added in v1.2.0
- Closed links (33, 51, 51A, 56, 63, 64) are drawn as they sit on site: lapped legs lie on the sides they lap. In the side view a lap shows only as a cut line (a tick in the line presentation); in plan it is a second bar alongside the first.
- 51A is the closed link with two 135 degree hooks bent round the same corner, tails parallel into the core. It is not a BS 8666 code; its length is the centre-line length.
- A bar bent in more than one plane gets one pictorial view in place of side and plan: 98 (chair) and 77 (helix, isometric).

## Status
36 figures drawn (the 35 BS 8666 codes and 51A) in `bs8666-shape-codes.html`. Approved by the user: 00, 11 to 15. Awaiting review: the rest.

## Changelog
- 1.2.0: closed links as on site; 51A added; 98 and 77 in one pictorial view; 56, 63, 64 uncluttered.
- 1.1.0: all codes; automatic plan view; leg-dimension rule; per-corner bend radii.
- 1.0.0: 00 and 11 to 15; four presentations; fit rule.
