"""El fixture de filas doradas debe coincidir con el generador Python actual."""

import json

import make_generator_golden as mgg


def test_committed_golden_rows_match_current_generator():
    with open(mgg.FIXTURE_PATH, encoding="utf-8") as fh:
        committed = json.load(fh)
    assert committed == mgg.build_fixture()


def test_golden_rows_cover_every_scenario_and_full_duration():
    data = mgg.build_fixture()
    assert {case["scenario"] for case in data["cases"]} == {s for s, _ in mgg.CASES}
    for case in data["cases"]:
        assert len(case["rows"]) == 300
        assert all(len(row) == len(data["header"]) for row in case["rows"])
