from vapterz_open.mlp import DEMO_GEOMETRY_MODEL, DenseLayer


def test_dense_layer_is_deterministic():
    layer = DenseLayer(weights=((1.0, -1.0),), biases=(0.0,))
    assert layer.forward((0.5, 0.25)) == layer.forward((0.5, 0.25))


def test_demo_model_returns_probability():
    score = DEMO_GEOMETRY_MODEL.predict((0.5, 0.4, 0.8, 0.5, 0.7))
    assert 0.0 <= score <= 1.0

