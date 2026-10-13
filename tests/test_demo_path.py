from pathlib import Path


def test_demo_launcher_uses_local_backend_and_prints_monitoring_url():
    script_path = Path(__file__).parents[1] / "scripts" / "demo.sh"

    assert script_path.is_file()
    script = script_path.read_text()
    assert "choose_demo_backend_port" in script
    assert "http://127.0.0.1:${backend_port}/health" in script
    assert 'PUBLIC_BACKEND_URL="http://127.0.0.1:${backend_port}"' in script
    assert "Monitoring: http://127.0.0.1:4321/monitoring" in script
    assert "OILGUARD_DEMO_BACKEND_PORT" in script
    assert "8001" in script
    for forbidden in ("down", "-v", "rm", "prune"):
        assert forbidden not in script
