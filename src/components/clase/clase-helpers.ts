import type { SessionFocus } from "./types";

export const FOCUS_ORDER: SessionFocus[] = ["p1", "p2", "oral"];

export function orderByFocus(focus: SessionFocus | null): SessionFocus[] {
  if (!focus) return FOCUS_ORDER;
  return [focus, ...FOCUS_ORDER.filter((f) => f !== focus)];
}

export function focusLabel(focus: SessionFocus | null, isEN: boolean): string {
  switch (focus) {
    case "p1":
      return isEN ? "Paper 1" : "Prueba 1";
    case "p2":
      return isEN ? "Paper 2" : "Prueba 2";
    case "oral":
      return isEN ? "Individual Oral" : "Oral Individual";
    default:
      return isEN ? "Not specified" : "Sin especificar";
  }
}

export type CritAvg = { key: string; label: string; value: number | null; max: number };

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10;
}

export function p1Averages(
  evals: { banda_a: number; banda_b: number; banda_c: number; banda_d: number; nota_ib: number | null }[],
): { crits: CritAvg[]; nota: number | null } {
  return {
    crits: [
      { key: "a", label: "A", value: mean(evals.map((e) => e.banda_a)), max: 5 },
      { key: "b", label: "B", value: mean(evals.map((e) => e.banda_b)), max: 5 },
      { key: "c", label: "C", value: mean(evals.map((e) => e.banda_c)), max: 5 },
      { key: "d", label: "D", value: mean(evals.map((e) => e.banda_d)), max: 5 },
    ],
    nota: mean(evals.filter((e) => e.nota_ib != null).map((e) => e.nota_ib as number)),
  };
}

export function p2Averages(
  evals: { criterio_a: number; criterio_b1: number; criterio_b2: number; criterio_c: number; criterio_d: number }[],
): { crits: CritAvg[] } {
  return {
    crits: [
      { key: "a", label: "A", value: mean(evals.map((e) => e.criterio_a)), max: 5 },
      { key: "b1", label: "B1", value: mean(evals.map((e) => e.criterio_b1)), max: 5 },
      { key: "b2", label: "B2", value: mean(evals.map((e) => e.criterio_b2)), max: 5 },
      { key: "c", label: "C", value: mean(evals.map((e) => e.criterio_c)), max: 5 },
      { key: "d", label: "D", value: mean(evals.map((e) => e.criterio_d)), max: 5 },
    ],
  };
}

export function oralAverages(
  evals: { criterio_a: number; criterio_b: number; criterio_c: number; criterio_d: number }[],
): { crits: CritAvg[] } {
  return {
    crits: [
      { key: "a", label: "A", value: mean(evals.map((e) => e.criterio_a)), max: 10 },
      { key: "b", label: "B", value: mean(evals.map((e) => e.criterio_b)), max: 10 },
      { key: "c", label: "C", value: mean(evals.map((e) => e.criterio_c)), max: 10 },
      { key: "d", label: "D", value: mean(evals.map((e) => e.criterio_d)), max: 10 },
    ],
  };
}

// Devuelve la `key` del criterio con menor ratio value/max (el más flojo).
export function weakestCrit(crits: CritAvg[]): string | null {
  const scored = crits.filter((c) => c.value != null);
  if (scored.length === 0) return null;
  let worst = scored[0];
  for (const c of scored) {
    if (c.value! / c.max < worst.value! / worst.max) worst = c;
  }
  return worst.key;
}
