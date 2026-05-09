// Punto de entrada de la capa de prompts multiasignatura.
// Usa buildSystemPrompt() en todas las Edge Functions en lugar de SYSTEM_PROMPT locales.

import { type CourseKey, type Nivel, nivelContext, type NivelContextPrueba } from "../courses.ts";
import * as ES from "./spanish-a-literature.ts";
import * as EN from "./english-a-literature.ts";
import * as SB from "./spanish-b-language.ts";

export type UiLang = "es" | "en";

export type PromptComponent =
  | "paper1-basic"
  | "paper2-basic"
  | "oral-basic"
  | "analysis-extras"
  | "analysis-feedback"
  | "paper2-extras"
  | "paper2-feedback"
  | "oral-feedback"
  | "oral-annotations"
  | "rewrite-p1"
  | "rewrite-p2"
  | "band5-p1"
  | "band5-p2"
  | "suggest-topics"
  | "practice-text"
  | "oral-notes"
  // Spanish B (Lang B acquisition) — Phase 2 MVP
  | "paper1-b-basic";

export interface BuildPromptParams {
  courseKey: CourseKey;
  component: PromptComponent;
  nivel: Nivel;
  /**
   * Idioma del feedback. Para cursos Lit, opcional: se deriva del courseKey
   * (ES → es, EN → en). Para Spanish B es obligatorio porque el curso soporta
   * ambos idiomas (default 'en' por preferencia del usuario).
   */
  uiLang?: UiLang;
}

// Componentes Lit (Spanish A & English A) — comparten estructura y se gobiernan
// por la lengua del curso (ES vs EN).
type LitComponent = Exclude<PromptComponent, "paper1-b-basic">;

const PROMPTS_LIT_ES: Record<LitComponent, string> = {
  "paper1-basic": ES.PAPER1_BASIC_ES,
  "paper2-basic": ES.PAPER2_BASIC_ES,
  "oral-basic": ES.ORAL_BASIC_ES,
  "analysis-extras": ES.ANALYSIS_EXTRAS_ES,
  "analysis-feedback": ES.ANALYSIS_FEEDBACK_ES,
  "paper2-extras": ES.PAPER2_EXTRAS_ES,
  "paper2-feedback": ES.PAPER2_FEEDBACK_ES,
  "oral-feedback": ES.ORAL_FEEDBACK_ES,
  "oral-annotations": ES.ORAL_ANNOTATIONS_ES,
  "rewrite-p1": ES.REWRITE_P1_ES,
  "rewrite-p2": ES.REWRITE_P2_ES,
  "band5-p1": ES.BAND5_P1_ES,
  "band5-p2": ES.BAND5_P2_ES,
  "suggest-topics": ES.SUGGEST_ORAL_ES,
  "oral-notes": ES.ORAL_NOTES_ES,
  "practice-text": ES.PRACTICE_TEXT_ES,
};

const PROMPTS_LIT_EN: Record<LitComponent, string> = {
  "paper1-basic": EN.PAPER1_BASIC_EN,
  "paper2-basic": EN.PAPER2_BASIC_EN,
  "oral-basic": EN.ORAL_BASIC_EN,
  "analysis-extras": EN.ANALYSIS_EXTRAS_EN,
  "analysis-feedback": EN.ANALYSIS_FEEDBACK_EN,
  "paper2-extras": EN.PAPER2_EXTRAS_EN,
  "paper2-feedback": EN.PAPER2_FEEDBACK_EN,
  "oral-feedback": EN.ORAL_FEEDBACK_EN,
  "oral-annotations": EN.ORAL_ANNOTATIONS_EN,
  "rewrite-p1": EN.REWRITE_P1_EN,
  "rewrite-p2": EN.REWRITE_P2_EN,
  "band5-p1": EN.BAND5_P1_EN,
  "band5-p2": EN.BAND5_P2_EN,
  "suggest-topics": EN.SUGGEST_ORAL_EN,
  "oral-notes": EN.ORAL_NOTES_EN,
  "practice-text": EN.PRACTICE_TEXT_EN,
};

// Spanish B (Lang B acquisition) — el feedback puede pedirse en ES o EN según
// la preferencia del alumno (uiLang). En MVP solo Paper 1 está implementado.
type SpanishBComponent = "paper1-b-basic";

const PROMPTS_SB_ES: Record<SpanishBComponent, string> = {
  "paper1-b-basic": SB.PAPER1_B_BASIC_ES,
};

const PROMPTS_SB_EN: Record<SpanishBComponent, string> = {
  "paper1-b-basic": SB.PAPER1_B_BASIC_EN,
};

function isSpanishBComponent(c: PromptComponent): c is SpanishBComponent {
  return c === "paper1-b-basic";
}

function defaultUiLangFor(courseKey: CourseKey): UiLang {
  if (courseKey === "english-a-literature") return "en";
  if (courseKey === "spanish-b-language") return "en";
  return "es";
}

function commonFeedbackStyle(lang: UiLang): string {
  if (lang === "en") {
    return `

COMMON FEEDBACK STYLE
- Use "Grade" as the user-facing label, not "IB grade".
- Format complete literary works in Markdown italics, e.g. *The Metamorphosis*. Put extracts, poems, chapters, scenes, fragments, and short passages in quotation marks.
- Keep the student's own line, verse, act, scene, chapter, page, or paragraph references whenever the student provides them. Do not remove useful textual anchors.
- Keep feedback direct and readable. When explaining the effect on the reader, avoid vague formulas; say what the device changes in interpretation, expectation, tension, sympathy, pace, or focus.
- Do not invent quotations or textual locations. If a location is unknown, say the example should be anchored to the relevant act, scene, chapter, part, line, or verse.`;
  }

  return `

ESTILO COMUN DEL FEEDBACK
- Usa "Nota" como etiqueta visible, no "Nota IB".
- Da formato Markdown a los títulos: obras completas en cursiva, por ejemplo *La metamorfosis*; extractos, poemas, capítulos, escenas, cuadros, fragmentos o pasajes entre comillas.
- Mantén las referencias a líneas, versos, actos, escenas, capítulos, páginas o párrafos cuando el alumno las aporte. No elimines anclajes textuales útiles.
- Simplifica el lenguaje. Al explicar el efecto en el lector, evita fórmulas vagas; explica qué cambia en la interpretación, expectativa, tensión, simpatía, ritmo o foco.
- No inventes citas ni localizaciones. Si no conoces la localización, indica que el ejemplo debe anclarse al acto, escena, cuadro, capítulo, parte, línea o verso correspondiente.`;
}

/**
 * Construye el system prompt completo para una llamada a Claude.
 * Incluye el bloque de ajuste de nivel (HL) si corresponde.
 *
 * Para componentes aún no migrados a este índice, las EFs pueden seguir usando
 * sus SYSTEM_PROMPT locales; este módulo se amplía de forma incremental.
 */
export function buildSystemPrompt(params: BuildPromptParams): string {
  const lang: UiLang = params.uiLang ?? defaultUiLangFor(params.courseKey);

  let base: string;
  if (isSpanishBComponent(params.component)) {
    if (params.courseKey !== "spanish-b-language") {
      throw new Error(
        `Component '${params.component}' only valid for course 'spanish-b-language' (got '${params.courseKey}')`,
      );
    }
    base = lang === "en" ? PROMPTS_SB_EN[params.component] : PROMPTS_SB_ES[params.component];
  } else {
    if (params.courseKey === "spanish-b-language") {
      throw new Error(
        `Component '${params.component}' is Lit-only and not valid for course 'spanish-b-language'`,
      );
    }
    base = lang === "en" ? PROMPTS_LIT_EN[params.component] : PROMPTS_LIT_ES[params.component];
  }

  const prueba = componentToPrueba(params.component);
  const nivel_context = prueba ? nivelContext(params.nivel, prueba, params.courseKey) : "";
  return base + commonFeedbackStyle(lang) + nivel_context;
}

function componentToPrueba(component: PromptComponent): NivelContextPrueba | null {
  if (
    component === "paper1-basic" ||
    component === "analysis-extras" ||
    component === "rewrite-p1" ||
    component === "band5-p1"
  )
    return "p1";
  if (
    component === "paper2-basic" ||
    component === "paper2-extras" ||
    component === "rewrite-p2" ||
    component === "band5-p2"
  )
    return "p2";
  if (
    component === "oral-basic" ||
    component === "oral-feedback" ||
    component === "oral-annotations" ||
    component === "oral-notes"
  )
    return "oral";
  return null; // suggest-topics, practice-text: sin ajuste de nivel
}
