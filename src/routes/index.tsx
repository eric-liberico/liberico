import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  GraficoProgresoIB,
  type DatoP1Grafico,
  type DatoP2Grafico,
  type DatoOralGrafico,
} from "@/components/GraficoProgresoIB";
import {
  ArrowRight,
  BarChart2,
  BookOpen,
  CalendarDays,
  Check,
  GraduationCap,
  History,
  Mic,
  PenLine,
  Sparkles,
} from "lucide-react";

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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LIBerico — IB Español A: Literatura" },
      {
        name: "description",
        content:
          "Prepara Prueba 1, Prueba 2 y Oral Individual para IB Español A: Literatura NM. Feedback con bandas A–D, nota estimada y solución anotada.",
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
  return <DashboardPage />;
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

function DashboardPage() {
  const { rol } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ p1: 0, p2: 0, oral: 0 });
  const [debilenCriterio, setDebilenCriterio] = useState<CriterioKey | null>(null);
  const [chartData, setChartData] = useState<{
    p1: DatoP1Grafico[];
    p2: DatoP2Grafico[];
    oral: DatoOralGrafico[];
  }>({ p1: [], p2: [], oral: [] });

  useEffect(() => {
    if (rol === "profesor") navigate({ to: "/profesor" });
    if (rol === "admin") navigate({ to: "/admin" });
  }, [rol, navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      const [
        { count: p1 },
        { count: p2 },
        { count: oral },
        { data: lastP1 },
        { data: p1History },
        { data: p2History },
        { data: oralHistory },
      ] = await Promise.all([
        supabase.from("evaluaciones").select("id", { count: "exact", head: true }),
        supabase.from("evaluaciones_prueba2").select("id", { count: "exact", head: true }),
        supabase.from("evaluaciones_oral").select("id", { count: "exact", head: true }),
        supabase
          .from("evaluaciones")
          .select("banda_a, banda_b, banda_c, banda_d")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("evaluaciones")
          .select("created_at, banda_a, banda_b, banda_c, banda_d, nota_ib")
          .order("created_at", { ascending: true }),
        supabase
          .from("evaluaciones_prueba2")
          .select(
            "created_at, criterio_a, criterio_b1, criterio_b2, criterio_c, criterio_d, puntuacion_total",
          )
          .order("created_at", { ascending: true }),
        supabase
          .from("evaluaciones_oral")
          .select("created_at, criterio_a, criterio_b, criterio_c, criterio_d, puntuacion_total")
          .order("created_at", { ascending: true }),
      ]);
      setStats({ p1: p1 ?? 0, p2: p2 ?? 0, oral: oral ?? 0 });
      if (lastP1) {
        const scores: Record<CriterioKey, number> = {
          a: lastP1.banda_a,
          b: lastP1.banda_b,
          c: lastP1.banda_c,
          d: lastP1.banda_d,
        };
        const min = Math.min(...Object.values(scores));
        setDebilenCriterio(
          (["a", "b", "c", "d"] as CriterioKey[]).find((k) => scores[k] === min) ?? null,
        );
      }
      setChartData({
        p1: (p1History ?? []) as DatoP1Grafico[],
        p2: (p2History ?? []) as DatoP2Grafico[],
        oral: (oralHistory ?? []) as DatoOralGrafico[],
      });
    };
    fetchStats();
  }, []);

  const totalEvals = stats.p1 + stats.p2 + stats.oral;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14">
        {/* Encabezado */}
        <div className="mb-8">
          <h1 className="font-serif text-2xl sm:text-3xl text-ink">¿En qué trabajamos hoy?</h1>
          {totalEvals > 0 && (
            <p className="text-sm text-muted-foreground mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
              {stats.p1 > 0 && (
                <span>
                  {stats.p1} {stats.p1 === 1 ? "evaluación" : "evaluaciones"} P1
                </span>
              )}
              {stats.p2 > 0 && (
                <span>
                  · {stats.p2} {stats.p2 === 1 ? "evaluación" : "evaluaciones"} P2
                </span>
              )}
              {stats.oral > 0 && (
                <span>
                  · {stats.oral} {stats.oral === 1 ? "oral" : "orales"}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Siguiente paso */}
        {debilenCriterio && (
          <div className="mb-8 p-4 rounded-lg bg-amber-50/60 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-700 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 text-sm text-foreground/80">
              Tu punto más débil es el{" "}
              <strong className="text-foreground">
                Criterio {CRITERIO_LABEL[debilenCriterio].letra}
              </strong>
              . Practica antes de tu próxima evaluación.
            </div>
            <Link to="/ejercicios" search={{ tab: CRITERIO_LABEL[debilenCriterio].tab }}>
              <Button
                size="sm"
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white gap-1.5 shrink-0"
              >
                {CRITERIO_LABEL[debilenCriterio].ejercicio}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        )}

        {/* Módulos */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Evaluar */}
          <Card className="p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-base text-ink">Evaluar</h2>
                <p className="text-xs text-muted-foreground">Bandas A–D + nota IB estimada</p>
              </div>
            </div>
            <nav className="flex flex-col gap-1.5">
              {(
                [
                  {
                    to: "/prueba-1",
                    label: "Prueba 1 — Comentario de texto",
                    icon: <BookOpen className="h-3.5 w-3.5" />,
                  },
                  {
                    to: "/prueba-2",
                    label: "Prueba 2 — Ensayo comparativo",
                    icon: <PenLine className="h-3.5 w-3.5" />,
                  },
                  {
                    to: "/oral",
                    label: "Oral Individual — Guion",
                    icon: <Mic className="h-3.5 w-3.5" />,
                  },
                ] as const
              ).map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm border border-border/60 hover:bg-accent text-foreground/75 hover:text-foreground transition-colors"
                >
                  {item.icon}
                  {item.label}
                  <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground/60" />
                </Link>
              ))}
            </nav>
          </Card>

          {/* Practicar */}
          <Card className="p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
                <PenLine className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-base text-ink">Practicar</h2>
                <p className="text-xs text-muted-foreground">Ejercicios, simulaciones y teoría</p>
              </div>
            </div>
            <nav className="flex flex-col gap-1.5">
              {(
                [
                  {
                    to: "/ejercicios",
                    label: "Ejercicios por criterio",
                    icon: <PenLine className="h-3.5 w-3.5" />,
                  },
                  {
                    to: "/simular-oral",
                    label: "Simulador de Oral",
                    icon: <Mic className="h-3.5 w-3.5" />,
                  },
                  {
                    to: "/teoria",
                    label: "Teoría literaria",
                    icon: <GraduationCap className="h-3.5 w-3.5" />,
                  },
                ] as const
              ).map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm border border-border/60 hover:bg-accent text-foreground/75 hover:text-foreground transition-colors"
                >
                  {item.icon}
                  {item.label}
                  <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground/60" />
                </Link>
              ))}
            </nav>
          </Card>

          {/* Progreso */}
          <Card className="p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
                <BarChart2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-semibold text-base text-ink">Progreso</h2>
                <p className="text-xs text-muted-foreground">Historial y evolución de bandas</p>
              </div>
            </div>
            <Link to="/historial">
              <Button variant="outline" className="w-full gap-2 justify-between">
                <span className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Ver mis evaluaciones
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </Link>
          </Card>

          {/* Tutoría */}
          <Card className="p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-md bg-purple-500/10 flex items-center justify-center shrink-0">
                <CalendarDays className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold text-base text-ink">Tutoría 1:1</h2>
                <p className="text-xs text-muted-foreground">
                  Sesión de calibración con profesora IB
                </p>
              </div>
            </div>
            <Link to="/reservar-sesion">
              <Button variant="outline" className="w-full gap-2 justify-between">
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Reservar sesión (75 min)
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </Link>
          </Card>
        </div>

        {/* Gráfico de progresión */}
        <Card className="p-6 mt-4">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-9 w-9 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
              <BarChart2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-ink">Tu progresión</h2>
              <p className="text-xs text-muted-foreground">
                Nota IB por prueba a lo largo del tiempo
              </p>
            </div>
          </div>
          <GraficoProgresoIB p1={chartData.p1} p2={chartData.p2} oral={chartData.oral} />
        </Card>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LANDING (visitantes no autenticados)
// ─────────────────────────────────────────────────────────────────────────────

function LandingPage() {
  const demoRef = useRef<HTMLDivElement>(null);
  const scrollToDemo = () => demoRef.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* ── HERO ── */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-block text-[10px] uppercase tracking-[0.22em] text-primary border border-primary/30 bg-primary/5 px-3 py-1 rounded-full mb-6">
            Español A: Literatura · IB Nivel Medio
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl text-ink leading-tight mb-5">
            Prepara el IB de Español A
            <br className="hidden sm:block" /> con el estándar real del examen
          </h1>
          <p className="text-base sm:text-lg text-foreground/65 max-w-xl mx-auto mb-8 leading-relaxed">
            Prueba 1, Prueba 2 y Oral Individual. Creado por una profesora estandarizadora del IB
            con muchos años de experiencia. Las mismas bandas y criterios que aplican los
            examinadores oficiales.
          </p>

          {/* Module pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {[
              { label: "Prueba 1", desc: "Comentario de texto" },
              { label: "Prueba 2", desc: "Ensayo comparativo" },
              {
                label: "Oral Individual",
                desc: "Presentación + preguntas",
                icon: <Mic className="h-3 w-3" />,
              },
            ].map((m) => (
              <div
                key={m.label}
                className="flex items-center gap-1.5 text-xs border border-border bg-card px-3 py-1.5 rounded-full text-foreground/70"
              >
                {m.icon}
                <span className="font-medium text-foreground/90">{m.label}</span>
                <span className="text-foreground/45">·</span>
                <span>{m.desc}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/login">
              <Button size="lg" className="w-full sm:w-auto px-8">
                Empezar gratis
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={scrollToDemo}>
              Ver cómo funciona
            </Button>
          </div>
        </div>
      </section>

      {/* ── ANTES / DESPUÉS ── */}
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

      {/* ── QUÉ RECIBES ── */}
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

      {/* ── 3 PASOS ── */}
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

      {/* ── QUIÉN HAY DETRÁS ── */}
      <section className="py-12 px-4">
        <div className="max-w-2xl mx-auto bg-accent/40 rounded-xl p-6 sm:p-8 flex gap-4 items-start">
          <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
              Quién hay detrás
            </p>
            <p className="font-serif text-lg text-ink mb-2">Una profesora estandarizadora del IB</p>
            <p className="text-sm text-foreground/70 leading-relaxed">
              LIBerico fue creado por una profesora de Español A: Literatura con muchos años de
              experiencia en el IB y participación en procesos oficiales de estandarización del IBO.
              Las bandas, los criterios y los ejemplos de la plataforma reflejan exactamente lo que
              los examinadores del IB valoran — no una interpretación: el estándar real.
            </p>
          </div>
        </div>
      </section>

      {/* ── CONFIANZA ── */}
      <section className="py-10 px-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {[
            "Criterios y bandas calibrados sobre exámenes reales por una estandarizadora del IBO.",
            "Tu análisis, tus ideas, tu estilo. El feedback señala qué mejorar sin imponerte una voz ajena.",
            "Sin anuncios. Sin suscripciones por ahora.",
          ].map((t) => (
            <div key={t} className="flex items-start gap-3 text-sm text-foreground/60">
              <Check className="h-4 w-4 text-primary/70 shrink-0 mt-0.5" />
              <span>{t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ── */}
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

      {/* ── PIE ── */}
      <footer className="border-t border-border py-6 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-foreground/40">
          <span>© 2026 LIBerico · Español A: Literatura IB</span>
          <div className="flex items-center gap-4">
            <span>No afiliado al International Baccalaureate Organization</span>
            <Link
              to="/privacidad"
              className="hover:text-foreground/70 underline underline-offset-2"
            >
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
