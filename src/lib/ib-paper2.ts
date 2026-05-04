export const CRITERIOS_PRUEBA2 = [
  { key: "a", etiqueta: "A", nombre: "Comprensión e interpretación", max: 5 },
  { key: "b", etiqueta: "B", nombre: "Análisis y evaluación", max: 5 },
  { key: "c", etiqueta: "C", nombre: "Focalización y organización", max: 5 },
  { key: "d", etiqueta: "D", nombre: "Lenguaje", max: 5 },
] as const;

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
  criterio: "A" | "B" | "C" | "D";
  problema: string;
  sugerencia: string;
  prioridad: number;
};

export type EnsayoBanda5Prueba2 = {
  titulo: string;
  texto: string;
  criterios_mejorados: { criterio: "A" | "B" | "C" | "D"; mejora: string }[];
  que_se_conservo: string[];
  que_se_transformo: string[];
  advertencia_uso: string;
};

export type SugerenciaReescrituraPrueba2 = {
  fragmento_original: string;
  criterio: "A" | "B" | "C" | "D";
  problema: string;
  propuesta_reescritura: string;
  explicacion_pedagogica: string;
  nivel_intervencion: string;
  prioridad: number;
};

/**
 * Convierte puntuación /20 a nota IB 1-7.
 * 0-2=1 · 3-5=2 · 6-8=3 · 9-10=4 · 11-13=5 · 14-15=6 · 16-20=7
 */
export function notaIBPrueba2(total: number): number {
  if (total <= 2) return 1;
  if (total <= 5) return 2;
  if (total <= 8) return 3;
  if (total <= 10) return 4;
  if (total <= 13) return 5;
  if (total <= 15) return 6;
  return 7;
}

export type EvaluacionPrueba2 = {
  evaluacion_id?: string | null;
  criterio_a: number;
  criterio_b: number;
  criterio_c: number;
  criterio_d: number;
  puntuacion_total: number;
  justificacion_a: string;
  justificacion_b: string;
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
