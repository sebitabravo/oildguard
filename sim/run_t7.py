"""T7 runner: move/rest detection + settling/viscosity extraction.

Ties ``sim/detect.py`` and ``sim/settling.py`` on one generated CSV::

    python3 sim/generate.py --scenario clean --seconds 120 --out /tmp/t7-clean.csv
    python3 sim/run_t7.py --in /tmp/t7-clean.csv --out /tmp/t7-windows.csv

Settling output defaults to the ``--out`` stem with ``-settling.csv``
(e.g. ``/tmp/t7-windows-settling.csv``); override with ``--settling-out``.
``--viscosity-proxy`` sets the synthetic transient scale (0 = raw fit);
see ``sim/settling.py`` for the honesty note.

Stdlib only.
"""

from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from detect import main as detect_main
from settling import main as settling_main


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="T7 detect + settling runner.")
    p.add_argument("--in", dest="inp", required=True, help="signal CSV from sim/generate.py")
    p.add_argument("--out", dest="out", required=True, help="windows CSV output")
    p.add_argument("--settling-out", default=None, help="settling CSV output")
    p.add_argument("--viscosity-proxy", type=float, default=1.0,
                   help="synthetic transient scale for settling (0 = raw fit)")
    return p.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)
    settling_out = args.settling_out
    if not settling_out:
        root, ext = os.path.splitext(args.out)
        settling_out = f"{root}-settling{ext or '.csv'}"
    rc = detect_main(["--in", args.inp, "--out", args.out])
    if rc != 0:
        return rc
    rc = settling_main(["--in", args.inp, "--windows", args.out,
                        "--out", settling_out,
                        "--viscosity-proxy", str(args.viscosity_proxy)])
    if rc != 0:
        return rc
    print(f"T7_DONE windows={args.out} settling={settling_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
