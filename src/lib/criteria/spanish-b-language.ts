import type { CriteriaItem, CriteriaSet, IBScaleBand } from "./types";

// ── Paper 1 — Producción escrita /30 (SL, syllabus first-assessment-2020) ──
//
// Tres criterios oficiales:
//   A · Language        /12 — Vocabulario, gramática y registro
//   B · Message         /12 — Desarrollo de ideas, relevancia, coherencia
//   C · Conceptual      /6  — Tipo de texto, audiencia, propósito y registro
//
// Total: /30. La conversión a nota IB 1-7 que se aplica abajo es una
// aproximación lineal pensada para feedback formativo; las verdaderas
// fronteras de calificación las publica el IB cada sesión y se aplican al
// componente externo combinado (P1 + P2). Estas bandas internas deben
// ajustarse cuando haya anchors calibrados (Phase 0).

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

// ── Word count target (SL) ─────────────────────────────────────────────────

export const WORD_COUNT_RANGE_SL = { min: 250, max: 400 } as const;
