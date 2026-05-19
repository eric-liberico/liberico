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
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap",
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
  stats: [
    { value: "A–D", label: "Criterios oficiales del IB" },
    { value: "3", label: "Componentes: P1, P2 y Oral" },
    { value: "20+", label: "Años de experiencia docente IB" },
    { value: "ES / EN", label: "Español A y English A" },
  ],
  how_title: "Cómo funciona",
  how_sub: "De tu borrador a una banda IB en tres pasos",
  how_steps: [
    {
      kicker: "Paso 01",
      title: "Pega tu análisis",
      desc: "Sube tu comentario, ensayo o guion oral. Elige la prueba y el componente.",
    },
    {
      kicker: "Paso 02",
      title: "Recibe tu nota IB",
      desc: "Bandas A–D, nota estimada sobre 7, anotaciones en tu texto y reescrituras modelo.",
    },
    {
      kicker: "Paso 03",
      title: "Itera y sube de banda",
      desc: "Vuelve a entregar con los cambios y mide la diferencia. El historial registra tu progreso.",
    },
  ],
  components_title: "Tres pruebas, un mismo rigor",
  components_sub: "LIBerico cubre los tres componentes evaluables del IB Language A: Literature.",
  components: [
    {
      tag: "Prueba 1",
      title: "Comentario de texto",
      desc: "Análisis guiado de un fragmento desconocido (prosa o poesía) con pregunta orientadora.",
      bullets: [
        "Biblioteca de textos calibrada",
        "Bandas A–D con anotaciones",
        "Reescritura modelo banda 5",
      ],
    },
    {
      tag: "Prueba 2",
      title: "Ensayo comparativo",
      desc: "Argumentación comparada entre dos obras del programa, según pregunta IB.",
      bullets: [
        "Catálogo de preguntas IB reales",
        "Diagnóstico comparativo",
        "Ensayo modelo de banda alta",
      ],
    },
    {
      tag: "Oral Individual",
      title: "Guion y respuestas",
      desc: "Evaluación del guion, equilibrio entre obras, asunto global y preguntas del examinador.",
      bullets: [
        "Apuntes del guion oral",
        "Simulador de preguntas",
        "Feedback por criterio",
      ],
    },
  ],
  criteria_title: "Los cuatro criterios, sin misterio",
  criteria_sub: "Cada evaluación desglosa tu texto según los criterios oficiales A–D.",
  criteria: [
    {
      letter: "A",
      name: "Comprensión e interpretación",
      focus: "Lectura del texto, inferencias y matices interpretativos.",
    },
    {
      letter: "B",
      name: "Análisis y evaluación",
      focus: "Efecto de los recursos lingüísticos y literarios sobre el lector.",
    },
    {
      letter: "C",
      name: "Foco y organización",
      focus: "Estructura del argumento, transiciones y coherencia interna.",
    },
    {
      letter: "D",
      name: "Lengua",
      focus: "Precisión léxica, registro académico y corrección gramatical.",
    },
  ],
  testimonial_quote:
    "Por primera vez mis alumnos entienden por qué su párrafo no es banda 5. El feedback es concreto, anclado al texto, y nunca inventa citas.",
  testimonial_author: "Profesora IB · Coordinadora de Lengua A",
  testimonial_role: "Colegio con 20+ años en el programa del Diploma",
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
  final_kicker: "Listo para empezar",
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
  stats: [
    { value: "A–D", label: "Official IB criteria" },
    { value: "3", label: "Components: P1, P2 and Oral" },
    { value: "20+", label: "Years of IB teaching experience" },
    { value: "ES / EN", label: "Español A and English A" },
  ],
  how_title: "How it works",
  how_sub: "From your draft to an IB band in three steps",
  how_steps: [
    {
      kicker: "Step 01",
      title: "Paste your analysis",
      desc: "Upload your commentary, essay or oral script. Pick the paper and component.",
    },
    {
      kicker: "Step 02",
      title: "Get your IB grade",
      desc: "Bands A–D, estimated grade out of 7, annotations in your text and model rewrites.",
    },
    {
      kicker: "Step 03",
      title: "Iterate and level up",
      desc: "Resubmit your revision and measure the difference. Your history tracks the progress.",
    },
  ],
  components_title: "Three papers, one standard",
  components_sub: "LIBerico covers all three assessed components of IB Language A: Literature.",
  components: [
    {
      tag: "Paper 1",
      title: "Textual analysis",
      desc: "Guided analysis of an unseen passage (prose or poetry) with a guiding question.",
      bullets: [
        "Curated text library",
        "Bands A–D with annotations",
        "Band 5 model rewrite",
      ],
    },
    {
      tag: "Paper 2",
      title: "Comparative essay",
      desc: "Comparative argument across two studied works, following an IB question.",
      bullets: [
        "Catalogue of real IB prompts",
        "Comparative diagnosis",
        "High-band model essay",
      ],
    },
    {
      tag: "Individual Oral",
      title: "Script and Q&A",
      desc: "Assessment of the script, balance across works, global issue and examiner questions.",
      bullets: [
        "Oral script notes",
        "Question simulator",
        "Per-criterion feedback",
      ],
    },
  ],
  criteria_title: "The four criteria, demystified",
  criteria_sub: "Every assessment breaks your text down against the official A–D criteria.",
  criteria: [
    {
      letter: "A",
      name: "Understanding and interpretation",
      focus: "Reading of the text, inferences and interpretive nuance.",
    },
    {
      letter: "B",
      name: "Analysis and evaluation",
      focus: "Effect of linguistic and literary devices on the reader.",
    },
    {
      letter: "C",
      name: "Focus and organisation",
      focus: "Argument structure, transitions and internal coherence.",
    },
    {
      letter: "D",
      name: "Language",
      focus: "Lexical precision, academic register and grammatical accuracy.",
    },
  ],
  testimonial_quote:
    "For the first time my students understand why their paragraph isn't band 5. The feedback is concrete, anchored to the text, and never invents quotations.",
  testimonial_author: "IB teacher · Language A Coordinator",
  testimonial_role: "School with 20+ years in the Diploma Programme",
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
  final_kicker: "Ready to start",
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

// Tokens "Navy Trust" para la landing (locales al componente)
const NAVY = {
  bg: "#0f1b3d",
  bgDeep: "#0a1229",
  mid: "#1e3a5f",
  blue: "#3b6fa0",
  paper: "#e8edf3",
};

const fontSerif = { fontFamily: "'Libre Baskerville', Georgia, serif" } as const;
const fontSans = { fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif" } as const;

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

  const bands = [
    { letter: "A", value: 7 },
    { letter: "B", value: 5 },
    { letter: "C", value: 4 },
    { letter: "D", value: 7 },
  ];

  return (
    <div
      className="w-full min-h-screen overflow-x-hidden"
      style={{
        ...fontSans,
        backgroundColor: NAVY.bg,
        color: NAVY.paper,
      }}
    >
      {/* NAV */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 sm:px-8 py-5 border-b backdrop-blur-md"
        style={{
          borderColor: "rgba(232,237,243,0.1)",
          backgroundColor: "rgba(15,27,61,0.9)",
        }}
      >
        <div className="text-2xl font-bold tracking-tight italic" style={fontSerif}>
          LIBerico
        </div>
        <div className="flex items-center gap-6 text-sm font-medium tracking-wide uppercase">
          <div className="flex gap-3">
            <button
              onClick={() => changeLang("es")}
              className={
                lang === "es" ? "text-white" : "opacity-40 hover:opacity-100 transition-opacity"
              }
            >
              ES
            </button>
            <button
              onClick={() => changeLang("en")}
              className={
                lang === "en" ? "text-white" : "opacity-40 hover:opacity-100 transition-opacity"
              }
            >
              EN
            </button>
          </div>
          <Link
            to="/login"
            className="px-5 py-2 border text-xs font-bold uppercase tracking-widest transition-all duration-300 hover:bg-[#e8edf3] hover:text-[#0f1b3d]"
            style={{ borderColor: "rgba(232,237,243,0.3)" }}
          >
            {copy.login_cta}
          </Link>
        </div>
      </nav>

      {/* HERO con "7" gigante */}
      <section
        className="relative px-6 sm:px-8 pt-24 sm:pt-32 pb-20 overflow-hidden border-b"
        style={{ borderColor: "rgba(232,237,243,0.1)" }}
      >
        <div
          className="absolute -right-10 sm:-right-20 -top-20 font-bold leading-none select-none pointer-events-none"
          style={{
            ...fontSerif,
            color: "rgba(232,237,243,0.05)",
            fontSize: "clamp(20rem, 50vw, 40rem)",
          }}
          aria-hidden
        >
          7
        </div>
        <div className="max-w-5xl mx-auto relative z-10">
          <span
            className="inline-block px-4 py-1 mb-8 text-xs font-semibold tracking-widest uppercase border"
            style={{ borderColor: NAVY.blue, color: NAVY.blue }}
          >
            {copy.badge}
          </span>
          <h1
            className="text-5xl sm:text-7xl md:text-8xl font-normal leading-[1.05] mb-10"
            style={fontSerif}
          >
            {copy.h1}
          </h1>
          <p
            className="text-lg sm:text-xl md:text-2xl max-w-2xl mb-12 leading-relaxed"
            style={{ color: "rgba(232,237,243,0.7)" }}
          >
            {copy.sub}
          </p>
          <div className="flex flex-wrap gap-3 sm:gap-4 mb-12 sm:mb-16">
            {copy.modules.map((m) => (
              <span
                key={m.label}
                className="px-4 py-2 text-xs sm:text-sm border"
                style={{ backgroundColor: NAVY.mid, borderColor: "rgba(59,111,160,0.3)" }}
              >
                <span className="font-semibold">{m.label}</span>
                <span className="opacity-60"> · {m.desc}</span>
              </span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <Link
              to="/login"
              className="px-10 py-5 font-bold text-base sm:text-lg text-center transition-colors hover:bg-white"
              style={{ backgroundColor: NAVY.paper, color: NAVY.bg }}
            >
              {copy.cta_primary}
            </Link>
            <button
              onClick={scrollToDemo}
              className="px-10 py-5 border text-base sm:text-lg transition-colors hover:bg-white/10"
              style={{ borderColor: "rgba(232,237,243,0.3)" }}
            >
              {copy.cta_demo}
            </button>
          </div>
        </div>
      </section>

      {/* STATS strip */}
      <section
        className="px-6 sm:px-8 py-14 sm:py-20 border-b"
        style={{ borderColor: "rgba(232,237,243,0.1)", backgroundColor: NAVY.bgDeep }}
      >
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-6">
          {copy.stats.map((s, i) => (
            <div
              key={s.label}
              className={`flex flex-col gap-2 px-2 sm:px-6 ${
                i > 0 ? "md:border-l" : ""
              }`}
              style={{ borderColor: "rgba(232,237,243,0.1)" }}
            >
              <div
                className="text-4xl sm:text-5xl md:text-6xl font-normal leading-none"
                style={{ ...fontSerif, color: NAVY.paper }}
              >
                {s.value}
              </div>
              <div
                className="text-[10px] sm:text-xs uppercase tracking-[0.2em]"
                style={{ color: "rgba(232,237,243,0.55)" }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DEMO banda clara */}

      <section
        ref={demoRef}
        className="py-20 sm:py-32 px-6 sm:px-8"
        style={{ backgroundColor: NAVY.paper, color: NAVY.bg }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 sm:mb-24 gap-6">
            <h2
              className="text-4xl sm:text-5xl font-normal max-w-xl leading-tight"
              style={fontSerif}
            >
              {copy.demo_title}
            </h2>
            <p
              className="font-medium uppercase tracking-widest text-xs sm:text-sm"
              style={{ color: "rgba(15,27,61,0.6)" }}
            >
              {copy.demo_sub}
            </p>
          </div>

          <div
            className="grid md:grid-cols-2 gap-px mb-12 sm:mb-16 border"
            style={{ backgroundColor: "rgba(15,27,61,0.1)", borderColor: "rgba(15,27,61,0.1)" }}
          >
            <div className="bg-white p-8 sm:p-12">
              <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-xs font-bold uppercase tracking-tighter">
                  {copy.before_label}
                </span>
              </div>
              <blockquote
                className="text-lg sm:text-xl italic mb-8 leading-relaxed"
                style={{ ...fontSerif, color: "rgba(15,27,61,0.8)" }}
              >
                "El poema usa anáforas y metáforas para mostrar el estado emocional del hablante
                lírico. Hay muchos recursos que generan un efecto triste y melancólico."
              </blockquote>
              <div className="flex flex-wrap gap-2">
                {copy.before_tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-1 bg-red-50 border border-red-100 text-red-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-white p-8 sm:p-12">
              <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-xs font-bold uppercase tracking-tighter">
                  {copy.after_label}
                </span>
              </div>
              <blockquote
                className="text-lg sm:text-xl italic mb-8 leading-relaxed"
                style={{ ...fontSerif, color: NAVY.bg }}
              >
                "La anáfora de «Puedo escribir» estructura el poema como una lucha interna: cada
                vez que el verso regresa, el hablante ha fracasado de nuevo en separarse del
                recuerdo."
              </blockquote>
              <div className="flex flex-wrap gap-2">
                {copy.after_tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-1 bg-green-50 border border-green-100 text-green-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <p
            className="text-center text-xs mb-16 sm:mb-24"
            style={{ color: "rgba(15,27,61,0.4)" }}
          >
            {copy.neruda_attr}
          </p>

          {/* Criterion breakdown */}
          <div
            className="p-8 sm:p-16 relative overflow-hidden"
            style={{ backgroundColor: NAVY.bg, color: NAVY.paper }}
          >
            <div className="grid md:grid-cols-12 gap-8 sm:gap-12 items-center">
              <div className="md:col-span-3 text-center md:text-left">
                <div className="text-8xl sm:text-9xl font-bold leading-none" style={fontSerif}>
                  5
                </div>
                <div className="text-xl sm:text-2xl font-medium opacity-50 mt-2">/ 7</div>
                <div
                  className="text-[10px] uppercase tracking-widest mt-3 opacity-50"
                  style={fontSans}
                >
                  {copy.mockup_score_label}
                </div>
              </div>
              <div className="md:col-span-9 space-y-8">
                <div className="grid grid-cols-4 gap-4">
                  {bands.map((b) => (
                    <div key={b.letter} className="space-y-2">
                      <div className="text-3xl sm:text-4xl font-bold" style={fontSerif}>
                        {b.letter}
                      </div>
                      <div
                        className="h-1 w-full"
                        style={{ backgroundColor: "rgba(232,237,243,0.1)" }}
                      >
                        <div
                          className="h-full"
                          style={{
                            backgroundColor: NAVY.blue,
                            width: `${(b.value / 10) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="text-[10px] opacity-50 tabular-nums">{b.value}/10</div>
                    </div>
                  ))}
                </div>
                <div
                  className="pt-6 sm:pt-8 border-t"
                  style={{ borderColor: "rgba(232,237,243,0.1)" }}
                >
                  <p className="italic text-base sm:text-lg opacity-80 leading-relaxed">
                    <span
                      className="not-italic text-xs font-bold mr-2 uppercase tracking-tighter px-2 py-0.5"
                      style={{ backgroundColor: NAVY.blue, color: "#fff" }}
                    >
                      {copy.mockup_annotation_label}
                    </span>
                    {lang === "es"
                      ? "¿Qué efecto específico crea la anáfora en el lector? Nombra la emoción antes de declarar el tema."
                      : "What specific effect does the anaphora create on the reader? Name the emotion before stating the theme."}
                  </p>
                </div>
                <div
                  className="p-4 sm:p-5 italic text-sm sm:text-base leading-relaxed"
                  style={{ backgroundColor: "rgba(59,111,160,0.15)", ...fontSerif }}
                >
                  <div
                    className="not-italic text-[10px] uppercase tracking-widest mb-2 opacity-60"
                    style={fontSans}
                  >
                    {copy.mockup_rewrite_label}
                  </div>
                  "La anáfora de «Puedo escribir» estructura el poema como una lucha interna: cada
                  retorno del verso es un nuevo fracaso ante el recuerdo. La repetición mimetiza la
                  imposibilidad de olvidar."
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        className="py-20 sm:py-32 px-6 sm:px-8 border-b"
        style={{
          borderColor: "rgba(232,237,243,0.1)",
          backgroundColor: NAVY.bg,
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16 sm:mb-20">
            <h2
              className="text-4xl sm:text-5xl md:text-6xl font-normal max-w-2xl leading-[1.05]"
              style={fontSerif}
            >
              {copy.how_title}
            </h2>
            <p
              className="text-xs sm:text-sm uppercase tracking-[0.25em]"
              style={{ color: "rgba(232,237,243,0.55)" }}
            >
              {copy.how_sub}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-px" style={{ backgroundColor: "rgba(232,237,243,0.08)" }}>
            {copy.how_steps.map((step, i) => (
              <div
                key={step.title}
                className="p-8 sm:p-10 relative group transition-colors"
                style={{ backgroundColor: NAVY.bg }}
              >
                <div
                  className="absolute top-6 right-6 text-7xl sm:text-8xl font-normal leading-none opacity-[0.08] group-hover:opacity-20 transition-opacity"
                  style={fontSerif}
                  aria-hidden
                >
                  {i + 1}
                </div>
                <div
                  className="text-[10px] font-bold tracking-[0.25em] uppercase mb-6"
                  style={{ color: NAVY.blue }}
                >
                  {step.kicker}
                </div>
                <h3 className="text-2xl sm:text-3xl mb-4 leading-tight" style={fontSerif}>
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(232,237,243,0.65)" }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES banda oscura */}

      <section
        className="py-20 sm:py-32 px-6 sm:px-8 border-b"
        style={{ borderColor: "rgba(232,237,243,0.1)" }}
      >
        <div className="max-w-7xl mx-auto">
          <h2
            className="text-3xl sm:text-4xl mb-12 sm:mb-20 max-w-2xl leading-tight"
            style={fontSerif}
          >
            {copy.receives_title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-12">
            {copy.receives.map((item, i) => (
              <div key={item.label} className="space-y-5">
                <div
                  className="w-12 h-12 flex items-center justify-center text-lg font-bold"
                  style={{
                    backgroundColor: NAVY.mid,
                    border: `1px solid rgba(59,111,160,0.3)`,
                    ...fontSerif,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="text-base sm:text-lg font-bold tracking-tight uppercase">
                  {item.label}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "rgba(232,237,243,0.6)" }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPONENTS — tres pruebas */}
      <section
        className="py-20 sm:py-32 px-6 sm:px-8 border-b"
        style={{ borderColor: "rgba(232,237,243,0.1)", backgroundColor: NAVY.bgDeep }}
      >
        <div className="max-w-6xl mx-auto">
          <div
            className="text-[10px] font-bold tracking-[0.3em] uppercase mb-6"
            style={{ color: NAVY.blue }}
          >
            {lang === "es" ? "Componentes" : "Components"}
          </div>
          <h2
            className="text-4xl sm:text-5xl md:text-6xl font-normal mb-6 leading-[1.05] max-w-3xl"
            style={fontSerif}
          >
            {copy.components_title}
          </h2>
          <p
            className="text-base sm:text-lg max-w-2xl mb-16 sm:mb-20 leading-relaxed"
            style={{ color: "rgba(232,237,243,0.65)" }}
          >
            {copy.components_sub}
          </p>
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {copy.components.map((c) => (
              <div
                key={c.title}
                className="p-8 sm:p-10 flex flex-col gap-6 border transition-colors hover:bg-white/[0.02]"
                style={{
                  borderColor: "rgba(232,237,243,0.12)",
                  backgroundColor: "rgba(30,58,95,0.25)",
                }}
              >
                <div
                  className="text-[10px] font-bold tracking-[0.25em] uppercase pb-4 border-b"
                  style={{ color: NAVY.blue, borderColor: "rgba(59,111,160,0.3)" }}
                >
                  {c.tag}
                </div>
                <h3 className="text-2xl sm:text-3xl leading-tight" style={fontSerif}>
                  {c.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(232,237,243,0.6)" }}>
                  {c.desc}
                </p>
                <ul className="space-y-2.5 mt-auto pt-4">
                  {c.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-sm">
                      <Check
                        className="h-3.5 w-3.5 mt-1 shrink-0"
                        style={{ color: NAVY.blue }}
                      />
                      <span style={{ color: "rgba(232,237,243,0.85)" }}>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CRITERIA — A/B/C/D */}
      <section
        className="py-20 sm:py-32 px-6 sm:px-8"
        style={{ backgroundColor: NAVY.paper, color: NAVY.bg }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16 sm:mb-20">
            <div className="max-w-3xl">
              <div
                className="text-[10px] font-bold tracking-[0.3em] uppercase mb-6"
                style={{ color: NAVY.blue }}
              >
                {lang === "es" ? "Criterios oficiales" : "Official criteria"}
              </div>
              <h2
                className="text-4xl sm:text-5xl md:text-6xl font-normal leading-[1.05]"
                style={fontSerif}
              >
                {copy.criteria_title}
              </h2>
            </div>
            <p
              className="text-sm sm:text-base max-w-sm leading-relaxed"
              style={{ color: "rgba(15,27,61,0.65)" }}
            >
              {copy.criteria_sub}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px" style={{ backgroundColor: "rgba(15,27,61,0.12)" }}>
            {copy.criteria.map((c) => (
              <div key={c.letter} className="bg-white p-8 sm:p-10 flex gap-6 sm:gap-8 items-start">
                <div
                  className="text-7xl sm:text-8xl font-normal leading-none shrink-0"
                  style={{ ...fontSerif, color: NAVY.bg }}
                >
                  {c.letter}
                </div>
                <div className="flex-1 pt-2">
                  <div
                    className="text-[10px] font-bold tracking-[0.25em] uppercase mb-3"
                    style={{ color: NAVY.blue }}
                  >
                    {lang === "es" ? "Criterio" : "Criterion"} {c.letter}
                  </div>
                  <h3 className="text-xl sm:text-2xl mb-3 leading-tight" style={fontSerif}>
                    {c.name}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(15,27,61,0.7)" }}>
                    {c.focus}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST + PRICING banda media */}

      <section className="py-20 sm:py-32 px-6 sm:px-8" style={{ backgroundColor: NAVY.mid }}>
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-4xl sm:text-5xl font-normal mb-16 sm:mb-20 italic text-center leading-tight"
            style={fontSerif}
          >
            {copy.trust_title}
          </h2>

          <div className="grid md:grid-cols-2 gap-6 sm:gap-8 mb-10">
            {copy.trust_pricing_tiers.map((tier, i) => (
              <div
                key={tier.label}
                className="p-8 sm:p-12 text-left border-l-4"
                style={{
                  backgroundColor: NAVY.bg,
                  borderLeftColor: i === 0 ? NAVY.blue : "#fff",
                }}
              >
                <div className="text-3xl sm:text-4xl font-bold mb-2" style={fontSerif}>
                  {tier.price}
                </div>
                <div
                  className="text-xs sm:text-sm font-semibold uppercase tracking-widest mb-6 sm:mb-8"
                  style={{ color: i === 0 ? NAVY.blue : NAVY.paper }}
                >
                  {tier.label}
                </div>
                <p
                  className="text-sm leading-relaxed mb-8 sm:mb-10"
                  style={{ color: "rgba(232,237,243,0.75)" }}
                >
                  {tier.desc}
                </p>
                <Link
                  to="/login"
                  className="block w-full py-4 text-center font-bold text-xs uppercase tracking-widest transition-opacity hover:opacity-90"
                  style={
                    i === 0
                      ? { backgroundColor: NAVY.blue, color: "#fff" }
                      : { backgroundColor: "#fff", color: NAVY.bg }
                  }
                >
                  {copy.cta_primary}
                </Link>
              </div>
            ))}
          </div>

          <p
            className="text-center text-xs uppercase tracking-widest mb-16 sm:mb-20"
            style={{ color: "rgba(232,237,243,0.4)" }}
          >
            {copy.trust_pricing_note}
          </p>

          <div className="grid md:grid-cols-2 gap-12 sm:gap-16 max-w-3xl mx-auto">
            <div className="space-y-3">
              <div
                className="text-[10px] font-bold tracking-[0.2em] uppercase"
                style={{ color: NAVY.blue }}
              >
                01 / {lang === "es" ? "Integridad" : "Integrity"}
              </div>
              <h3 className="text-xl" style={fontSerif}>
                {copy.trust_ib_label}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(232,237,243,0.6)" }}>
                {copy.trust_ib_body}
              </p>
            </div>
            <div className="space-y-3">
              <div
                className="text-[10px] font-bold tracking-[0.2em] uppercase"
                style={{ color: NAVY.blue }}
              >
                02 / {lang === "es" ? "Experiencia" : "Expertise"}
              </div>
              <h3 className="text-xl" style={fontSerif}>
                {copy.trust_who_label}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(232,237,243,0.6)" }}>
                {copy.trust_who_body}
              </p>
            </div>
          </div>

          <p
            className="mt-16 text-center text-[10px] uppercase tracking-widest"
            style={{ color: "rgba(232,237,243,0.35)" }}
          >
            {copy.trust_disclaimer}
          </p>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section
        className="py-24 sm:py-40 px-6 sm:px-8 relative overflow-hidden"
        style={{ backgroundColor: NAVY.bg }}
      >
        <div
          className="absolute -left-10 top-10 font-bold leading-none select-none pointer-events-none"
          style={{
            ...fontSerif,
            color: "rgba(232,237,243,0.04)",
            fontSize: "clamp(16rem, 35vw, 28rem)",
          }}
          aria-hidden
        >
          “
        </div>
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <div
            className="text-[10px] font-bold tracking-[0.3em] uppercase mb-10"
            style={{ color: NAVY.blue }}
          >
            {lang === "es" ? "Voz docente" : "Teacher voice"}
          </div>
          <blockquote
            className="text-2xl sm:text-3xl md:text-4xl leading-[1.4] italic mb-12"
            style={{ ...fontSerif, color: NAVY.paper }}
          >
            “{copy.testimonial_quote}”
          </blockquote>
          <div
            className="inline-block h-px w-16 mb-6"
            style={{ backgroundColor: NAVY.blue }}
          />
          <div className="text-sm font-semibold" style={{ color: NAVY.paper }}>
            {copy.testimonial_author}
          </div>
          <div
            className="text-xs uppercase tracking-[0.2em] mt-2"
            style={{ color: "rgba(232,237,243,0.5)" }}
          >
            {copy.testimonial_role}
          </div>
        </div>
      </section>

      {/* FAQ */}

      <section className="py-20 sm:py-32 px-6 sm:px-8" style={{ backgroundColor: NAVY.bgDeep }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl text-center mb-12 sm:mb-16" style={fontSerif}>
            {copy.faq_title}
          </h2>
          <div>
            {copy.faq.map((item) => (
              <details
                key={item.q}
                className="group py-5 sm:py-6 border-b"
                style={{ borderColor: "rgba(232,237,243,0.1)" }}
              >
                <summary
                  className="flex cursor-pointer items-center justify-between gap-4 text-sm sm:text-base font-medium list-none select-none"
                  style={{ color: NAVY.paper }}
                >
                  {item.q}
                  <span className="opacity-30 group-open:rotate-180 transition-transform text-xl">
                    ↓
                  </span>
                </summary>
                <p
                  className="mt-4 text-sm leading-relaxed"
                  style={{ color: "rgba(232,237,243,0.6)" }}
                >
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section
        className="py-24 sm:py-40 px-6 sm:px-8 text-center"
        style={{ backgroundColor: NAVY.bg }}
      >
        <div className="max-w-3xl mx-auto">
          <div
            className="text-[10px] font-bold tracking-[0.3em] uppercase mb-8"
            style={{ color: NAVY.blue }}
          >
            {copy.final_kicker}
          </div>
          <h2
            className="text-4xl sm:text-5xl md:text-6xl font-normal mb-12 leading-[1.1]"
            style={fontSerif}
          >
            {copy.final_title}
          </h2>

          <Link
            to="/login"
            className="inline-block px-12 sm:px-16 py-5 sm:py-6 font-bold text-base sm:text-xl hover:scale-105 transition-transform"
            style={{ backgroundColor: NAVY.paper, color: NAVY.bg }}
          >
            {copy.final_cta}
          </Link>
          <p className="mt-10 sm:mt-12 text-sm opacity-60">
            {copy.final_teacher}{" "}
            <Link
              to="/login"
              className="underline underline-offset-4"
              style={{ color: NAVY.blue }}
            >
              {copy.final_teacher_link}
            </Link>
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="py-10 sm:py-12 px-6 sm:px-8 border-t text-[10px] uppercase tracking-[0.2em] font-medium"
        style={{
          backgroundColor: NAVY.bgDeep,
          borderColor: "rgba(232,237,243,0.05)",
          color: "rgba(232,237,243,0.4)",
        }}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8 text-center">
          <div>© 2026 LIBerico</div>
          <div className="md:text-left">{copy.footer_disclaimer}</div>
          <div className="flex gap-6 sm:gap-8">
            <Link to="/privacy" className="hover:text-[#e8edf3] transition-colors">
              {copy.footer_privacy}
            </Link>
            <Link to="/cookies" className="hover:text-[#e8edf3] transition-colors">
              {copy.footer_cookies}
            </Link>
            <Link to="/terms" className="hover:text-[#e8edf3] transition-colors">
              {copy.footer_terms}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

