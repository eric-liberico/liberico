import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
import type { Evaluacion } from "@/lib/ib";
import { getFunctionErrorMessage } from "@/lib/functionErrors";
import { toast } from "sonner";
import { ArrowRight, BarChart2, Check, History, Loader2, PenLine, Sparkles, X } from "lucide-react";

type CriterioKey = "a" | "b" | "c" | "d";
const CRITERIO_LABEL: Record<CriterioKey, { letra: string; tab: string; ejercicio: string }> = {
  a: { letra: "A", tab: "identificacion", ejercicio: "Identificación de recursos" },
  b: { letra: "B", tab: "efectos",        ejercicio: "Análisis de efectos" },
  c: { letra: "C", tab: "reescritura",    ejercicio: "Reescritura" },
  d: { letra: "D", tab: "teoria",         ejercicio: "Recursos literarios" },
};

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.innerText.trim();
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LIBerico — Prueba 1 IB Español A" },
      {
        name: "description",
        content:
          "Entrena tu comentario de Prueba 1 con feedback de nivel IB. Bandas A–D, nota estimada y solución anotada.",
      },
    ],
  }),
  component: IndexPage,
});

function IndexPage() {
  const { user, loading: authLoading } = useAuth();
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Cargando…
      </div>
    );
  }
  if (!user) return <LandingPage />;
  return <CorrectorPage />;
}

function LandingPage() {
  const demoRef = useRef<HTMLDivElement>(null);

  const scrollToDemo = () => {
    demoRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* ── HERO ──────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-block text-[10px] uppercase tracking-[0.22em] text-primary border border-primary/30 bg-primary/5 px-3 py-1 rounded-full mb-6">
            Español A: Literatura · IB Nivel Medio
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl text-ink leading-tight mb-5">
            Entrena tu Prueba 1
            <br className="hidden sm:block" /> con feedback de nivel IB
          </h1>
          <p className="text-base sm:text-lg text-foreground/65 max-w-xl mx-auto mb-8 leading-relaxed">
            Pega tu análisis literario, recibe bandas A–D, nota estimada y una solución anotada. La
            IA te explica exactamente cómo subir de banda.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/login">
              <Button size="lg" className="w-full sm:w-auto px-8">
                Corregir mi análisis
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={scrollToDemo}>
              Ver cómo funciona
            </Button>
          </div>
        </div>
      </section>

      {/* ── ANTES / DESPUÉS ───────────────────────────────── */}
      <section ref={demoRef} className="py-14 px-4 bg-accent/20">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-2xl sm:text-3xl text-ink text-center mb-2">
            La diferencia entre identificar y analizar
          </h2>
          <p className="text-center text-foreground/55 text-sm mb-8">
            Así enseña LIBerico a subir de banda en el criterio B
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-lg border border-rose-200 bg-rose-50/50">
              <div className="text-[10px] uppercase tracking-[0.18em] text-rose-700 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
                Banda 2–3 · Identificación
              </div>
              <p className="text-sm text-foreground/80 italic leading-relaxed">
                "El poema usa anáforas y metáforas para mostrar el estado emocional del hablante
                lírico. Hay muchos recursos que generan un efecto triste y melancólico."
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {["Nombra sin analizar", "Sin efecto en lector", "Vago"].map((t) => (
                  <span
                    key={t}
                    className="text-[10px] px-2 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="p-5 rounded-lg border border-emerald-200 bg-emerald-50/50">
              <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-700 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Banda 4–5 · Análisis
              </div>
              <p className="text-sm text-foreground/80 italic leading-relaxed">
                "La anáfora de «Puedo escribir» estructura el poema como una lucha interna: cada vez
                que el verso regresa, el hablante ha fracasado de nuevo en separarse del recuerdo.
                La repetición mimetiza la imposibilidad de olvidar."
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {["Efecto explicado", "Conecta con tema", "Nivel IB"].map((t) => (
                  <span
                    key={t}
                    className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-foreground/40 mt-4">
            Basado en el Poema XX de Pablo Neruda
          </p>
        </div>
      </section>

      {/* ── QUÉ RECIBES ───────────────────────────────────── */}
      <section className="py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-2xl sm:text-3xl text-ink text-center mb-8">
            Qué recibes en cada corrección
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {(
              [
                {
                  icon: BarChart2,
                  titulo: "Bandas A–D y nota IB estimada",
                  desc: "Evaluación por los cuatro criterios oficiales: Comprensión, Análisis, Organización y Lenguaje. Con nota 1–7 calculada según la tabla de conversión del IB.",
                },
                {
                  icon: PenLine,
                  titulo: "Tu análisis anotado",
                  desc: "Tu propio texto marcado con highlights: qué funciona, qué falta, qué cambiar. No una solución genérica: feedback sobre lo que tú escribiste.",
                },
                {
                  icon: Sparkles,
                  titulo: "Reescrituras de banda alta",
                  desc: "Fragmentos clave de tu análisis reescritos al nivel de banda 5. Ves exactamente cómo sonaría un párrafo tuyo elevado.",
                },
                {
                  icon: History,
                  titulo: "Historial de progreso",
                  desc: "Guarda todas tus correcciones y sigue la evolución de tus bandas. Ve cómo mejoras criterio a criterio.",
                },
              ] as const
            ).map((f) => (
              <div
                key={f.titulo}
                className="p-5 rounded-lg border border-border bg-card flex gap-4"
              >
                <div className="shrink-0 w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                  <f.icon className="h-[18px] w-[18px] text-primary" />
                </div>
                <div>
                  <div className="font-medium text-sm text-ink mb-1">{f.titulo}</div>
                  <p className="text-xs text-foreground/65 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3 PASOS ───────────────────────────────────────── */}
      <section className="py-14 px-4 bg-accent/20">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-2xl sm:text-3xl text-ink text-center mb-10">Tres pasos</h2>
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-0">
            {[
              {
                n: "1",
                titulo: "Pega el texto y tu análisis",
                desc: "El texto literario del examen y tu respuesta escrita. Sin límite de formato.",
              },
              {
                n: "2",
                titulo: "Recibe el feedback",
                desc: "Bandas por criterio, nota estimada, solución anotada y reescrituras en segundos.",
              },
              {
                n: "3",
                titulo: "Reescribe con guía concreta",
                desc: "Usa las anotaciones y reescrituras para escribir una versión mejorada.",
              },
            ].map((paso) => (
              <div key={paso.n} className="flex-1 flex flex-col items-center text-center sm:px-6">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-serif text-lg font-bold mb-4">
                  {paso.n}
                </div>
                <div className="font-medium text-sm text-ink mb-1.5">{paso.titulo}</div>
                <p className="text-xs text-foreground/60 leading-relaxed">{paso.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONFIANZA ─────────────────────────────────────── */}
      <section className="py-12 px-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {[
            "Calibrado con los criterios oficiales de Español A: Literatura, IB Nivel Medio.",
            "La IA no sustituye tu voz: te ayuda a encontrarla. Tu análisis, tus ideas, tu estilo.",
            "Sin anuncios. Sin suscripciones por ahora.",
          ].map((t) => (
            <div key={t} className="flex items-start gap-3 text-sm text-foreground/60">
              <Check className="h-4 w-4 text-primary/70 shrink-0 mt-0.5" />
              <span>{t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────── */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-2xl sm:text-3xl text-ink mb-4 leading-snug">
            Tu próximo comentario puede ser más preciso,
            <br className="hidden sm:block" /> más profundo y más IB.
          </h2>
          <p className="text-foreground/50 text-sm mb-8">
            ¿Eres docente?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Accede al panel de profesor
            </Link>
          </p>
          <Link to="/login">
            <Button size="lg" className="px-10">
              Empezar ahora
            </Button>
          </Link>
        </div>
      </section>

      {/* ── PIE ───────────────────────────────────────────── */}
      <footer className="border-t border-border py-6 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-foreground/40">
          <span>© 2026 LIBerico · Español A: Literatura IB</span>
          <div className="flex items-center gap-4">
            <span>No afiliado al International Baccalaureate Organization</span>
            <Link to="/privacidad" className="hover:text-foreground/70 underline underline-offset-2">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CorrectorPage() {
  const { user, loading: authLoading, rol } = useAuth();
  const navigate = useNavigate();
  const [texto, setTexto] = useState("");
  const [pregunta, setPregunta] = useState("");
  const [analisis, setAnalisis] = useState("");
  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null);
  const [analisisPlanoGuardado, setAnalisisPlanoGuardado] = useState("");
  const [loading, setLoading] = useState(false);
  const [bannerDebil, setBannerDebil] = useState<CriterioKey | null>(null);
  const [bannerVisible, setBannerVisible] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    if (rol === "profesor") navigate({ to: "/profesor" });
  }, [user, authLoading, rol, navigate]);

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

        {/* Banner: siguiente paso de la última evaluación */}
        {!evaluacion && bannerDebil && bannerVisible && (() => {
          const cfg = CRITERIO_LABEL[bannerDebil];
          return (
            <div className="mb-6 flex items-start justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50/60 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/30">
              <p className="text-sm text-foreground/80">
                La última vez tu punto más débil fue el{" "}
                <strong className="text-foreground">Criterio {cfg.letra}</strong>. ¿Practicamos antes
                de tu siguiente análisis?
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  asChild
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5 h-8 text-xs"
                >
                  <Link to="/ejercicios" search={{ tab: cfg.tab as "identificacion" | "efectos" | "reescritura" | "teoria" }}>
                    {cfg.ejercicio}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
                <button
                  onClick={() => setBannerVisible(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })()}

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

        {/* Juego de espera */}
        {loading && (
          <div className="mt-6">
            <JuegoEsperaEvaluacion modo="prueba1" />
          </div>
        )}

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
