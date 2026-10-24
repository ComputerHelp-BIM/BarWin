"""
Builds packages/cad/template.dxf: the empty BarWin drawing that every DXF sheet is written into.

The template holds what is hard to write by hand and never changes per sheet: the header, linetypes, text styles,
layers (from layers.json), one dimension style per drawing scale, the arrow block, and a paper-space layout "SHEET".
cad.js fills it: entities, viewports, dimension blocks and the handle seed, plus the paper size.

Paper size: the template is generated twice (A1 and A3) and the lines that differ become tokens, so the layout's
plot settings and main viewport always follow the chosen sheet without hand-written group codes:
  {{PW}} {{PH}}      paper width and height, mm
  {{PW2}} {{PH2}}    half of them (the main viewport's centre)
  {{MEDIA}}          the "DWG To PDF.pc3" media name
Insert points (each on a line of its own): {{BLOCK_RECORDS}}, {{BLOCKS}}, {{ENTITIES}}. Value: {{HANDSEED}}.

Run from the repository root (needs ezdxf 1.4.4, a development tool only; the apps never need Python):
    python packages/cad/tools/make_template.py
"""
import json
import pathlib
import sys

import ezdxf
from ezdxf.render.arrows import ARROWS

HERE = pathlib.Path(__file__).resolve().parent
CAD = HERE.parent
SPEC = json.loads((CAD / "layers.json").read_text(encoding="utf-8"))
EZDXF_VERSION = "1.4.4"

# Fixed metadata, so the same inputs always give the same template (a reviewable diff, a stable test).
ezdxf.options.write_fixed_meta_data_for_testing = True


def media_name(w, h):
    """The canonical media name AutoCAD's DWG To PDF.pc3 uses, e.g. ISO_full_bleed_A1_(841.00_x_594.00_MM)."""
    for name, (a, b) in SPEC["paper"].items():
        if {a, b} == {w, h}:
            return f"ISO_full_bleed_{name}"
    raise ValueError(f"no ISO paper {w} x {h}")


def build(w, h):
    """The template drawing for one paper size, as DXF text."""
    doc = ezdxf.new("R2010", setup=False, units=ezdxf.units.MM)
    hdr = doc.header
    hdr["$MEASUREMENT"] = 1          # metric
    hdr["$LUNITS"] = 2               # decimal
    hdr["$LUPREC"] = 0
    hdr["$LTSCALE"] = 1.0
    hdr["$PSLTSCALE"] = 1            # linetypes scale with each viewport, so dashes are the same length on paper
    hdr["$MIRRTEXT"] = 0
    hdr["$TEXTSTYLE"] = "ROMANS"
    hdr["$CLAYER"] = "0"
    hdr["$FINGERPRINTGUID"] = "{B4A0C1D2-0000-4BAE-9C1A-0000000BA2A1}"
    hdr["$VERSIONGUID"] = "{B4A0C1D2-0000-4BAE-9C1A-0000000BA2A2}"

    # linetypes: DASHED2 is acadiso's half-size dashed line (6.35 dash, 3.175 gap on paper)
    doc.linetypes.add("DASHED2", pattern=[9.525, 6.35, -3.175], description="Dashed (.5x) __ __ __ __ __")
    doc.linetypes.add("CENTER2", pattern=[28.575, 19.05, -3.175, 3.175, -3.175], description="Center (.5x) ___ _ ___ _")

    # text styles, as in the office standard: ROMANS for notes and dimensions, RC (romanc) for titles
    doc.styles.add("ROMANS", font=SPEC["text"]["font"])
    doc.styles.add("RC", font=SPEC["text"]["titleFont"])

    for name, ly in SPEC["layers"].items():
        layer = doc.layers.add(name, color=ly["aci"], linetype=ly["lt"].upper())
        layer.dxf.lineweight = int(round(ly["lw"] * 100))
        if ly.get("plot") is False:
            layer.dxf.plot = 0

    # dimension styles: one per scale, so a dimension keeps 2.5 mm text on paper after any edit in CAD
    ARROWS.create_block(doc.blocks, ARROWS.closed_blank)
    d = SPEC["dim"]
    for s in [1] + SPEC["scales"]:
        ds = doc.dimstyles.add(f"BARWIN-{s}" if s > 1 else "BARWIN")
        ds.dxf.dimscale = s
        ds.dxf.dimtxt = d["txt"]
        ds.dxf.dimasz = d["asz"]
        ds.dxf.dimexo = d["exo"]
        ds.dxf.dimexe = d["exe"]
        ds.dxf.dimgap = d["gap"]
        ds.dxf.dimtad = 1                 # text above the line
        ds.dxf.dimtih = 0                 # text aligned with the line, inside and outside
        ds.dxf.dimtoh = 0
        ds.dxf.dimdec = 0                 # whole millimetres
        ds.dxf.dimzin = 8
        ds.dxf.dimclrd = d["clrd"]
        ds.dxf.dimclre = d["clre"]
        ds.dxf.dimclrt = d["clrt"]
        ds.dxf.dimtxsty_handle = doc.styles.get("ROMANS").dxf.handle
        ds.set_arrows(blk=ARROWS.closed_blank)
        ds.dxf.dimtmove = 2               # text moves freely, no leader

    psp = doc.paperspace()
    doc.layouts.rename(psp.name, "SHEET")
    psp.page_setup(size=(w, h), margins=(0, 0, 0, 0), units="mm", offset=(0, 0), rotation=0, scale=1,
                   name=media_name(w, h), device="DWG To PDF.pc3")
    mv = psp.main_viewport()
    mv.dxf.center = (w / 2, h / 2)
    mv.dxf.width = w
    mv.dxf.height = h
    mv.dxf.view_center_point = (w / 2, h / 2)
    mv.dxf.view_height = h
    mv.dxf.layer = "VIEWPORT"

    out = CAD / ".template-tmp.dxf"
    doc.saveas(out)
    text = out.read_text(encoding="utf-8")
    out.unlink()
    return text


def tokenize(a_text, a_size, b_text, b_size):
    """The A1 text with each line that differs between the two sizes replaced by its token."""
    a, b = a_text.split("\n"), b_text.split("\n")
    if len(a) != len(b):
        raise SystemExit("the two paper sizes give different line counts; cannot tokenize")
    (aw, ah), (bw, bh) = a_size, b_size
    values = {"PW": (aw, bw), "PH": (ah, bh), "PW2": (aw / 2, bw / 2), "PH2": (ah / 2, bh / 2)}
    out = []
    for x, y in zip(a, b):
        if x == y:
            out.append(x)
            continue
        token = None
        try:
            fx, fy = float(x), float(y)
            for k, (va, vb) in values.items():
                if abs(fx - va) < 1e-9 and abs(fy - vb) < 1e-9:
                    token = k
                    break
        except ValueError:
            if x.startswith("ISO_full_bleed_") and y.startswith("ISO_full_bleed_"):
                token = "MEDIA"
        if token is None:
            raise SystemExit(f"unexpected difference: {x!r} / {y!r}")
        out.append("{{" + token + "}}")
    return out


def mark_insert_points(lines):
    """Puts the insert tokens in, and the handle seed. Each token is a line of its own (DXF readers never see it)."""
    def find(pair, start=0):
        for i in range(start, len(lines) - 1, 2):
            if lines[i] == pair[0] and lines[i + 1] == pair[1]:
                return i
        raise SystemExit(f"not found: {pair}")

    def end_of(kind_pair, end_pair):
        return find(end_pair, find(kind_pair))

    i = find(("  9", "$HANDSEED"))
    lines[i + 3] = "{{HANDSEED}}"
    # Find every point first (group code / value pairs sit at even line numbers), then insert from the end
    # so the earlier positions stay valid.
    points = [
        (end_of(("  2", "BLOCK_RECORD"), ("  0", "ENDTAB")), "{{BLOCK_RECORDS}}"),   # before the table's ENDTAB
        (end_of(("  2", "BLOCKS"), ("  0", "ENDSEC")), "{{BLOCKS}}"),               # before the section's ENDSEC
        (end_of(("  2", "ENTITIES"), ("  0", "ENDSEC")), "{{ENTITIES}}"),
    ]
    for i, token in sorted(points, reverse=True):
        lines.insert(i, token)
    return lines


def main():
    if ezdxf.__version__ != EZDXF_VERSION:
        print(f"warning: built with ezdxf {ezdxf.__version__}; the template was made with {EZDXF_VERSION}", file=sys.stderr)
    a1, a3 = tuple(SPEC["paper"]["A1"]), tuple(SPEC["paper"]["A3"])
    lines = tokenize(build(*a1), a1, build(*a3), a3)
    lines = mark_insert_points(lines)
    target = CAD / "template.dxf"
    target.write_text("\n".join(lines), encoding="utf-8", newline="\n")
    print(f"wrote {target.relative_to(CAD.parent.parent)} ({target.stat().st_size} bytes, {len(lines)} lines)")


if __name__ == "__main__":
    main()
