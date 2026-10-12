from ai import anomaly


def _rows_for_key(device_id, mode, baseline_pressure, start_seq, count=10):
    rows = []
    for offset in range(count):
        rows.append({
            "t_s": str(start_seq + offset),
            "seq": str(start_seq + offset),
            "device_id": device_id,
            "fsm_state": mode,
            "pressure_kpa": str(baseline_pressure),
            "temperature_c": "75",
            "vib_rms_g": "0.35",
            "vib_kurtosis": "3",
        })
    return rows


def _score(rows):
    windows = [{
        "window_id": "1",
        "state": "rest",
        "start_t_s": "0",
        "end_t_s": "99",
        "zone": "LOAD",
    }, {
        "window_id": "2",
        "state": "rest",
        "start_t_s": "100",
        "end_t_s": "200",
        "zone": "LOAD",
    }]
    return anomaly.score_rows(rows, windows)


def test_baselines_are_independent_per_device_and_mode():
    rows = []
    rows += _rows_for_key("wheel-1", "LOAD", 10, 0)
    rows += _rows_for_key("wheel-1", "DUMP", 20, 20)
    rows += _rows_for_key("wheel-2", "LOAD", 30, 40)
    rows += _rows_for_key("wheel-2", "DUMP", 40, 60)
    for device_id, mode, pressure, seq in [
        ("wheel-1", "LOAD", 15, 100),
        ("wheel-1", "DUMP", 25, 101),
        ("wheel-2", "LOAD", 35, 102),
        ("wheel-2", "DUMP", 45, 103),
    ]:
        rows.append({
            "t_s": str(seq), "seq": str(seq), "device_id": device_id,
            "fsm_state": mode, "pressure_kpa": str(pressure),
            "temperature_c": "75", "vib_rms_g": "0.35", "vib_kurtosis": "3",
        })

    baseline = _score(rows)
    shifted_rows = [dict(row) for row in rows]
    for row in shifted_rows:
        if row["device_id"] == "wheel-1" and row["fsm_state"] == "LOAD":
            row["pressure_kpa"] = str(float(row["pressure_kpa"]) + 100)
    shifted = _score(shifted_rows)

    def scores_for(result, device_id, mode):
        return [flag["score"] for flag in result["flags"]
                if flag["device_id"] == device_id and flag["fsm_state"] == mode]

    unaffected_device_scores = scores_for(baseline, "wheel-2", "LOAD")
    unaffected_mode_scores = scores_for(baseline, "wheel-1", "DUMP")
    assert unaffected_device_scores
    assert unaffected_mode_scores
    assert unaffected_device_scores == scores_for(shifted, "wheel-2", "LOAD")
    assert unaffected_mode_scores == scores_for(shifted, "wheel-1", "DUMP")
    assert baseline["baselines"]["wheel-1|LOAD"]["mu"] != shifted["baselines"]["wheel-1|LOAD"]["mu"]


def test_key_below_minimum_has_explicit_insufficient_baseline_status():
    rows = _rows_for_key("wheel-1", "LOAD", 10, 0, count=anomaly.MIN_BASELINE_N - 1)

    result = _score(rows)

    assert result["baselines"]["wheel-1|LOAD"]["status"] == "sin línea base suficiente"
    assert result["baselines"]["wheel-1|LOAD"]["n"] == anomaly.MIN_BASELINE_N - 1
