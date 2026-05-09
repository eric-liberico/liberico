// Source of truth: src/lib/criteria/spanish-a-literature.ts
export {
  CRITERIOS_SPANISH_A_P2_ES as CRITERIOS_PRUEBA2,
  CRITERIOS_SPANISH_A_P2_EN as CRITERIOS_PRUEBA2_EN,
  SET_SPANISH_A_P2,
} from "./criteria/spanish-a-literature";

export type EstadoElementoPrueba2 = {
  estado: "presente" | "parcial" | "ausente";
  fragmento: string;
  evaluacion: string;
  sugerencia: string;
};

export type DiagnosticoComparativoPrueba2 = {
  tesis_comparativa: EstadoElementoPrueba2;
  equilibrio_obras: EstadoElementoPrueba2;
  respuesta_pregunta: EstadoElementoPrueba2;
  uso_evidencia: EstadoElementoPrueba2;
  comparacion_integrada: EstadoElementoPrueba2;
};

export type AnotacionPrueba2 = {
  fragmento_original: string;
  criterio: "A" | "B1" | "B2" | "C" | "D";
  problema: string;
  sugerencia: string;
  prioridad: number;
};

export type EnsayoBanda5Prueba2 = {
  titulo: string;
  texto: string;
  criterios_mejorados: { criterio: "A" | "B1" | "B2" | "C" | "D"; mejora: string }[];
  que_se_conservo: string[];
  que_se_transformo: string[];
  advertencia_uso: string;
};

export type SugerenciaReescrituraPrueba2 = {
  fragmento_original: string;
  criterio: "A" | "B1" | "B2" | "C" | "D";
  problema: string;
  propuesta_reescritura: string;
  explicacion_pedagogica: string;
  nivel_intervencion: string;
  prioridad: number;
};

import { SET_SPANISH_A_P2 as _SET_P2 } from "./criteria/spanish-a-literature";
import { notaIBFromScale } from "./criteria/types";

/**
 * Convierte puntuación /25 a nota IB 1-7.
 * Deriva de la escala oficial del CriteriaSet de Lit P2.
 */
export function notaIBPrueba2(total: number): number {
  return notaIBFromScale(_SET_P2.ibScale, total);
}

export type EvaluacionPrueba2 = {
  evaluacion_id?: string | null;
  criterio_a: number;
  criterio_b1: number;
  criterio_b2: number;
  criterio_c: number;
  criterio_d: number;
  puntuacion_total: number;
  justificacion_a: string;
  justificacion_b1: string;
  justificacion_b2: string;
  justificacion_c: string;
  justificacion_d: string;
  fortalezas: string;
  areas_mejora: string;
  comentario_global: string;
  diagnostico_comparativo?: DiagnosticoComparativoPrueba2 | null;
  anotaciones?: AnotacionPrueba2[] | null;
  sugerencias_reescritura?: SugerenciaReescrituraPrueba2[] | null;
  ensayo_banda_5?: EnsayoBanda5Prueba2 | null;
  feedback_completo_generado?: boolean;
};
