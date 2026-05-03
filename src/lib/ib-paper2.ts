export const CRITERIOS_PRUEBA2 = [
  { key: "a", etiqueta: "A", nombre: "Conocimiento e interpretación", max: 5 },
  { key: "b1", etiqueta: "B1", nombre: "Análisis formal", max: 5 },
  { key: "b2", etiqueta: "B2", nombre: "Comparación", max: 5 },
  { key: "c", etiqueta: "C", nombre: "Organización", max: 5 },
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

/**
 * Convierte puntuación /25 a nota IB 1-7.
 * Fronteras escaladas proporcionalmente desde la tabla oficial /30.
 * 0-2=1 · 3-6=2 · 7-9=3 · 10-13=4 · 14-17=5 · 18-21=6 · 22-25=7
 */
export function notaIBPrueba2(total: number): number {
  if (total <= 2) return 1;
  if (total <= 6) return 2;
  if (total <= 9) return 3;
  if (total <= 13) return 4;
  if (total <= 17) return 5;
  if (total <= 21) return 6;
  return 7;
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
