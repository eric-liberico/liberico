import { useEffect, useState } from "react";
import { CreditGate, CreditCostBadge } from "@/components/CreditGate";
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
import {
  LANDING as L,
  CRIT,
  DEEP,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";

type ModoIdeasP2 = "conservar" | "ideas_nuevas";

// Claro premium — replica del patrón de las rutas migradas (prueba-1/login).
const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;
const ctaGlow = { boxShadow: "0 16px 30px -12px rgba(79,70,229,0.55)" } as const;
const cardStyle = {
  backgroundColor: L.surface,
  borderColor: L.line,
  boxShadow: cardShadow,
  color: L.ink,
} as const;
// Color por criterio (B1/B2 comparten la familia B). Índigo queda reservado a acciones.
const critColor = (etiqueta: string): string =>
  ({ A: CRIT.A, B: CRIT.B, C: CRIT.C, D: CRIT.D })[etiqueta[0]] ?? L.primary;
const critChipStyle = (criterio: string) => {
  const c = critColor(criterio);
  return { color: c, backgroundColor: c + "14", borderColor: c + "33" } as const;
};

function BandaCard({
  etiqueta,
  nombre,
  valor,
  max,
  justificacion,
  color,
  isEN,
}: {
  etiqueta: string;
  nombre: string;
  valor: number;
  max: number;
  justificacion: string;
  color: string;
  isEN: boolean;
}) {
  return (
    <Card className="lib-reveal flex flex-col gap-3 rounded-2xl border p-5" style={cardStyle}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.2em]"
            style={{ ...fontMono, color: L.muted }}
          >
            {isEN ? "Criterion" : "Criterio"} {etiqueta}
          </div>
          <div className="mt-1 text-base leading-tight" style={{ ...headingStyle, color: L.ink }}>
            {nombre}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div
            className="text-4xl font-semibold leading-none tabular-nums"
            style={{ ...fontMono, color }}
          >
            {valor}
          </div>
          <div className="mt-1 text-[10px]" style={{ ...fontMono, color: L.muted }}>
            / {max}
          </div>
        </div>
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{ backgroundColor: i < valor ? color : L.line }}
          />
        ))}
      </div>
      <p className="text-sm leading-relaxed" style={{ color: L.muted }}>
        {justificacion}
      </p>
    </Card>
  );
}

const ESTADO_STYLE: Record<
  EstadoElementoPrueba2["estado"],
  { color: string; bg: string; border: string }
> = {
  presente: { color: L.ok, bg: L.ok + "14", border: L.ok + "55" },
  parcial: { color: L.amberDeep, bg: L.amber + "1F", border: L.amber + "66" },
  ausente: { color: CRIT.D, bg: CRIT.D + "14", border: CRIT.D + "44" },
};

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
  const st = ESTADO_STYLE[elemento.estado];
  const estadoLabel = isEN ? ESTADO_LABELS_EN[elemento.estado] : ESTADO_LABELS_ES[elemento.estado];
  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: L.surface, borderColor: L.line }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-sm font-medium" style={{ color: L.ink }}>
          {etiqueta}
        </span>
        <span
          className="shrink-0 rounded border px-2 py-0.5 text-[10px] uppercase tracking-wider"
          style={{ ...fontMono, color: st.color, backgroundColor: st.bg, borderColor: st.border }}
        >
          {estadoLabel}
        </span>
      </div>
      {elemento.fragmento && (
        <p className="mb-2 text-xs italic leading-relaxed" style={{ color: L.muted }}>
          &ldquo;{elemento.fragmento}&rdquo;
        </p>
      )}
      <p className="mb-1 text-xs leading-relaxed" style={{ color: L.ink }}>
        {elemento.evaluacion}
      </p>
      {elemento.sugerencia && (
        <p className="text-xs leading-relaxed" style={{ color: L.primary }}>
          {elemento.sugerencia}
        </p>
      )}
    </div>
  );
}

function AnotacionItem({ anotacion }: { anotacion: AnotacionPrueba2 }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: L.surface, borderColor: L.line }}
    >
      <div className="mb-2 flex items-start gap-3">
        <span
          className="shrink-0 rounded border px-2 py-0.5 text-[10px] font-semibold"
          style={{ ...fontMono, ...critChipStyle(anotacion.criterio) }}
        >
          {anotacion.criterio}
        </span>
        <p className="text-xs italic leading-relaxed" style={{ color: L.muted }}>
          &ldquo;{anotacion.fragmento_original}&rdquo;
        </p>
      </div>
      <p className="mb-1 text-sm leading-relaxed" style={{ color: L.ink }}>
        {anotacion.problema}
      </p>
      <p className="text-xs leading-relaxed" style={{ color: L.primary }}>
        {anotacion.sugerencia}
      </p>
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
  soloLectura = false,
  gamificacion,
  onSugerenciasChange,
  onEnsayoChange,
  onEvaluacionChange,
}: {
  ev: EvaluacionPrueba2;
  ensayo?: string;
  autoGenerar?: boolean;
  resultadoInicialBasico?: boolean;
  soloLectura?: boolean;
  gamificacion?: GamificacionResultado;
  onSugerenciasChange?: (s: import("@/lib/ib-paper2").SugerenciaReescrituraPrueba2[]) => void;
  onEnsayoChange?: (e: import("@/lib/ib-paper2").EnsayoBanda5Prueba2) => void;
  onEvaluacionChange?: (ev: EvaluacionPrueba2) => void;
}) {
  const { courseKey, refreshRol } = useAuth();
  const isEN = useUiLang() === "en";
  const DIAGNOSTICO_ETIQUETAS = isEN ? DIAGNOSTICO_ETIQUETAS_EN : DIAGNOSTICO_ETIQUETAS_ES;
  const [feedbackDetallado, setFeedbackDetallado] = useState<Partial<EvaluacionPrueba2>>({});
  const [cargandoFeedback, setCargandoFeedback] = useState(false);
  const [showCreditGateFeedbackP2, setShowCreditGateFeedbackP2] = useState(false);
  const [modoIdeas, setModoIdeas] = useState<ModoIdeasP2>("conservar");
  const evConFeedback: EvaluacionPrueba2 = { ...ev, ...feedbackDetallado };
  const evYaTieneFeedbackCompleto = tieneFeedbackCompletoP2(evConFeedback);
  const [feedbackCompletoVisible, setFeedbackCompletoVisible] = useState(
    () => evYaTieneFeedbackCompleto || !resultadoInicialBasico || soloLectura,
  );

  useEffect(() => {
    setFeedbackDetallado({});
  }, [ev.evaluacion_id]);

  useEffect(() => {
    setFeedbackCompletoVisible(evYaTieneFeedbackCompleto || !resultadoInicialBasico || soloLectura);
  }, [ev.evaluacion_id, evYaTieneFeedbackCompleto, resultadoInicialBasico, soloLectura]);

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

      void refreshRol();
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

      {!soloLectura && !tieneFeedbackCompletoP2(evConFeedback) && (
        <Card className="lib-reveal rounded-2xl border p-6" style={cardStyle}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div
                className="mb-2 text-[10px] uppercase tracking-[0.2em]"
                style={{ ...fontMono, color: L.muted }}
              >
                {isEN ? "Full feedback" : "Feedback completo"}
              </div>
              <div className="text-xl leading-tight" style={{ ...headingStyle, color: L.ink }}>
                {isEN
                  ? "Comparative diagnostic and high-band essay"
                  : "Diagnóstico comparativo y ensayo elevado"}
              </div>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: L.muted }}>
                {isEN
                  ? "Generate the advanced blocks only if you want to review annotations, diagnosis and an elevated version of your essay."
                  : "Genera los bloques avanzados solo si quieres revisar anotaciones, diagnóstico y una versión elevada de tu ensayo."}
              </p>
            </div>
            <div className="shrink-0 space-y-3 sm:max-w-[260px]">
              <label
                className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left"
                style={{ borderColor: L.line, backgroundColor: L.bg2 }}
              >
                <span className="min-w-0">
                  <span className="block text-[11px] font-medium" style={{ color: L.ink }}>
                    {isEN ? "Top-band rewrite" : "Reescritura de banda alta"}
                  </span>
                  <span className="block text-[10px] leading-snug" style={{ color: L.muted }}>
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
              <CreditGate
                coste={2}
                concepto={
                  isEN
                    ? "Literature Paper 2 — full feedback"
                    : "Literature Prueba 2 — feedback completo"
                }
                open={showCreditGateFeedbackP2}
                onConfirm={() => {
                  setShowCreditGateFeedbackP2(false);
                  void solicitarFeedbackCompleto();
                }}
                onCancel={() => setShowCreditGateFeedbackP2(false)}
              />
              <div className="flex items-center gap-2">
                {!cargandoFeedback && <CreditCostBadge coste={2} />}
                <Button
                  type="button"
                  className="lib-press flex-1 rounded-2xl"
                  style={ctaGlow}
                  onClick={() => setShowCreditGateFeedbackP2(true)}
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
          </div>
          {cargandoFeedback && (
            <div className="mt-5">
              <JuegoEsperaEvaluacion modo="prueba2" />
            </div>
          )}
        </Card>
      )}

      {/* Header de puntuación */}
      <Card
        className="lib-reveal rounded-2xl border p-6"
        style={{
          backgroundColor: DEEP.bg,
          borderColor: DEEP.border,
          boxShadow: cardShadow,
          color: DEEP.text,
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.22em]"
              style={{ ...fontMono, color: DEEP.muted }}
            >
              {isEN ? "Result" : "Resultado"}
            </div>
            <div className="mt-1 text-2xl" style={{ ...headingStyle, color: DEEP.text }}>
              {isEN ? "Paper 2 · Comparative essay" : "Prueba 2 · Ensayo comparativo"}
            </div>
          </div>
          <div className="flex items-end gap-8">
            <div>
              <div
                className="text-[10px] uppercase tracking-[0.18em]"
                style={{ ...fontMono, color: DEEP.muted }}
              >
                {isEN ? "Score" : "Puntuación"}
              </div>
              <div
                className="mt-1 text-5xl font-semibold leading-none tabular-nums"
                style={{ ...fontMono, color: DEEP.text }}
              >
                {evConFeedback.puntuacion_total}
                <span className="text-lg font-normal" style={{ color: DEEP.muted }}>
                  {" "}
                  / 25
                </span>
              </div>
            </div>
            <div>
              <div
                className="text-[10px] uppercase tracking-[0.18em]"
                style={{ ...fontMono, color: DEEP.muted }}
              >
                {isEN ? "Est. grade" : "Nota est"}
              </div>
              <div className="mt-1">
                <span
                  className="inline-block rounded-lg px-3 py-1 text-4xl font-semibold leading-none tabular-nums"
                  style={{ ...fontMono, backgroundColor: L.ok, color: "#fff" }}
                >
                  {notaIBPrueba2(evConFeedback.puntuacion_total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tarjetas de criterios */}
      <div className="grid gap-4 sm:grid-cols-2">
        {(isEN ? CRITERIOS_PRUEBA2_EN : CRITERIOS_PRUEBA2).map((c) => (
          <BandaCard
            key={c.key}
            etiqueta={c.etiqueta}
            nombre={c.nombre}
            valor={valores[c.key]}
            max={c.max}
            justificacion={justificaciones[c.key]}
            color={critColor(c.etiqueta)}
            isEN={isEN}
          />
        ))}
      </div>

      {/* Fortalezas y áreas de mejora */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card
          className="lib-reveal rounded-2xl border border-l-4 p-5"
          style={{ ...cardStyle, borderLeftColor: L.ok }}
        >
          <div
            className="mb-2 text-[10px] uppercase tracking-[0.2em]"
            style={{ ...fontMono, color: L.muted }}
          >
            {isEN ? "Strengths" : "Fortalezas"}
          </div>
          <MdProse>{evConFeedback.fortalezas}</MdProse>
        </Card>
        <Card
          className="lib-reveal rounded-2xl border border-l-4 p-5"
          style={{ ...cardStyle, borderLeftColor: L.primary }}
        >
          <div
            className="mb-2 text-[10px] uppercase tracking-[0.2em]"
            style={{ ...fontMono, color: L.muted }}
          >
            {isEN ? "Areas for improvement" : "Áreas de mejora"}
          </div>
          <MdProse>{evConFeedback.areas_mejora}</MdProse>
        </Card>
      </div>

      {/* Comentario global */}
      <Card className="lib-reveal rounded-2xl border p-6" style={cardStyle}>
        <div
          className="mb-3 text-[10px] uppercase tracking-[0.2em]"
          style={{ ...fontMono, color: L.muted }}
        >
          {isEN ? "Examiner's overall comment" : "Comentario global del examinador"}
        </div>
        <MdProse size="base">{evConFeedback.comentario_global}</MdProse>
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
          <div
            className="mb-3 text-[10px] uppercase tracking-[0.22em]"
            style={{ ...fontMono, color: L.muted }}
          >
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
          <div
            className="mb-3 text-[10px] uppercase tracking-[0.22em]"
            style={{ ...fontMono, color: L.muted }}
          >
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
