import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/RichTextEditor";
import { EvaluacionPanel } from "@/components/EvaluacionPanel";
import type { Evaluacion } from "@/lib/ib";
import { getFunctionErrorMessage } from "@/lib/functionErrors";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.innerText.trim();
}

export const Route = createFileRoute("/")({
  component: CorrectorPage,
});

function CorrectorPage() {
  const { user, loading: authLoading, rol } = useAuth();
  const navigate = useNavigate();
  const [texto, setTexto] = useState("");
  const [pregunta, setPregunta] = useState("");
  const [analisis, setAnalisis] = useState("");
  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null);
  const [analisisPlanoGuardado, setAnalisisPlanoGuardado] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (rol === "profesor") navigate({ to: "/profesor" });
  }, [user, authLoading, rol, navigate]);

  const evaluar = async () => {
    const textoPlano = stripHtml(texto);
    const analisisPlano = stripHtml(analisis);
    if (!textoPlano || !pregunta.trim() || !analisisPlano) {
      toast.error("Completa los tres campos antes de evaluar.");
      return;
    }
    setLoading(true);
    setEvaluacion(null);
    setAnalisisPlanoGuardado(analisisPlano);
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-analysis", {
        body: {
          texto: textoPlano,
          pregunta,
          analisis: analisisPlano,
          texto_html: texto,
          analisis_html: analisis,
        },
      });
      if (error) {
        const msg = await getFunctionErrorMessage(error, "Error al evaluar.");
        console.error(
          "Supabase functions error:",
          error,
          "ctx:",
          (error as { context?: unknown }).context,
        );
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);

      const ev = data as Evaluacion;
      setEvaluacion(ev);

      toast.success(`Evaluación completada · ${ev.puntuacion_total}/20 · IB ${ev.nota_ib}`);
      // Scroll to results
      setTimeout(() => {
        document
          .getElementById("resultados")
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
        {/* Hero */}
        <div className="max-w-3xl mb-10">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
            Corrector de análisis literario
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink leading-tight">
            Evalúa tu comentario de la Prueba 1 según los criterios oficiales del IB.
          </h1>
          <p className="mt-3 text-foreground/70 leading-relaxed">
            Pega el texto literario, la pregunta de orientación y tu análisis. Recibirás una
            valoración por los cuatro criterios (A–D), tu puntuación sobre 20 y la nota IB estimada.
          </p>
        </div>

        {/* Form */}
        <Card className="p-6 sm:p-8 border-border">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Texto literario
              </Label>
              <RichTextEditor
                value={texto}
                onChange={setTexto}
                placeholder="Pega aquí el fragmento de prosa o poesía…"
                minHeight="220px"
                className="font-serif"
                disabled={loading}
              />
            </div>

            <div className="space-y-6">
              <div className="space-y-1.5">
                <Label
                  htmlFor="pregunta"
                  className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
                >
                  Pregunta de orientación
                </Label>
                <Input
                  id="pregunta"
                  value={pregunta}
                  onChange={(e) => setPregunta(e.target.value)}
                  placeholder="Ej.: ¿Cómo se construye la voz lírica…?"
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Tu análisis
                </Label>
                <RichTextEditor
                  value={analisis}
                  onChange={setAnalisis}
                  placeholder="Escribe aquí tu comentario analítico…"
                  minHeight="180px"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Tus evaluaciones se guardan automáticamente en{" "}
              <span className="text-foreground/80">Mis evaluaciones</span>.
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
                  Evaluar análisis
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Results */}
        {evaluacion && (
          <section id="resultados" className="mt-12 scroll-mt-20">
            <EvaluacionPanel
              ev={evaluacion}
              analisisTexto={analisisPlanoGuardado}
              autoGenerarReescrituras
              onEvaluacionChange={setEvaluacion}
            />
          </section>
        )}
      </main>
    </div>
  );
}
