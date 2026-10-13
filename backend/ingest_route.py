"""POST /ingest route handler delegated from backend.main."""
from __future__ import annotations

from fastapi.responses import JSONResponse

try:
    from . import main as _main_module
except ImportError:
    import main as _main_module

IngestBatch = _main_module.IngestBatch

def _main():
    return _main_module

def ingest(batch: IngestBatch) -> dict:
    main = _main()
    """Accept one SignalRow batch (10 Hz rows from sim/generate.py).

    Breaking change vs the S0 stub (single ``IngestPayload`` object):
    old 4-field payloads now return 422 — see backend/API.md migration note.
    """
    rows = [r.model_dump() for r in batch.rows]
    result = main.ingest_rows(rows)
    if result["ingested"] == 0 and result["rejected"] and main._REQUIRE_SIGNATURE:
        return JSONResponse(
            status_code=401,
            content={"status": "error", "kind": "ingest-ack", **result},
        )
    return {
        "status": "ok",
        "kind": "ingest-ack",
        "as_of": main._now_iso(),
        **result,
    }

