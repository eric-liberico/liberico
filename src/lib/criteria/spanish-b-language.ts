import type { CriteriaItem, CriteriaSet, IBScaleBand } from "./types";

// ── Paper 1 — Producción escrita /30 (SL y HL) ────────────────────────────
//
//   A · Lengua          /12 — Vocabulario, estructuras y corrección (4 bandas de 3 pts)
//   B · Mensaje         /12 — Cumplimiento de la tarea: pertinencia, desarrollo, organización
//   C · Comprensión     /6  — Tipo de texto, registro/tono y convenciones (3 bandas de 2 pts)
//
// Total: /30 → nota IB 1-7 (estimación formativa; calibrar con anchors).
// Nota: en NS el Criterio A usa descriptores más exigentes (ver SB_HL_P1 en courses.ts).

export const CRITERIOS_SPANISH_B_P1_ES = [
  { key: "a", letra: "A", nombre: "Lengua", max: 12 },
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
//   A  · Lengua                     /12 — Vocabulario, estructuras, corrección (y pronunciación si hay audio)
//   B1 · Mensaje (estímulo/pasaje)  /6  — Pertinencia para el estímulo visual (NM) o el pasaje literario (NS)
//   B2 · Mensaje (conversación)     /6  — Pertinencia y profundidad de las respuestas en la discusión
//   C  · Destrezas de interacción   /6  — Comprensión, mantener el diálogo y aportar ideas
//
// Total: /30 → misma escala que Paper 1 (estimación formativa).

export const CRITERIOS_SPANISH_B_ORAL_ES = [
  { key: "a", letra: "A", nombre: "Lengua", max: 12 },
  { key: "b1", letra: "B1", nombre: "Mensaje (estímulo)", max: 6 },
  { key: "b2", letra: "B2", nombre: "Mensaje (conversación)", max: 6 },
  { key: "c", letra: "C", nombre: "Destrezas de interacción", max: 6 },
] as const;

export const CRITERIOS_SPANISH_B_ORAL_EN = [
  { key: "a", letra: "A", nombre: "Language", max: 12 },
  { key: "b1", letra: "B1", nombre: "Message (stimulus)", max: 6 },
  { key: "b2", letra: "B2", nombre: "Message (conversation)", max: 6 },
  { key: "c", letra: "C", nombre: "Interactive skills", max: 6 },
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

// ── Prueba 2 — Comprensión auditiva + lectura /65 (SL y HL) ──────────────
//
//   Auditiva · /25 — Comprensión de tres fragmentos de audio (esquema de respuestas)
//   Lectura  · /40 — Comprensión de tres textos escritos (esquema de respuestas)
//
// Se corrige SOLO la comprensión (no la lengua de las respuestas), ítem a ítem
// contra una clave. Total: /65 → nota IB 1-7 (estimación formativa por % de aciertos).

export const SECCIONES_SPANISH_B_P2_ES = [
  { key: "auditiva", letra: "Auditiva", nombre: "Comprensión auditiva", max: 25 },
  { key: "lectura", letra: "Lectura", nombre: "Comprensión de lectura", max: 40 },
] as const;

export const SECCIONES_SPANISH_B_P2_EN = [
  { key: "auditiva", letra: "Listening", nombre: "Listening comprehension", max: 25 },
  { key: "lectura", letra: "Reading", nombre: "Reading comprehension", max: 40 },
] as const;

export const P2_SECTION_MAX = { auditiva: 25, lectura: 40 } as const;

const IB_SCALE_SPANISH_B_P2: readonly IBScaleBand[] = [
  { upTo: 12, nota: 1 },
  { upTo: 22, nota: 2 },
  { upTo: 32, nota: 3 },
  { upTo: 40, nota: 4 },
  { upTo: 48, nota: 5 },
  { upTo: 56, nota: 6 },
  { upTo: 65, nota: 7 },
];

const CRITERIA_P2: readonly CriteriaItem[] = SECCIONES_SPANISH_B_P2_ES.map((c, i) => ({
  key: c.key,
  label: c.letra,
  nameEs: c.nombre,
  nameEn: SECCIONES_SPANISH_B_P2_EN[i].nombre,
  max: c.max,
}));

export const SET_SPANISH_B_P2: CriteriaSet = {
  paper: "p2",
  criteria: CRITERIA_P2,
  total: 65,
  ibScale: IB_SCALE_SPANISH_B_P2,
};

/**
 * Nota IB (1-7) formativa a partir del porcentaje de aciertos de la Prueba 2.
 * Se usa el porcentaje (y no el total absoluto) porque el alumno puede realizar
 * solo una sección; así la nota no penaliza una sección no intentada.
 */
export function notaIBP2FromPorcentaje(pct: number): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  if (pct < 20) return 1;
  if (pct < 35) return 2;
  if (pct < 50) return 3;
  if (pct < 63) return 4;
  if (pct < 75) return 5;
  if (pct < 87) return 6;
  return 7;
}

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
