from pathlib import Path


SCRIPT = (Path(__file__).parents[1] / "scripts" / "demo.sh").read_text()


def test_demo_checks_both_ports_before_reading_or_creating_env():
    preflight = SCRIPT.index("\nbackend_port=$(choose_demo_backend_port")
    env_creation = SCRIPT.index("if [[ ! -f .env ]]")
    env_read = SCRIPT.index("done < .env")

    assert preflight < env_creation < env_read
    assert "4321" in SCRIPT
    assert "8001" in SCRIPT
    assert "OILGUARD_DEMO_BACKEND_PORT" in SCRIPT
    assert "ya está en uso" in SCRIPT


def test_demo_does_not_execute_env_as_shell_code():
    assert ". ./.env" not in SCRIPT
    assert "source ./.env" not in SCRIPT
    assert "OILGUARD_DEVICE_MASTER_KEY" in SCRIPT


def test_demo_rejects_backend_port_matching_preview_port():
    assert "if backend_port == 4321:" in SCRIPT
    assert "el puerto del backend no puede ser el puerto de vista previa 4321" in SCRIPT


def test_preview_ignores_existing_astro_lock_without_stopping_other_servers():
    assert "bunx astro preview --host 127.0.0.1 --port 4321 --ignore-lock" in SCRIPT


def test_preview_replaces_the_launcher_subshell_process():
    assert "exec bunx astro preview --host 127.0.0.1 --port 4321 --ignore-lock" in SCRIPT


def test_demo_uses_the_full_level_alert_budget():
    assert "export OILGUARD_ALERT_LEVEL_ROW_BUDGET=40000" in SCRIPT
    assert "una hora completa cuesta ~0,12 s" in SCRIPT


def test_demo_status_messages_are_in_spanish():
    assert "Backend local:" in SCRIPT
    assert "Monitoreo:" in SCRIPT
    assert "Presiona Ctrl-C para detener" in SCRIPT
