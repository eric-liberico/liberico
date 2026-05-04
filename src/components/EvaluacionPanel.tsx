import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import type { Evaluacion } from "@/lib/ib";
import { CRITERIOS } from "@/lib/ib";
import { MdProse } from "@/components/MdProse";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

function TextoLiterarioCard({ texto }: { texto: string }) {
  const { courseKey } = useAuth();
  const isEN = courseKey === "english-a-literature";
  const [expandido, setExpandido] = useState(false);
  return (
    <Card className="p-6 bg-parchment border-border">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
        {isEN ? "Literary extract" : "Texto literario"}
      </div>
      <div className={expandido ? undefined : "max-h-32 overflow-hidden relative"}>
        <TextoLectura texto={texto} className="font-serif text-[15px] leading-relaxed text-ink" />
        {!expandido && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-parchment to-transparent" />
        )}
      </div>
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline"
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
}: {
  letra: string;
  nombre: string;
  banda: number;
  justificacion: string;
}) {
  return (
    <Card className="p-5 bg-card border-border flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Criterio {letra}
          </div>
          <div className="font-serif text-lg text-ink leading-tight mt-0.5">{nombre}</div>
        </div>
        <div className="text-right">
          <div className="font-serif text-4xl font-semibold text-primary leading-none">{banda}</div>
          <div className="text-[10px] text-muted-foreground mt-1">/ 5</div>
        </div>
      </div>

      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full ${n <= banda ? "bg-primary" : "bg-border"}`}
          />
        ))}
      </div>

      <p className="text-sm text-foreground/80 leading-relaxed">{justificacion}</p>
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
  const { courseKey } = useAuth();
  const isEN = courseKey === "english-a-literature";
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
        { body: { evaluacion_id: evaluacionId } },
      );

      if (error1) {
        throw new Error(await getFunctionErrorMessage(error1, "No se pudo generar el feedback."));
      }
      if (data1?.error) throw new Error(data1.error);
      if (!data1?.introduccion) {
        throw new Error("La IA no devolvió el análisis estructural.");
      }

      const parcial = data1 as Partial<Evaluacion>;
      setFeedbackDetallado(parcial);
      onEvaluacionChange?.({ ...evConFeedback, ...parcial });
      setFeedbackCompletoVisible(true);

      // Llamada 2: ensayo de banda alta (~40s con Opus)
      const { data: data2, error: error2 } = await supabase.functions.invoke(
        "generate-band5-essay",
        { body: { evaluacion_id: evaluacionId } },
      );

      if (error2) {
        throw new Error(await getFunctionErrorMessage(error2, "No se pudo generar el ensayo modelo."));
      }
      if (data2?.error) throw new Error(data2.error);

      if (data2?.ensayo_banda_5) {
        const completo = { ...parcial, ensayo_banda_5: data2.ensayo_banda_5 };
        setFeedbackDetallado(completo);
        onEvaluacionChange?.({ ...evConFeedback, ...completo });
      }

      toast.success("Feedback completo generado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo generar el feedback.");
    } finally {
      setCargandoFeedback(false);
    }
  };

  return (
    <div className="space-y-6">
      {feedbackCompletoVisible && <ToastLogro gamificacion={evConFeedback.gamificacion} />}

      {!tieneFeedbackCompleto && !cargandoFeedback && (
        <div className="flex justify-center">
          <Button
            type="button"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => void mostrarFeedbackCompleto()}
          >
            <Sparkles className="h-4 w-4" />
            Dame feedback completo
          </Button>
        </div>
      )}

      {!feedbackCompletoVisible && cargandoFeedback && (
        <JuegoEsperaEvaluacion modo="prueba1" />
      )}

      {/* Score header */}
      <Card className="p-6 bg-primary text-primary-foreground border-primary">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] opacity-70">Resultado</div>
            <div className="font-serif text-2xl mt-1">Evaluación del examinador</div>
          </div>
          <div className="flex items-end gap-8">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">Puntuación</div>
              <div className="font-serif text-5xl font-semibold leading-none mt-1">
                {evConFeedback.puntuacion_total}
                <span className="text-lg opacity-60 font-normal"> / 20</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">Nota IB</div>
              <div className="font-serif text-5xl font-semibold leading-none mt-1 text-success-foreground">
                <span className="px-3 py-1 rounded-md bg-success">{evConFeedback.nota_ib}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Bands grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {CRITERIOS.map((c) => (
          <BandaCard
            key={c.key}
            letra={c.letra}
            nombre={c.nombre}
            banda={bandas[c.key]}
            justificacion={justis[c.key]}
          />
        ))}
      </div>

      {/* Global comment */}
      <Card className="p-6 bg-parchment border-border">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Comentario global del examinador
        </div>
        <MdProse className="font-serif text-ink" size="base">
          {evConFeedback.comentario_global}
        </MdProse>
      </Card>

      {/* Strengths + improvements: ya vienen con la evaluación básica */}
      {(evConFeedback.fortalezas?.trim() || evConFeedback.areas_mejora?.trim()) && (
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
