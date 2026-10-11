import { useState } from "preact/hooks";
import { t } from "../../i18n";
import { LANDING_SENSORS, sensorById, type LandingSensorId } from "./scenes/sensors";

// Una sola tarjeta por selector: evita la cuadrícula perezosa de cuatro
// tarjetas y conserva la identidad de punto de servicio trazada a B01.
export default function SensorDetails({
  initial = "pressure",
}: {
  initial?: LandingSensorId;
}) {
  // El inicial inválido lanza aquí para que lo no seleccionable nunca pinte en silencio.
  const [selected, setSelected] = useState<LandingSensorId>(() => sensorById(initial).id);
  const sensor = sensorById(selected);

  return (
    <div className="landing__sensor-details" data-sensors="true">
      <div
        className="landing__actions"
        role="group"
        aria-label={t("landing.sensors.selectLabel")}
      >
        {LANDING_SENSORS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            data-sensor={entry.id}
            aria-pressed={entry.id === selected}
            onClick={() => setSelected(sensorById(entry.id).id)}
            className="landing__button landing__button--secondary"
          >
            {t(entry.titleKey)}
          </button>
        ))}
      </div>
      <article className="landing__scope-banner" data-sensor-card={sensor.id}>
        <span className="landing__banner-mark" aria-hidden="true">
          {sensor.item}
        </span>
        <div>
          <strong>{t(sensor.titleKey)}</strong>
          <p>
            {t(sensor.serviceKey)} · {sensor.item}
          </p>
          {sensor.rotatingOutput && <p>{t("landing.sensors.rotatingNote")}</p>}
          {sensor.detailKey !== null && <p>{t(sensor.detailKey)}</p>}
          <p>
            <span className="landing__assumption-chip">{t("landing.designInput")}</span>{" "}
            {t("landing.mountNote")}
          </p>
        </div>
      </article>
    </div>
  );
}
