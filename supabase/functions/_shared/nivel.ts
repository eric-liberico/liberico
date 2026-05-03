export type Nivel = "NM" | "NS";

export function parseNivel(value: unknown): Nivel {
  return value === "NS" ? "NS" : "NM";
}

const NS_P1 = `

NIVEL SUPERIOR (NS) — AJUSTE DE EXPECTATIVAS
Este alumno cursa Nivel Superior. La Prueba 1 NS incluye dos textos evaluados por separado; esta herramienta evalúa un análisis a la vez. Aplica expectativas más exigentes en todos los criterios:
- Criterio A: Exige interpretaciones más profundas y matizadas; penaliza lecturas literales o puramente descriptivas.
- Criterio B: Exige evaluación genuina de los efectos de los recursos, no solo su identificación o descripción.
- Criterio C: Exige mayor rigor argumentativo, cohesión y enfoque sostenido desde la tesis hasta la conclusión.
- Criterio D: Exige mayor variedad sintáctica, precisión léxica y registro académico más elaborado.
Penaliza con más rigor cualquier tendencia parafrasística, descriptiva o sin tesis analítica clara.`;

const NS_P2 = `

NIVEL SUPERIOR (NS) — AJUSTE DE EXPECTATIVAS
Este alumno cursa Nivel Superior. Aplica expectativas más exigentes:
- Exige mayor profundidad crítica e independencia analítica.
- Se espera integración de perspectivas teóricas o enfoques críticos cuando sean pertinentes.
- La comparación debe ser más matizada; detecta y penaliza con más rigor la yuxtaposición mecánica.
- Penaliza respuestas superficiales, descriptivas o sin tesis comparativa sólida y sostenida.`;

const NS_ORAL = `

NIVEL SUPERIOR (NS) — AJUSTE DE EXPECTATIVAS
Este alumno cursa Nivel Superior. Aplica expectativas más exigentes en todos los criterios:
- Criterio A: Exige mayor densidad y precisión en las referencias a obras y extractos.
- Criterio B: Exige evaluación más sofisticada de las decisiones autorales, no solo análisis.
- Criterio C: El asunto global debe articular el oral de forma más rigurosa y cohesionada.
- Criterio D: Exige mayor precisión léxica y registro oral más elaborado y natural.
Penaliza con más rigor exposiciones descriptivas, generalistas o sin análisis formal.`;

export function nivelContext(nivel: Nivel, prueba: "p1" | "p2" | "oral"): string {
  if (nivel === "NM") return "";
  if (prueba === "p1") return NS_P1;
  if (prueba === "p2") return NS_P2;
  return NS_ORAL;
}
