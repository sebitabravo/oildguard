from __future__ import annotations

import subprocess
import threading

import pytest


def test_unused_helpers_are_removed_but_outage_runs_remains_public() -> None:
    import backend.main as main
    import backend.store as store

    assert not hasattr(store, "iter_prepared")
    assert not hasattr(main, "load_rows_from_csv")
    assert not hasattr(main, "_parse_t_iso")
    assert callable(main.outage_runs)


def test_rolling_fleet_serializes_observe_snapshot_and_eviction(monkeypatch) -> None:
    from backend.fleetagg import RollingFleet

    rolling = RollingFleet(("value",), horizon_s=1_000_000)
    rolling.observe("existing", 1, (1.0,))
    entered_eviction = threading.Event()
    release_snapshot = threading.Event()
    observer_started = threading.Event()
    observer_finished = threading.Event()
    thread_errors: list[BaseException] = []
    original_evict = rolling._evict_below
    pause_next = True

    def pause_one_eviction(window, cutoff) -> None:
        nonlocal pause_next
        if pause_next:
            pause_next = False
            entered_eviction.set()
            assert release_snapshot.wait(timeout=2)
        original_evict(window, cutoff)

    monkeypatch.setattr(rolling, "_evict_below", pause_one_eviction)

    def take_snapshots() -> None:
        try:
            for _ in range(64):
                rolling.snapshot(1_000_000)
        except BaseException as error:
            thread_errors.append(error)

    def observe_rows() -> None:
        observer_started.set()
        try:
            for index in range(64):
                rolling.observe("existing", index + 2, (3.0,))
        except BaseException as error:
            thread_errors.append(error)
        finally:
            observer_finished.set()

    snapshot_thread = threading.Thread(target=take_snapshots)
    snapshot_thread.start()
    assert entered_eviction.wait(timeout=2)

    observer_thread = threading.Thread(target=observe_rows)
    observer_thread.start()
    try:
        assert observer_started.wait(timeout=2)
        assert not observer_finished.wait(timeout=0.1)
    finally:
        release_snapshot.set()
        snapshot_thread.join(timeout=2)
        observer_thread.join(timeout=2)

    blocks, rows, devices = rolling.snapshot(1_000_000)
    assert not snapshot_thread.is_alive()
    assert not observer_thread.is_alive()
    assert thread_errors == []
    assert observer_finished.is_set()
    assert (rows, devices) == (65, 1)
    assert blocks["value"]["count"] == 65
    assert blocks["value"]["mean"] == 193 / 65


def test_fleetagg_uses_the_shared_metrics_percentile() -> None:
    from backend import fleetagg, metrics

    assert fleetagg._quantile_linear is metrics._percentile
    sample = [0.0, 1.0, 4.0, 10.0]
    for quantile in (0.0, 0.5, 0.95, 0.99, 1.0):
        assert fleetagg._quantile_linear(sample, quantile) == metrics._percentile(sample, quantile)
    assert metrics._percentile(sample, 0.5) == 2.5
    assert metrics._percentile(sample, 0.95) == pytest.approx(9.1)
    assert metrics._percentile(sample, 0.99) == pytest.approx(9.82)


def test_device_stats_latest_fields_follow_highest_sequence() -> None:
    from backend.store import TelemetryStore

    store = TelemetryStore(retention_rows=10)
    store.append_row({"device_id": "device", "seq": 10, "t_s": 10, "t_iso": "later", "level_liters": 10})
    store.append_row({"device_id": "device", "seq": 2, "t_s": 2, "t_iso": "earlier", "level_liters": 2})

    latest = store.latest("device")
    stats = store.device_stats()["device"]
    assert latest is not None
    assert stats["last_t_iso"] == latest["t_iso"]
    assert stats["last_t_s"] == latest["t_s"]
    assert stats["latest_level_liters"] == latest["level_liters"]


def test_ab_ingest_refuses_dirty_worktree(tmp_path) -> None:
    from backend.ab_ingest import check_clean_worktree

    subprocess.run(["git", "init", "-q"], cwd=tmp_path, check=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=tmp_path, check=True)
    subprocess.run(["git", "config", "user.name", "Test"], cwd=tmp_path, check=True)
    tracked = tmp_path / "tracked.txt"
    tracked.write_text("clean\n")
    subprocess.run(["git", "add", "tracked.txt"], cwd=tmp_path, check=True)
    subprocess.run(["git", "commit", "-qm", "initial"], cwd=tmp_path, check=True)

    check_clean_worktree(tmp_path)
    tracked.write_text("modified\n")
    with pytest.raises(RuntimeError, match="clean worktree"):
        check_clean_worktree(tmp_path)
