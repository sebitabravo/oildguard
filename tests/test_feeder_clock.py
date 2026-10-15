from datetime import datetime, timedelta, timezone

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


def test_each_batch_timestamp_uses_its_own_clock_read(monkeypatch):
    monkeypatch.setenv("OILGUARD_DEVICE_MASTER_KEY", "ab" * 32)
    initial_time = datetime(2030, 5, 6, 12, 30, tzinfo=timezone.utc)
    clock_reads = []

    def advancing_clock():
        now = initial_time + timedelta(seconds=5 * len(clock_reads))
        clock_reads.append(now)
        return now

    batches = list(feeder.iter_batches(seconds=3, clock=advancing_clock))

    assert len(clock_reads) == len(batches)
    for batch, batch_clock in zip(batches, clock_reads):
        assert datetime.fromisoformat(batch[0]["t_iso"]) == batch_clock
