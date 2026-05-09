// Source of truth: src/lib/criteria/spanish-a-literature.ts
// Re-exportamos con los nombres legacy para mantener compatibilidad con
// componentes e historial. Lit P1 comparte rúbrica entre Español A e English A.
export {
  CRITERIOS_SPANISH_A_P1_ES as CRITERIOS,
  CRITERIOS_SPANISH_A_P1_EN as CRITERIOS_EN,
  SET_SPANISH_A_P1,
} from "./criteria/spanish-a-literature";

import { SET_SPANISH_A_P1 as _SET_P1 } from "./criteria/spanish-a-literature";
import { notaIBFromScale } from "./criteria/types";

// P1 /20 → IB 1-7. Deriva de la escala oficial del CriteriaSet.
export function notaIB(total: number): number {
  return notaIBFromScale(_SET_P1.ibScale, total);
}

// Nota final compuesta (puntuación 0-100 después de escalar P1+P2+Oral)
// Escala: P1 raw/20 × 35 + P2 raw/30 × 35 + Oral raw/40 × 30
export function notaIBFinal(total: number): number {
  if (total <= 11) return 1;
  if (total <= 26) return 2;
  if (total <= 40) return 3;
  if (total <= 53) return 4;
  if (total <= 68) return 5;
  if (total <= 81) return 6;
  return 7;
}

// Devuelve la puntuación escalada de P1 para el compuesto (contribución /35)
export function escalarP1(raw: number): number {
  return Math.round((raw / 20) * 35);
}

// Devuelve la puntuación escalada de P2 para el compuesto (contribución /35, max 25)
export function escalarP2(raw: number): number {
  return Math.round((raw / 25) * 35);
}

// Devuelve la puntuación escalada de Oral para el compuesto (contribución /30)
export function escalarOral(raw: number): number {
  return Math.round((raw / 40) * 30);
}

export type ElementoEstructural = {
  tipo: string;
  estado: "presente" | "parcial" | "ausente";
  fragmento: string;
  evaluacion: string;
  sugerencia: string;
};

export type SeccionEstructural = {
  elementos: ElementoEstructural[];
  valoracion: string;
};

export type ParrafoAnalisis = {
  numero: number;
  extracto_inicio: string;
  elementos: ElementoEstructural[];
  nivel_analisis: "descripcion" | "analisis" | "interpretacion" | "evaluacion";
  sugerencia_global: string;
};

export type VerboDebil = {
  verbo: string;
  frecuencia: number;
  ejemplo_original: string;
  alternativa_mejorada: string;
};

export type InterferenciaIngles = {
  tipo:
    | "gerundio"
    | "como_que"
    | "calco_sintactico"
    | "estructura_traducida"
    | "orden_palabras"
    | "otro";
  fragmento_original: string;
  explicacion: string;
  correccion: string;
};

export type LenguajeAnalitico = {
  verbos_debiles: VerboDebil[];
  verbos_fuertes_usados: string[];
  adverbios_presentes: string[];
  adverbios_sugeridos: string[];
  interferencias_ingles: InterferenciaIngles[];
  valoracion: string;
};

export type SugerenciaReescritura = {
  fragmento_original: string;
  criterio: "A" | "B" | "C" | "D";
  tipo:
    | "tesis"
    | "interpretacion"
    | "analisis_efecto"
    | "integracion_cita"
    | "estructura_parrafo"
    | "transicion"
    | "conclusion"
    | "precision_lenguaje"
    | "registro"
    | "otro";
  problema: string;
  propuesta_reescritura: string;
  explicacion_pedagogica: string;
  nivel_intervencion: "minima" | "media" | "profunda";
  prioridad: number;
};

export type EnsayoBanda5 = {
  titulo: string;
  texto: string;
  criterios_mejorados: {
    criterio: "A" | "B" | "C" | "D";
    mejora: string;
  }[];
  que_se_conservo: string[];
  que_se_transformo: string[];
  advertencia_uso: string;
};

export type LogroNuevo = {
  logro_id: string;
  nombre: string;
  xp_recompensa: number;
  icono: string;
};

export type GamificacionResultado = {
  xp_ganado: number;
  xp_total: number;
  racha_actual: number;
  logros_nuevos: LogroNuevo[];
};

export type Evaluacion = {
  evaluacion_id?: string | null;
  banda_a: number;
  banda_b: number;
  banda_c: number;
  banda_d: number;
  justificacion_a: string;
  justificacion_b: string;
  justificacion_c: string;
  justificacion_d: string;
  fortalezas: string;
  areas_mejora: string;
  comentario_global: string;
  puntuacion_total: number;
  nota_ib: number;
  introduccion?: SeccionEstructural;
  parrafos?: ParrafoAnalisis[];
  conclusion?: SeccionEstructural;
  lenguaje_analitico?: LenguajeAnalitico;
  sugerencias_reescritura?: SugerenciaReescritura[];
  ensayo_banda_5?: EnsayoBanda5;
  gamificacion?: GamificacionResultado;
  feedback_completo_generado?: boolean;
};
