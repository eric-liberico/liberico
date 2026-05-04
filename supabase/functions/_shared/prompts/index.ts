// Punto de entrada de la capa de prompts multiasignatura.
// Usa buildSystemPrompt() en todas las Edge Functions en lugar de SYSTEM_PROMPT locales.

import { type CourseKey, type Nivel, type NivelContextPrueba, nivelContext } from "../courses.ts";
import * as ES from "./spanish-a-literature.ts";
import * as EN from "./english-a-literature.ts";


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
  | "oral-notes";

export interface BuildPromptParams {
  courseKey: CourseKey;
  component: PromptComponent;
  nivel: Nivel;
}

const PROMPTS_ES: Record<PromptComponent, string> = {
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

const PROMPTS_EN: Record<PromptComponent, string> = {
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

/**
 * Construye el system prompt completo para una llamada a Claude.
 * Incluye el bloque de ajuste de nivel (HL) si corresponde.
 *
 * Para componentes aún no migrados a este índice, las EFs pueden seguir usando
 * sus SYSTEM_PROMPT locales; este módulo se amplía de forma incremental.
 */
export function buildSystemPrompt(params: BuildPromptParams): string {
  const map = params.courseKey === "english-a-literature" ? PROMPTS_EN : PROMPTS_ES;
  const base = map[params.component];
  const prueba = componentToPrueba(params.component);
  const nivel_context = prueba ? nivelContext(params.nivel, prueba, params.courseKey) : "";
  return base + nivel_context;
}

function componentToPrueba(component: PromptComponent): NivelContextPrueba | null {
  if (
    component === "paper1-basic" ||
    component === "analysis-extras" ||
    component === "rewrite-p1" ||
    component === "band5-p1"
  ) return "p1";
  if (
    component === "paper2-basic" ||
    component === "paper2-extras" ||
    component === "rewrite-p2" ||
    component === "band5-p2"
  ) return "p2";
  if (
    component === "oral-basic" ||
    component === "oral-feedback" ||
    component === "oral-annotations" ||
    component === "oral-notes"
  ) return "oral";
  return null; // suggest-topics, practice-text: sin ajuste de nivel
}
