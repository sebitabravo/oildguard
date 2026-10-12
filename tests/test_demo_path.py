from pathlib import Path


def test_demo_launcher_starts_sim_profile_and_prints_monitoring_url():
    script_path = Path(__file__).parents[1] / "scripts" / "demo.sh"

    assert script_path.is_file()
    script = script_path.read_text()
    assert "docker compose --profile sim up -d" in script
    assert "http://localhost:5173/monitoring" in script
    for forbidden in ("down", "-v", "rm", "prune"):
        assert forbidden not in script
