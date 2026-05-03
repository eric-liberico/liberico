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

  diagnostico_asunto_global?: DiagnosticoAsuntoGlobalOral | null;
  diagnostico_equilibrio?: DiagnosticoEquilibrioOral | null;
  diagnostico_estructura?: DiagnosticoEstructuraOral | null;

  preguntas_profesor?: PreguntaProfesorOral[];
  zonas_desarrollo_self_taught?: ZonaDesarrolloSelfTaught[];
  anotaciones?: AnotacionOral[] | null;

  feedback_completo_generado?: boolean;
};

// ── Revisión de apuntes ───────────────────────────────────────────────────

export type NivelPreparacionApuntes = "alto" | "medio" | "bajo";
export type EstadoFormato = "bien" | "demasiado_extenso" | "demasiado_vago" | "parece_guion";
export type EstadoCobertura = "bien" | "parcial" | "ausente";
export type TipoRiesgo =
  | "memorizacion"
  | "generalidad"
  | "falta_evidencia"
  | "desequilibrio"
  | "falta_analisis_formal"
  | "otro";

export type CoberturaApuntesItem = {
  id: "extracto_1" | "obra_1" | "extracto_2" | "obra_2";
  titulo: string;
  estado: EstadoCobertura;
  comentario: string;
  mejora: string;
};

export type RiesgoApuntes = {
  tipo: TipoRiesgo;
  problema: string;
  solucion: string;
};

export type MejoraBullet = {
  fragmento_original: string;
  problema: string;
  propuesta_bullet_mejorado: string;
  criterio_relacionado: "A" | "B" | "C" | "D";
};

export type PreguntaProbableApuntes = {
  pregunta: string;
  por_que_te_la_harian: string;
  como_prepararla: string;
};

export type RevisionApuntesOral = {
  revision_id?: string;
  guardado?: boolean;
  evaluacion_global: {
    resumen: string;
    nivel_preparacion: NivelPreparacionApuntes;
  };
  cumple_formato: {
    estado: EstadoFormato;
    comentario: string;
  };
  diagnostico_asunto_global: {
    estado: "presente" | "parcial" | "ausente";
    comentario: string;
    mejora: string;
  };
  cobertura: CoberturaApuntesItem[];
  equilibrio: { comentario: string; mejora: string };
  analisis_formal: { comentario: string; mejora: string };
  riesgos: RiesgoApuntes[];
  mejoras_bullet_a_bullet: MejoraBullet[];
  preguntas_probables: PreguntaProbableApuntes[];
  prioridades: string[];
};

// /40 → IB 1-7
export function notaIBOral(total: number): number {
  if (total <= 6) return 1;
  if (total <= 12) return 2;
  if (total <= 18) return 3;
  if (total <= 23) return 4;
  if (total <= 28) return 5;
  if (total <= 33) return 6;
  return 7;
}
