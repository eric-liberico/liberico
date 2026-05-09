// Módulo compartido: cursos Language A: Literature del IB
// Reemplaza _shared/nivel.ts — importar desde aquí en todas las EFs.

export type CourseKey = "spanish-a-literature" | "english-a-literature" | "spanish-b-language";

// SL = Standard Level (alias NM para Español A)
// HL = Higher Level  (alias NS para Español A)
export type Nivel = "SL" | "HL";

export type TipoObraOral = "original_language" | "in_translation" | "unspecified";

// ── Parsers con retrocompatibilidad ──────────────────────────────────────────

/** Acepta 'NM'|'NS' (legacy) y 'SL'|'HL' (actual). Devuelve siempre SL|HL. */
export function parseNivel(value: unknown): Nivel {
  if (value === "HL" || value === "NS") return "HL";
  return "SL";
}

/** Valores fuera del conjunto → 'spanish-a-literature' (retrocompatible). */
export function parseCourseKey(value: unknown): CourseKey {
  if (value === "english-a-literature") return "english-a-literature";
  if (value === "spanish-b-language") return "spanish-b-language";
  return "spanish-a-literature";
}

/** Acepta valores legacy en español y los valores generalizados. */
export function parseObraTipo(value: unknown): TipoObraOral {
  if (value === "in_translation" || value === "traducida") return "in_translation";
  if (value === "original_language" || value === "original_espanol") return "original_language";
  return "unspecified";
}

// ── Configuración por curso ──────────────────────────────────────────────────

export const COURSE_CONFIG = {
  "spanish-a-literature": {
    responseLanguage: "es" as const,
    courseName: "Español A: Literatura",
    nivelLabel: { SL: "NM", HL: "NS" } as Record<Nivel, string>,
    obraOriginalLabel: "obra escrita originalmente en español",
    obraTraducidaLabel: "obra estudiada en traducción al español",
    terminos: {
      paper1: "Prueba 1",
      paper2: "Paper 2",
      oral: "Oral Individual",
      asignatura: "Español A: Literatura del Bachillerato Internacional",
    },
    // Capabilities: qué funciones están listas para este curso
    capabilities: {
      practiceLibrary: true,
      oralSimulator: true,
      studyPlan: true,
      exercises: true,
      theory: true,
      questionBank: true,
    },
  },
  "english-a-literature": {
    responseLanguage: "en" as const,
    courseName: "English A: Literature",
    nivelLabel: { SL: "SL", HL: "HL" } as Record<Nivel, string>,
    obraOriginalLabel: "work written originally in the language of study",
    obraTraducidaLabel: "work studied in translation",
    terminos: {
      paper1: "Paper 1",
      paper2: "Paper 2",
      oral: "Individual Oral",
      asignatura: "English A: Literature (IB Diploma Programme)",
    },
    // Capabilities: qué funciones están listas para este curso (English A MVP)
    capabilities: {
      practiceLibrary: false, // pendiente seed de textos EN
      oralSimulator: true,
      studyPlan: true,
      exercises: false, // contenido específico de Español A
      theory: false, // contenido específico de Español A
      questionBank: false, // pendiente seed de preguntas EN
    },
  },
  "spanish-b-language": {
    // Lengua del feedback: el usuario elige (default 'en' por preferencia,
    // override a 'es' si lo pide). Las EFs leen uiLang del payload y lo
    // pasan a buildSystemPrompt(); responseLanguage queda como default
    // documentado pero NO se usa para construir el prompt.
    responseLanguage: "en" as const,
    courseName: "Spanish B (Acquisition)",
    nivelLabel: { SL: "SL", HL: "HL" } as Record<Nivel, string>,
    obraOriginalLabel: "",
    obraTraducidaLabel: "",
    terminos: {
      paper1: "Paper 1",
      paper2: "Paper 2",
      oral: "Individual Oral",
      asignatura: "Spanish B (IB Diploma Programme, Language acquisition)",
    },
    capabilities: {
      practiceLibrary: false,
      oralSimulator: false,
      studyPlan: false,
      exercises: false,
      theory: false,
      questionBank: false,
    },
  },
} as const;

// ── Contexto de nivel para prompts ───────────────────────────────────────────

const HL_P1_ES = `

NIVEL SUPERIOR (NS/HL) — AJUSTE DE EXPECTATIVAS
Este alumno cursa Nivel Superior. La Prueba 1 NS incluye dos textos evaluados por separado; esta herramienta evalúa un análisis a la vez. Aplica expectativas más exigentes:
- Criterio A: Exige interpretaciones más profundas y matizadas; penaliza lecturas literales.
- Criterio B: Exige evaluación genuina de los efectos de los recursos, no solo identificación.
- Criterio C: Exige mayor rigor argumentativo, cohesión y enfoque sostenido.
- Criterio D: Exige mayor variedad sintáctica, precisión léxica y registro académico elaborado.
Penaliza con más rigor cualquier tendencia parafrasística o sin tesis analítica clara.`;

const HL_P2_ES = `

NIVEL SUPERIOR (NS/HL) — AJUSTE DE EXPECTATIVAS
Este alumno cursa Nivel Superior. Aplica expectativas más exigentes:
- Exige mayor profundidad crítica e independencia analítica.
- Se espera integración de perspectivas teóricas o enfoques críticos cuando sean pertinentes.
- La comparación debe ser más matizada; penaliza con más rigor la yuxtaposición mecánica.
- Penaliza respuestas superficiales o sin tesis comparativa sólida.`;

const HL_ORAL_ES = `

NIVEL SUPERIOR (NS/HL) — AJUSTE DE EXPECTATIVAS
Este alumno cursa Nivel Superior. Aplica expectativas más exigentes en todos los criterios:
- Criterio A: Exige mayor densidad y precisión en las referencias a obras y extractos.
- Criterio B: Exige evaluación más sofisticada de las decisiones autorales.
- Criterio C: El asunto global debe articular el oral de forma más rigurosa y cohesionada.
- Criterio D: Exige mayor precisión léxica y registro oral más elaborado y natural.`;

const HL_P1_EN = `

HIGHER LEVEL (HL) — STRUCTURAL CONTEXT
This student is enrolled at Higher Level. Paper 1 at HL consists of two unseen texts written under a longer time allowance; this tool evaluates one essay at a time, using the SAME band descriptors already defined above for criteria A, B, C, and D.

The IBO does NOT publish separate, stricter band descriptors for HL Paper 1. The bands are the same standard for SL and HL. What differs is that the unseen texts at HL tend to be more complex, and HL candidates are expected to engage with that complexity — but the band-5 profile, the band-4 profile, and so on, are identical.

Within the SAME band-5 profile defined above, an HL response at band 5 is expected to:
- Handle thematic and structural complexity confidently when the text invites it.
- Sustain analytical engagement over a longer response without losing focus.
- Show critical independence and willingness to push beyond the most obvious reading when relevant.

CRITICAL ANTI-OVERDRIVE INSTRUCTION
Do NOT downgrade a response from band 5 to band 4 merely because the candidate is HL. Do NOT apply an extra "HL severity margin" on top of the descriptors above. An HL response that meets the band-5 profile (sustained and fairly convincing interpretation; insightful and convincing analysis even if selective; effectively organised with occasional shifts tolerated; language very clear and effective for the most part) is band 5. The IB itself awards 20/20 to HL responses that fit the band-5 profile, with the same kind of imperfections that are tolerated at SL.

If a response is genuinely thin, paraphrastic, or unsubstantiated, the lower band applies — at HL as at SL — but the determining factor is the band descriptor, not the level.`;

const HL_P2_EN = `

HIGHER LEVEL (HL) — ADJUSTED EXPECTATIONS
This student is enrolled at Higher Level. Apply more demanding expectations:
- Demand greater critical depth and analytical independence.
- Integration of relevant critical or theoretical perspectives is expected where appropriate.
- The comparative argument must be more nuanced; penalize mechanical juxtaposition more strictly.
- Penalize superficial, descriptive, or thesis-weak responses.`;

const HL_ORAL_EN = `

HIGHER LEVEL (HL) — ADJUSTED EXPECTATIONS
This student is enrolled at Higher Level. Apply more demanding expectations across all criteria:
- Criterion A: Demand greater density and precision in references to works and extracts.
- Criterion B: Demand more sophisticated evaluation of authorial choices.
- Criterion C: The global issue must frame the oral more rigorously and cohesively.
- Criterion D: Demand greater lexical precision and a more polished, natural oral register.`;

export type NivelContextPrueba = "p1" | "p2" | "oral";

/** Devuelve el bloque de ajuste de nivel para añadir al system prompt. */
export function nivelContext(
  nivel: Nivel,
  prueba: NivelContextPrueba,
  courseKey: CourseKey,
): string {
  if (nivel === "SL") return "";
  // Spanish B: SL-only en MVP; no hay HL definido. Devolvemos vacío para
  // evitar inyectar el bloque HL de Lit en un prompt de Lang B.
  if (courseKey === "spanish-b-language") return "";
  const isES = courseKey === "spanish-a-literature";
  if (prueba === "p1") return isES ? HL_P1_ES : HL_P1_EN;
  if (prueba === "p2") return isES ? HL_P2_ES : HL_P2_EN;
  return isES ? HL_ORAL_ES : HL_ORAL_EN;
}
