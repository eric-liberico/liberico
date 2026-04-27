import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { Sparkles, Loader2, ArrowRight, BookOpen } from "lucide-react";

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.innerText.trim();
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { texto_id?: string } => {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const result: { texto_id?: string } = {};
    if (typeof search.texto_id === "string" && UUID_RE.test(search.texto_id))
      result.texto_id = search.texto_id;
    return result;
  },
  component: CorrectorPage,
});

function CorrectorPage() {
  const { user, loading: authLoading, rol } = useAuth();
  const navigate = useNavigate();
  const { texto_id } = Route.useSearch();
  const [texto, setTexto] = useState("");
  const [pregunta, setPregunta] = useState("");
  const [analisis, setAnalisis] = useState("");
  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null);
  const [analisisPlanoGuardado, setAnalisisPlanoGuardado] = useState("");
  const [loading, setLoading] = useState(false);
  const [textoPreloading, setTextoPreloading] = useState(false);
  const [planEstado, setPlanEstado] = useState<
    | { tipo: "sin_perfil" }
    | { tipo: "diagnostico_pendiente" }
    | { tipo: "con_plan"; progreso: number }
    | null
  >(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (rol === "profesor") navigate({ to: "/profesor" });
  }, [user, authLoading, rol, navigate]);

  // Pre-rellenar el corrector si viene de la biblioteca
  useEffect(() => {
    if (!texto_id || !user) return;
    setTextoPreloading(true);
    supabase
      .from("textos_biblioteca")
      .select("fragmento, pregunta_orientacion")
      .eq("id", texto_id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error("No se pudo cargar el texto de la biblioteca.");
        } else {
          setTexto(data.fragmento);
          setPregunta(data.pregunta_orientacion);
          setAnalisis("");
          setEvaluacion(null);
        }
        setTextoPreloading(false);
      });
  }, [texto_id, user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: perfil } = await supabase
        .from("perfiles")
        .select("diagnostico_completado")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!perfil) {
        setPlanEstado({ tipo: "sin_perfil" });
        return;
      }

      const { data: plan } = await supabase
        .from("planes_estudio")
        .select("id")
        .eq("user_id", user.id)
        .eq("activo", true)
        .maybeSingle();

      if (!plan) {
        setPlanEstado({ tipo: "diagnostico_pendiente" });
        return;
      }

      const { data: tareas } = await supabase
        .from("tareas_plan")
        .select("completada")
        .eq("plan_id", plan.id);
      const total = tareas?.length ?? 0;
      const hechas = tareas?.filter((t) => t.completada).length ?? 0;
      const progreso = total ? Math.round((hechas / total) * 100) : 0;
      setPlanEstado({ tipo: "con_plan", progreso });
    })();
  }, [user]);

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
          texto_id,
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
        {/* Banner biblioteca */}
        {texto_id && (
          <div className="mb-6 flex items-center gap-3 p-4 rounded-lg border border-violet-300 bg-violet-50">
            <BookOpen className="h-4 w-4 text-violet-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-violet-800 font-medium">
                Texto de la biblioteca pre-cargado
              </div>
              <div className="text-xs text-violet-700 mt-0.5">
                Escribe tu análisis y evalúalo. Al terminar, el marco de análisis se desbloqueará en
                la{" "}
                <Link to="/biblioteca" className="underline">
                  Biblioteca
                </Link>
                .
              </div>
            </div>
            {textoPreloading && (
              <Loader2 className="h-4 w-4 animate-spin text-violet-500 shrink-0" />
            )}
          </div>
        )}

        {/* Banner plan */}
        {(planEstado?.tipo === "sin_perfil" || planEstado?.tipo === "diagnostico_pendiente") && (
          <Link
            to="/onboarding"
            className="mb-8 flex items-center justify-between gap-4 p-4 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition"
          >
            <div>
              <div className="font-medium text-ink text-sm">Completa tu diagnóstico inicial</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Genera tu plan de estudio personalizado para la Prueba 1.
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-primary shrink-0" />
          </Link>
        )}
        {planEstado?.tipo === "con_plan" && (
          <Link
            to="/mi-plan"
            className="mb-8 flex items-center justify-between gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent transition"
          >
            <div>
              <div className="font-medium text-ink text-sm">Tu plan de estudio</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Progreso: {planEstado.progreso}% completado
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        )}

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
                disabled={loading || textoPreloading}
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
            <EvaluacionPanel ev={evaluacion} analisisTexto={analisisPlanoGuardado} />
          </section>
        )}
      </main>
    </div>
  );
}
