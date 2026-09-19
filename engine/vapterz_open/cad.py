"""Raw DXF structure inspection and explicit-layer SVG export."""

from __future__ import annotations

import html
from collections import Counter, defaultdict
from pathlib import Path
from typing import Iterable

import ezdxf
from ezdxf.path import make_path


def inspect_layers(source: Path) -> list[dict]:
    document = ezdxf.readfile(source)
    counts: dict[str, Counter[str]] = defaultdict(Counter)
    children: dict[str, Counter[str]] = defaultdict(Counter)
    for entity in document.modelspace():
        layer = _layer(entity)
        counts[layer][entity.dxftype()] += 1
        if entity.dxftype() == "INSERT":
            for child, effective_layer in _flatten_insert(entity, layer):
                counts[effective_layer][child.dxftype()] += 1
                if effective_layer != layer:
                    children[layer][effective_layer] += 1
    names = sorted({str(layer.dxf.name) for layer in document.layers} | set(counts))
    return [
        {
            "name": name,
            "semanticRole": "CAD layer",
            "semanticGuess": "unknown",
            "entityCount": sum(counts[name].values()),
            "confidence": 1.0,
            "selected": False,
            "color": "#7aa8c7",
            "isContainer": bool(children[name]),
            "blockNames": [],
            "blockReferenceCount": sum(children[name].values()),
            "descendantLayers": [
                {"name": child, "entityCount": amount, "minDepth": 1, "maxDepth": 1, "paths": [[name, child]]}
                for child, amount in sorted(children[name].items())
            ],
            "maxBlockDepth": 1 if children[name] else 0,
            "nestedInsertCount": sum(children[name].values()),
        }
        for name in names
    ]


def export_selected_layers(source: Path, output: Path, selected_layers: set[str]) -> dict:
    if not selected_layers:
        raise ValueError("select at least one CAD layer")
    document = ezdxf.readfile(source)
    geometry: list[tuple[str, list[tuple[float, float]], bool]] = []
    for entity in document.modelspace():
        layer = _layer(entity)
        entities = _flatten_insert(entity, layer) if entity.dxftype() == "INSERT" else [(entity, layer)]
        for candidate, effective_layer in entities:
            if effective_layer not in selected_layers:
                continue
            points, closed = _entity_points(candidate)
            if len(points) >= 2:
                geometry.append((effective_layer, points, closed))
    if not geometry:
        raise ValueError("the selected layers contain no supported drawable entities")
    xs = [x for _, points, _ in geometry for x, _ in points]
    ys = [y for _, points, _ in geometry for _, y in points]
    min_x, max_x, min_y, max_y = min(xs), max(xs), min(ys), max(ys)
    width, height = max(1.0, max_x - min_x), max(1.0, max_y - min_y)
    groups: dict[str, list[str]] = defaultdict(list)
    for layer, points, closed in geometry:
        transformed = [(x - min_x, max_y - y) for x, y in points]
        commands = [f"M {transformed[0][0]:.3f} {transformed[0][1]:.3f}"]
        commands.extend(f"L {x:.3f} {y:.3f}" for x, y in transformed[1:])
        if closed:
            commands.append("Z")
        groups[layer].append(f'<path d="{" ".join(commands)}" />')
    body = []
    for layer in sorted(groups):
        body.append(f'  <g id="layer-{html.escape(layer)}" data-cad-layer="{html.escape(layer)}">')
        body.extend(f"    {path}" for path in groups[layer])
        body.append("  </g>")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{width:.3f}" height="{height:.3f}" viewBox="0 0 {width:.3f} {height:.3f}">
  <g fill="none" stroke="#47545c" stroke-width="0.7" vector-effect="non-scaling-stroke">
{"\n".join(body)}
  </g>
</svg>
''', encoding="utf-8")
    return {"output": str(output), "layers": sorted(groups), "entities": len(geometry)}


def _flatten_insert(insert, inherited_layer: str) -> Iterable[tuple[object, str]]:
    for entity in insert.virtual_entities():
        layer = _layer(entity)
        effective = inherited_layer if layer == "0" else layer
        if entity.dxftype() == "INSERT":
            yield from _flatten_insert(entity, effective)
        else:
            yield entity, effective


def _entity_points(entity) -> tuple[list[tuple[float, float]], bool]:
    try:
        path = make_path(entity)
        points = [(float(vertex.x), float(vertex.y)) for vertex in path.flattening(distance=0.5, segments=8)]
        return points, bool(path.is_closed)
    except (TypeError, ValueError, AttributeError, ezdxf.DXFError):
        if entity.dxftype() == "LINE":
            return [(float(entity.dxf.start.x), float(entity.dxf.start.y)), (float(entity.dxf.end.x), float(entity.dxf.end.y))], False
        return [], False


def _layer(entity) -> str:
    return str(getattr(entity.dxf, "layer", "0") or "0")

