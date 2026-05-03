import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
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

function BandaCard({
  criterio,
  puntuacion,
  justificacion,
}: {
  criterio: (typeof CRITERIOS_ORAL)[number];
  puntuacion: number;
  justificacion: string;
}) {
  return (
    <Card className="p-5 bg-card border-border flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Criterio {criterio.etiqueta}
          </div>
          <div className="font-serif text-base text-ink leading-tight mt-0.5">{criterio.nombre}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-serif text-4xl font-semibold text-primary leading-none">{puntuacion}</div>
          <div className="text-[10px] text-muted-foreground mt-1">/ {criterio.max}</div>
        </div>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: criterio.max }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < puntuacion ? "bg-primary" : "bg-border"}`}
          />
        ))}
      </div>
      {justificacion && (
        <p className="text-sm text-foreground/80 leading-relaxed">{justificacion}</p>
      )}
    </Card>
  );
}

function EstadoIcon({ estado }: { estado: EstadoElementoOral["estado"] }) {
  if (estado === "presente")
    return <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />;
  if (estado === "parcial")
    return <MinusCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
  return <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />;
}

function EstadoBadge({ estado }: { estado: EstadoElementoOral["estado"] }) {
  if (estado === "presente")
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-normal">
        Presente
      </Badge>
    );
  if (estado === "parcial")
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-normal">
        Parcial
      </Badge>
    );
  return (
    <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] font-normal">
      Ausente
    </Badge>
  );
}

function DiagnosticoItem({ etiqueta, el }: { etiqueta: string; el: EstadoElementoOral }) {
  return (
    <div className="flex gap-3 py-3 border-b last:border-b-0">
      <EstadoIcon estado={el.estado} />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-foreground">{etiqueta}</span>
          <EstadoBadge estado={el.estado} />
        </div>
        {el.fragmento && (
          <p className="text-[12px] text-muted-foreground italic">«{el.fragmento}»</p>
        )}
        <p className="text-[12px] text-foreground/75">{el.evaluacion}</p>
        {el.sugerencia && <p className="text-[12px] text-primary">{el.sugerencia}</p>}
      </div>
    </div>
  );
}

function PreguntaProfesorItem({ pq, idx }: { pq: PreguntaProfesorOral; idx: number }) {
  return (
    <div className="p-4 border rounded-lg space-y-2 bg-background">
      <div className="flex gap-2 items-start">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold shrink-0 mt-0.5">
          {idx + 1}
        </span>
        <p className="text-[13px] font-medium text-foreground">{pq.pregunta}</p>
      </div>
      <div className="pl-7 space-y-1">
        <p className="text-[12px] text-muted-foreground">
          <span className="font-medium text-foreground/80">Propósito: </span>
          {pq.proposito}
        </p>
        <p className="text-[12px] text-primary leading-relaxed">
          <span className="font-medium">Cómo responder: </span>
          {pq.como_responder}
        </p>
      </div>
    </div>
  );
}

function ZonaDesarrolloItem({ zona, idx }: { zona: ZonaDesarrolloSelfTaught; idx: number }) {
  return (
    <div className="p-4 border border-amber-200 rounded-lg bg-amber-50/40 space-y-1.5">
      <div className="flex gap-2 items-start">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 text-amber-800 text-[10px] font-semibold shrink-0 mt-0.5">
          {idx + 1}
        </span>
        <p className="text-[13px] font-medium text-foreground">{zona.zona}</p>
      </div>
      <div className="pl-7 space-y-1">
        <p className="text-[12px] text-foreground/75">{zona.problema}</p>
        <p className="text-[12px] text-amber-800 leading-relaxed">{zona.sugerencia}</p>
      </div>
    </div>
  );
}

export function EvaluacionOralPanel({
  ev,
  gamificacion,
  guion,
  resultadoInicialBasico = false,
}: {
  ev: EvaluacionOral;
  gamificacion?: GamificacionResultado;
  guion?: string;
  resultadoInicialBasico?: boolean;
}) {
  const [feedbackDetallado, setFeedbackDetallado] = useState<Partial<EvaluacionOral> | null>(null);
  const [cargandoFeedback, setCargandoFeedback] = useState(false);

  const evConFeedback: EvaluacionOral = { ...ev, ...(feedbackDetallado ?? {}) };

  const yaTieneFeedbackCompleto =
    evConFeedback.feedback_completo_generado === true ||
    evConFeedback.diagnostico_asunto_global != null;

  const [feedbackCompletoVisible, setFeedbackCompletoVisible] = useState(
    () => yaTieneFeedbackCompleto || !resultadoInicialBasico,
  );

  useEffect(() => {
    setFeedbackDetallado(null);
  }, [ev.evaluacion_id]);

  useEffect(() => {
    const tieneCompleto =
      evConFeedback.feedback_completo_generado === true ||
      evConFeedback.diagnostico_asunto_global != null;
    setFeedbackCompletoVisible(tieneCompleto || !resultadoInicialBasico);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ev.evaluacion_id, resultadoInicialBasico]);

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
      const { data, error } = await supabase.functions.invoke("generate-oral-feedback", {
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

      {/* ── Header ── */}
      <Card className="p-6 bg-primary text-primary-foreground border-primary">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] opacity-70">Resultado</div>
            <div className="font-serif text-2xl mt-1">Oral Individual</div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {esTaught ? (
                <Badge className="text-[11px] border-white/30 text-white/90 bg-white/10">
                  Alumno con profesor
                </Badge>
              ) : (
                <Badge className="text-[11px] border-white/30 text-white/90 bg-white/10">
                  Self-taught / SSST
                </Badge>
              )}
              <div className="flex items-center gap-1 text-[11px] opacity-70">
                <Clock className="h-3 w-3" />
                ~{duracion} min · objetivo {esTaught ? "10+5 min" : "15 min"}
              </div>
              {excedeTiempo && (
                <div className="flex items-center gap-1 text-[11px] text-amber-300">
                  <AlertCircle className="h-3 w-3" />
                  Excede el tiempo
                </div>
              )}
              {bajoDeTiempo && (
                <div className="flex items-center gap-1 text-[11px] text-amber-300">
                  <AlertCircle className="h-3 w-3" />
                  Guion corto
                </div>
              )}
            </div>
          </div>
          <div className="flex items-end gap-8">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">Puntuación</div>
              <div className="font-serif text-5xl font-semibold leading-none mt-1">
                {ev.puntuacion_total}
                <span className="text-lg opacity-60 font-normal"> / 40</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">Nota IB</div>
              <div className="font-serif text-5xl font-semibold leading-none mt-1 text-success-foreground">
                <span className="px-3 py-1 rounded-md bg-success">{notaIB}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Criterios A B C D ── */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
          Criterios
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      <div className="grid sm:grid-cols-2 gap-4">
        {ev.fortalezas && (
          <Card className="p-4 bg-emerald-50/40 border-emerald-100">
            <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-700 mb-2">
              Fortalezas
            </div>
            <MdProse>{ev.fortalezas}</MdProse>
          </Card>
        )}
        {ev.areas_mejora && (
          <Card className="p-4 bg-amber-50/40 border-amber-100">
            <div className="text-[10px] uppercase tracking-[0.18em] text-amber-700 mb-2">
              Áreas de mejora
            </div>
            <MdProse>{ev.areas_mejora}</MdProse>
          </Card>
        )}
      </div>

      {/* ── Comentario global ── */}
      {ev.comentario_global && (
        <Card className="p-5 border-primary/20 bg-primary/5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-primary/70 mb-2">
            Comentario global
          </div>
          <MdProse size="base">{ev.comentario_global}</MdProse>
        </Card>
      )}

      {/* ── Botón feedback completo ── */}
      {!feedbackCompletoVisible && (
        <Card className="p-6 border-primary/20 bg-primary/5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-primary/70 mb-1">
            Siguiente paso
          </div>
          <p className="font-medium text-[15px] text-ink mb-1">
            Diagnóstico completo y guion anotado
          </p>
          <p className="text-sm text-foreground/70 mb-4">
            Genera los diagnósticos del asunto global, equilibrio y estructura,{" "}
            {esTaught
              ? "las preguntas probables del profesor"
              : "las zonas que debes desarrollar en tus 15 minutos"}{" "}
            y el guion anotado con comentarios localizables.
          </p>
          {cargandoFeedback ? (
            <JuegoEsperaEvaluacion modo="oral" />
          ) : (
            <Button
              type="button"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => void solicitarFeedbackCompleto()}
              disabled={cargandoFeedback}
            >
              <Sparkles className="h-4 w-4" />
              Dame feedback completo
            </Button>
          )}
        </Card>
      )}

      {/* ── Secciones de feedback detallado ── */}
      {feedbackCompletoVisible && (
        <>
          {/* Guion anotado */}
          {guion && (
            <GuionAnotadoOral
              guion={guion}
              anotaciones={evConFeedback.anotaciones}
            />
          )}

          {/* Diagnóstico del asunto global */}
          {evConFeedback.diagnostico_asunto_global && (
            <Card className="p-5">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
                Diagnóstico
              </div>
              <p className="font-medium text-[14px] text-foreground mb-3">Asunto global</p>
              <DiagnosticoItem
                etiqueta="Definición del asunto global"
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
            <Card className="p-5">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
                Diagnóstico
              </div>
              <p className="font-medium text-[14px] text-foreground mb-3">
                Equilibrio extractos y obras
              </p>
              <DiagnosticoItem etiqueta="Extracto 1" el={evConFeedback.diagnostico_equilibrio.extracto_1} />
              <DiagnosticoItem etiqueta="Obra 1 (completa)" el={evConFeedback.diagnostico_equilibrio.obra_1} />
              <DiagnosticoItem etiqueta="Extracto 2" el={evConFeedback.diagnostico_equilibrio.extracto_2} />
              <DiagnosticoItem etiqueta="Obra 2 (completa)" el={evConFeedback.diagnostico_equilibrio.obra_2} />
            </Card>
          )}

          {/* Diagnóstico de estructura */}
          {evConFeedback.diagnostico_estructura && (
            <Card className="p-5">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
                Diagnóstico
              </div>
              <p className="font-medium text-[14px] text-foreground mb-3">Estructura</p>
              <DiagnosticoItem etiqueta="Apertura" el={evConFeedback.diagnostico_estructura.apertura} />
              <DiagnosticoItem etiqueta="Progresión" el={evConFeedback.diagnostico_estructura.progresion} />
              <DiagnosticoItem etiqueta="Transiciones" el={evConFeedback.diagnostico_estructura.transiciones} />
              <DiagnosticoItem etiqueta="Cierre" el={evConFeedback.diagnostico_estructura.cierre} />
            </Card>
          )}

          {/* Preguntas del profesor (taught) */}
          {esTaught && evConFeedback.preguntas_profesor && evConFeedback.preguntas_profesor.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
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
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
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
