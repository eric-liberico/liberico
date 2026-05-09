import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { Loader2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MdProse } from "@/components/MdProse";
import type {
  AnotacionPrueba2,
  DiagnosticoComparativoPrueba2,
  EstadoElementoPrueba2,
  EvaluacionPrueba2,
} from "@/lib/ib-paper2";
import { CRITERIOS_PRUEBA2, CRITERIOS_PRUEBA2_EN, notaIBPrueba2 } from "@/lib/ib-paper2";
import { EnsayoAnotadoPrueba2 } from "@/components/EnsayoAnotadoPrueba2";
import { EnsayoBanda5Prueba2 } from "@/components/EnsayoBanda5Prueba2";
import { JuegoEsperaEvaluacion } from "@/components/JuegoEsperaEvaluacion";
import { ToastLogro } from "@/components/gamificacion/ToastLogro";
import type { GamificacionResultado } from "@/lib/ib";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getFunctionErrorMessage } from "@/lib/functionErrors";

type ModoIdeasP2 = "conservar" | "ideas_nuevas";

function BandaCard({
  etiqueta,
  nombre,
  valor,
  max,
  justificacion,
  isEN,
}: {
  etiqueta: string;
  nombre: string;
  valor: number;
  max: number;
  justificacion: string;
  isEN: boolean;
}) {
  return (
    <Card className="p-5 bg-card border-border flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {isEN ? "Criterion" : "Criterio"} {etiqueta}
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

const ESTADO_LABELS_ES = {
  presente: "Presente",
  parcial: "Parcial",
  ausente: "Ausente",
} as const;

const ESTADO_LABELS_EN = {
  presente: "Present",
  parcial: "Partial",
  ausente: "Absent",
} as const;

const DIAGNOSTICO_ETIQUETAS_ES: Record<keyof DiagnosticoComparativoPrueba2, string> = {
  tesis_comparativa: "Tesis comparativa",
  equilibrio_obras: "Equilibrio entre obras",
  respuesta_pregunta: "Respuesta a la pregunta",
  uso_evidencia: "Uso de evidencia",
  comparacion_integrada: "Comparación integrada",
};
const DIAGNOSTICO_ETIQUETAS_EN: Record<keyof DiagnosticoComparativoPrueba2, string> = {
  tesis_comparativa: "Comparative thesis",
  equilibrio_obras: "Balance of works",
  respuesta_pregunta: "Response to question",
  uso_evidencia: "Use of evidence",
  comparacion_integrada: "Integrated comparison",
};

function DiagnosticoItem({
  etiqueta,
  elemento,
  isEN,
}: {
  etiqueta: string;
  elemento: EstadoElementoPrueba2;
  isEN: boolean;
}) {
  const estadoStyle = ESTADO_STYLES[elemento.estado];
  const estadoLabel = isEN ? ESTADO_LABELS_EN[elemento.estado] : ESTADO_LABELS_ES[elemento.estado];
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
    ev.diagnostico_comparativo &&
    Array.isArray(ev.anotaciones) &&
    ev.anotaciones.length > 0 &&
    Array.isArray(ev.sugerencias_reescritura) &&
    ev.sugerencias_reescritura.length > 0 &&
    (ev.ensayo_banda_5 as { texto?: string } | undefined)?.texto?.trim(),
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
  const { courseKey } = useAuth();
  const isEN = useUiLang() === "en";
  const DIAGNOSTICO_ETIQUETAS = isEN ? DIAGNOSTICO_ETIQUETAS_EN : DIAGNOSTICO_ETIQUETAS_ES;
  const [feedbackDetallado, setFeedbackDetallado] = useState<Partial<EvaluacionPrueba2>>({});
  const [cargandoFeedback, setCargandoFeedback] = useState(false);
  const [modoIdeas, setModoIdeas] = useState<ModoIdeasP2>("conservar");
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
      toast.error(
        isEN
          ? "Assessment not found to generate full feedback."
          : "No se encontró la evaluación para generar el feedback completo.",
      );
      return;
    }

    const evaluacionId = evConFeedback.evaluacion_id;
    setCargandoFeedback(true);
    try {
      const { data: data1, error: error1 } = await supabase.functions.invoke(
        "generate-paper2-extras",
        { body: { evaluacion_id: evaluacionId, modo_ideas: modoIdeas } },
      );

      if (error1) {
        throw new Error(
          await getFunctionErrorMessage(
            error1,
            isEN ? "Could not generate full feedback." : "No se pudo generar el feedback completo.",
          ),
        );
      }
      if (data1?.error) throw new Error(data1.error as string);

      const respuesta1 = data1 as Partial<EvaluacionPrueba2>;
      const parcial: EvaluacionPrueba2 = {
        ...evConFeedback,
        evaluacion_id: respuesta1.evaluacion_id ?? evaluacionId,
        diagnostico_comparativo: respuesta1.diagnostico_comparativo ?? null,
        anotaciones: Array.isArray(respuesta1.anotaciones) ? respuesta1.anotaciones : [],
        sugerencias_reescritura: Array.isArray(respuesta1.sugerencias_reescritura)
          ? respuesta1.sugerencias_reescritura
          : [],
        feedback_completo_generado: true,
      };

      setFeedbackDetallado(parcial);
      onEvaluacionChange?.(parcial);
      setFeedbackCompletoVisible(true);

      const { data: data2, error: error2 } = await supabase.functions.invoke(
        "generate-band5-essay-p2",
        { body: { evaluacion_id: evaluacionId, modo_ideas: modoIdeas } },
      );

      if (error2) {
        throw new Error(
          await getFunctionErrorMessage(
            error2,
            isEN ? "Could not generate the model essay." : "No se pudo generar el ensayo modelo.",
          ),
        );
      }
      if (data2?.error) throw new Error(data2.error as string);

      if (data2?.ensayo_banda_5) {
        const completo: EvaluacionPrueba2 = { ...parcial, ensayo_banda_5: data2.ensayo_banda_5 };
        setFeedbackDetallado(completo);
        onEvaluacionChange?.(completo);
      }

      toast.success(isEN ? "Full feedback generated." : "Feedback completo generado.");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : isEN
            ? "Could not generate full feedback."
            : "No se pudo generar el feedback completo.",
      );
    } finally {
      setCargandoFeedback(false);
    }
  };

  return (
    <div className="space-y-6">
      {feedbackCompletoVisible && <ToastLogro gamificacion={gamificacion} />}

      {!tieneFeedbackCompletoP2(evConFeedback) && (
        <Card className="p-5 bg-card border-border">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                {isEN ? "Full feedback" : "Feedback completo"}
              </div>
              <div className="font-serif text-xl text-ink leading-tight">
                {isEN
                  ? "Comparative diagnostic and high-band essay"
                  : "Diagnóstico comparativo y ensayo elevado"}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                {isEN
                  ? "Generate the advanced blocks only if you want to review annotations, diagnosis and an elevated version of your essay."
                  : "Genera los bloques avanzados solo si quieres revisar anotaciones, diagnóstico y una versión elevada de tu ensayo."}
              </p>
            </div>
            <div className="shrink-0 space-y-3 sm:max-w-[260px]">
              <label className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-left">
                <span className="min-w-0">
                  <span className="block text-[11px] font-medium text-foreground">
                    {isEN ? "Top-band rewrite" : "Reescritura de banda alta"}
                  </span>
                  <span className="block text-[10px] leading-snug text-muted-foreground">
                    {modoIdeas === "ideas_nuevas"
                      ? isEN
                        ? "With new ideas"
                        : "Con ideas nuevas"
                      : isEN
                        ? "Keep my voice"
                        : "Mantener mi voz"}
                  </span>
                </span>
                <Switch
                  checked={modoIdeas === "ideas_nuevas"}
                  onCheckedChange={(checked) =>
                    setModoIdeas(checked ? "ideas_nuevas" : "conservar")
                  }
                  disabled={cargandoFeedback}
                  aria-label={
                    isEN
                      ? "Toggle new ideas in top-band rewrite"
                      : "Activar ideas nuevas en la reescritura de banda alta"
                  }
                />
              </label>
              <Button
                type="button"
                className="w-full"
                onClick={() => void solicitarFeedbackCompleto()}
                disabled={cargandoFeedback}
              >
                {cargandoFeedback ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isEN ? "Generating…" : "Generando…"}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {isEN ? "Give me full feedback" : "Dame feedback completo"}
                  </>
                )}
              </Button>
            </div>
          </div>
          {cargandoFeedback && (
            <div className="mt-5">
              <JuegoEsperaEvaluacion modo="prueba2" />
            </div>
          )}
        </Card>
      )}

      {/* Header de puntuación */}
      <Card className="p-6 bg-primary text-primary-foreground border-primary">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] opacity-70">
              {isEN ? "Result" : "Resultado"}
            </div>
            <div className="font-serif text-2xl mt-1">
              {isEN ? "Paper 2 · Comparative essay" : "Prueba 2 · Ensayo comparativo"}
            </div>
          </div>
          <div className="flex items-end gap-8">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">
                {isEN ? "Score" : "Puntuación"}
              </div>
              <div className="font-serif text-5xl font-semibold leading-none mt-1">
                {evConFeedback.puntuacion_total}
                <span className="text-lg opacity-60 font-normal"> / 25</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">
                {isEN ? "Est. grade" : "Nota est"}
              </div>
              <div className="font-serif text-5xl font-semibold leading-none mt-1 text-success-foreground">
                <span className="px-3 py-1 rounded-md bg-success">
                  {notaIBPrueba2(evConFeedback.puntuacion_total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tarjetas de criterios */}
      <div className="grid sm:grid-cols-2 gap-4">
        {(isEN ? CRITERIOS_PRUEBA2_EN : CRITERIOS_PRUEBA2).map((c) => (
          <BandaCard
            key={c.key}
            etiqueta={c.etiqueta}
            nombre={c.nombre}
            valor={valores[c.key]}
            max={c.max}
            justificacion={justificaciones[c.key]}
            isEN={isEN}
          />
        ))}
      </div>

      {/* Fortalezas y áreas de mejora */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 border-l-4" style={{ borderLeftColor: "var(--color-success)" }}>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
            {isEN ? "Strengths" : "Fortalezas"}
          </div>
          <MdProse>{evConFeedback.fortalezas}</MdProse>
        </Card>
        <Card className="p-5 border-l-4" style={{ borderLeftColor: "var(--color-primary)" }}>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
            {isEN ? "Areas for improvement" : "Áreas de mejora"}
          </div>
          <MdProse>{evConFeedback.areas_mejora}</MdProse>
        </Card>
      </div>

      {/* Comentario global */}
      <Card className="p-6 bg-parchment border-border">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
          {isEN ? "Examiner's overall comment" : "Comentario global del examinador"}
        </div>
        <MdProse className="font-serif text-ink" size="base">
          {evConFeedback.comentario_global}
        </MdProse>
      </Card>

      {/* Ensayo del alumno: limpio al principio, anotado solo con feedback completo */}
      {ensayo && (
        <EnsayoAnotadoPrueba2
          texto={ensayo}
          anotaciones={feedbackCompletoVisible ? (evConFeedback.anotaciones ?? []) : []}
          evaluacionId={evConFeedback.evaluacion_id}
          sugerenciasIniciales={evConFeedback.sugerencias_reescritura}
          mostrarAnotaciones={feedbackCompletoVisible}
          onSugerenciasChange={onSugerenciasChange}
        />
      )}

      {/* Diagnóstico comparativo */}
      {feedbackCompletoVisible && evConFeedback.diagnostico_comparativo && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
            {isEN ? "Comparative diagnostic" : "Diagnóstico comparativo"}
          </div>
          <div className="space-y-3">
            {diagnosticoEntries.map(([key, etiqueta]) => (
              <DiagnosticoItem
                key={key}
                etiqueta={etiqueta}
                elemento={evConFeedback.diagnostico_comparativo![key]}
                isEN={isEN}
              />
            ))}
          </div>
        </div>
      )}

      {/* Anotaciones localizables */}
      {feedbackCompletoVisible && anotacionesOrdenadas.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
            {isEN ? "Priority annotations" : "Anotaciones prioritarias"}
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
          onEnsayoChange={onEnsayoChange}
          cargando={cargandoFeedback}
          modoIdeas={modoIdeas}
          onModoIdeasChange={setModoIdeas}
        />
      )}
    </div>
  );
}
