import { useEffect, useState } from "react";
import { CreditGate, CreditCostBadge } from "@/components/CreditGate";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { Card } from "@/components/ui/card";
import { MdProse } from "@/components/MdProse";
import {
  CRITERIOS_ORAL,
  notaIBOral,
  type EvaluacionOral,
  type EstadoElementoOral,
  type PreguntaProfesorOral,
  type ZonaDesarrolloSelfTaught,
} from "@/lib/ib-oral";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  MinusCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToastLogro } from "@/components/gamificacion/ToastLogro";
import { GuionAnotadoOral } from "@/components/GuionAnotadoOral";
import { JuegoEsperaEvaluacion } from "@/components/JuegoEsperaEvaluacion";
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

// Claro premium — replica del patrón de las rutas migradas (prueba-1/login).
const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;
const ctaGlow = { boxShadow: "0 16px 30px -12px rgba(79,70,229,0.55)" } as const;
const cardStyle = {
  backgroundColor: L.surface,
  borderColor: L.line,
  boxShadow: cardShadow,
  color: L.ink,
} as const;
const critColor = (etiqueta: string): string =>
  ({ A: CRIT.A, B: CRIT.B, C: CRIT.C, D: CRIT.D })[etiqueta[0]] ?? L.primary;
const ESTADO_ORAL: Record<
  EstadoElementoOral["estado"],
  { color: string; bg: string; border: string; label: string }
> = {
  presente: { color: L.ok, bg: L.ok + "14", border: L.ok + "55", label: "Presente" },
  parcial: { color: L.amberDeep, bg: L.amber + "1F", border: L.amber + "66", label: "Parcial" },
  ausente: { color: CRIT.D, bg: CRIT.D + "14", border: CRIT.D + "44", label: "Ausente" },
};

function BandaCard({
  criterio,
  puntuacion,
  justificacion,
}: {
  criterio: (typeof CRITERIOS_ORAL)[number];
  puntuacion: number;
  justificacion: string;
}) {
  const color = critColor(criterio.etiqueta);
  return (
    <Card className="lib-reveal flex flex-col gap-3 rounded-2xl border p-5" style={cardStyle}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.2em]"
            style={{ ...fontMono, color: L.muted }}
          >
            Criterio {criterio.etiqueta}
          </div>
          <div className="mt-1 text-base leading-tight" style={{ ...headingStyle, color: L.ink }}>
            {criterio.nombre}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div
            className="text-4xl font-semibold leading-none tabular-nums"
            style={{ ...fontMono, color }}
          >
            {puntuacion}
          </div>
          <div className="mt-1 text-[10px]" style={{ ...fontMono, color: L.muted }}>
            / {criterio.max}
          </div>
        </div>
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: criterio.max }, (_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{ backgroundColor: i < puntuacion ? color : L.line }}
          />
        ))}
      </div>
      {justificacion && (
        <p className="text-sm leading-relaxed" style={{ color: L.muted }}>
          {justificacion}
        </p>
      )}
    </Card>
  );
}

function EstadoIcon({ estado }: { estado: EstadoElementoOral["estado"] }) {
  const color = ESTADO_ORAL[estado].color;
  const Icon =
    estado === "presente" ? CheckCircle2 : estado === "parcial" ? MinusCircle : AlertCircle;
  return <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color }} aria-hidden="true" />;
}

function EstadoBadge({ estado }: { estado: EstadoElementoOral["estado"] }) {
  const s = ESTADO_ORAL[estado];
  return (
    <span
      className="rounded border px-2 py-0.5 text-[10px]"
      style={{ ...fontMono, color: s.color, backgroundColor: s.bg, borderColor: s.border }}
    >
      {s.label}
    </span>
  );
}

function DiagnosticoItem({ etiqueta, el }: { etiqueta: string; el: EstadoElementoOral }) {
  return (
    <div className="flex gap-3 border-b py-3 last:border-b-0" style={{ borderColor: L.line }}>
      <EstadoIcon estado={el.estado} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium" style={{ color: L.ink }}>
            {etiqueta}
          </span>
          <EstadoBadge estado={el.estado} />
        </div>
        {el.fragmento && (
          <p className="text-[12px] italic" style={{ color: L.muted }}>
            «{el.fragmento}»
          </p>
        )}
        <p className="text-[12px]" style={{ color: L.ink }}>
          {el.evaluacion}
        </p>
        {el.sugerencia && (
          <p className="text-[12px]" style={{ color: L.primary }}>
            {el.sugerencia}
          </p>
        )}
      </div>
    </div>
  );
}

function PreguntaProfesorItem({ pq, idx }: { pq: PreguntaProfesorOral; idx: number }) {
  return (
    <div
      className="space-y-2 rounded-xl border p-4"
      style={{ backgroundColor: L.surface, borderColor: L.line }}
    >
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums"
          style={{ ...fontMono, backgroundColor: L.primary + "1A", color: L.primary }}
        >
          {idx + 1}
        </span>
        <p className="text-[13px] font-medium" style={{ color: L.ink }}>
          {pq.pregunta}
        </p>
      </div>
      <div className="space-y-1 pl-7">
        <p className="text-[12px]" style={{ color: L.muted }}>
          <span className="font-medium" style={{ color: L.ink }}>
            Propósito:{" "}
          </span>
          {pq.proposito}
        </p>
        <p className="text-[12px] leading-relaxed" style={{ color: L.primary }}>
          <span className="font-medium">Cómo responder: </span>
          {pq.como_responder}
        </p>
      </div>
    </div>
  );
}

function ZonaDesarrolloItem({ zona, idx }: { zona: ZonaDesarrolloSelfTaught; idx: number }) {
  return (
    <div
      className="space-y-1.5 rounded-xl border p-4"
      style={{ backgroundColor: L.amber + "14", borderColor: L.amber + "55" }}
    >
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums"
          style={{ ...fontMono, backgroundColor: L.amber + "33", color: L.amberDeep }}
        >
          {idx + 1}
        </span>
        <p className="text-[13px] font-medium" style={{ color: L.ink }}>
          {zona.zona}
        </p>
      </div>
      <div className="space-y-1 pl-7">
        <p className="text-[12px]" style={{ color: L.muted }}>
          {zona.problema}
        </p>
        <p className="text-[12px] leading-relaxed" style={{ color: L.amberDeep }}>
          {zona.sugerencia}
        </p>
      </div>
    </div>
  );
}

export function EvaluacionOralPanel({
  ev,
  gamificacion,
  guion,
  soloLectura = false,
}: {
  ev: EvaluacionOral;
  gamificacion?: GamificacionResultado;
  guion?: string;
  soloLectura?: boolean;
}) {
  const { courseKey, refreshRol } = useAuth();
  const isEN = useUiLang() === "en";
  const [feedbackDetallado, setFeedbackDetallado] = useState<Partial<EvaluacionOral> | null>(null);
  const [cargandoFeedback, setCargandoFeedback] = useState(false);
  const [showCreditGateFeedbackOral, setShowCreditGateFeedbackOral] = useState(false);

  const evConFeedback: EvaluacionOral = { ...ev, ...(feedbackDetallado ?? {}) };

  const yaTieneFeedbackCompleto =
    evConFeedback.feedback_completo_generado === true ||
    evConFeedback.diagnostico_asunto_global != null;

  const [feedbackCompletoVisible, setFeedbackCompletoVisible] = useState(
    () => yaTieneFeedbackCompleto || soloLectura,
  );

  useEffect(() => {
    setFeedbackDetallado(null);
  }, [ev.evaluacion_id]);

  useEffect(() => {
    const tieneCompleto =
      evConFeedback.feedback_completo_generado === true ||
      evConFeedback.diagnostico_asunto_global != null;
    setFeedbackCompletoVisible(tieneCompleto || soloLectura);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ev.evaluacion_id, soloLectura]);

  const notaIB = notaIBOral(ev.puntuacion_total);
  const esTaught = ev.tipo_oral === "taught";
  const objetivoMin = esTaught ? 10 : 15;
  const duracion = ev.duracion_estimada_minutos;
  const excedeTiempo = duracion > objetivoMin + 0.5;
  const bajoDeTiempo = duracion < objetivoMin - 1.5;

  const solicitarFeedbackCompleto = async () => {
    if (evConFeedback.diagnostico_asunto_global != null) {
      setFeedbackCompletoVisible(true);
      return;
    }

    const evaluacionId = evConFeedback.evaluacion_id;
    if (!evaluacionId) {
      toast.error("No se encontró la evaluación para generar el feedback completo.");
      return;
    }

    setCargandoFeedback(true);
    try {
      const { data, error } = await supabase.functions.invoke("lita-io-feedback", {
        body: { evaluacion_id: evaluacionId },
      });

      if (error) {
        throw new Error(
          await getFunctionErrorMessage(error, "No se pudo generar el feedback completo."),
        );
      }
      if (data?.error) throw new Error(data.error as string);

      const respuesta = data as Partial<EvaluacionOral>;
      setFeedbackDetallado(respuesta);
      setFeedbackCompletoVisible(true);
      void refreshRol();
      toast.success("Feedback completo generado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo generar el feedback completo.");
    } finally {
      setCargandoFeedback(false);
    }
  };

  return (
    <div className="space-y-6">
      <ToastLogro gamificacion={gamificacion} />

      {/* ── Botón feedback completo (tope) ── */}
      {!feedbackCompletoVisible && !cargandoFeedback && (
        <div className="flex items-center justify-center gap-3">
          <CreditGate
            coste={2}
            concepto="Literature Oral — feedback completo"
            open={showCreditGateFeedbackOral}
            onConfirm={() => {
              setShowCreditGateFeedbackOral(false);
              void solicitarFeedbackCompleto();
            }}
            onCancel={() => setShowCreditGateFeedbackOral(false)}
          />
          <CreditCostBadge coste={2} />
          <Button
            type="button"
            size="lg"
            className="lib-press w-full rounded-2xl sm:w-auto"
            style={ctaGlow}
            onClick={() => setShowCreditGateFeedbackOral(true)}
          >
            <Sparkles className="h-4 w-4" />
            Dame feedback completo
          </Button>
        </div>
      )}
      {!feedbackCompletoVisible && cargandoFeedback && <JuegoEsperaEvaluacion modo="oral" />}

      {/* ── Header ── */}
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
              Resultado
            </div>
            <div className="mt-1 text-2xl" style={{ ...headingStyle, color: DEEP.text }}>
              Oral Individual
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className="rounded-full border px-2 py-0.5 text-[11px]"
                style={{
                  ...fontMono,
                  borderColor: DEEP.border,
                  color: DEEP.text,
                  backgroundColor: "rgba(255,255,255,0.06)",
                }}
              >
                {esTaught ? "Alumno con profesor" : "Aprendizaje autodidacta con apoyo del colegio"}
              </span>
              <div
                className="flex items-center gap-1 text-[11px]"
                style={{ ...fontMono, color: DEEP.muted }}
              >
                <Clock className="h-3 w-3" aria-hidden="true" />~{duracion} min · objetivo{" "}
                {esTaught ? "10+5 min" : "15 min"}
              </div>
              {excedeTiempo && (
                <div className="flex items-center gap-1 text-[11px]" style={{ color: L.amber }}>
                  <AlertCircle className="h-3 w-3" aria-hidden="true" />
                  Excede el tiempo
                </div>
              )}
              {bajoDeTiempo && (
                <div className="flex items-center gap-1 text-[11px]" style={{ color: L.amber }}>
                  <AlertCircle className="h-3 w-3" aria-hidden="true" />
                  Guion corto
                </div>
              )}
            </div>
          </div>
          <div className="flex items-end gap-8">
            <div>
              <div
                className="text-[10px] uppercase tracking-[0.18em]"
                style={{ ...fontMono, color: DEEP.muted }}
              >
                Puntuación
              </div>
              <div
                className="mt-1 text-5xl font-semibold leading-none tabular-nums"
                style={{ ...fontMono, color: DEEP.text }}
              >
                {ev.puntuacion_total}
                <span className="text-lg font-normal" style={{ color: DEEP.muted }}>
                  {" "}
                  / 40
                </span>
              </div>
            </div>
            <div>
              <div
                className="text-[10px] uppercase tracking-[0.18em]"
                style={{ ...fontMono, color: DEEP.muted }}
              >
                Nota
              </div>
              <div className="mt-1">
                <span
                  className="inline-block rounded-lg px-3 py-1 text-4xl font-semibold leading-none tabular-nums"
                  style={{ ...fontMono, backgroundColor: L.ok, color: "#fff" }}
                >
                  {notaIB}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Criterios A B C D ── */}
      <div>
        <div
          className="mb-3 text-[10px] uppercase tracking-[0.22em]"
          style={{ ...fontMono, color: L.muted }}
        >
          Criterios
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CRITERIOS_ORAL.map((c) => (
            <BandaCard
              key={c.key}
              criterio={c}
              puntuacion={ev[`criterio_${c.key}` as `criterio_${typeof c.key}`]}
              justificacion={ev[`justificacion_${c.key}` as `justificacion_${typeof c.key}`]}
            />
          ))}
        </div>
      </div>

      {/* ── Fortalezas y áreas de mejora ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {ev.fortalezas && (
          <Card
            className="lib-reveal rounded-2xl border border-l-4 p-5"
            style={{ ...cardStyle, borderLeftColor: L.ok }}
          >
            <div
              className="mb-2 text-[10px] uppercase tracking-[0.18em]"
              style={{ ...fontMono, color: L.muted }}
            >
              Fortalezas
            </div>
            <MdProse>{ev.fortalezas}</MdProse>
          </Card>
        )}
        {ev.areas_mejora && (
          <Card
            className="lib-reveal rounded-2xl border border-l-4 p-5"
            style={{ ...cardStyle, borderLeftColor: L.primary }}
          >
            <div
              className="mb-2 text-[10px] uppercase tracking-[0.18em]"
              style={{ ...fontMono, color: L.muted }}
            >
              Áreas de mejora
            </div>
            <MdProse>{ev.areas_mejora}</MdProse>
          </Card>
        )}
      </div>

      {/* ── Comentario global ── */}
      {ev.comentario_global && (
        <Card className="lib-reveal rounded-2xl border p-6" style={cardStyle}>
          <div
            className="mb-2 text-[10px] uppercase tracking-[0.22em]"
            style={{ ...fontMono, color: L.muted }}
          >
            Comentario global
          </div>
          <MdProse size="base">{ev.comentario_global}</MdProse>
        </Card>
      )}

      {/* ── Guion (siempre visible; con anotaciones solo si hay feedback completo) ── */}
      {guion && (
        <GuionAnotadoOral
          guion={guion}
          anotaciones={feedbackCompletoVisible ? evConFeedback.anotaciones : null}
        />
      )}

      {/* ── Secciones de feedback detallado ── */}
      {feedbackCompletoVisible && (
        <>
          {/* Diagnóstico del asunto global */}
          {evConFeedback.diagnostico_asunto_global && (
            <Card className="lib-reveal rounded-2xl border p-5" style={cardStyle}>
              <div
                className="mb-1 text-[10px] uppercase tracking-[0.22em]"
                style={{ ...fontMono, color: L.muted }}
              >
                Diagnóstico
              </div>
              <p className="mb-3 text-[14px] font-medium" style={{ ...headingStyle, color: L.ink }}>
                Asunto global
              </p>
              <DiagnosticoItem
                etiqueta={isEN ? "Global issue definition" : "Definición del asunto global"}
                el={evConFeedback.diagnostico_asunto_global.definicion}
              />
              <DiagnosticoItem
                etiqueta="Especificidad"
                el={evConFeedback.diagnostico_asunto_global.especificidad}
              />
              <DiagnosticoItem
                etiqueta="Uso como lente articuladora"
                el={evConFeedback.diagnostico_asunto_global.uso_como_lente}
              />
            </Card>
          )}

          {/* Diagnóstico de equilibrio */}
          {evConFeedback.diagnostico_equilibrio && (
            <Card className="lib-reveal rounded-2xl border p-5" style={cardStyle}>
              <div
                className="mb-1 text-[10px] uppercase tracking-[0.22em]"
                style={{ ...fontMono, color: L.muted }}
              >
                Diagnóstico
              </div>
              <p className="mb-3 text-[14px] font-medium" style={{ ...headingStyle, color: L.ink }}>
                Equilibrio extractos y obras
              </p>
              <DiagnosticoItem
                etiqueta="Extracto 1"
                el={evConFeedback.diagnostico_equilibrio.extracto_1}
              />
              <DiagnosticoItem
                etiqueta="Obra 1 (completa)"
                el={evConFeedback.diagnostico_equilibrio.obra_1}
              />
              <DiagnosticoItem
                etiqueta="Extracto 2"
                el={evConFeedback.diagnostico_equilibrio.extracto_2}
              />
              <DiagnosticoItem
                etiqueta="Obra 2 (completa)"
                el={evConFeedback.diagnostico_equilibrio.obra_2}
              />
            </Card>
          )}

          {/* Diagnóstico de estructura */}
          {evConFeedback.diagnostico_estructura && (
            <Card className="lib-reveal rounded-2xl border p-5" style={cardStyle}>
              <div
                className="mb-1 text-[10px] uppercase tracking-[0.22em]"
                style={{ ...fontMono, color: L.muted }}
              >
                Diagnóstico
              </div>
              <p className="mb-3 text-[14px] font-medium" style={{ ...headingStyle, color: L.ink }}>
                Estructura
              </p>
              <DiagnosticoItem
                etiqueta="Apertura"
                el={evConFeedback.diagnostico_estructura.apertura}
              />
              <DiagnosticoItem
                etiqueta="Progresión"
                el={evConFeedback.diagnostico_estructura.progresion}
              />
              <DiagnosticoItem
                etiqueta="Transiciones"
                el={evConFeedback.diagnostico_estructura.transiciones}
              />
              <DiagnosticoItem etiqueta="Cierre" el={evConFeedback.diagnostico_estructura.cierre} />
            </Card>
          )}

          {/* Preguntas del profesor (taught) */}
          {esTaught &&
            evConFeedback.preguntas_profesor &&
            evConFeedback.preguntas_profesor.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" style={{ color: L.primary }} aria-hidden="true" />
                  <div
                    className="text-[10px] uppercase tracking-[0.22em]"
                    style={{ ...fontMono, color: L.muted }}
                  >
                    Preguntas probables del profesor
                  </div>
                </div>
                {evConFeedback.preguntas_profesor.map((pq, i) => (
                  <PreguntaProfesorItem key={i} pq={pq} idx={i} />
                ))}
              </div>
            )}

          {/* Zonas de desarrollo (self-taught) */}
          {!esTaught &&
            evConFeedback.zonas_desarrollo_self_taught &&
            evConFeedback.zonas_desarrollo_self_taught.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle
                    className="h-4 w-4"
                    style={{ color: L.amberDeep }}
                    aria-hidden="true"
                  />
                  <div
                    className="text-[10px] uppercase tracking-[0.22em]"
                    style={{ ...fontMono, color: L.muted }}
                  >
                    Zonas que debes desarrollar en tus 15 minutos
                  </div>
                </div>
                {evConFeedback.zonas_desarrollo_self_taught.map((z, i) => (
                  <ZonaDesarrolloItem key={i} zona={z} idx={i} />
                ))}
              </div>
            )}
        </>
      )}
    </div>
  );
}
