export const CRITERIOS = [
  { key: "a", letra: "A", nombre: "Comprensión e interpretación" },
  { key: "b", letra: "B", nombre: "Análisis y evaluación" },
  { key: "c", letra: "C", nombre: "Focalización y desarrollo" },
  { key: "d", letra: "D", nombre: "Lenguaje" },
] as const;

export function notaIB(total: number): number {
  if (total <= 3) return 1;
  if (total <= 6) return 2;
  if (total <= 9) return 3;
  if (total <= 12) return 4;
  if (total <= 15) return 5;
  if (total <= 18) return 6;
  return 7;
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
};
