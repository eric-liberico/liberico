import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MdProse } from "@/components/MdProse";
import type {
  AnotacionPrueba2,
  DiagnosticoComparativoPrueba2,
  EstadoElementoPrueba2,
  EvaluacionPrueba2,
} from "@/lib/ib-paper2";
import { CRITERIOS_PRUEBA2, notaIBPrueba2 } from "@/lib/ib-paper2";
import { EnsayoAnotadoPrueba2 } from "@/components/EnsayoAnotadoPrueba2";
import { EnsayoBanda5Prueba2 } from "@/components/EnsayoBanda5Prueba2";
import { JuegoEsperaEvaluacion } from "@/components/JuegoEsperaEvaluacion";
import { ToastLogro } from "@/components/gamificacion/ToastLogro";
import type { GamificacionResultado } from "@/lib/ib";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getFunctionErrorMessage } from "@/lib/functionErrors";

function BandaCard({
  etiqueta,
  nombre,
  valor,
  max,
  justificacion,
}: {
  etiqueta: string;
  nombre: string;
  valor: number;
  max: number;
  justificacion: string;
}) {
  return (
    <Card className="p-5 bg-card border-border flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Criterio {etiqueta}
          </div>
          <div className="font-serif text-base text-ink leading-tight mt-0.5">{nombre}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-serif text-4xl font-semibold text-primary leading-none">{valor}</div>
          <div className="text-[10px] text-muted-foreground mt-1">/ {max}</div>
        </div>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < valor ? "bg-primary" : "bg-border"}`}
          />
        ))}
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">{justificacion}</p>
    </Card>
  );
}

const ESTADO_STYLES = {
  presente: "text-emerald-700 bg-emerald-50 border-emerald-200",
  parcial: "text-amber-700 bg-amber-50 border-amber-200",
  ausente: "text-rose-700 bg-rose-50 border-rose-200",
} as const;

const ESTADO_LABELS = {
  presente: "Presente",
  parcial: "Parcial",
  ausente: "Ausente",
} as const;

const DIAGNOSTICO_ETIQUETAS: Record<keyof DiagnosticoComparativoPrueba2, string> = {
  tesis_comparativa: "Tesis comparativa",
  equilibrio_obras: "Equilibrio entre obras",
  respuesta_pregunta: "Respuesta a la pregunta",
  uso_evidencia: "Uso de evidencia",
  comparacion_integrada: "Comparación integrada",
};

function DiagnosticoItem({
  etiqueta,
  elemento,
}: {
  etiqueta: string;
  elemento: EstadoElementoPrueba2;
}) {
  const estadoStyle = ESTADO_STYLES[elemento.estado];
  const estadoLabel = ESTADO_LABELS[elemento.estado];
  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-medium text-ink">{etiqueta}</span>
        <span
          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${estadoStyle}`}
        >
          {estadoLabel}
        </span>
      </div>
      {elemento.fragmento && (
        <p className="text-xs italic text-foreground/60 mb-2 leading-relaxed">
          "{elemento.fragmento}"
        </p>
      )}
      <p className="text-xs text-foreground/75 mb-1 leading-relaxed">{elemento.evaluacion}</p>
      {elemento.sugerencia && (
        <p className="text-xs text-primary/80 leading-relaxed">{elemento.sugerencia}</p>
      )}
    </div>
  );
}

const CRITERIO_CHIP_STYLES: Record<AnotacionPrueba2["criterio"], string> = {
  A: "bg-blue-100 text-blue-700 border-blue-200",
  B1: "bg-purple-100 text-purple-700 border-purple-200",
  B2: "bg-indigo-100 text-indigo-700 border-indigo-200",
  C: "bg-amber-100 text-amber-700 border-amber-200",
  D: "bg-rose-100 text-rose-700 border-rose-200",
};

function AnotacionItem({ anotacion }: { anotacion: AnotacionPrueba2 }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="flex items-start gap-3 mb-2">
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0 ${CRITERIO_CHIP_STYLES[anotacion.criterio]}`}
        >
          {anotacion.criterio}
        </span>
        <p className="text-xs italic text-foreground/60 leading-relaxed">
          "{anotacion.fragmento_original}"
        </p>
      </div>
      <p className="text-sm text-foreground/80 mb-1 leading-relaxed">{anotacion.problema}</p>
      <p className="text-xs text-primary/80 leading-relaxed">{anotacion.sugerencia}</p>
    </div>
  );
}

function tieneFeedbackCompletoP2(ev: EvaluacionPrueba2): boolean {
  return Boolean(
    ev.diagnostico_comparativo && Array.isArray(ev.anotaciones) && ev.anotaciones.length > 0,
  );
}

export function EvaluacionPrueba2Panel({
  ev,
  ensayo,
  autoGenerar = false,
  resultadoInicialBasico = false,
  gamificacion,
  onSugerenciasChange,
  onEnsayoChange,
  onEvaluacionChange,
}: {
  ev: EvaluacionPrueba2;
  ensayo?: string;
  autoGenerar?: boolean;
  resultadoInicialBasico?: boolean;
  gamificacion?: GamificacionResultado;
  onSugerenciasChange?: (s: import("@/lib/ib-paper2").SugerenciaReescrituraPrueba2[]) => void;
  onEnsayoChange?: (e: import("@/lib/ib-paper2").EnsayoBanda5Prueba2) => void;
  onEvaluacionChange?: (ev: EvaluacionPrueba2) => void;
}) {
  const [feedbackDetallado, setFeedbackDetallado] = useState<Partial<EvaluacionPrueba2>>({});
  const [cargandoFeedback, setCargandoFeedback] = useState(false);
  const evConFeedback: EvaluacionPrueba2 = { ...ev, ...feedbackDetallado };
  const evYaTieneFeedbackCompleto = tieneFeedbackCompletoP2(evConFeedback);
  const [feedbackCompletoVisible, setFeedbackCompletoVisible] = useState(
    () => evYaTieneFeedbackCompleto || !resultadoInicialBasico,
  );

  useEffect(() => {
    setFeedbackDetallado({});
  }, [ev.evaluacion_id]);

  useEffect(() => {
    setFeedbackCompletoVisible(evYaTieneFeedbackCompleto || !resultadoInicialBasico);
  }, [ev.evaluacion_id, evYaTieneFeedbackCompleto, resultadoInicialBasico]);

  const valores: Record<string, number> = {
    a: evConFeedback.criterio_a,
    b1: evConFeedback.criterio_b1,
    b2: evConFeedback.criterio_b2,
    c: evConFeedback.criterio_c,
    d: evConFeedback.criterio_d,
  };
  const justificaciones: Record<string, string> = {
    a: evConFeedback.justificacion_a,
    b1: evConFeedback.justificacion_b1,
    b2: evConFeedback.justificacion_b2,
    c: evConFeedback.justificacion_c,
    d: evConFeedback.justificacion_d,
  };

  const diagnosticoEntries = Object.entries(DIAGNOSTICO_ETIQUETAS) as [
    keyof DiagnosticoComparativoPrueba2,
    string,
  ][];

  const anotacionesOrdenadas = [...(evConFeedback.anotaciones ?? [])].sort(
    (a, b) => b.prioridad - a.prioridad,
  );

  const solicitarFeedbackCompleto = async () => {
    if (!evConFeedback.evaluacion_id) {
      toast.error("No se encontró la evaluación para generar el feedback completo.");
      return;
    }

    setCargandoFeedback(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-paper2-feedback", {
        body: { evaluacion_id: evConFeedback.evaluacion_id },
      });

      if (error) {
        throw new Error(
          await getFunctionErrorMessage(error, "No se pudo generar el feedback completo."),
        );
      }
      if (data?.error) throw new Error(data.error as string);

      const respuesta = data as Partial<EvaluacionPrueba2>;
      const siguiente: EvaluacionPrueba2 = {
        ...evConFeedback,
        evaluacion_id: respuesta.evaluacion_id ?? evConFeedback.evaluacion_id,
        diagnostico_comparativo: respuesta.diagnostico_comparativo ?? null,
        anotaciones: Array.isArray(respuesta.anotaciones) ? respuesta.anotaciones : [],
        feedback_completo_generado: true,
      };

      if (!tieneFeedbackCompletoP2(siguiente)) {
        throw new Error("La IA no devolvió feedback completo válido.");
      }

      setFeedbackDetallado(siguiente);
      onEvaluacionChange?.(siguiente);
      setFeedbackCompletoVisible(true);
      toast.success("Feedback completo generado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo generar el feedback completo.");
    } finally {
      setCargandoFeedback(false);
    }
  };

  return (
    <div className="space-y-6">
      {feedbackCompletoVisible && <ToastLogro gamificacion={gamificacion} />}

      {/* Header de puntuación */}
      <Card className="p-6 bg-primary text-primary-foreground border-primary">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] opacity-70">Resultado</div>
            <div className="font-serif text-2xl mt-1">Prueba 2 · Ensayo comparativo</div>
          </div>
          <div className="flex items-end gap-6 sm:flex-col sm:items-end sm:gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">Puntuación</div>
              <div className="font-serif text-5xl font-semibold leading-none mt-1">
                {evConFeedback.puntuacion_total}
                <span className="text-lg opacity-60 font-normal"> / 25</span>
              </div>
            </div>
            <div className="shrink-0">
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">Nota IB est.</div>
              <div className="font-serif text-3xl font-semibold leading-none mt-1">
                {notaIBPrueba2(evConFeedback.puntuacion_total)}
                <span className="text-sm opacity-60 font-normal"> / 7</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tarjetas de criterios */}
      <div className="grid sm:grid-cols-2 gap-4">
        {CRITERIOS_PRUEBA2.map((c) => (
          <BandaCard
            key={c.key}
            etiqueta={c.etiqueta}
            nombre={c.nombre}
            valor={valores[c.key]}
            max={c.max}
            justificacion={justificaciones[c.key]}
          />
        ))}
      </div>

      {/* Fortalezas y áreas de mejora */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 border-l-4" style={{ borderLeftColor: "var(--color-success)" }}>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Fortalezas
          </div>
          <MdProse>{evConFeedback.fortalezas}</MdProse>
        </Card>
        <Card className="p-5 border-l-4" style={{ borderLeftColor: "var(--color-primary)" }}>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Áreas de mejora
          </div>
          <MdProse>{evConFeedback.areas_mejora}</MdProse>
        </Card>
      </div>

      {/* Comentario global */}
      <Card className="p-6 bg-parchment border-border">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Comentario global del examinador
        </div>
        <MdProse className="font-serif text-ink" size="base">
          {evConFeedback.comentario_global}
        </MdProse>
      </Card>

      {!feedbackCompletoVisible && (
        <Card className="p-5 bg-card border-border">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                Feedback completo
              </div>
              <div className="font-serif text-xl text-ink leading-tight">
                Diagnóstico comparativo y ensayo elevado
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                Genera los bloques avanzados solo si quieres revisar anotaciones, diagnóstico y una
                versión elevada de tu ensayo.
              </p>
            </div>
            <Button
              type="button"
              className="shrink-0"
              onClick={() => void solicitarFeedbackCompleto()}
              disabled={cargandoFeedback}
            >
              {cargandoFeedback ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Dame feedback completo
                </>
              )}
            </Button>
          </div>
          {cargandoFeedback && (
            <div className="mt-5">
              <JuegoEsperaEvaluacion modo="prueba2" />
            </div>
          )}
        </Card>
      )}

      {/* Ensayo del alumno: limpio al principio, anotado solo con feedback completo */}
      {ensayo && (
        <EnsayoAnotadoPrueba2
          texto={ensayo}
          anotaciones={feedbackCompletoVisible ? (evConFeedback.anotaciones ?? []) : []}
          evaluacionId={evConFeedback.evaluacion_id}
          sugerenciasIniciales={evConFeedback.sugerencias_reescritura}
          autoGenerar={feedbackCompletoVisible && autoGenerar}
          mostrarAnotaciones={feedbackCompletoVisible}
          onSugerenciasChange={onSugerenciasChange}
        />
      )}

      {/* Diagnóstico comparativo */}
      {feedbackCompletoVisible && evConFeedback.diagnostico_comparativo && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
            Diagnóstico comparativo
          </div>
          <div className="space-y-3">
            {diagnosticoEntries.map(([key, etiqueta]) => (
              <DiagnosticoItem
                key={key}
                etiqueta={etiqueta}
                elemento={evConFeedback.diagnostico_comparativo![key]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Anotaciones localizables */}
      {feedbackCompletoVisible && anotacionesOrdenadas.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
            Anotaciones prioritarias
          </div>
          <div className="space-y-3">
            {anotacionesOrdenadas.map((a, i) => (
              <AnotacionItem key={i} anotacion={a} />
            ))}
          </div>
        </div>
      )}

      {/* Ensayo elevado a banda alta */}
      {feedbackCompletoVisible && (
        <EnsayoBanda5Prueba2
          ensayo={evConFeedback.ensayo_banda_5}
          evaluacionId={evConFeedback.evaluacion_id}
          autoGenerar={feedbackCompletoVisible}
          onEnsayoChange={onEnsayoChange}
        />
      )}
    </div>
  );
}
