from datetime import datetime, timezone

from sim import feeder


def test_first_batch_timestamp_uses_injected_real_clock(monkeypatch):
    monkeypatch.setenv("OILGUARD_DEVICE_MASTER_KEY", "ab" * 32)
    injected_now = datetime(2030, 5, 6, 12, 30, tzinfo=timezone.utc)

    first_batch = next(
        feeder.iter_batches(
            seconds=1,
            clock=lambda: injected_now,
        )
    )

    timestamp = datetime.fromisoformat(first_batch[0]["t_iso"])
    assert abs((timestamp - injected_now).total_seconds()) <= 120
