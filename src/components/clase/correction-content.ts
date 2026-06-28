import { supabase } from "@/integrations/supabase/client";
import type { SessionFocus } from "./types";

// ── Tipos ────────────────────────────────────────────────────────────────────

export type PaperKind = SessionFocus; // "p1" | "p2" | "oral"

export type CriterionFeedback = {
  label: string;
  value: number;
  max: number;
  justification: string | null;
};

/** Vista normalizada que consume el CorrectionReader, igual para las 3 pruebas. */
export type CorrectionView = {
  paper: PaperKind;
  created_at: string;
  notaIb: number | null; // solo P1
  textBlocks: { heading: string; body: string }[];
  answer: { heading: string; body: string };
  criteria: CriterionFeedback[];
  fortalezas: string | null;
  areas_mejora: string | null;
  comentario_global: string | null;
};

const P1_COLS = "id, created_at, texto_literario, pregunta_orientacion, analisis_estudiante, banda_a, banda_b, banda_c, banda_d, nota_ib, justificacion_a, justificacion_b, justificacion_c, justificacion_d, fortalezas, areas_mejora, comentario_global";
const P2_COLS = "id, created_at, pregunta, obra_1, obra_2, notas_obra_1, notas_obra_2, ensayo_estudiante, criterio_a, criterio_b1, criterio_b2, criterio_c, criterio_d, justificacion_a, justificacion_b1, justificacion_b2, justificacion_c, justificacion_d, fortalezas, areas_mejora, comentario_global";
const ORAL_COLS = "id, created_at, asunto_global, obra_1_titulo, obra_1_autor, extracto_1, notas_obra_1, obra_2_titulo, obra_2_autor, extracto_2, notas_obra_2, guion_oral, criterio_a, criterio_b, criterio_c, criterio_d, justificacion_a, justificacion_b, justificacion_c, justificacion_d, fortalezas, areas_mejora, comentario_global";

// ── Carga + normalización ────────────────────────────────────────────────────

/** Carga una corrección completa por id desde la tabla de su prueba. */
export async function fetchCorrectionView(
  paper: PaperKind,
  id: string,
  isEN: boolean,
): Promise<CorrectionView | null> {
  const res =
    paper === "p1"
      ? await supabase.from("evaluaciones").select(P1_COLS).eq("id", id).maybeSingle()
      : paper === "p2"
        ? await supabase.from("evaluaciones_prueba2").select(P2_COLS).eq("id", id).maybeSingle()
        : await supabase.from("evaluaciones_oral").select(ORAL_COLS).eq("id", id).maybeSingle();

  if (res.error) {
    console.error("fetchCorrectionView:", res.error);
    return null;
  }
  if (!res.data) return null;
  return toView(paper, res.data as unknown as Record<string, unknown>, isEN);
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const numOrNull = (v: unknown): number | null => (typeof v === "number" ? v : null);
const num = (v: unknown): number => (typeof v === "number" ? v : 0);

function obraBlock(titulo: unknown, autor: unknown, extra: unknown, notas: unknown): string {
  const head = [str(titulo), str(autor)].filter(Boolean).join(" — ");
  const parts = [head, str(extra), str(notas)].filter(Boolean);
  return parts.join("\n\n");
}

function toView(paper: PaperKind, d: Record<string, unknown>, isEN: boolean): CorrectionView {
  const L = (es: string, en: string) => (isEN ? en : es);
  const base = {
    paper,
    created_at: str(d.created_at),
    fortalezas: (d.fortalezas as string | null) ?? null,
    areas_mejora: (d.areas_mejora as string | null) ?? null,
    comentario_global: (d.comentario_global as string | null) ?? null,
  };

  if (paper === "p1") {
    return {
      ...base,
      notaIb: numOrNull(d.nota_ib),
      textBlocks: [
        { heading: L("Pregunta de orientación", "Guiding question"), body: str(d.pregunta_orientacion) },
        { heading: L("Texto literario", "Literary text"), body: str(d.texto_literario) },
      ].filter((b) => b.body),
      answer: { heading: L("Análisis del alumno", "Student's analysis"), body: str(d.analisis_estudiante) },
      criteria: [
        { label: "A", value: num(d.banda_a), max: 5, justification: (d.justificacion_a as string | null) ?? null },
        { label: "B", value: num(d.banda_b), max: 5, justification: (d.justificacion_b as string | null) ?? null },
        { label: "C", value: num(d.banda_c), max: 5, justification: (d.justificacion_c as string | null) ?? null },
        { label: "D", value: num(d.banda_d), max: 5, justification: (d.justificacion_d as string | null) ?? null },
      ],
    };
  }

  if (paper === "p2") {
    return {
      ...base,
      notaIb: null,
      textBlocks: [
        { heading: L("Pregunta", "Question"), body: str(d.pregunta) },
        { heading: L("Obra 1", "Work 1"), body: obraBlock(d.obra_1, "", "", d.notas_obra_1) },
        { heading: L("Obra 2", "Work 2"), body: obraBlock(d.obra_2, "", "", d.notas_obra_2) },
      ].filter((b) => b.body),
      answer: { heading: L("Ensayo del alumno", "Student's essay"), body: str(d.ensayo_estudiante) },
      criteria: [
        { label: "A", value: num(d.criterio_a), max: 5, justification: (d.justificacion_a as string | null) ?? null },
        { label: "B1", value: num(d.criterio_b1), max: 5, justification: (d.justificacion_b1 as string | null) ?? null },
        { label: "B2", value: num(d.criterio_b2), max: 5, justification: (d.justificacion_b2 as string | null) ?? null },
        { label: "C", value: num(d.criterio_c), max: 5, justification: (d.justificacion_c as string | null) ?? null },
        { label: "D", value: num(d.criterio_d), max: 5, justification: (d.justificacion_d as string | null) ?? null },
      ],
    };
  }

  // oral
  return {
    ...base,
    notaIb: null,
    textBlocks: [
      { heading: L("Asunto global", "Global issue"), body: str(d.asunto_global) },
      { heading: L("Obra 1", "Work 1"), body: obraBlock(d.obra_1_titulo, d.obra_1_autor, d.extracto_1, d.notas_obra_1) },
      { heading: L("Obra 2", "Work 2"), body: obraBlock(d.obra_2_titulo, d.obra_2_autor, d.extracto_2, d.notas_obra_2) },
    ].filter((b) => b.body),
    answer: { heading: L("Guion oral", "Oral script"), body: str(d.guion_oral) },
    criteria: [
      { label: "A", value: num(d.criterio_a), max: 10, justification: (d.justificacion_a as string | null) ?? null },
      { label: "B", value: num(d.criterio_b), max: 10, justification: (d.justificacion_b as string | null) ?? null },
      { label: "C", value: num(d.criterio_c), max: 10, justification: (d.justificacion_c as string | null) ?? null },
      { label: "D", value: num(d.criterio_d), max: 10, justification: (d.justificacion_d as string | null) ?? null },
    ],
  };
}
