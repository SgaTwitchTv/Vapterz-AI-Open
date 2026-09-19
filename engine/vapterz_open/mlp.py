"""Tiny dependency-free MLP inference used by the synthetic raster demo.

The bundled parameters are hand-authored for demonstration and were not
trained on, derived from, or evaluated against private floor plans.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import exp
from typing import Sequence


def _sigmoid(value: float) -> float:
    value = max(-40.0, min(40.0, value))
    return 1.0 / (1.0 + exp(-value))


@dataclass(frozen=True)
class DenseLayer:
    weights: tuple[tuple[float, ...], ...]
    biases: tuple[float, ...]

    def forward(self, values: Sequence[float]) -> tuple[float, ...]:
        if any(len(row) != len(values) for row in self.weights):
            raise ValueError("layer input size does not match its weights")
        return tuple(
            _sigmoid(sum(weight * value for weight, value in zip(row, values)) + bias)
            for row, bias in zip(self.weights, self.biases)
        )


@dataclass(frozen=True)
class GeometryMlp:
    layers: tuple[DenseLayer, ...]

    def predict(self, features: Sequence[float]) -> float:
        values = tuple(float(value) for value in features)
        for layer in self.layers:
            values = layer.forward(values)
        if len(values) != 1:
            raise ValueError("geometry classifier must produce one score")
        return values[0]


DEMO_GEOMETRY_MODEL = GeometryMlp(
    layers=(
        DenseLayer(
            weights=(
                (1.5, 0.8, 1.8, -0.4, 0.5),
                (-0.8, 1.4, 0.7, 1.2, -0.5),
                (0.4, -0.3, 1.2, 0.7, 1.0),
                (1.1, 0.5, -0.6, 0.9, 0.4),
            ),
            biases=(-1.0, -0.8, -0.7, -0.9),
        ),
        DenseLayer(weights=((1.2, 1.0, 1.1, 0.9),), biases=(-1.55,)),
    )
)

