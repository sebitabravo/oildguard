import csv
import secrets

from shared.signing import verify_row
from sim import generate, store_forward


def test_signed_rows_survive_outage_buffer_and_sequence_resort(monkeypatch, tmp_path, capsys):
    key = secrets.token_bytes(32)
    monkeypatch.setenv("OILGUARD_DEVICE_KEY", key.hex())
    generated = tmp_path / "generated.csv"
    shuffled = tmp_path / "shuffled.csv"
    flushed = tmp_path / "flushed.csv"

    assert generate.main([
        "--scenario", "link-outage", "--seconds", "1", "--seed", "11",
        "--out", str(generated), "--sign",
    ]) == 0

    with generated.open(newline="") as source:
        reader = csv.DictReader(source)
        fieldnames = reader.fieldnames
        rows = list(reader)
    shuffled_rows = [rows[index] for index in (4, 2, 0, 5, 1, 3, 8, 6, 7, 9)]
    with shuffled.open("w", newline="") as destination:
        writer = csv.DictWriter(destination, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(shuffled_rows)

    assert store_forward.main(["--in", str(shuffled), "--out", str(flushed)]) == 0
    assert "OUTAGE BUFFERING PROOF: PASS" in capsys.readouterr().out

    with flushed.open(newline="") as source:
        reader = csv.DictReader(source)
        output_rows = list(reader)
    assert reader.fieldnames == fieldnames
    assert [int(row["seq"]) for row in output_rows] == list(range(len(rows)))
    assert all(verify_row(row, key) for row in output_rows)
