import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  GraficoProgresoIB,
  type DatoP1Grafico,
  type DatoP2Grafico,
  type DatoOralGrafico,
} from "@/components/GraficoProgresoIB";
import { TarjetaRacha } from "@/components/gamificacion/TarjetaRacha";
import { BarraXP } from "@/components/gamificacion/BarraXP";
import { useGamificacion } from "@/hooks/useGamificacion";
import {
  ArrowRight,
  BarChart2,
  BookOpen,
  CalendarDays,
  Check,
  GraduationCap,
  History,
  Library,
  Mic,
  PenLine,
  Sparkles,
} from "lucide-react";
import { notaIBFinal, escalarP1, escalarP2, escalarOral } from "@/lib/ib";
import { COURSES } from "@/lib/ib-courses";

type CriterioKey = "a" | "b" | "c" | "d";
const getCriterioLabel = (
  isEN: boolean,
): Record<
  CriterioKey,
  { letra: string; tab: "identificacion" | "efectos" | "reescritura" | "teoria"; ejercicio: string }
> =>
  isEN
    ? {
        a: { letra: "A", tab: "identificacion", ejercicio: "Resource identification" },
        b: { letra: "B", tab: "efectos", ejercicio: "Effect analysis" },
        c: { letra: "C", tab: "reescritura", ejercicio: "Rewriting" },
        d: { letra: "D", tab: "teoria", ejercicio: "Literary resources" },
      }
    : {
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

const DASHBOARD_ES = {
  heading: "¿En qué trabajamos hoy?",
  evaluar_title: "Evaluar",
  evaluar_sub: "Bandas A–D + nota estimada",
  p1_link: "Prueba 1 — Comentario de texto",
  p2_link: "Prueba 2 — Ensayo comparativo",
  oral_link: "Oral Individual — Guion",
  practicar_title: "Practicar",
  practicar_sub: "Ejercicios, simulaciones y teoría",
  biblioteca_link: "Biblioteca de textos P1",
  ejercicios_link: "Ejercicios por criterio",
  simular_link: "Simulador de Oral",
  teoria_link: "Teoría literaria",
  progreso_title: "Progreso",
  progreso_sub: "Historial y evolución de bandas",
  ver_evals: "Ver mis evaluaciones",
  tutoria_title: "Tutoría 1:1",
  tutoria_sub: "Sesión de calibración con profesora IB",
  reservar: "Reservar sesión (75 min)",
  nota_final_label: "Nota final estimada",
  nota_final_sub: "Evaluaciones más recientes de cada prueba",
  progresion_title: "Tu progresión",
  progresion_sub: "Nota por prueba a lo largo del tiempo",
  debil_prefix: "Tu punto más débil es el Criterio",
  debil_suffix: ". Practica antes de tu próxima evaluación.",
  stats_p1: (n: number) => `${n} ${n === 1 ? "evaluación" : "evaluaciones"} P1`,
  stats_p2: (n: number) => `${n} ${n === 1 ? "evaluación" : "evaluaciones"} P2`,
  stats_oral: (n: number) => `${n} ${n === 1 ? "oral" : "orales"}`,
  nota_ib_label: "Nota",
  puntos_compuestos: (n: number) => `${n}/100 puntos compuestos`,
};

const DASHBOARD_EN: typeof DASHBOARD_ES = {
  heading: "What are we working on today?",
  evaluar_title: "Assess",
  evaluar_sub: "Criteria A–D + estimated grade",
  p1_link: "Paper 1 — Literary analysis",
  p2_link: "Paper 2 — Comparative essay",
  oral_link: "Individual Oral — Script",
  practicar_title: "Practise",
  practicar_sub: "Exercises, simulations and theory",
  biblioteca_link: "Paper 1 text library",
  ejercicios_link: "Exercises by criterion",
  simular_link: "Oral simulator",
  teoria_link: "Literary theory",
  progreso_title: "Progress",
  progreso_sub: "History and band evolution",
  ver_evals: "View my assessments",
  tutoria_title: "1:1 Tutoring",
  tutoria_sub: "Calibration session with IB teacher",
  reservar: "Book session (75 min)",
  nota_final_label: "Estimated final grade",
  nota_final_sub: "Most recent assessment per component",
  progresion_title: "Your progress",
  progresion_sub: "grade per component over time",
  debil_prefix: "Your weakest criterion is Criterion",
  debil_suffix: ". Practise before your next assessment.",
  stats_p1: (n: number) => `${n} P1 ${n === 1 ? "analysis" : "analyses"}`,
  stats_p2: (n: number) => `${n} P2 ${n === 1 ? "essay" : "essays"}`,
  stats_oral: (n: number) => `${n} oral${n === 1 ? "" : "s"}`,
  nota_ib_label: "Grade",
  puntos_compuestos: (n: number) => `${n}/100 composite points`,
};

function DashboardPage() {
  const { rol, courseKey } = useAuth();
  const isEN = useUiLang() === "en";
  const navigate = useNavigate();
  const gamif = useGamificacion();
  const t = isEN ? DASHBOARD_EN : DASHBOARD_ES;
  const isEnglishA = courseKey === "english-a-literature";
  const caps = COURSES[courseKey]?.capabilities ?? {
    paper1Enabled: true,
    paper2Enabled: true,
    oralEnabled: true,
    practiceLibrary: true,
    oralSimulator: true,
    studyPlan: true,
    exercises: true,
    theory: true,
    questionBank: true,
  };
  const criterioLabel = getCriterioLabel(isEN);
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
    setStats({ p1: 0, p2: 0, oral: 0 });
    setDebilenCriterio(null);
    setChartData({ p1: [], p2: [], oral: [] });
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
        supabase
          .from("evaluaciones")
          .select("id", { count: "exact", head: true })
          .eq("course_key", courseKey),
        supabase
          .from("evaluaciones_prueba2")
          .select("id", { count: "exact", head: true })
          .eq("course_key", courseKey),
        supabase
          .from("evaluaciones_oral")
          .select("id", { count: "exact", head: true })
          .eq("course_key", courseKey),
        supabase
          .from("evaluaciones")
          .select("banda_a, banda_b, banda_c, banda_d")
          .eq("course_key", courseKey)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("evaluaciones")
          .select("created_at, banda_a, banda_b, banda_c, banda_d, nota_ib")
          .eq("course_key", courseKey)
          .order("created_at", { ascending: true }),
        supabase
          .from("evaluaciones_prueba2")
          .select(
            "created_at, criterio_a, criterio_b1, criterio_b2, criterio_c, criterio_d, puntuacion_total",
          )
          .eq("course_key", courseKey)
          .order("created_at", { ascending: true }),
        supabase
          .from("evaluaciones_oral")
          .select("created_at, criterio_a, criterio_b, criterio_c, criterio_d, puntuacion_total")
          .eq("course_key", courseKey)
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
  }, [courseKey]);

  const totalEvals = stats.p1 + stats.p2 + stats.oral;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14">
        {/* Encabezado */}
        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl text-ink">{t.heading}</h1>
            {!gamif.loading && (
              <div className="flex items-center gap-2 flex-wrap">
                <TarjetaRacha racha={gamif.racha} rachaMaxima={gamif.rachaMaxima} />
              </div>
            )}
          </div>
          {totalEvals > 0 && (
            <p className="text-sm text-muted-foreground mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
              {stats.p1 > 0 && <span>{t.stats_p1(stats.p1)}</span>}
              {stats.p2 > 0 && <span>· {t.stats_p2(stats.p2)}</span>}
              {stats.oral > 0 && <span>· {t.stats_oral(stats.oral)}</span>}
            </p>
          )}
          {!gamif.loading && gamif.xp > 0 && (
            <div className="mt-3 max-w-xs">
              <BarraXP xp={gamif.xp} notaMedia={gamif.notaMedia} />
            </div>
          )}
        </div>

        {/* Siguiente paso */}
        {debilenCriterio && (
          <div className="mb-8 p-4 rounded-lg bg-amber-50/60 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-700 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 text-sm text-foreground/80">
              {t.debil_prefix}{" "}
              <strong className="text-foreground">{criterioLabel[debilenCriterio].letra}</strong>
              {t.debil_suffix}
            </div>
            <Link to="/ejercicios" search={{ tab: criterioLabel[debilenCriterio].tab }}>
              <Button
                size="sm"
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white gap-1.5 shrink-0"
              >
                {criterioLabel[debilenCriterio].ejercicio}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        )}

        {/* Nota final estimada */}
        {(() => {
          const ultimaP1 = chartData.p1.at(-1);
          const ultimaP2 = chartData.p2.at(-1);
          const ultimaOral = chartData.oral.at(-1);
          if (!ultimaP1 || !ultimaP2 || !ultimaOral) return null;
          const p1Raw =
            (ultimaP1.banda_a ?? 0) +
            (ultimaP1.banda_b ?? 0) +
            (ultimaP1.banda_c ?? 0) +
            (ultimaP1.banda_d ?? 0);
          const p2Raw = ultimaP2.puntuacion_total;
          const oralRaw = ultimaOral.puntuacion_total;
          const escP1 = escalarP1(p1Raw);
          const escP2 = escalarP2(p2Raw);
          const escOral = escalarOral(oralRaw);
          const total = escP1 + escP2 + escOral;
          const nota = notaIBFinal(total);
          return (
            <div className="mb-4 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="text-center shrink-0">
                  <div className="font-serif text-5xl font-bold text-primary leading-none">
                    {nota}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                    {t.nota_ib_label}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-ink">{t.nota_final_label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.nota_final_sub} · {t.puntos_compuestos(total)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      { label: "P1", raw: p1Raw, max: 20, esc: escP1, contrib: 35 },
                      { label: "P2", raw: p2Raw, max: 25, esc: escP2, contrib: 35 },
                      { label: "Oral", raw: oralRaw, max: 40, esc: escOral, contrib: 30 },
                    ].map((c) => (
                      <span
                        key={c.label}
                        className="text-[11px] px-2 py-0.5 rounded border border-border bg-background text-muted-foreground"
                      >
                        {c.label} {c.raw}/{c.max} → {c.esc}/{c.contrib}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Módulos */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Evaluar */}
          <Card className="p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-base text-ink">{t.evaluar_title}</h2>
                <p className="text-xs text-muted-foreground">{t.evaluar_sub}</p>
              </div>
            </div>
            <nav className="flex flex-col gap-1.5">
              {(
                [
                  {
                    to: "/prueba-1",
                    label: t.p1_link,
                    icon: <BookOpen className="h-3.5 w-3.5" />,
                  },
                  {
                    to: "/prueba-2",
                    label: t.p2_link,
                    icon: <PenLine className="h-3.5 w-3.5" />,
                  },
                  {
                    to: "/oral",
                    label: t.oral_link,
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
                <h2 className="font-semibold text-base text-ink">{t.practicar_title}</h2>
                <p className="text-xs text-muted-foreground">{t.practicar_sub}</p>
              </div>
            </div>
            <nav className="flex flex-col gap-1.5">
              {(
                [
                  {
                    to: "/biblioteca",
                    label: t.biblioteca_link,
                    icon: <Library className="h-3.5 w-3.5" />,
                    show: caps.practiceLibrary,
                  },
                  {
                    to: "/ejercicios",
                    label: t.ejercicios_link,
                    icon: <PenLine className="h-3.5 w-3.5" />,
                    show: caps.exercises,
                  },
                  {
                    to: "/simular-oral",
                    label: t.simular_link,
                    icon: <Mic className="h-3.5 w-3.5" />,
                    show: caps.oralSimulator,
                  },
                  {
                    to: "/teoria",
                    label: t.teoria_link,
                    icon: <GraduationCap className="h-3.5 w-3.5" />,
                    show: caps.theory,
                  },
                ] as const
              )
                .filter((item) => item.show)
                .map((item) => (
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
                <h2 className="font-semibold text-base text-ink">{t.progreso_title}</h2>
                <p className="text-xs text-muted-foreground">{t.progreso_sub}</p>
              </div>
            </div>
            <Link to="/historial">
              <Button variant="outline" className="w-full gap-2 justify-between">
                <span className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  {t.ver_evals}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </Link>
          </Card>

          {!isEnglishA && (
            <Card className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-md bg-purple-500/10 flex items-center justify-center shrink-0">
                  <CalendarDays className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-base text-ink">{t.tutoria_title}</h2>
                  <p className="text-xs text-muted-foreground">{t.tutoria_sub}</p>
                </div>
              </div>
              <Link to="/reservar-sesion">
                <Button variant="outline" className="w-full gap-2 justify-between">
                  <span className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {t.reservar}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </Link>
            </Card>
          )}
        </div>

        {/* Gráfico de progresión */}
        <Card className="p-6 mt-4">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-9 w-9 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
              <BarChart2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-ink">{t.progresion_title}</h2>
              <p className="text-xs text-muted-foreground">{t.progresion_sub}</p>
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

type LandingLang = "es" | "en";
const LANDING_LANG_STORAGE_KEY = "liberico.landingLang";

function getInitialLandingLang(): LandingLang {
  try {
    const stored = localStorage.getItem(LANDING_LANG_STORAGE_KEY);
    if (stored === "en" || stored === "es") return stored;
  } catch {
    return "es";
  }
  try {
    return navigator.language.startsWith("en") ? "en" : "es";
  } catch {
    return "es";
  }
  return "es";
}

const LANDING_COPY_ES = {
  login_cta: "Iniciar sesión",
  badge: "IB Language A · Español A & English A",
  h1: "Feedback IB para mejorar tu análisis literario",
  sub: "Prueba 1, Prueba 2 y Oral Individual. Desarrollado alrededor de los criterios oficiales del IB y calibrado con criterio docente experto.",
  cta_primary: "Empezar",
  cta_demo: "Ver cómo funciona",
  modules: [
    { label: "Prueba 1", desc: "Comentario de texto" },
    { label: "Prueba 2", desc: "Ensayo comparativo" },
    { label: "Oral Individual", desc: "Presentación + preguntas" },
  ],
  demo_title: "Cómo mejora tu texto",
  demo_sub: "La diferencia entre identificar y analizar — criterio B",
  before_label: "Sin feedback · Banda 2–3",
  after_label: "Con LIBerico · Banda 4–5",
  before_tags: ["Nombra sin analizar", "Sin efecto en lector", "Vago"],
  after_tags: ["Efecto explicado", "Conecta con tema", "Nivel IB"],
  neruda_attr: "Basado en el Poema XX de Pablo Neruda",
  mockup_score_label: "Nota estimada",
  mockup_band_label: "Bandas por criterio",
  mockup_annotation_label: "Criterio B:",
  mockup_rewrite_label: "Reescritura sugerida",
  receives_title: "Qué recibes con cada evaluación",
  receives: [
    {
      label: "Nota IB por criterio",
      desc: "Bandas A–D desglosadas con explicación de qué falta para subir.",
    },
    {
      label: "Anotaciones en tu texto",
      desc: "El feedback señala párrafos concretos, no solo una nota global.",
    },
    {
      label: "Reescritura modelo",
      desc: "Un ejemplo de cómo podría quedar el párrafo débil. Tu voz, mejor argumentada.",
    },
    {
      label: "Historial y progreso",
      desc: "Ve cómo evolucionan tus bandas evaluación a evaluación.",
    },
  ],
  trust_title: "Por qué confiar en LIBerico",
  trust_ib_label: "Criterios oficiales del IB",
  trust_ib_body:
    "El sistema aplica los criterios de evaluación del IB y fue calibrado por profesores con décadas de experiencia en el programa, incluyendo participación en procesos de estandarización. El feedback sigue la lógica de las rúbricas sin copiarlas.",
  trust_pricing_label: "Pago por uso, sin jaulas",
  trust_pricing_body:
    "Sin suscripciones obligatorias. Compras los créditos que necesitas (mínimo 5 €) y los usas cuando quieras.",
  trust_pricing_tiers: [
    {
      label: "Corrección",
      price: "1,50 €",
      desc: "Nota A–D por cada criterio con explicación de qué mejorar.",
    },
    {
      label: "+ Feedback completo",
      price: "+2,00 €",
      desc: "Reescritura modelo y solución anotada sobre tu propio texto.",
    },
  ],
  trust_pricing_note: "Mínimo de recarga 5 €. Sin mensualidad ni compromiso.",
  trust_who_label: "Quién lo calibra",
  trust_who_body:
    "Desarrollado con profesores de IB con décadas de experiencia, incluyendo participación en estandarización y coordinación de asignaturas. Conocemos los criterios desde dentro.",
  trust_disclaimer:
    "LIBerico no está afiliado ni respaldado por la International Baccalaureate Organization.",
  faq_title: "Preguntas frecuentes",
  faq: [
    {
      q: "¿LIBerico está afiliado al IB?",
      a: "No. LIBerico es una herramienta independiente. No somos parte de la IBO ni contamos con su respaldo oficial.",
    },
    {
      q: "¿Es esto trampa académica?",
      a: "No. LIBerico no escribe por ti. Evalúa lo que tú escribes y te muestra qué mejorar — igual que un tutor.",
    },
    {
      q: "¿Puedo usarlo en inglés?",
      a: "Sí. LIBerico tiene soporte para English A: Literature. Cambia el idioma con el selector de arriba.",
    },
    {
      q: "¿Cuánto cuesta?",
      a: "La corrección básica (nota A–D por criterio) vale 1,50 €. Si quieres reescritura y solución anotada, son 2 € adicionales. El mínimo de recarga es 5 €, sin mensualidad.",
    },
    {
      q: "¿Mis textos son privados?",
      a: "Sí. No compartimos tus análisis con terceros. Consulta nuestra política de privacidad.",
    },
  ],
  final_title: "Tu próximo comentario puede ser más preciso, más profundo y más IB.",
  final_teacher: "¿Eres docente?",
  final_teacher_link: "Accede al panel de profesor",
  final_cta: "Empezar ahora",
  footer_disclaimer: "No afiliado al International Baccalaureate Organization",
  footer_privacy: "Privacidad",
  footer_cookies: "Cookies",
  footer_terms: "Términos",
};

const LANDING_COPY_EN: typeof LANDING_COPY_ES = {
  login_cta: "Sign in",
  badge: "IB Language A · Español A & English A",
  h1: "IB feedback to sharpen your literary analysis",
  sub: "Paper 1, Paper 2, and Individual Oral. Built around the IB's official assessment criteria and calibrated by expert IB teachers.",
  cta_primary: "Get started",
  cta_demo: "See how it works",
  modules: [
    { label: "Paper 1", desc: "Textual analysis" },
    { label: "Paper 2", desc: "Comparative essay" },
    { label: "Individual Oral", desc: "Presentation + questions" },
  ],
  demo_title: "How your text improves",
  demo_sub: "The difference between identifying and analysing — Criterion B",
  before_label: "Without feedback · Band 2–3",
  after_label: "With LIBerico · Band 4–5",
  before_tags: ["Names without analysing", "No reader effect", "Vague"],
  after_tags: ["Effect explained", "Connects to theme", "IB level"],
  neruda_attr: "Based on Poem XX by Pablo Neruda",
  mockup_score_label: "Estimated grade",
  mockup_band_label: "Bands by criterion",
  mockup_annotation_label: "Criterion B:",
  mockup_rewrite_label: "Suggested rewrite",
  receives_title: "What you get with each assessment",
  receives: [
    {
      label: "IB score by criterion",
      desc: "Bands A–D broken down with an explanation of what's needed to go higher.",
    },
    {
      label: "Annotations in your text",
      desc: "Feedback targets specific paragraphs, not just an overall grade.",
    },
    {
      label: "Model rewrite",
      desc: "A worked example of how a weak paragraph could look. Your voice, better argued.",
    },
    { label: "History and progress", desc: "Track how your bands evolve across assessments." },
  ],
  trust_title: "Why trust LIBerico",
  trust_ib_label: "IB official criteria",
  trust_ib_body:
    "LIBerico applies the IB's official assessment criteria and was calibrated by teachers with decades of experience in the programme, including involvement in standardisation processes. Feedback follows the logic of the rubrics without reproducing them verbatim.",
  trust_pricing_label: "Pay per use — no lock-in",
  trust_pricing_body:
    "No required subscriptions. Buy the credits you need (minimum €5) and use them whenever you want.",
  trust_pricing_tiers: [
    {
      label: "Assessment",
      price: "€1.50",
      desc: "A–D band per criterion with an explanation of what to improve.",
    },
    {
      label: "+ Full feedback",
      price: "+€2.00",
      desc: "Model rewrite and annotated solution on your own text.",
    },
  ],
  trust_pricing_note: "Minimum top-up €5. No monthly fee or commitment.",
  trust_who_label: "Who calibrates it",
  trust_who_body:
    "Developed with IB teachers who have decades of experience in the programme, including involvement in standardisation and subject coordination. We know the criteria from the inside.",
  trust_disclaimer:
    "LIBerico is not affiliated with or endorsed by the International Baccalaureate Organization.",
  faq_title: "Frequently asked questions",
  faq: [
    {
      q: "Is LIBerico affiliated with the IB?",
      a: "No. LIBerico is an independent tool. We are not part of the IBO and do not have its official endorsement.",
    },
    {
      q: "Is this academic dishonesty?",
      a: "No. LIBerico does not write for you. It assesses what you write and shows you how to improve — just like a tutor.",
    },
    {
      q: "Can I use it in Spanish?",
      a: "Yes. LIBerico supports Español A: Literatura. Use the language selector above to switch.",
    },
    {
      q: "How much does it cost?",
      a: "A basic assessment (A–D band per criterion) costs €1.50. If you want a model rewrite and annotated solution, that's an additional €2.00. The minimum top-up is €5, with no monthly fee.",
    },
    {
      q: "Are my texts private?",
      a: "Yes. We do not share your analyses with third parties. See our privacy policy for details.",
    },
  ],
  final_title: "Your next commentary can be more precise, more analytical, and more IB.",
  final_teacher: "Are you a teacher?",
  final_teacher_link: "Access the teacher panel",
  final_cta: "Get started",
  footer_disclaimer: "Not affiliated with the International Baccalaureate Organization",
  footer_privacy: "Privacy",
  footer_cookies: "Cookies",
  footer_terms: "Terms",
};

const LANDING_COPY = { es: LANDING_COPY_ES, en: LANDING_COPY_EN };

const RECEIVE_ICONS = [BarChart2, PenLine, Sparkles, History];

function FeedbackMockup({
  scoreLabel,
  bandLabel,
  annotationLabel,
  rewriteLabel,
}: {
  scoreLabel: string;
  bandLabel: string;
  annotationLabel: string;
  rewriteLabel: string;
}) {
  const bands = [
    { letter: "A", value: 7, max: 10 },
    { letter: "B", value: 5, max: 10 },
    { letter: "C", value: 4, max: 10 },
    { letter: "D", value: 7, max: 10 },
  ];
  return (
    <div className="mt-8 rounded-xl border border-border bg-card shadow-sm overflow-hidden text-sm max-w-2xl mx-auto">
      <div className="bg-accent/30 border-b border-border px-5 py-4 flex flex-col sm:flex-row gap-4 sm:gap-6">
        <div className="text-center shrink-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            {scoreLabel}
          </div>
          <div className="font-serif text-4xl font-bold text-primary leading-none">5</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">/ 7</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            {bandLabel}
          </div>
          <div className="space-y-2">
            {bands.map((b) => (
              <div key={b.letter} className="flex items-center gap-2">
                <span className="text-xs font-mono w-3 text-muted-foreground">{b.letter}</span>
                <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(b.value / b.max) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
                  {b.value}/{b.max}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="px-5 py-4 border-b border-border">
        <p className="text-xs text-foreground/65 italic leading-relaxed mb-3">
          "El poema usa anáforas y metáforas para mostrar el estado emocional del hablante lírico.
          Hay muchos recursos que generan un efecto triste y melancólico."
        </p>
        <div className="flex gap-2 items-start">
          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 font-medium mt-0.5">
            {annotationLabel}
          </span>
          <p className="text-xs text-foreground/70 leading-relaxed">
            ¿Qué efecto específico crea la anáfora en el lector? Nombra la emoción antes de declarar
            el tema.
          </p>
        </div>
      </div>
      <div className="px-5 py-4">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          {rewriteLabel}
        </div>
        <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3 leading-relaxed italic">
          "La anáfora de «Puedo escribir» estructura el poema como una lucha interna: cada retorno
          del verso es un nuevo fracaso ante el recuerdo. La repetición mimetiza la imposibilidad de
          olvidar."
        </p>
      </div>
    </div>
  );
}

function LandingPage() {
  const demoRef = useRef<HTMLDivElement>(null);
  const [lang, setLang] = useState<LandingLang>(getInitialLandingLang);
  const copy = LANDING_COPY[lang];

  const changeLang = (l: LandingLang) => {
    setLang(l);
    try {
      localStorage.setItem(LANDING_LANG_STORAGE_KEY, l);
    } catch {
      return;
    }
  };

  const scrollToDemo = () => demoRef.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-background">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 h-14">
          <span className="font-serif font-bold text-lg text-ink">LIBerico</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm">
              <button
                onClick={() => changeLang("es")}
                className={
                  lang === "es"
                    ? "font-semibold text-primary"
                    : "text-foreground/45 hover:text-foreground/70 transition-colors"
                }
              >
                ES
              </button>
              <span className="text-border select-none px-0.5">|</span>
              <button
                onClick={() => changeLang("en")}
                className={
                  lang === "en"
                    ? "font-semibold text-primary"
                    : "text-foreground/45 hover:text-foreground/70 transition-colors"
                }
              >
                EN
              </button>
            </div>
            <Link to="/login">
              <Button variant="outline" size="sm">
                {copy.login_cta}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── §1 HERO ── */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-block text-[10px] uppercase tracking-[0.22em] text-primary border border-primary/30 bg-primary/5 px-3 py-1 rounded-full mb-6">
            {copy.badge}
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl text-ink leading-tight mb-5">{copy.h1}</h1>
          <p className="text-base sm:text-lg text-foreground/65 max-w-xl mx-auto mb-8 leading-relaxed">
            {copy.sub}
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {copy.modules.map((m) => (
              <div
                key={m.label}
                className="flex items-center gap-1.5 text-xs border border-border bg-card px-3 py-1.5 rounded-full text-foreground/70"
              >
                <span className="font-medium text-foreground/90">{m.label}</span>
                <span className="text-foreground/45">·</span>
                <span>{m.desc}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/login">
              <Button size="lg" className="w-full sm:w-auto px-8">
                {copy.cta_primary}
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={scrollToDemo}>
              {copy.cta_demo}
            </Button>
          </div>
        </div>
      </section>

      {/* ── §2 CÓMO MEJORA TU TEXTO ── */}
      <section ref={demoRef} className="py-14 px-4 bg-accent/20">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-2xl sm:text-3xl text-ink text-center mb-2">
            {copy.demo_title}
          </h2>
          <p className="text-center text-foreground/55 text-sm mb-8">{copy.demo_sub}</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-lg border border-rose-200 bg-rose-50/50">
              <div className="text-[10px] uppercase tracking-[0.18em] text-rose-700 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
                {copy.before_label}
              </div>
              <p className="text-sm text-foreground/80 italic leading-relaxed">
                "El poema usa anáforas y metáforas para mostrar el estado emocional del hablante
                lírico. Hay muchos recursos que generan un efecto triste y melancólico."
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {copy.before_tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="p-5 rounded-lg border border-emerald-200 bg-emerald-50/50">
              <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-700 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                {copy.after_label}
              </div>
              <p className="text-sm text-foreground/80 italic leading-relaxed">
                "La anáfora de «Puedo escribir» estructura el poema como una lucha interna: cada vez
                que el verso regresa, el hablante ha fracasado de nuevo en separarse del recuerdo.
                La repetición mimetiza la imposibilidad de olvidar."
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {copy.after_tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-foreground/40 mt-4">{copy.neruda_attr}</p>
          <FeedbackMockup
            scoreLabel={copy.mockup_score_label}
            bandLabel={copy.mockup_band_label}
            annotationLabel={copy.mockup_annotation_label}
            rewriteLabel={copy.mockup_rewrite_label}
          />
        </div>
      </section>

      {/* ── §3 QUÉ RECIBES ── */}
      <section className="py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-2xl sm:text-3xl text-ink text-center mb-8">
            {copy.receives_title}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {copy.receives.map((item, i) => {
              const Icon = RECEIVE_ICONS[i];
              if (!Icon) return null;
              return (
                <div
                  key={item.label}
                  className="p-5 rounded-lg border border-border bg-card flex gap-4"
                >
                  <div className="shrink-0 w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                    <Icon className="h-[18px] w-[18px] text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-ink mb-1">{item.label}</div>
                    <p className="text-xs text-foreground/65 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── §4 POR QUÉ CONFIAR ── */}
      <section className="py-14 px-4 bg-accent/20">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-2xl sm:text-3xl text-ink text-center mb-10">
            {copy.trust_title}
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            <div className="flex flex-col gap-3">
              <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-[18px] w-[18px] text-primary" />
              </div>
              <h3 className="font-semibold text-sm text-ink">{copy.trust_ib_label}</h3>
              <p className="text-xs text-foreground/65 leading-relaxed">{copy.trust_ib_body}</p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                <Check className="h-[18px] w-[18px] text-primary" />
              </div>
              <h3 className="font-semibold text-sm text-ink">{copy.trust_pricing_label}</h3>
              <p className="text-xs text-foreground/65 leading-relaxed">
                {copy.trust_pricing_body}
              </p>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {copy.trust_pricing_tiers.map((tier) => (
                  <div key={tier.label} className="rounded-lg border border-border bg-card p-3">
                    <div className="font-bold text-lg text-primary leading-none">{tier.price}</div>
                    <div className="font-medium text-xs text-ink mt-1">{tier.label}</div>
                    <p className="text-[10px] text-foreground/55 leading-relaxed mt-1">
                      {tier.desc}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-foreground/45">{copy.trust_pricing_note}</p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                <GraduationCap className="h-[18px] w-[18px] text-primary" />
              </div>
              <h3 className="font-semibold text-sm text-ink">{copy.trust_who_label}</h3>
              <p className="text-xs text-foreground/65 leading-relaxed">{copy.trust_who_body}</p>
            </div>
          </div>
          <div className="mt-10 text-center">
            <span className="inline-block text-[10px] text-foreground/40 border border-border/60 px-3 py-1.5 rounded-full">
              {copy.trust_disclaimer}
            </span>
          </div>
        </div>
      </section>

      {/* ── §5 FAQ ── */}
      <section className="py-14 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-serif text-2xl sm:text-3xl text-ink text-center mb-8">
            {copy.faq_title}
          </h2>
          <div className="divide-y divide-border">
            {copy.faq.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-medium text-ink list-none select-none">
                  {item.q}
                  <span className="text-foreground/40 shrink-0 group-open:rotate-180 transition-transform leading-none">
                    ↓
                  </span>
                </summary>
                <p className="mt-3 text-xs text-foreground/65 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── §6 CTA FINAL ── */}
      <section className="py-16 sm:py-20 px-4 bg-accent/20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-2xl sm:text-3xl text-ink mb-4 leading-snug">
            {copy.final_title}
          </h2>
          <p className="text-foreground/50 text-sm mb-8">
            {copy.final_teacher}{" "}
            <Link to="/login" className="text-primary hover:underline">
              {copy.final_teacher_link}
            </Link>
          </p>
          <Link to="/login">
            <Button size="lg" className="px-10">
              {copy.final_cta}
            </Button>
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border py-6 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-foreground/40">
          <span>© 2026 LIBerico</span>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span>{copy.footer_disclaimer}</span>
            <Link to="/privacy" className="hover:text-foreground/70 underline underline-offset-2">
              {copy.footer_privacy}
            </Link>
            <Link to="/cookies" className="hover:text-foreground/70 underline underline-offset-2">
              {copy.footer_cookies}
            </Link>
            <Link to="/terms" className="hover:text-foreground/70 underline underline-offset-2">
              {copy.footer_terms}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
