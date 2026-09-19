from pathlib import Path


def test_repository_has_no_private_data_directories():
    root = Path(__file__).resolve().parents[2]
    forbidden = {"dataset", "datasets", "models", "projects", "training_materials"}
    ignored = {".git", ".venv", "node_modules", "target", "dist", "__pycache__", "workspace"}
    present = {
        path.name.lower()
        for path in root.rglob("*")
        if path.is_dir() and not any(part.lower() in ignored for part in path.relative_to(root).parts)
    }
    assert not forbidden & present


def test_no_cad_ai_modules_are_shipped():
    root = Path(__file__).resolve().parents[1] / "vapterz_open"
    names = {path.name for path in root.glob("*.py")}
    assert "ai_model.py" not in names
    assert "rescue.py" not in names
