import type { CriteriaItem, CriteriaSet, IBScaleBand } from "./types";

// ── Paper 1 (análisis de texto no visto) /20 ─────────────────────────────

export const CRITERIOS_SPANISH_A_P1_ES = [
  { key: "a", letra: "A", nombre: "Comprensión e interpretación" },
  { key: "b", letra: "B", nombre: "Análisis y evaluación" },
  { key: "c", letra: "C", nombre: "Focalización y desarrollo" },
  { key: "d", letra: "D", nombre: "Lenguaje" },
] as const;

export const CRITERIOS_SPANISH_A_P1_EN = [
  { key: "a", letra: "A", nombre: "Understanding and interpretation" },
  { key: "b", letra: "B", nombre: "Analysis and evaluation" },
  { key: "c", letra: "C", nombre: "Focus and organisation" },
  { key: "d", letra: "D", nombre: "Language" },
] as const;

const IB_SCALE_P1: readonly IBScaleBand[] = [
  { upTo: 2, nota: 1 },
  { upTo: 5, nota: 2 },
  { upTo: 8, nota: 3 },
  { upTo: 10, nota: 4 },
  { upTo: 13, nota: 5 },
  { upTo: 15, nota: 6 },
  { upTo: 20, nota: 7 },
];

const CRITERIA_P1: readonly CriteriaItem[] = CRITERIOS_SPANISH_A_P1_ES.map((c, i) => ({
  key: c.key,
  label: c.letra,
  nameEs: c.nombre,
  nameEn: CRITERIOS_SPANISH_A_P1_EN[i].nombre,
  max: 5,
}));

export const SET_SPANISH_A_P1: CriteriaSet = {
  paper: "p1",
  criteria: CRITERIA_P1,
  total: 20,
  ibScale: IB_SCALE_P1,
};

// ── Paper 2 (ensayo comparativo) /25 ──────────────────────────────────────

export const CRITERIOS_SPANISH_A_P2_ES = [
  { key: "a", etiqueta: "A", nombre: "Conocimiento e interpretación", max: 5 },
  { key: "b1", etiqueta: "B1", nombre: "Análisis formal", max: 5 },
  { key: "b2", etiqueta: "B2", nombre: "Comparación", max: 5 },
  { key: "c", etiqueta: "C", nombre: "Organización", max: 5 },
  { key: "d", etiqueta: "D", nombre: "Lenguaje", max: 5 },
] as const;

export const CRITERIOS_SPANISH_A_P2_EN = [
  { key: "a", etiqueta: "A", nombre: "Knowledge and interpretation", max: 5 },
  { key: "b1", etiqueta: "B1", nombre: "Formal analysis", max: 5 },
  { key: "b2", etiqueta: "B2", nombre: "Comparison", max: 5 },
  { key: "c", etiqueta: "C", nombre: "Organisation", max: 5 },
  { key: "d", etiqueta: "D", nombre: "Language", max: 5 },
] as const;

const IB_SCALE_P2: readonly IBScaleBand[] = [
  { upTo: 2, nota: 1 },
  { upTo: 6, nota: 2 },
  { upTo: 9, nota: 3 },
  { upTo: 13, nota: 4 },
  { upTo: 17, nota: 5 },
  { upTo: 21, nota: 6 },
  { upTo: 25, nota: 7 },
];

const CRITERIA_P2: readonly CriteriaItem[] = CRITERIOS_SPANISH_A_P2_ES.map((c, i) => ({
  key: c.key,
  label: c.etiqueta,
  nameEs: c.nombre,
  nameEn: CRITERIOS_SPANISH_A_P2_EN[i].nombre,
  max: c.max,
}));

export const SET_SPANISH_A_P2: CriteriaSet = {
  paper: "p2",
  criteria: CRITERIA_P2,
  total: 25,
  ibScale: IB_SCALE_P2,
};

// ── Oral Individual /40 ────────────────────────────────────────────────────

export const CRITERIOS_SPANISH_A_ORAL_ES = [
  { key: "a", etiqueta: "A", nombre: "Conocimiento e interpretación", max: 10 },
  { key: "b", etiqueta: "B", nombre: "Análisis y evaluación", max: 10 },
  { key: "c", etiqueta: "C", nombre: "Foco y organización", max: 10 },
  { key: "d", etiqueta: "D", nombre: "Lenguaje", max: 10 },
] as const;

export const CRITERIOS_SPANISH_A_ORAL_EN = [
  { key: "a", etiqueta: "A", nombre: "Knowledge and interpretation", max: 10 },
  { key: "b", etiqueta: "B", nombre: "Analysis and evaluation", max: 10 },
  { key: "c", etiqueta: "C", nombre: "Focus and organisation", max: 10 },
  { key: "d", etiqueta: "D", nombre: "Language", max: 10 },
] as const;

const IB_SCALE_ORAL: readonly IBScaleBand[] = [
  { upTo: 6, nota: 1 },
  { upTo: 12, nota: 2 },
  { upTo: 18, nota: 3 },
  { upTo: 23, nota: 4 },
  { upTo: 28, nota: 5 },
  { upTo: 33, nota: 6 },
  { upTo: 40, nota: 7 },
];

const CRITERIA_ORAL: readonly CriteriaItem[] = CRITERIOS_SPANISH_A_ORAL_ES.map((c, i) => ({
  key: c.key,
  label: c.etiqueta,
  nameEs: c.nombre,
  nameEn: CRITERIOS_SPANISH_A_ORAL_EN[i].nombre,
  max: c.max,
}));

export const SET_SPANISH_A_ORAL: CriteriaSet = {
  paper: "oral",
  criteria: CRITERIA_ORAL,
  total: 40,
  ibScale: IB_SCALE_ORAL,
};
