import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LANDING as L } from "@/lib/landing-theme";
import { textoLecturaPlano } from "@/lib/textFormatting";
import type { Evaluacion } from "@/lib/ib";
import type { EvaluacionPrueba2 } from "@/lib/ib-paper2";
import type { AnotacionOral, EvaluacionOral } from "@/lib/ib-oral";
import { EvaluacionPanel } from "@/components/EvaluacionPanel";
import { EvaluacionPrueba2Panel } from "@/components/EvaluacionPrueba2Panel";
import { EvaluacionOralPanel } from "@/components/EvaluacionOralPanel";
import type { SessionFocus } from "./types";

// Filas crudas (select * de cada tabla). Acceso laxo para no depender de que
// types.ts tenga todas las columnas de feedback (jsonb) regeneradas.
type Row = Record<string, unknown>;

const sNull = (v: unknown): string => (typeof v === "string" ? v : "");
const n = (v: unknown): number => (typeof v === "number" ? v : 0);

function rowToP1(r: Row): Evaluacion {
  return {
    evaluacion_id: r.id as string,
    banda_a: n(r.banda_a),
    banda_b: n(r.banda_b),
    banda_c: n(r.banda_c),
    banda_d: n(r.banda_d),
    justificacion_a: sNull(r.justificacion_a),
    justificacion_b: sNull(r.justificacion_b),
    justificacion_c: sNull(r.justificacion_c),
    justificacion_d: sNull(r.justificacion_d),
    fortalezas: sNull(r.fortalezas),
    areas_mejora: sNull(r.areas_mejora),
    comentario_global: sNull(r.comentario_global),
    puntuacion_total: n(r.puntuacion_total),
    nota_ib: (r.nota_ib as number | null) ?? 1,
    introduccion: (r.introduccion as Evaluacion["introduccion"]) ?? undefined,
    parrafos: (r.parrafos as Evaluacion["parrafos"]) ?? undefined,
    conclusion: (r.conclusion as Evaluacion["conclusion"]) ?? undefined,
    ensayo_banda_5: (r.ensayo_banda_5 as Evaluacion["ensayo_banda_5"]) ?? undefined,
    lenguaje_analitico: (r.lenguaje_analitico as Evaluacion["lenguaje_analitico"]) ?? undefined,
    sugerencias_reescritura:
      (r.sugerencias_reescritura as Evaluacion["sugerencias_reescritura"]) ?? undefined,
  };
}

function rowToP2(r: Row): EvaluacionPrueba2 {
  return {
    evaluacion_id: r.id as string,
    criterio_a: n(r.criterio_a),
    criterio_b1: n(r.criterio_b1),
    criterio_b2: n(r.criterio_b2),
    criterio_c: n(r.criterio_c),
    criterio_d: n(r.criterio_d),
    puntuacion_total: n(r.puntuacion_total),
    justificacion_a: sNull(r.justificacion_a),
    justificacion_b1: sNull(r.justificacion_b1),
    justificacion_b2: sNull(r.justificacion_b2),
    justificacion_c: sNull(r.justificacion_c),
    justificacion_d: sNull(r.justificacion_d),
    fortalezas: sNull(r.fortalezas),
    areas_mejora: sNull(r.areas_mejora),
    comentario_global: sNull(r.comentario_global),
    diagnostico_comparativo:
      (r.diagnostico_comparativo as EvaluacionPrueba2["diagnostico_comparativo"]) ?? null,
    anotaciones: (r.anotaciones as EvaluacionPrueba2["anotaciones"]) ?? null,
    sugerencias_reescritura:
      (r.sugerencias_reescritura as EvaluacionPrueba2["sugerencias_reescritura"]) ?? null,
    ensayo_banda_5: (r.ensayo_banda_5 as EvaluacionPrueba2["ensayo_banda_5"]) ?? null,
  };
}

function rowToOral(r: Row): EvaluacionOral {
  return {
    evaluacion_id: r.id as string,
    tipo_oral: r.tipo_oral as EvaluacionOral["tipo_oral"],
    criterio_a: n(r.criterio_a),
    criterio_b: n(r.criterio_b),
    criterio_c: n(r.criterio_c),
    criterio_d: n(r.criterio_d),
    puntuacion_total: n(r.puntuacion_total),
    duracion_estimada_minutos: (r.duracion_estimada_minutos as number | null) ?? 0,
    justificacion_a: sNull(r.justificacion_a),
    justificacion_b: sNull(r.justificacion_b),
    justificacion_c: sNull(r.justificacion_c),
    justificacion_d: sNull(r.justificacion_d),
    fortalezas: sNull(r.fortalezas),
    areas_mejora: sNull(r.areas_mejora),
    comentario_global: sNull(r.comentario_global),
    diagnostico_asunto_global:
      (r.diagnostico_asunto_global as EvaluacionOral["diagnostico_asunto_global"]) ?? null,
    diagnostico_equilibrio:
      (r.diagnostico_equilibrio as EvaluacionOral["diagnostico_equilibrio"]) ?? null,
    diagnostico_estructura:
      (r.diagnostico_estructura as EvaluacionOral["diagnostico_estructura"]) ?? null,
    preguntas_profesor: (r.preguntas_profesor as EvaluacionOral["preguntas_profesor"]) ?? [],
    zonas_desarrollo_self_taught:
      (r.zonas_desarrollo_self_taught as EvaluacionOral["zonas_desarrollo_self_taught"]) ?? [],
    anotaciones: (r.anotaciones as AnotacionOral[] | null) ?? null,
    feedback_completo_generado: r.diagnostico_asunto_global != null,
  };
}

export function CorrectionPanel({ paper, id }: { paper: SessionFocus; id: string }) {
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void (async () => {
      const res =
        paper === "p1"
          ? await supabase.from("evaluaciones").select("*").eq("id", id).maybeSingle()
          : paper === "p2"
            ? await supabase.from("evaluaciones_prueba2").select("*").eq("id", id).maybeSingle()
            : await supabase.from("evaluaciones_oral").select("*").eq("id", id).maybeSingle();
      if (res.error) console.error("CorrectionPanel:", res.error);
      if (alive) {
        setRow((res.data as Row | null) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [paper, id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" style={{ color: L.muted }} />
      </div>
    );
  }
  if (!row) {
    return <p className="text-sm" style={{ color: L.muted }}>No se pudo cargar la corrección.</p>;
  }

  if (paper === "p1") {
    return (
      <EvaluacionPanel
        ev={rowToP1(row)}
        textoLiterario={sNull(row.texto_literario)}
        analisisTexto={textoLecturaPlano(sNull(row.analisis_estudiante))}
        soloLectura
      />
    );
  }
  if (paper === "p2") {
    return (
      <EvaluacionPrueba2Panel
        ev={rowToP2(row)}
        ensayo={textoLecturaPlano(sNull(row.ensayo_estudiante))}
        soloLectura
      />
    );
  }
  return (
    <EvaluacionOralPanel
      ev={rowToOral(row)}
      guion={sNull(row.guion_oral) || undefined}
      soloLectura
    />
  );
}
