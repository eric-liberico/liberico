import { useEffect, useState } from "react";
import { CreditGate, CreditCostBadge } from "@/components/CreditGate";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import type { Evaluacion } from "@/lib/ib";
import { CRITERIOS, CRITERIOS_EN } from "@/lib/ib";
import { MdProse } from "@/components/MdProse";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FeedbackEstructural } from "@/components/FeedbackEstructural";
import { AnalisisAnotado } from "@/components/AnalisisAnotado";
import { EnsayoBanda5 } from "@/components/EnsayoBanda5";
import { JuegoEsperaEvaluacion } from "@/components/JuegoEsperaEvaluacion";
import { SiguientePasoCard } from "@/components/SiguientePasoCard";
import { ToastLogro } from "@/components/gamificacion/ToastLogro";
import { TextoLectura } from "@/components/TextoLectura";
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

type ModoIdeasBanda5 = "conservar" | "ideas_nuevas";

// Claro premium — replica del patrón de las rutas migradas (prueba-1/login).
const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;
const ctaGlow = { boxShadow: "0 16px 30px -12px rgba(79,70,229,0.55)" } as const;
const cardStyle = {
  backgroundColor: L.surface,
  borderColor: L.line,
  boxShadow: cardShadow,
  color: L.ink,
} as const;
const critColor: Record<string, string> = { A: CRIT.A, B: CRIT.B, C: CRIT.C, D: CRIT.D };

function TextoLiterarioCard({ texto }: { texto: string }) {
  const isEN = useUiLang() === "en";
  const [expandido, setExpandido] = useState(false);
  return (
    <Card className="lib-reveal rounded-2xl border p-6" style={cardStyle}>
      <div
        className="mb-3 text-[10px] uppercase tracking-[0.2em]"
        style={{ ...fontMono, color: L.muted }}
      >
        {isEN ? "Literary extract" : "Texto literario"}
      </div>
      <div className={expandido ? undefined : "relative max-h-32 overflow-hidden"}>
        <TextoLectura texto={texto} className="font-serif text-[15px] leading-relaxed" />
        {!expandido && (
          <div
            className="absolute bottom-0 left-0 right-0 h-12"
            style={{ background: `linear-gradient(to top, ${L.surface}, transparent)` }}
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="mt-3 flex items-center gap-1 text-xs hover:underline"
        style={{ color: L.primary }}
      >
        {expandido ? (
          <>
            <ChevronUp className="h-3.5 w-3.5" />
            {isEN ? "Hide text" : "Ocultar texto"}
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5" />
            {isEN ? "View full text" : "Ver texto completo"}
          </>
        )}
      </button>
    </Card>
  );
}

function BandaCard({
  letra,
  nombre,
  banda,
  justificacion,
  color,
  isEN,
}: {
  letra: string;
  nombre: string;
  banda: number;
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
            {isEN ? "Criterion" : "Criterio"} {letra}
          </div>
          <div className="mt-1 text-lg leading-tight" style={{ ...headingStyle, color: L.ink }}>
            {nombre}
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-4xl font-semibold leading-none tabular-nums"
            style={{ ...fontMono, color }}
          >
            {banda}
          </div>
          <div className="mt-1 text-[10px]" style={{ ...fontMono, color: L.muted }}>
            / 5
          </div>
        </div>
      </div>

      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className="h-1.5 flex-1 rounded-full"
            style={{ backgroundColor: n <= banda ? color : L.line }}
          />
        ))}
      </div>

      <p className="text-sm leading-relaxed" style={{ color: L.muted }}>
        {justificacion}
      </p>
    </Card>
  );
}

export function EvaluacionPanel({
  ev,
  textoLiterario,
  analisisTexto,
  resultadoInicialBasico = false,
  onEvaluacionChange,
}: {
  ev: Evaluacion;
  textoLiterario?: string;
  analisisTexto?: string;
  resultadoInicialBasico?: boolean;
  autoGenerarReescrituras?: boolean;
  onEvaluacionChange?: (ev: Evaluacion) => void;
}) {
  const { courseKey, refreshRol } = useAuth();
  const isEN = useUiLang() === "en";
  // El feedback completo incluye análisis estructural, reescrituras y ensayo de banda alta.
  const evYaTieneFeedbackCompleto = Boolean(
    ev.introduccion &&
    ev.parrafos &&
    ev.conclusion &&
    ev.lenguaje_analitico &&
    Array.isArray(ev.sugerencias_reescritura) &&
    ev.sugerencias_reescritura.length > 0 &&
    (ev.ensayo_banda_5 as { texto?: string } | undefined)?.texto?.trim(),
  );

  const [feedbackCompletoVisible, setFeedbackCompletoVisible] = useState(
    () => evYaTieneFeedbackCompleto || !resultadoInicialBasico,
  );
  const [feedbackDetallado, setFeedbackDetallado] = useState<Partial<Evaluacion> | null>(null);
  const [cargandoFeedback, setCargandoFeedback] = useState(false);
  const [showCreditGateFeedback, setShowCreditGateFeedback] = useState(false);
  const [modoIdeasBanda5, setModoIdeasBanda5] = useState<ModoIdeasBanda5>("conservar");

  useEffect(() => {
    setFeedbackCompletoVisible(evYaTieneFeedbackCompleto || !resultadoInicialBasico);
    setFeedbackDetallado(null);
    setCargandoFeedback(false);
  }, [ev.evaluacion_id, resultadoInicialBasico, evYaTieneFeedbackCompleto]);

  const evConFeedback = feedbackDetallado ? ({ ...ev, ...feedbackDetallado } as Evaluacion) : ev;
  const tieneFeedbackCompleto = Boolean(
    evConFeedback.introduccion &&
    evConFeedback.parrafos &&
    evConFeedback.conclusion &&
    evConFeedback.lenguaje_analitico &&
    Array.isArray(evConFeedback.sugerencias_reescritura) &&
    evConFeedback.sugerencias_reescritura.length > 0 &&
    (evConFeedback.ensayo_banda_5 as { texto?: string } | undefined)?.texto?.trim(),
  );

  const bandas: Record<string, number> = {
    a: evConFeedback.banda_a,
    b: evConFeedback.banda_b,
    c: evConFeedback.banda_c,
    d: evConFeedback.banda_d,
  };
  const justis: Record<string, string> = {
    a: evConFeedback.justificacion_a,
    b: evConFeedback.justificacion_b,
    c: evConFeedback.justificacion_c,
    d: evConFeedback.justificacion_d,
  };

  const mostrarFeedbackCompleto = async () => {
    if (cargandoFeedback) return;

    if (!evConFeedback.evaluacion_id || tieneFeedbackCompleto) {
      setFeedbackCompletoVisible(true);
      return;
    }

    const evaluacionId = evConFeedback.evaluacion_id;
    setCargandoFeedback(true);
    try {
      // Llamada 1: análisis estructural + micro-reescrituras (~100s con Opus)
      const { data: data1, error: error1 } = await supabase.functions.invoke(
        "generate-analysis-extras",
        { body: { evaluacion_id: evaluacionId, modo_ideas: modoIdeasBanda5 } },
      );

      if (error1) {
        throw new Error(
          await getFunctionErrorMessage(
            error1,
            isEN ? "Could not generate full feedback." : "No se pudo generar el feedback.",
          ),
        );
      }
      if (data1?.error) throw new Error(data1.error);
      if (!data1?.introduccion) {
        throw new Error(
          isEN
            ? "The AI did not return the structural analysis."
            : "La IA no devolvió el análisis estructural.",
        );
      }

      const parcial = data1 as Partial<Evaluacion>;
      setFeedbackDetallado(parcial);
      onEvaluacionChange?.({ ...evConFeedback, ...parcial });
      setFeedbackCompletoVisible(true);

      // Llamada 2: ensayo de banda alta (~40s con Opus)
      const { data: data2, error: error2 } = await supabase.functions.invoke(
        "generate-band5-essay",
        { body: { evaluacion_id: evaluacionId, modo_ideas: modoIdeasBanda5 } },
      );

      if (error2) {
        throw new Error(
          await getFunctionErrorMessage(
            error2,
            isEN ? "Could not generate the model essay." : "No se pudo generar el ensayo modelo.",
          ),
        );
      }
      if (data2?.error) throw new Error(data2.error);

      if (data2?.ensayo_banda_5) {
        const completo = { ...parcial, ensayo_banda_5: data2.ensayo_banda_5 };
        setFeedbackDetallado(completo);
        onEvaluacionChange?.({ ...evConFeedback, ...completo });
      }

      void refreshRol();
      toast.success(isEN ? "Full feedback generated." : "Feedback completo generado.");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : isEN
            ? "Could not generate full feedback."
            : "No se pudo generar el feedback.",
      );
    } finally {
      setCargandoFeedback(false);
    }
  };

  return (
    <div className="space-y-6">
      {feedbackCompletoVisible && <ToastLogro gamificacion={evConFeedback.gamificacion} />}

      {!tieneFeedbackCompleto && (
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
                  ? "Structural diagnostic and top-band essay"
                  : "Diagnóstico estructural y ensayo elevado"}
              </div>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: L.muted }}>
                {isEN
                  ? "Generate the advanced blocks only if you want to review annotations, language feedback and an elevated version of your response."
                  : "Genera los bloques avanzados solo si quieres revisar anotaciones, feedback de lenguaje y una versión elevada de tu respuesta."}
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
                    {modoIdeasBanda5 === "ideas_nuevas"
                      ? isEN
                        ? "With new ideas"
                        : "Con ideas nuevas"
                      : isEN
                        ? "Keep my voice"
                        : "Mantener mi voz"}
                  </span>
                </span>
                <Switch
                  checked={modoIdeasBanda5 === "ideas_nuevas"}
                  onCheckedChange={(checked) =>
                    setModoIdeasBanda5(checked ? "ideas_nuevas" : "conservar")
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
                    ? "Literature Paper 1 — full feedback"
                    : "Literature Prueba 1 — feedback completo"
                }
                open={showCreditGateFeedback}
                onConfirm={() => {
                  setShowCreditGateFeedback(false);
                  void mostrarFeedbackCompleto();
                }}
                onCancel={() => setShowCreditGateFeedback(false)}
              />
              <div className="flex items-center gap-2">
                {!cargandoFeedback && <CreditCostBadge coste={2} />}
                <Button
                  type="button"
                  className="lib-press flex-1 rounded-2xl"
                  style={ctaGlow}
                  onClick={() => setShowCreditGateFeedback(true)}
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
              <JuegoEsperaEvaluacion modo="prueba1" />
            </div>
          )}
        </Card>
      )}

      {/* Score header */}
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
              {isEN ? "Examiner's evaluation" : "Evaluación del examinador"}
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
                  / 20
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
                  {evConFeedback.nota_ib}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Bands grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {(isEN ? CRITERIOS_EN : CRITERIOS).map((c) => (
          <BandaCard
            key={c.key}
            letra={c.letra}
            nombre={c.nombre}
            banda={bandas[c.key]}
            justificacion={justis[c.key]}
            color={critColor[c.letra] ?? L.primary}
            isEN={isEN}
          />
        ))}
      </div>

      {/* Global comment */}
      <Card className="lib-reveal rounded-2xl border p-6" style={cardStyle}>
        <div
          className="mb-3 text-[10px] uppercase tracking-[0.2em]"
          style={{ ...fontMono, color: L.muted }}
        >
          {isEN ? "Examiner's global comment" : "Comentario global del examinador"}
        </div>
        <MdProse size="base">{evConFeedback.comentario_global}</MdProse>
      </Card>

      {/* Strengths + improvements: ya vienen con la evaluación básica */}
      {(evConFeedback.fortalezas?.trim() || evConFeedback.areas_mejora?.trim()) && (
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
      )}

      {/* Siguiente paso: visible en cuanto hay feedback completo */}
      {feedbackCompletoVisible && (
        <SiguientePasoCard
          banda_a={evConFeedback.banda_a}
          banda_b={evConFeedback.banda_b}
          banda_c={evConFeedback.banda_c}
          banda_d={evConFeedback.banda_d}
        />
      )}

      {textoLiterario && <TextoLiterarioCard texto={textoLiterario} />}

      {/* Análisis del alumno: limpio hasta que haya feedback completo, anotado después */}
      {analisisTexto && (
        <AnalisisAnotado
          texto={analisisTexto}
          ev={evConFeedback}
          mostrarAnotaciones={feedbackCompletoVisible}
          onSugerenciasChange={(sugerencias) =>
            onEvaluacionChange?.({ ...evConFeedback, sugerencias_reescritura: sugerencias })
          }
        />
      )}

      {feedbackCompletoVisible && (
        <>
          {/* Language feedback */}
          <FeedbackEstructural lenguaje_analitico={evConFeedback.lenguaje_analitico} />

          {/* Ensayo modelo basado en la respuesta del alumno */}
          <EnsayoBanda5 ensayo={evConFeedback.ensayo_banda_5} />
        </>
      )}
    </div>
  );
}
