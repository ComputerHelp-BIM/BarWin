"""
Reads each DXF with ezdxf (recover mode, then a full audit) and fails on any error, so a sheet that a CAD program might
refuse never ships. Also checks the layout SHEET exists with its viewports. Development tool: pip install ezdxf==1.4.4

Usage: python scripts/check_dxf.py file.dxf [more.dxf ...]
"""
import sys

from ezdxf import recover


def check(path):
    doc, auditor = recover.readfile(path)
    problems = [str(e.message) for e in auditor.errors]
    problems += [str(e.message) for e in doc.audit().errors]
    if "SHEET" not in doc.layout_names():
        problems.append("no layout SHEET")
    else:
        vps = [e for e in doc.layout("SHEET") if e.dxftype() == "VIEWPORT"]
        if len(vps) < 2:
            problems.append("layout SHEET has no view viewports")
    dims = doc.modelspace().query("DIMENSION")
    for d in dims:
        if d.get_geometry_block() is None:
            problems.append(f"dimension {d.dxf.handle} has no block")
    return problems, len(doc.modelspace()), len(dims)


def main(paths):
    if not paths:
        print("usage: python scripts/check_dxf.py file.dxf [...]")
        return 2
    failed = 0
    for p in paths:
        problems, n, dims = check(p)
        status = "ok" if not problems else "FAILED"
        print(f"{status:6} {p}  ({n} model entities, {dims} dimensions)")
        for msg in problems[:20]:
            print("       - " + msg)
        failed += bool(problems)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
