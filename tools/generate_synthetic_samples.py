from pathlib import Path

import ezdxf
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1] / "samples"


def raster_sample() -> None:
    image = Image.new("RGB", (960, 620), "white")
    draw = ImageDraw.Draw(image)
    draw.rectangle((70, 70, 890, 550), outline="#26343d", width=8)
    draw.line((430, 70, 430, 550), fill="#26343d", width=7)
    draw.line((430, 300, 890, 300), fill="#26343d", width=7)
    draw.arc((390, 250, 470, 330), 270, 360, fill="#26343d", width=4)
    draw.rectangle((150, 160, 330, 250), outline="#607782", width=4)
    draw.rectangle((560, 380, 760, 470), outline="#607782", width=4)
    draw.text((110, 100), "S1.1", fill="#26343d")
    draw.text((500, 100), "S2.1", fill="#26343d")
    draw.text((500, 340), "S3.1", fill="#26343d")
    image.save(ROOT / "synthetic_floorplan.png")


def cad_sample() -> None:
    document = ezdxf.new("R2010")
    for name, color in (("WALLS", 7), ("DOORS", 3), ("FURNITURE", 5), ("NOTES", 2)):
        document.layers.add(name, color=color)
    space = document.modelspace()
    walls = [(0, 0), (20, 0), (20, 14), (0, 14), (0, 0)]
    space.add_lwpolyline(walls, dxfattribs={"layer": "WALLS"})
    space.add_line((10, 0), (10, 14), dxfattribs={"layer": "WALLS"})
    space.add_arc((10, 5), 2, 270, 360, dxfattribs={"layer": "DOORS"})
    space.add_lwpolyline([(3, 3), (7, 3), (7, 5), (3, 5), (3, 3)], dxfattribs={"layer": "FURNITURE"})
    space.add_text("Synthetic example", dxfattribs={"layer": "NOTES", "height": 0.6, "insert": (1, 13)})
    document.saveas(ROOT / "synthetic_layers.dxf")


if __name__ == "__main__":
    ROOT.mkdir(parents=True, exist_ok=True)
    raster_sample()
    cad_sample()
    print(f"Generated public synthetic samples in {ROOT}")

