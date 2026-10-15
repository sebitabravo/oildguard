import os


# Los fixtures no llevan firma; el default estricto de producción se verifica eliminando la variable.
os.environ.setdefault("OILGUARD_REQUIRE_SIGNATURE", "0")
os.environ.setdefault("INFLUXDB_TOKEN", "placeholder-para-pruebas")
