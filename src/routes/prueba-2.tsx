import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { EvaluacionPrueba2Panel } from "@/components/EvaluacionPrueba2Panel";
import { JuegoEsperaEvaluacion } from "@/components/JuegoEsperaEvaluacion";
import { ImageUploadButton } from "@/components/ImageUploadButton";
import { SelectorPreguntaP2 } from "@/components/SelectorPreguntaP2";
import type { EvaluacionPrueba2 } from "@/lib/ib-paper2";
import type { GamificacionResultado } from "@/lib/ib";
import { getFunctionErrorMessage } from "@/lib/functionErrors";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, History, Loader2, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.innerText.trim();
}

export const Route = createFileRoute("/prueba-2")({
  head: () => ({
    meta: [
      { title: "LIBerico — Prueba 2 IB Español A" },
      {
        name: "description",
        content:
          "Entrena tu ensayo comparativo de Prueba 2 con feedback de nivel IB. Cinco criterios, diagnóstico comparativo y anotaciones priorizadas.",
      },
    ],
  }),
  component: Prueba2Page,
});

function Prueba2Page() {
  const { user, loading: authLoading, rol } = useAuth();
  const navigate = useNavigate();

  const [pregunta, setPregunta] = useState("");
  const [obra1, setObra1] = useState("");
  const [obra2, setObra2] = useState("");
  const [notasObra1, setNotasObra1] = useState("");
  const [notasObra2, setNotasObra2] = useState("");
  const [ensayo, setEnsayo] = useState("");
  const [evaluacion, setEvaluacion] = useState<EvaluacionPrueba2 | null>(null);
  const [gamificacion, setGamificacion] = useState<GamificacionResultado | undefined>(undefined);
  const [ensayoEnviado, setEnsayoEnviado] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (rol === "profesor") {
      navigate({ to: "/profesor" });
    }
  }, [user, authLoading, rol, navigate]);

  const evaluar = async () => {
    const ensayoPlano = stripHtml(ensayo);
    if (!pregunta.trim() || !obra1.trim() || !obra2.trim() || !ensayoPlano) {
      toast.error("La pregunta, las dos obras y el ensayo son obligatorios.");
      return;
    }
    setLoading(true);
    setEvaluacion(null);
    setEnsayoEnviado(ensayoPlano);
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-paper2", {
        body: {
          pregunta: pregunta.trim(),
          obra_1: obra1.trim(),
          obra_2: obra2.trim(),
          notas_obra_1: notasObra1.trim() || undefined,
          notas_obra_2: notasObra2.trim() || undefined,
          ensayo: ensayoPlano,
          ensayo_html: ensayo,
        },
      });
      if (error) {
        const msg = await getFunctionErrorMessage(error, "Error al evaluar.");
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error as string);

      const ev = data as EvaluacionPrueba2;
      setEvaluacion(ev);
      if (data?.gamificacion) setGamificacion(data.gamificacion as GamificacionResultado);
      toast.success(`Evaluación completada · ${ev.puntuacion_total}/25`);
      setTimeout(() => {
        document
          .getElementById("resultados-p2")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al evaluar.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user || rol === "profesor") {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Inicio
        </Link>

        {/* Hero */}
        <div className="max-w-3xl mb-10">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3 flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5" />
            Corrector de ensayo comparativo
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink leading-tight">
            Evalúa tu ensayo de Prueba 2 según los criterios oficiales del IB.
          </h1>
          <p className="mt-3 text-foreground/70 leading-relaxed">
            Escribe la pregunta elegida, las dos obras y tu ensayo comparativo. Recibirás una
            valoración por los cinco criterios (A, B1, B2, C, D), diagnóstico comparativo y
            anotaciones priorizadas.
          </p>
          <Link
            to="/historial-prueba-2"
            className="inline-flex items-center gap-1.5 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="h-3.5 w-3.5" />
            Ver mis evaluaciones anteriores
          </Link>
        </div>

        {/* Form */}
        <Card className="p-6 sm:p-8 border-border space-y-6">
          {/* Pregunta */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label
                htmlFor="pregunta"
                className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
              >
                Pregunta de Prueba 2
              </Label>
              <SelectorPreguntaP2 onSeleccion={(p) => setPregunta(p)} />
            </div>
            <p className="text-xs text-muted-foreground/70">
              Copia la pregunta exacta del enunciado oficial, o escribe la que elegirás en el
              examen.
            </p>
            <Input
              id="pregunta"
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              placeholder="Ej.: ¿De qué manera dos obras estudiadas presentan el conflicto entre individuo y sociedad?"
              disabled={loading}
            />
          </div>

          {/* Obras */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="obra1"
                className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
              >
                Obra 1
              </Label>
              <Input
                id="obra1"
                value={obra1}
                onChange={(e) => setObra1(e.target.value)}
                placeholder="Título y autor"
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="obra2"
                className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
              >
                Obra 2
              </Label>
              <Input
                id="obra2"
                value={obra2}
                onChange={(e) => setObra2(e.target.value)}
                placeholder="Título y autor"
                disabled={loading}
              />
            </div>
          </div>

          {/* Notas opcionales */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="notas1"
                className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
              >
                Notas opcionales sobre obra 1
              </Label>
              <Textarea
                id="notas1"
                value={notasObra1}
                onChange={(e) => setNotasObra1(e.target.value)}
                placeholder="Escenas, personajes, recursos, temas o citas breves que quieres que el corrector tenga en cuenta. No pegues la obra completa."
                rows={4}
                disabled={loading}
                className="resize-none text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="notas2"
                className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
              >
                Notas opcionales sobre obra 2
              </Label>
              <Textarea
                id="notas2"
                value={notasObra2}
                onChange={(e) => setNotasObra2(e.target.value)}
                placeholder="Escenas, personajes, recursos, temas o citas breves que quieres que el corrector tenga en cuenta. No pegues la obra completa."
                rows={4}
                disabled={loading}
                className="resize-none text-sm"
              />
            </div>
          </div>

          {/* Ensayo */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Tu ensayo comparativo
              </Label>
              <ImageUploadButton label="Subir foto" onTranscripcion={(t) => setEnsayo(t)} />
            </div>
            <p className="text-xs text-muted-foreground/70">
              Escribe o pega tu ensayo tal como lo entregarías: tesis comparativa, argumentos con
              textualidad de ambas obras y conclusión.
            </p>
            <RichTextEditor
              value={ensayo}
              onChange={setEnsayo}
              placeholder="Escribe aquí tu ensayo comparativo…"
              minHeight="280px"
              disabled={loading}
              showWordCount
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Tu evaluación se guarda automáticamente en{" "}
              <Link to="/historial-prueba-2" className="text-foreground/80 hover:underline">
                Historial P2
              </Link>
              .
            </p>
            <Button onClick={evaluar} disabled={loading} size="lg" className="sm:w-auto">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Evaluando…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Evaluar ensayo
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Juego de espera */}
        {loading && (
          <div className="mt-6">
            <JuegoEsperaEvaluacion modo="prueba2" />
          </div>
        )}

        {/* Resultados */}
        {evaluacion && (
          <section id="resultados-p2" className="mt-12 scroll-mt-20">
            <EvaluacionPrueba2Panel
              ev={evaluacion}
              ensayo={ensayoEnviado}
              autoGenerar
              gamificacion={gamificacion}
              onSugerenciasChange={(sugerencias) =>
                setEvaluacion((actual) =>
                  actual ? { ...actual, sugerencias_reescritura: sugerencias } : actual,
                )
              }
              onEnsayoChange={(ensayoBanda5) =>
                setEvaluacion((actual) =>
                  actual ? { ...actual, ensayo_banda_5: ensayoBanda5 } : actual,
                )
              }
            />
          </section>
        )}
      </main>
    </div>
  );
}
