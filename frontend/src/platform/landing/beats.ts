// Los ocho beats narrativos del landing: una idea por sección con anclas
// estables para scroll nativo y topes de longitud que mantienen cada beat
// legible sin scroll secuestrado.
import type { DictKey } from "../../i18n";

// Solo español (S01): el contrato estrecho admite únicamente español; si llega
// otro idioma por una llamada heredada, cae a español hasta que S04 la borre.
export type BeatLocale = "es";

export const BEAT_LOCALES: readonly BeatLocale[] = ["es"];

// El español es el idioma único de `/`; cualquier valor cae a español para no
// servir un `lang` inválido.
export const DEFAULT_BEAT_LOCALE: BeatLocale = "es";

export function asBeatLocale(_value: string | null | undefined): BeatLocale {
  return "es";
}

export type BeatId =
  | "intro"
  | "problem"
  | "regimes"
  | "sensing"
  | "pipeline"
  | "response"
  | "evidence"
  | "scope";

export type Beat = {
  readonly id: BeatId;
  readonly anchor: string;
  readonly titleKey: DictKey;
  readonly bodyKey: DictKey;
};

// Un beat por sección con una sola idea: título y cuerpo reutilizan la misma
// clave de diccionario que ya pinta la sección, sin duplicar texto.
export const BEATS: readonly Beat[] = [
  { id: "intro", anchor: "top", titleKey: "landing.heroTitle", bodyKey: "landing.heroBody" },
  { id: "problem", anchor: "approach", titleKey: "landing.blindTitle", bodyKey: "landing.blindBody" },
  { id: "regimes", anchor: "telemetry", titleKey: "landing.regimeTitle", bodyKey: "landing.regimeBody" },
  { id: "sensing", anchor: "sensing", titleKey: "landing.hardwareTitle", bodyKey: "landing.hardwareBody" },
  { id: "pipeline", anchor: "signal-path", titleKey: "landing.pipelineTitle", bodyKey: "landing.pipelineBody" },
  { id: "response", anchor: "alerts", titleKey: "landing.ladderTitle", bodyKey: "landing.ladderBody" },
  { id: "evidence", anchor: "evidence", titleKey: "landing.evidenceTitle", bodyKey: "landing.evidenceBody" },
  { id: "scope", anchor: "team", titleKey: "landing.teamTitle", bodyKey: "landing.teamBody" },
];

export function beatById(id: BeatId): Beat {
  const beat = BEATS.find((entry) => entry.id === id);
  if (!beat) throw new Error(`Unknown landing beat: ${id}`);
  return beat;
}

// Tope por beat (título + cuerpo, por idioma): unas dos pantallas a 65–75ch.
export const MAX_BEAT_WORDS = 60;

// Tope del arco completo (por idioma): unas doce pantallas en ocho beats.
export const MAX_BEAT_TOTAL_WORDS = 320;

export function countWords(copy: string): number {
  return copy.trim().split(/\s+/).filter((word) => word.length > 0).length;
}
