// Espejo tipado de los umbrales del analizador Python. Fuentes de verdad:
//   ai/level.py  (capacidad, % de advertencia y crítico, precisión de línea base)
//   ai/ladder.py (z de presión, curtosis, RMS, deriva térmica, escalón abrupto, 2 de 3)
//   ai/rul.py    (turno, ciclo de acarreo, compuertas de pronóstico)
// Debe mantenerse sincronizado: rules.test.ts lee esos archivos y falla si divergen.
export const RULES = {
  capacityL: 95,
  warnPct: 50,
  critPct: 30,
  warnL: 47.5,
  critL: 28.5,
  zThr: 3.0,
  zExtreme: 10.0,
  kurtSpike: 5.0,
  rmsHighG: 0.6,
  tempDriftC: 1.5,
  abruptStepL: 5.0,
  minVotes: 2,
  shiftH: 8,
  cycleS: 29,
  minBaselineN: 10,
  minScoredN: 10,
  minR2: 0.3,
  maxSigmaL: 2.0,
} as const;

export const RULE_SOURCES = {
  level: "ai/level.py",
  ladder: "ai/ladder.py",
  rul: "ai/rul.py",
} as const;
