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

export type Evaluacion = {
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
};
