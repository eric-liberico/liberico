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

// ── Contexto de nivel para Spanish B (Lengua B, adquisición) ────────────────
// La guía de Lengua B usa descriptores de Criterio A distintos en NS (más
// exigentes). Estos bloques se inyectan en el system prompt cuando nivel === HL.

const SB_HL_P1_ES = `

NIVEL SUPERIOR (NS) — AJUSTE DEL CRITERIO A
Este alumno cursa Nivel Superior. La tarea exige un uso de la lengua y unas estructuras más complejos y habilidades de pensamiento de orden superior (análisis, evaluación, síntesis e interpretación), con una extensión de 450–600 palabras. Aplica estas expectativas más altas SOLO en el Criterio A; los criterios B y C mantienen los mismos descriptores.
- 10-12: el vocabulario, además de adecuado, muestra variedad y matices que realzan el mensaje, e incluye el uso con un fin determinado de expresiones idiomáticas; emplea de manera selectiva una variedad de estructuras básicas y complejas para mejorar la comunicación; los errores leves en estructuras complejas no dificultan la comunicación.
- 7-9: vocabulario adecuado, variado e incluye expresiones idiomáticas; emplea con eficacia una variedad de estructuras básicas y complejas; errores ocasionales que no dificultan la comunicación.
- 4-6: vocabulario en general adecuado y variado; emplea una variedad de estructuras básicas y algunas complejas; correcto sobre todo en las básicas, con errores en las complejas que a veces dificultan la comunicación.
- 1-3: el vocabulario es a veces adecuado; emplea algunas estructuras básicas e intentos de estructuras más complejas; los errores tanto en estructuras básicas como complejas dificultan la comunicación.`;

const SB_HL_P1_EN = `

HIGHER LEVEL (HL) — CRITERION A ADJUSTMENT
This student is enrolled at Higher Level. The task requires more complex language and structures and higher-order thinking (analysis, evaluation, synthesis, interpretation), with a length of 450–600 words. Apply these higher expectations ONLY to Criterion A; criteria B and C keep the same descriptors.
- 10-12: vocabulary is not only appropriate but shows variety and nuance that enhance the message, and includes the purposeful use of idiomatic expressions; a variety of basic and complex structures is used selectively to improve communication; minor errors in complex structures do not impede communication.
- 7-9: vocabulary appropriate, varied and including idiomatic expressions; a variety of basic and complex structures used effectively; occasional errors do not impede communication.
- 4-6: vocabulary generally appropriate and varied; a variety of basic structures and some complex ones; mostly accurate in basic structures, with errors in complex ones that sometimes impede communication.
- 1-3: vocabulary sometimes appropriate; some basic structures and attempts at more complex ones; errors in both basic and complex structures impede communication.`;

export type NivelContextPrueba = "p1" | "p2" | "oral";

/** Devuelve el bloque de ajuste de nivel para añadir al system prompt. */
export function nivelContext(
  nivel: Nivel,
  prueba: NivelContextPrueba,
  courseKey: CourseKey,
  uiLang: "es" | "en" = "es",
): string {
  if (nivel === "SL") return "";
  if (courseKey === "spanish-b-language") {
    // Lengua B: solo el Criterio A de la Prueba 1 difiere en NS. El Oral y la
    // Prueba 2 gestionan el nivel en sus propios prompts/flujos.
    if (prueba === "p1") return uiLang === "en" ? SB_HL_P1_EN : SB_HL_P1_ES;
    return "";
  }
  const isES = courseKey === "spanish-a-literature";
  if (prueba === "p1") return isES ? HL_P1_ES : HL_P1_EN;
  if (prueba === "p2") return isES ? HL_P2_ES : HL_P2_EN;
  return isES ? HL_ORAL_ES : HL_ORAL_EN;
}
