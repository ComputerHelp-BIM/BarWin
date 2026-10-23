# BarWin brand

**Version 1.0.0**

The mark is a bar with one bend in side view, with its plan view below and a dot where the bar leaves the plan: the way the shape-code figures draw it.

## Files

| File | Use |
|---|---|
| `tokens.css` | CSS custom properties (`--bw-*`) for colour, type and shape. |
| `tokens.json` | The same values as data, for scripts and other tools. Keep the two in step. |
| `assets/mark.svg` | The mark on light grounds. |
| `assets/mark-reversed.svg` | The mark on Steel or other dark grounds. |
| `assets/app-icon.svg` | App icon, 64 px and up. |
| `assets/app-icon-small.svg` | 32 px and below (favicon): plan line dropped, dot enlarged. |
| `canvas/` | Source of the brand board (logo, icon, colour, type, app header) as Claude Design artboards. They need the Design canvas to render; open the board itself to view or edit. |

## Colour

| Name | Hex | Use |
|---|---|---|
| Steel | `#1B2530` | Text, bars, the dark ground |
| Oxide | `#B23A21` | The accent: "Win", the dot, primary buttons |
| Oxide light | `#F08A5D` | The accent on Steel |
| Marker | `#F2B705` | The picked bar, and nothing else |
| Mill | `#46525C` | Secondary text, dimension lines |
| Galvanised | `#E9EDF0` | The light ground; cards sit on it in white |

## Type

| Face | Weights | Use |
|---|---|---|
| Barlow Condensed | 600, 700 | The name, headings, tab labels |
| Barlow | 400, 500, 600 | Everything people read |
| IBM Plex Mono | 400, 500 | Dimensions, bar marks, lengths and weights |

## Wordmark

"Bar" in Steel (or white on Steel), "Win" in Oxide (or Oxide light on Steel), Barlow Condensed 700. Lockup: mark, wordmark, and "by Computer Help" in Barlow 500, tracked, in Mill.

The apps do not use these tokens yet; bringing them onto the brand is an open item in [docs/BACKLOG.md](../../docs/BACKLOG.md).
