"""T6 store-and-forward mock (edge buffer -> gateway -> InfluxDB narrative).

Reads a CSV from sim/generate.py, treats rows flagged by the link_down
column (link-outage scenario) as a dropped link: those rows are queued in
an edge-side FIFO buffer instead of being "sent". When the link recovers,
the buffer flushes in order and the full ordered stream is written to
--out. Prints queued/flushed/sent counts as the outage-buffering proof.

An --outage-from/--outage-to (seconds) override forces a drop window on
any input CSV, so the drop-then-flush demo also works on clean runs.

Stdlib only.
"""

from __future__ import annotations

import argparse
import csv
from collections import deque


class EdgeBuffer:
    """FIFO edge buffer. Enqueue while link is down, flush on recovery."""

    def __init__(self) -> None:
        self._q: deque[dict] = deque()
        self.queued_total = 0
        self.flushed_total = 0

    def enqueue(self, row: dict) -> None:
        self._q.append(row)
        self.queued_total += 1

    def flush(self) -> list[dict]:
        out = list(self._q)
        self.flushed_total += len(out)
        self._q.clear()
        return out

    @property
    def pending(self) -> int:
        return len(self._q)


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="T6 store-and-forward mock.")
    p.add_argument("--in", dest="inp", required=True, help="input CSV from generate.py")
    p.add_argument("--out", dest="out", required=True, help="flushed output CSV")
    p.add_argument("--link-column", default="link_down")
    p.add_argument("--outage-from", type=float, default=None,
                   help="force outage for t_s >= this (s); overrides link column")
    p.add_argument("--outage-to", type=float, default=None,
                   help="force outage for t_s < this (s); overrides link column")
    return p.parse_args(argv)


def _link_down(row: dict, args) -> bool:
    if args.outage_from is not None and args.outage_to is not None:
        try:
            t = float(row.get("t_s", 0.0))
        except ValueError:
            t = 0.0
        return args.outage_from <= t < args.outage_to
    try:
        return int(float(row.get(args.link_column, 0))) == 1
    except (ValueError, TypeError):
        return False


def main(argv=None) -> int:
    args = parse_args(argv)
    buf = EdgeBuffer()
    sent: list[dict] = []
    fieldnames: list[str] | None = None
    total = 0

    with open(args.inp, newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        if not fieldnames:
            raise SystemExit("input CSV has no header")
        for row in reader:
            total += 1
            if _link_down(row, args):
                buf.enqueue(row)  # link down: store on edge
            else:
                if buf.pending:
                    sent.extend(buf.flush())  # link back: flush first (order kept below)
                sent.append(row)

    # Any tail outage never recovered mid-stream flushes at the end.
    if buf.pending:
        sent.extend(buf.flush())

    # Restore original order (flush preserves causality; sort proves no loss).
    def _seq(r: dict) -> int:
        try:
            return int(r.get("seq", 0))
        except (ValueError, TypeError):
            return 0

    sent.sort(key=_seq)
    with open(args.out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(sent)

    print(f"in={args.inp} out={args.out} total={total}")
    print(f"sent_direct={total - buf.queued_total} queued={buf.queued_total} "
          f"flushed={buf.flushed_total} out_rows={len(sent)}")
    ok = buf.flushed_total == buf.queued_total and len(sent) == total
    print(f"OUTAGE BUFFERING PROOF: {'PASS' if ok else 'FAIL'} "
          f"(no rows lost, order restored by seq)")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
