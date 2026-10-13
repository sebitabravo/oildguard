from ai import anomaly
from backend.influx_writer import encode_row


def test_iforest_fallback_uses_module_logger_without_printing(monkeypatch, caplog, capsys):
    rows = [
        {
            "t_s": str(index),
            "device_id": "wheel-1",
            "fsm_state": "LOAD",
            "pressure_kpa": "10.0",
            "temperature_c": "75",
            "vib_rms_g": "0.35",
        }
        for index in range(anomaly.MIN_BASELINE_N)
    ]
    windows = [{
        "window_id": "rest-1",
        "state": "rest",
        "start_t_s": "0",
        "end_t_s": str(anomaly.MIN_BASELINE_N - 1),
    }]
    monkeypatch.setattr(anomaly, "try_iforest", lambda *_: (None, "sklearn-missing"))

    with caplog.at_level("WARNING", logger=anomaly.__name__):
        anomaly.score_rows(rows, windows, use_iforest=True)

    assert any(
        record.name == anomaly.__name__ and "iforest fallback: sklearn-missing" in record.message
        for record in caplog.records
    )
    captured = capsys.readouterr()
    assert captured.out == ""
    assert captured.err == ""


def test_line_protocol_canonicalizes_newlines_around_numeric_field():
    line = encode_row({
        "t_iso": "2026-01-01T00:00:00+00:00",
        "pressure_kpa": "\n1.25\r",
    })

    assert line is not None
    assert "pressure_kpa=1.25" in line
    assert "\r" not in line
    assert "\n" not in line
