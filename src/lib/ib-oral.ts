export type TipoOral = "taught" | "self_taught";

export type TipoObraOral = "original_espanol" | "traducida" | "no_especificado";

export const CRITERIOS_ORAL = [
  { key: "a", etiqueta: "A", nombre: "Conocimiento e interpretación", max: 10 },
  { key: "b", etiqueta: "B", nombre: "Análisis y evaluación", max: 10 },
  { key: "c", etiqueta: "C", nombre: "Foco y organización", max: 10 },
  { key: "d", etiqueta: "D", nombre: "Lenguaje", max: 10 },
] as const;

export type CriterioKeyOral = (typeof CRITERIOS_ORAL)[number]["key"];

export type EstadoElementoOral = {
  estado: "presente" | "parcial" | "ausente";
  fragmento: string;
  evaluacion: string;
  sugerencia: string;
};

export type DiagnosticoAsuntoGlobalOral = {
  definicion: EstadoElementoOral;
  especificidad: EstadoElementoOral;
  uso_como_lente: EstadoElementoOral;
};

export type DiagnosticoEquilibrioOral = {
  extracto_1: EstadoElementoOral;
  obra_1: EstadoElementoOral;
  extracto_2: EstadoElementoOral;
  obra_2: EstadoElementoOral;
};

export type DiagnosticoEstructuraOral = {
  apertura: EstadoElementoOral;
  progresion: EstadoElementoOral;
  transiciones: EstadoElementoOral;
  cierre: EstadoElementoOral;
};

export type PreguntaProfesorOral = {
  pregunta: string;
  proposito: string;
  como_responder: string;
};

export type ZonaDesarrolloSelfTaught = {
  zona: string;
  problema: string;
  sugerencia: string;
};

export type AnotacionOral = {
  fragmento_original: string;
  criterio: "A" | "B" | "C" | "D";
  problema: string;
  sugerencia: string;
  prioridad: number;
};

export type EvaluacionOral = {
  evaluacion_id?: string | null;
  tipo_oral: TipoOral;

  criterio_a: number;
  criterio_b: number;
  criterio_c: number;
  criterio_d: number;
  puntuacion_total: number;

  duracion_estimada_minutos: number;

  justificacion_a: string;
  justificacion_b: string;
  justificacion_c: string;
  justificacion_d: string;

  fortalezas: string;
  areas_mejora: string;
  comentario_global: string;

  diagnostico_asunto_global: DiagnosticoAsuntoGlobalOral;
  diagnostico_equilibrio: DiagnosticoEquilibrioOral;
  diagnostico_estructura: DiagnosticoEstructuraOral;

  preguntas_profesor?: PreguntaProfesorOral[];
  zonas_desarrollo_self_taught?: ZonaDesarrolloSelfTaught[];
  anotaciones?: AnotacionOral[] | null;
};

export function notaIBOral(total: number): number {
  if (total <= 9) return 1;
  if (total <= 15) return 2;
  if (total <= 21) return 3;
  if (total <= 27) return 4;
  if (total <= 32) return 5;
  if (total <= 36) return 6;
  return 7;
}
