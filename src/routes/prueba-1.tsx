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
import { JuegoEsperaEvaluacion } from "@/components/JuegoEsperaEvaluacion";
import { ImageUploadButton } from "@/components/ImageUploadButton";
import type { Evaluacion } from "@/lib/ib";
import { getFunctionErrorMessage } from "@/lib/functionErrors";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, History, Loader2, Sparkles, X } from "lucide-react";

type CriterioKey = "a" | "b" | "c" | "d";
const CRITERIO_LABEL: Record<
  CriterioKey,
  { letra: string; tab: "identificacion" | "efectos" | "reescritura" | "teoria"; ejercicio: string }
> = {
  a: { letra: "A", tab: "identificacion", ejercicio: "Identificación de recursos" },
  b: { letra: "B", tab: "efectos", ejercicio: "Análisis de efectos" },
  c: { letra: "C", tab: "reescritura", ejercicio: "Reescritura" },
  d: { letra: "D", tab: "teoria", ejercicio: "Recursos literarios" },
};

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.innerText.trim();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/prueba-1")({
  validateSearch: (search: Record<string, unknown>): { texto_id?: string } => ({
    texto_id:
      typeof search.texto_id === "string" && UUID_RE.test(search.texto_id)
        ? search.texto_id
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "LIBerico — Corrector Prueba 1 · IB Español A" },
      {
        name: "description",
        content:
          "Entrena tu comentario de texto guiado con feedback de nivel IB. Bandas A–D, nota estimada y solución anotada.",
      },
    ],
  }),
  component: Prueba1Page,
});

function Prueba1Page() {
  const { user, loading: authLoading, rol } = useAuth();
  const navigate = useNavigate();
  const { texto_id } = Route.useSearch();
  const [texto, setTexto] = useState("");
  const [pregunta, setPregunta] = useState("");
  const [analisis, setAnalisis] = useState("");
  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null);
  const [textoPlanoGuardado, setTextoPlanoGuardado] = useState("");
  const [analisisPlanoGuardado, setAnalisisPlanoGuardado] = useState("");
  const [loading, setLoading] = useState(false);
  const [bannerDebil, setBannerDebil] = useState<CriterioKey | null>(null);
  const [bannerVisible, setBannerVisible] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (rol === "profesor") navigate({ to: "/profesor" });
  }, [user, authLoading, rol, navigate]);

  // Pre-rellenar desde la biblioteca cuando llega ?texto_id=
  useEffect(() => {
    if (!texto_id || !user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("textos_practica_p1")
      .select("texto, pregunta")
      .eq("id", texto_id)
      .eq("activo", true)
      .maybeSingle()
      .then(({ data }: { data: { texto: string; pregunta: string } | null }) => {
        if (!data) return;
        setTexto(data.texto);
        setPregunta(data.pregunta);
        document.getElementById("form-p1")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
  }, [texto_id, user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("evaluaciones")
      .select("banda_a, banda_b, banda_c, banda_d")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const scores: Record<CriterioKey, number> = {
          a: data.banda_a,
          b: data.banda_b,
          c: data.banda_c,
          d: data.banda_d,
        };
        const min = Math.min(...Object.values(scores));
        const debil = (["a", "b", "c", "d"] as CriterioKey[]).find((k) => scores[k] === min)!;
        setBannerDebil(debil);
      });
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
    setTextoPlanoGuardado(textoPlano);
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
        console.error("Supabase functions error:", error);
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      const ev = data as Evaluacion;
      setEvaluacion(ev);
      toast.success(`Evaluación completada · ${ev.puntuacion_total}/20 · IB ${ev.nota_ib}`);
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
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Inicio
        </Link>

        {/* Hero */}
        <div className="max-w-3xl mb-10">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
            Corrector de análisis literario · Prueba 1
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink leading-tight">
            Evalúa tu comentario según los criterios oficiales del IB.
          </h1>
          <p className="mt-3 text-foreground/70 leading-relaxed">
            Pega el texto literario, la pregunta de orientación y tu análisis. Recibirás una
            valoración por los cuatro criterios (A–D), tu puntuación sobre 20 y la nota IB estimada.
          </p>
          <Link
            to="/historial"
            className="inline-flex items-center gap-1.5 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="h-3.5 w-3.5" />
            Ver mis evaluaciones anteriores
          </Link>
        </div>

        {/* Banner: criterio débil de la última evaluación */}
        {!evaluacion &&
          bannerDebil &&
          bannerVisible &&
          (() => {
            const cfg = CRITERIO_LABEL[bannerDebil];
            return (
              <div className="mb-6 relative rounded-lg border border-amber-300 bg-amber-50/60 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/30">
                <button
                  onClick={() => setBannerVisible(false)}
                  className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
                <p className="text-sm text-foreground/80 pr-6">
                  La última vez tu punto más débil fue el{" "}
                  <strong className="text-foreground">Criterio {cfg.letra}</strong>. ¿Practicamos
                  antes de tu siguiente análisis?
                </p>
                <div className="mt-3">
                  <Button
                    asChild
                    size="sm"
                    className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white gap-1.5 h-8 text-xs"
                  >
                    <Link to="/ejercicios" search={{ tab: cfg.tab }}>
                      {cfg.ejercicio}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })()}

        {/* Form */}
        <Card id="form-p1" className="p-6 sm:p-8 border-border">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Texto literario */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Texto literario
                </Label>
                <ImageUploadButton label="Subir foto" onTranscripcion={(t) => setTexto(t)} />
              </div>
              <p className="text-xs text-muted-foreground/70">
                Pega el poema, fragmento de prosa o texto dramático del examen. Formato libre,
                conserva el original.
              </p>
              <RichTextEditor
                value={texto}
                onChange={setTexto}
                placeholder="Pega aquí el fragmento literario…"
                minHeight="220px"
                className="font-serif"
                disabled={loading}
              />
            </div>

            <div className="space-y-6">
              {/* Pregunta */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="pregunta"
                  className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
                >
                  Pregunta de orientación
                </Label>
                <p className="text-xs text-muted-foreground/70">
                  Si el examen no incluye pregunta explícita, escribe el aspecto central que vas a
                  desarrollar.
                </p>
                <Input
                  id="pregunta"
                  value={pregunta}
                  onChange={(e) => setPregunta(e.target.value)}
                  placeholder="Ej.: ¿Cómo construye el hablante lírico la imagen del tiempo?"
                  disabled={loading}
                />
              </div>

              {/* Análisis */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Tu análisis
                  </Label>
                  <ImageUploadButton label="Subir foto" onTranscripcion={(t) => setAnalisis(t)} />
                </div>
                <p className="text-xs text-muted-foreground/70">
                  Escribe o pega tu respuesta tal como la entregarías: introducción con tesis,
                  cuerpo analítico y conclusión.
                </p>
                <RichTextEditor
                  value={analisis}
                  onChange={setAnalisis}
                  placeholder="Escribe aquí tu comentario analítico…"
                  minHeight="180px"
                  disabled={loading}
                  showWordCount
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Tus evaluaciones se guardan automáticamente en{" "}
              <span className="text-foreground/80">Progreso</span>.
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

        {loading && (
          <div className="mt-6">
            <JuegoEsperaEvaluacion modo="prueba1" />
          </div>
        )}

        {evaluacion && (
          <section id="resultados" className="mt-12 scroll-mt-20">
            <EvaluacionPanel
              ev={evaluacion}
              textoLiterario={textoPlanoGuardado}
              analisisTexto={analisisPlanoGuardado}
              resultadoInicialBasico
              autoGenerarReescrituras
              onEvaluacionChange={setEvaluacion}
            />
          </section>
        )}
      </main>
    </div>
  );
}
