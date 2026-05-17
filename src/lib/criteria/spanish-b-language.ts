import type { CriteriaItem, CriteriaSet, IBScaleBand } from "./types";

// ── Paper 1 — Producción escrita /30 (SL y HL) ────────────────────────────
//
//   A · Language        /12 — Vocabulario, gramática y registro
//   B · Message         /12 — Desarrollo de ideas, relevancia, coherencia
//   C · Conceptual      /6  — Tipo de texto, audiencia, propósito y registro
//
// Total: /30 → nota IB 1-7 (estimación formativa; calibrar con anchors).

export const CRITERIOS_SPANISH_B_P1_ES = [
  { key: "a", letra: "A", nombre: "Lenguaje", max: 12 },
  { key: "b", letra: "B", nombre: "Mensaje", max: 12 },
  { key: "c", letra: "C", nombre: "Comprensión conceptual", max: 6 },
] as const;

export const CRITERIOS_SPANISH_B_P1_EN = [
  { key: "a", letra: "A", nombre: "Language", max: 12 },
  { key: "b", letra: "B", nombre: "Message", max: 12 },
  { key: "c", letra: "C", nombre: "Conceptual understanding", max: 6 },
] as const;

const IB_SCALE_SPANISH_B_P1: readonly IBScaleBand[] = [
  { upTo: 3, nota: 1 },
  { upTo: 7, nota: 2 },
  { upTo: 12, nota: 3 },
  { upTo: 16, nota: 4 },
  { upTo: 20, nota: 5 },
  { upTo: 25, nota: 6 },
  { upTo: 30, nota: 7 },
];

const CRITERIA_P1: readonly CriteriaItem[] = CRITERIOS_SPANISH_B_P1_ES.map((c, i) => ({
  key: c.key,
  label: c.letra,
  nameEs: c.nombre,
  nameEn: CRITERIOS_SPANISH_B_P1_EN[i].nombre,
  max: c.max,
}));

export const SET_SPANISH_B_P1: CriteriaSet = {
  paper: "p1",
  criteria: CRITERIA_P1,
  total: 30,
  ibScale: IB_SCALE_SPANISH_B_P1,
};

// ── Oral Individual — /30 (SL y HL) ──────────────────────────────────────
//
//   A · Lengua               /10 — Vocabulario, gramática y pronunciación
//   B · Mensaje              /10 — Ideas, relevancia con el estímulo y la cuestión global
//   C · Habilidades interact. /10 — Diálogo, respuestas y desarrollo de ideas
//
// Total: /30 → misma escala que Paper 1 (estimación formativa).

export const CRITERIOS_SPANISH_B_ORAL_ES = [
  { key: "a", letra: "A", nombre: "Lengua", max: 10 },
  { key: "b", letra: "B", nombre: "Mensaje", max: 10 },
  { key: "c", letra: "C", nombre: "Habilidades interactivas", max: 10 },
] as const;

export const CRITERIOS_SPANISH_B_ORAL_EN = [
  { key: "a", letra: "A", nombre: "Language", max: 10 },
  { key: "b", letra: "B", nombre: "Message", max: 10 },
  { key: "c", letra: "C", nombre: "Interactive skills", max: 10 },
] as const;

const IB_SCALE_SPANISH_B_ORAL: readonly IBScaleBand[] = [
  { upTo: 3, nota: 1 },
  { upTo: 7, nota: 2 },
  { upTo: 12, nota: 3 },
  { upTo: 16, nota: 4 },
  { upTo: 20, nota: 5 },
  { upTo: 25, nota: 6 },
  { upTo: 30, nota: 7 },
];

const CRITERIA_ORAL: readonly CriteriaItem[] = CRITERIOS_SPANISH_B_ORAL_ES.map((c, i) => ({
  key: c.key,
  label: c.letra,
  nameEs: c.nombre,
  nameEn: CRITERIOS_SPANISH_B_ORAL_EN[i].nombre,
  max: c.max,
}));

export const SET_SPANISH_B_ORAL: CriteriaSet = {
  paper: "oral",
  criteria: CRITERIA_ORAL,
  total: 30,
  ibScale: IB_SCALE_SPANISH_B_ORAL,
};

// ── Lectura / Paper 2 — Comprensión lectora /20 (SL y HL) ────────────────
//
//   A · Lengua en las respuestas  /10 — Precisión gramatical y léxica al contestar
//   B · Comprensión               /10 — Exactitud, relevancia y profundidad de las respuestas
//
// Total: /20 → nota IB 1-7 (estimación formativa).

export const CRITERIOS_SPANISH_B_P2_ES = [
  { key: "a", letra: "A", nombre: "Lengua en las respuestas", max: 10 },
  { key: "b", letra: "B", nombre: "Comprensión del texto", max: 10 },
] as const;

export const CRITERIOS_SPANISH_B_P2_EN = [
  { key: "a", letra: "A", nombre: "Language in responses", max: 10 },
  { key: "b", letra: "B", nombre: "Text comprehension", max: 10 },
] as const;

const IB_SCALE_SPANISH_B_P2: readonly IBScaleBand[] = [
  { upTo: 2, nota: 1 },
  { upTo: 5, nota: 2 },
  { upTo: 9, nota: 3 },
  { upTo: 12, nota: 4 },
  { upTo: 15, nota: 5 },
  { upTo: 17, nota: 6 },
  { upTo: 20, nota: 7 },
];

const CRITERIA_P2: readonly CriteriaItem[] = CRITERIOS_SPANISH_B_P2_ES.map((c, i) => ({
  key: c.key,
  label: c.letra,
  nameEs: c.nombre,
  nameEn: CRITERIOS_SPANISH_B_P2_EN[i].nombre,
  max: c.max,
}));

export const SET_SPANISH_B_P2: CriteriaSet = {
  paper: "p2",
  criteria: CRITERIA_P2,
  total: 20,
  ibScale: IB_SCALE_SPANISH_B_P2,
};

// ── Tipos de texto oficiales de Lang B Paper 1 ────────────────────────────

export type TextTypeP1B =
  | "blog"
  | "email"
  | "article"
  | "brochure"
  | "speech"
  | "interview"
  | "instructions"
  | "leaflet"
  | "proposal"
  | "report"
  | "review";

export const TEXT_TYPE_LABELS: Record<TextTypeP1B, { es: string; en: string }> = {
  blog: { es: "Entrada de blog", en: "Blog post" },
  email: { es: "Correo electrónico", en: "Email" },
  article: { es: "Artículo", en: "Article" },
  brochure: { es: "Folleto", en: "Brochure" },
  speech: { es: "Discurso", en: "Speech" },
  interview: { es: "Entrevista", en: "Interview" },
  instructions: { es: "Instrucciones", en: "Set of instructions" },
  leaflet: { es: "Volante", en: "Leaflet" },
  proposal: { es: "Propuesta", en: "Proposal" },
  report: { es: "Informe", en: "Report" },
  review: { es: "Reseña", en: "Review" },
};

// ── Temas prescritos del syllabus 2020 ────────────────────────────────────

export type ThemeP1B =
  | "identidades"
  | "experiencias"
  | "ingenio_humano"
  | "organizacion_social"
  | "planeta_compartido";

export const THEME_LABELS: Record<ThemeP1B, { es: string; en: string }> = {
  identidades: { es: "Identidades", en: "Identities" },
  experiencias: { es: "Experiencias", en: "Experiences" },
  ingenio_humano: { es: "Ingenio humano", en: "Human ingenuity" },
  organizacion_social: { es: "Organización social", en: "Social organization" },
  planeta_compartido: { es: "Planeta compartido", en: "Sharing the planet" },
};

// ── Word count targets ────────────────────────────────────────────────────

export const WORD_COUNT_RANGE_SL = { min: 250, max: 400 } as const;
export const WORD_COUNT_RANGE_HL = { min: 450, max: 600 } as const;
