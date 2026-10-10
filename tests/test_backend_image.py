from pathlib import Path
import shlex


REPOSITORY_ROOTS = {"ai", "shared", "sim"}
DOCKERFILE = Path(__file__).resolve().parents[1] / "backend" / "Dockerfile"


def copied_package_roots(dockerfile: Path) -> set[str]:
    copied: set[str] = set()

    for line in dockerfile.read_text(encoding="utf-8").splitlines():
        tokens = shlex.split(line)
        if not tokens or tokens[0] != "COPY" or len(tokens) < 3:
            continue

        *sources, destination = tokens[1:]
        if len(sources) != 1:
            continue

        source = sources[0].rstrip("/")
        if source in REPOSITORY_ROOTS and Path(destination).name == source:
            copied.add(source)

    return copied


def test_backend_image_copies_every_runtime_package_root() -> None:
    assert REPOSITORY_ROOTS <= copied_package_roots(DOCKERFILE)
