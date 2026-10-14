"""Device key configuration and derivation helpers delegated from backend.main."""
from __future__ import annotations

try:
    from . import main as _main_module
except ImportError:
    import main as _main_module

def _main():
    return _main_module

def parse_master_key(spec: str) -> bytes | None:
    """Llave maestra en hex; None si no se configuro. Nunca incluye el valor en el error."""
    spec = spec.strip()
    if not spec:
        return None
    try:
        key = bytes.fromhex(spec)
    except ValueError:
        raise ValueError("OILGUARD_DEVICE_MASTER_KEY must be a hex string") from None
    if not key:
        raise ValueError("OILGUARD_DEVICE_MASTER_KEY must not be empty")
    return key


def device_key(device_id: str) -> bytes | None:
    main = _main()
    """Llave de un dispositivo: la explicita si existe, si no la derivada de la maestra.

    Listar una llave por equipo no escala a miles de dispositivos, asi que
    ``OILGUARD_DEVICE_MASTER_KEY`` permite derivarlas. La entrada explicita
    siempre gana: sirve para puentear un equipo durante una rotacion.

    La derivacion se cachea por maestra: el perfil la mostraba como 1.2 s de
    13 s en el camino firmado, porque se rederivaba la misma llave en cada una
    de las diez filas de un lote.
    """
    explicit = main._DEVICE_KEYS.get(device_id)
    if explicit is not None:
        return explicit
    master = main._DEVICE_MASTER_KEY
    if not master or not device_id:
        return None
    cache = main._DEVICE_KEY_CACHE.get(master)
    if cache is None:
        cache = {}
        main._DEVICE_KEY_CACHE[master] = cache
    key = cache.get(device_id)
    if key is None:
        key = main.derive_device_key(master, device_id)
        # Un device_id sin firmar podria inflar el cache sin limite.
        if len(cache) >= main.DEVICE_KEY_CACHE_LIMIT:
            cache.clear()
        cache[device_id] = key
    return key


def _DEVICE_KEY_CACHE_SIZE() -> int:
    main = _main()
    return sum(len(cache) for cache in main._DEVICE_KEY_CACHE.values())
