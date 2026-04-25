import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { EvaluacionPanel } from "@/components/EvaluacionPanel";
import type { Evaluacion } from "@/lib/ib";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: CorrectorPage,
});

function CorrectorPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [texto, setTexto] = useState("");
  const [pregunta, setPregunta] = useState("");
  const [analisis, setAnalisis] = useState("");
  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  const evaluar = async () => {
    if (!texto.trim() || !pregunta.trim() || !analisis.trim()) {
      toast.error("Completa los tres campos antes de evaluar.");
      return;
    }
    setLoading(true);
    setEvaluacion(null);
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-analysis", {
        body: { texto, pregunta, analisis },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const ev = data as Evaluacion;
      setEvaluacion(ev);

      // Save to history
      const { error: insertError } = await supabase.from("evaluaciones").insert({
        user_id: user!.id,
        texto_literario: texto,
        pregunta_orientacion: pregunta,
        analisis_estudiante: analisis,
        banda_a: ev.banda_a,
        banda_b: ev.banda_b,
        banda_c: ev.banda_c,
        banda_d: ev.banda_d,
        justificacion_a: ev.justificacion_a,
        justificacion_b: ev.justificacion_b,
        justificacion_c: ev.justificacion_c,
        justificacion_d: ev.justificacion_d,
        nota_ib: ev.nota_ib,
        fortalezas: ev.fortalezas,
        areas_mejora: ev.areas_mejora,
        comentario_global: ev.comentario_global,
      });
      if (insertError) console.error(insertError);

      toast.success(`Evaluación completada · ${ev.puntuacion_total}/20 · IB ${ev.nota_ib}`);
      // Scroll to results
      setTimeout(() => {
        document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al evaluar.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
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
            Pega el texto literario, la pregunta de orientación y tu análisis. Recibirás
            una valoración por los cuatro criterios (A–D), tu puntuación sobre 20 y la
            nota IB estimada.
          </p>
        </div>

        {/* Form */}
        <Card className="p-6 sm:p-8 border-border">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <Label htmlFor="texto" className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Texto literario
              </Label>
              <Textarea
                id="texto"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={10}
                placeholder="Pega aquí el fragmento de prosa o poesía…"
                className="font-serif text-[15px] leading-relaxed resize-y min-h-[220px]"
              />
            </div>

            <div className="space-y-6">
              <div className="space-y-1.5">
                <Label htmlFor="pregunta" className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Pregunta de orientación
                </Label>
                <Input
                  id="pregunta"
                  value={pregunta}
                  onChange={(e) => setPregunta(e.target.value)}
                  placeholder="Ej.: ¿Cómo se construye la voz lírica…?"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="analisis" className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Tu análisis
                </Label>
                <Textarea
                  id="analisis"
                  value={analisis}
                  onChange={(e) => setAnalisis(e.target.value)}
                  rows={8}
                  placeholder="Escribe aquí tu comentario analítico…"
                  className="text-[15px] leading-relaxed resize-y min-h-[180px]"
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
            <EvaluacionPanel ev={evaluacion} />
          </section>
        )}
      </main>
    </div>
  );
}
