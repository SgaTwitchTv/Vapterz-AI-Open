from __future__ import annotations

import argparse
import json
from pathlib import Path

from .cad import export_selected_layers, inspect_layers
from .raster import vectorize_raster


def main() -> int:
    parser = argparse.ArgumentParser(prog="vapterz-open")
    sub = parser.add_subparsers(dest="command", required=True)
    inspect = sub.add_parser("inspect-dxf")
    inspect.add_argument("--input", type=Path, required=True)
    raster = sub.add_parser("raster")
    raster.add_argument("--input", type=Path, required=True)
    raster.add_argument("--output", type=Path, required=True)
    raster.add_argument("--enhanced-output", type=Path)
    raster.add_argument("--scale", type=float, default=2.0)
    cad = sub.add_parser("cad")
    cad.add_argument("--input", type=Path, required=True)
    cad.add_argument("--output", type=Path, required=True)
    cad.add_argument("--layer", action="append", default=[])
    args = parser.parse_args()
    if args.command == "inspect-dxf":
        result = inspect_layers(args.input)
    elif args.command == "raster":
        result = vectorize_raster(args.input, args.output, args.enhanced_output, args.scale)
    else:
        result = export_selected_layers(args.input, args.output, set(args.layer))
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

