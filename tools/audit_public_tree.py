from __future__ import annotations

import re
import sys
from pathlib import Path


FORBIDDEN_DIRS = {"dataset", "datasets", "models", "projects", "training_materials"}
SKIP_DIRS = {".git", ".venv", "node_modules", "target", "dist", "workspace", "__pycache__"}
FORBIDDEN_EXTENSIONS = {".dwg", ".npz", ".onnx", ".pt", ".pth"}
PRIVATE_MARKERS = [
    re.compile(r"[A-Za-z]:\\Users\\[^\\\s]+", re.I),
    re.compile(r"\b(?:BTVISA|BTG\d{2,})\b", re.I),
    re.compile(r"\bL(?:06|07|08|11|20|35)\b", re.I),
]


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    failures: list[str] = []
    for path in root.rglob("*"):
        relative = path.relative_to(root)
        if any(part.lower() in SKIP_DIRS for part in relative.parts):
            continue
        if any(part.lower() in FORBIDDEN_DIRS for part in relative.parts):
            failures.append(f"forbidden directory: {relative}")
            continue
        if not path.is_file():
            continue
        if path.suffix.lower() in FORBIDDEN_EXTENSIONS:
            failures.append(f"forbidden file: {relative}")
        if relative.as_posix() == "tools/audit_public_tree.py":
            continue
        if path.suffix.lower() in {".py", ".rs", ".ts", ".tsx", ".json", ".md", ".toml", ".txt"}:
            text = path.read_text("utf-8", errors="ignore")
            if any(pattern.search(text) for pattern in PRIVATE_MARKERS):
                failures.append(f"private marker: {relative}")
    if failures:
        print("AUDIT FAILED")
        print("\n".join(f"- {item}" for item in failures))
        return 1
    print(f"AUDIT PASSED: {root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
