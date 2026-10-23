# BBS Studio

**Version 0.14.2 · Active**

Steel schedules from the steel quantity workbook. Drop the column and wall workbook (or the beam workbook) and the app reads the typed inputs, checks its totals against the workbook's own, and builds:

- the bar bending schedule, in standard form (CADS RC layout) and full data;
- shop drawings, a 3D view and an IFC4 model with concrete, formwork and reinforcement;
- BOQ, rate analysis and cost; cutting plan;
- downloads: Excel, PDF (schedule, full data, BOQ and cost, shop drawings), DXF, IFC, zip of everything.

Covers shear walls, core walls and columns; beams at step 1 (schedule, BOQ, cost, PDFs; drawings and 3D to follow). IS 2502 and BS 8666:2020 switchable. The full changelog is in the app's About box.

## Files

`index.html` is the whole app: one file, opens from disk. It loads four libraries from public CDNs (SheetJS 0.18.5, JSZip 3.10.1, three.js r128 with OrbitControls), so the first open needs internet.

## Notes

- The earlier modular source of this app was not kept; this single file is now the source. Splitting it into modules (as Beam Sections is) is a good next step before larger changes.
- Release: bump `VERSION` in the script, add a line to the About changelog, commit, tag `bbs-studio@vX.Y.Z`.
- Sample outputs from a real project are in [docs/reference/pdf-samples](../../docs/reference/pdf-samples).
