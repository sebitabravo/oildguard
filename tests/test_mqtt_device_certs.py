import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_tls_listener_requires_device_certificate_and_maps_identity():
    config = (ROOT / "mosquitto/config/mosquitto.conf").read_text()
    directives = [line.strip() for line in config.splitlines() if line.strip() and not line.lstrip().startswith("#")]
    assert "listener 8883" in directives
    assert "require_certificate true" in directives
    assert "use_identity_as_username true" in directives
    assert "listener 1883" in directives


def test_certificate_script_issues_device_and_backend_certificates(tmp_path):
    output_dir = tmp_path / "certs"
    completed = subprocess.run(
        [str(ROOT / "scripts/gen-dev-certs.sh"), "--output-dir", str(output_dir), "wheel-01", "wheel-02"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=True,
    )
    assert output_dir.is_relative_to(tmp_path)
    for name in ("backend", "wheel-01", "wheel-02"):
        cert = output_dir / f"{name}.crt"
        assert cert.is_file()
        subprocess.run(
            ["openssl", "verify", "-CAfile", str(output_dir / "ca.crt"), str(cert)],
            check=True,
            text=True,
            capture_output=True,
        )
    assert "wheel-01" in completed.stdout and "wheel-02" in completed.stdout


def test_readme_documents_plain_listener_as_development_only():
    readme = (ROOT / "README.md").read_text()
    assert "1883" in readme and "development-only" in readme
