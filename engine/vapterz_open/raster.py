"""Raster enhancement and editable SVG generation for public examples."""

from __future__ import annotations

import html
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

from .mlp import DEMO_GEOMETRY_MODEL


def vectorize_raster(source: Path, output: Path, enhanced_output: Path | None = None, scale: float = 2.0) -> dict:
    image = Image.open(source).convert("L")
    if scale != 1.0:
        image = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.Resampling.LANCZOS)
    image = ImageOps.autocontrast(image, cutoff=1)
    image = image.filter(ImageFilter.MedianFilter(3))
    image = ImageEnhance.Sharpness(image).enhance(1.35)
    pixels = np.asarray(image)
    _, binary = cv2.threshold(pixels, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, np.ones((2, 2), np.uint8))
    if enhanced_output:
        enhanced_output.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(255 - binary).save(enhanced_output)

    contours, _ = cv2.findContours(binary, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    paths: list[str] = []
    rejected = 0
    canvas_area = float(binary.shape[0] * binary.shape[1])
    for contour in contours:
        area = abs(float(cv2.contourArea(contour)))
        perimeter = float(cv2.arcLength(contour, True))
        x, y, width, height = cv2.boundingRect(contour)
        if area < 3 or perimeter < 6 or width < 2 or height < 2:
            rejected += 1
            continue
        rectangularity = min(1.0, area / max(1.0, width * height))
        elongation = min(width, height) / max(width, height)
        score = DEMO_GEOMETRY_MODEL.predict((
            min(1.0, area / max(1.0, canvas_area * 0.01)),
            min(1.0, perimeter / max(binary.shape) / 2.0),
            rectangularity,
            elongation,
            min(1.0, max(width, height) / max(binary.shape)),
        ))
        if score < 0.43:
            rejected += 1
            continue
        epsilon = max(0.7, perimeter * 0.002)
        points = cv2.approxPolyDP(contour, epsilon, True).reshape(-1, 2)
        if len(points) < 2:
            rejected += 1
            continue
        commands = [f"M {points[0][0]} {points[0][1]}"]
        commands.extend(f"L {point[0]} {point[1]}" for point in points[1:])
        if len(points) > 2:
            commands.append("Z")
        paths.append(" ".join(commands))

    output.parent.mkdir(parents=True, exist_ok=True)
    body = "\n".join(f'    <path d="{html.escape(path)}" />' for path in paths)
    output.write_text(
        f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{binary.shape[1]}" height="{binary.shape[0]}" viewBox="0 0 {binary.shape[1]} {binary.shape[0]}">
  <g fill="none" stroke="#47545c" stroke-width="1" stroke-linejoin="round" stroke-linecap="round">
{body}
  </g>
</svg>
''',
        encoding="utf-8",
    )
    return {"output": str(output), "enhanced": str(enhanced_output or ""), "paths": len(paths), "rejected": rejected}

