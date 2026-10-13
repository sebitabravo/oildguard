import json
from pathlib import Path

from sim import geometry, geartrain, physics


def test_export_matches_checked_in_demo_json_byte_for_byte(tmp_path):
    from sim.export_demo_json import export_demo_json

    output_path = tmp_path / "demo-data.json"

    export_demo_json(output_path)

    checked_in = Path(__file__).resolve().parents[1] / "sim" / "demo-data.json"
    assert output_path.read_bytes() == checked_in.read_bytes()


def test_json_physics_constants_match_python_sources():
    payload = json.loads((Path(__file__).resolve().parents[1] / "sim" / "demo-data.json").read_text())
    constants = payload["physics"]["constants"]

    assert set(payload) == {"physics", "demo"}
    assert constants["defaultGearCase"] == {
        "rOut": geometry.DEFAULT_GEAR_CASE.r_out,
        "rIn": geometry.DEFAULT_GEAR_CASE.r_in,
        "length": geometry.DEFAULT_GEAR_CASE.length,
    }
    assert constants["researchRotatingCavity"] == {
        "rOut": physics.RESEARCH_ROTATING_CAVITY.r_out,
        "rIn": physics.RESEARCH_ROTATING_CAVITY.r_in,
        "length": physics.RESEARCH_ROTATING_CAVITY.length,
    }
    assert constants["rhoRef"] == physics.RHO_REF
    assert constants["rhoTRefC"] == physics.RHO_T_REF_C
    assert constants["betaRhoPerC"] == physics.BETA_RHO_PER_C
    assert constants["gravity"] == physics.G
    assert constants["capacityL"] == physics.CAPACITY_L
    assert constants["rotatingStaticFroudeMax"] == physics.ROTATING_STATIC_FROUDE_MAX
    assert constants["rotatingRimmingFroudeMin"] == physics.ROTATING_RIMMING_FROUDE_MIN
    assert constants["rotatingRpmMax"] == physics.ROTATING_RPM_MAX
    assert constants["sloshHeightCapFactor"] == physics.ROTATING_SLOSH_HEIGHT_CAP_FACTOR
    assert constants["sloshFroudeFactor"] == physics.ROTATING_SLOSH_FROUDE_FACTOR
    assert constants["rotatingSamplesDefault"] == physics.ROTATING_SAMPLES_DEFAULT
    assert constants["rotatingSamplesMin"] == physics.ROTATING_SAMPLES_MIN
    assert constants["rotatingSamplesMax"] == physics.ROTATING_SAMPLES_MAX
    assert constants["headToleranceM"] == geometry.EFFECTIVE_HEAD_TOL_M == 1e-9
    assert constants["gearRatio"] == physics.GEAR_RATIO
    sources = payload["physics"]["sources"]
    assert sources["headToleranceM"] == "sim/geometry.py:EFFECTIVE_HEAD_TOL_M"
    assert sources["sloshHeightCapFactor"] == "sim/physics.py:ROTATING_SLOSH_HEIGHT_CAP_FACTOR"
    assert sources["sloshFroudeFactor"] == "sim/physics.py:ROTATING_SLOSH_FROUDE_FACTOR"
    assert sources["rotatingSamplesDefault"] == "sim/physics.py:ROTATING_SAMPLES_DEFAULT"
    assert sources["rotatingSamplesMin"] == "sim/physics.py:ROTATING_SAMPLES_MIN"
    assert sources["rotatingSamplesMax"] == "sim/physics.py:ROTATING_SAMPLES_MAX"
    assert constants["gdy106Train"] == {
        "hs": {"zs": geartrain.GDY106_TRAIN.hs.zs, "zp": geartrain.GDY106_TRAIN.hs.zp,
               "zr": geartrain.GDY106_TRAIN.hs.zr, "planets": geartrain.GDY106_TRAIN.hs.planets},
        "ls": {"zs": geartrain.GDY106_TRAIN.ls.zs, "zp": geartrain.GDY106_TRAIN.ls.zp,
               "zr": geartrain.GDY106_TRAIN.ls.zr, "planets": geartrain.GDY106_TRAIN.ls.planets},
    }


def test_demo_preserves_dataset_and_has_ingest_templates():
    payload = json.loads((Path(__file__).resolve().parents[1] / "sim" / "demo-data.json").read_text())
    demo = payload["demo"]

    assert demo["referenceMs"] == 1768478400000
    assert len(demo["trucks"]) == 6
    assert len(demo["wheels"]) == 12
    assert len(demo["ingestRows"]) > 0
