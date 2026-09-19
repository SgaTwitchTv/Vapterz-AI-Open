# Vapterz AI Open

Vapterz AI Open is a fully local, portfolio-safe demonstration of the Vapterz
floor-plan transformation workflow. It combines a modern Tauri/React desktop
interface with a small Python engine and does not call external APIs.

![Status](https://img.shields.io/badge/status-public%20demo-2f91ff)
![Network](https://img.shields.io/badge/network-not%20required-34c779)

## Public scope

- Raster enhancement and editable SVG generation.
- A small neural-network inference implementation written from scratch.
- Demo parameters authored for this repository, not production model weights.
- Raw DXF layer discovery and hierarchical layer display.
- Manual-only selection of DXF layers followed by SVG export.
- Synthetic sample generation and automated boundary checks.

The repository intentionally excludes production training data, customer plans,
trained production weights, CAD classification, rescue modes and commercial
building-standard profiles.

## Architecture

```text
React interface → Tauri command bridge → local Python CLI
                                      ├─ raster preparation + demo MLP + SVG
                                      └─ raw DXF inspection + selected-layer SVG
```

## Run locally

Requirements: Node.js 20+, Rust, Python 3.11+ and Windows WebView2.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".\engine[dev]"
.\.venv\Scripts\python.exe tools\generate_synthetic_samples.py

cd app
npm install
$env:VAPTERZ_PYTHON = "..\.venv\Scripts\python.exe"
npm run tauri dev
```

Browser-only interface preview:

```powershell
cd app
npm run dev
```

## Tests and publication audit

```powershell
.\.venv\Scripts\python.exe -m pytest engine\tests
.\.venv\Scripts\python.exe tools\audit_public_tree.py .
cd app
npm run build
cargo check --manifest-path src-tauri\Cargo.toml
```

## Limitations

This repository demonstrates architecture, UI, local processing and engineering
practices. Its synthetic MLP parameters and conservative vectorizer are not the
commercial Vapterz model and are not expected to reproduce production quality.
The CAD workflow deliberately makes no automatic judgment about layer meaning.

## License

Source code in this repository is available under the [MIT License](LICENSE).
Third-party packages retain their respective licenses; see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
