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
  LANDING_FONT_LINK,
  NAVY,
  landingFontSans as fontSans,
  landingFontSerif as fontSerif,
} from "@/lib/landing-theme";
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
        href: LANDING_FONT_LINK,
      },
    ],
  }),
  component: IndexPage,
});

function IndexPage() {
  const { user, loading: authLoading } = useAuth();
  if (!user) return <LandingPage />;
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Cargando…
      </div>
    );
  }
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
    oralConversation: false,
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
  nav_feedback: "Demo",
  nav_how: "Cómo funciona",
  nav_courses: "Cursos",
  nav_pricing: "Precios",
  nav_faq: "FAQ",
  badge: "Calibrado por examinadores IB · Literatura y Lengua",
  h1: "Corrección IB calibrada. Feedback que mejora tu análisis.",
  sub: "Criterios oficiales del IB y orientaciones de profesores con décadas de experiencia en el Diploma. Prueba 1, Prueba 2 y Oral Individual.",
  cta_primary: "Empezar",
  cta_demo: "Ver cómo funciona",
  modules: [
    { label: "Prueba 1", desc: "Comentario de texto" },
    { label: "Prueba 2", desc: "Ensayo comparativo" },
    { label: "Oral Individual", desc: "Presentación + preguntas" },
  ],
  demo_title: "Así se ve la corrección",
  demo_sub: "Nota estimada y feedback calibrado sobre tu propio texto.",
  demo_flow: "Pegas tu análisis → eliges la prueba → en segundos recibes todo esto",
  before_label: "Sin feedback · Banda 2–3",
  after_label: "Con LIBerico · Banda 4–5",
  before_tags: ["Nombra sin analizar", "Sin efecto en lector", "Vago"],
  after_tags: ["Efecto explicado", "Conecta con tema", "Nivel IB"],
  neruda_attr: "Basado en el Poema XX de Pablo Neruda",
  mockup_score_label: "Nota estimada",
  mockup_band_label: "Bandas por criterio",
  mockup_annotation_label: "Criterio B:",
  mockup_rewrite_label: "Reescritura sugerida",
  mockup_tier1_label: "Corrección · 1,50 €",
  mockup_tier2_separator: "Con feedback completo · +2,00 €",
  mockup_annotated_label: "Tu texto — con anotaciones del examinador",
  mockup_rewrite_full:
    '"La anáfora de «Puedo escribir los versos más tristes esta noche» estructura el poema como una lucha interna: cada retorno del verso supone un nuevo fracaso ante el recuerdo. La repetición no es ornamental — mimetiza la imposibilidad de olvidar. El lector experimenta el mismo loop que el hablante: la conciencia persistente de la pérdida, sin capacidad de escape."',
  mockup_rewrite_note: "Tu voz, mejor argumentada.",
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
  pricing_title: "Sin mensualidad. Sin permanencia. Pagas lo que usas.",
  pricing_sub:
    "Compra créditos cuando los necesites. Si es bueno, sigue usándolo. Si no, no pierdas nada.",
  trust_title: "Calibración y criterio docente",
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
    { value: "4", label: "Componentes evaluables" },
    { value: "20+", label: "Años de experiencia docente IB" },
    { value: "ES / EN", label: "Literatura y Lengua" },
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
      desc: "En segundos: bandas A–D, nota estimada sobre 7, anotaciones en tu texto y reescritura modelo.",
    },
    {
      kicker: "Paso 03",
      title: "Itera y sube de banda",
      desc: "Vuelve a entregar con los cambios y mide la diferencia. El historial registra tu progreso.",
    },
  ],
  components_title: "Cuatro componentes, un mismo rigor",
  components_sub:
    "LIBerico cubre los componentes evaluables del IB: análisis literario, ensayo comparativo, oral y producción escrita.",
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
      bullets: ["Apuntes del guion oral", "Simulador de preguntas", "Feedback por criterio"],
    },
    {
      tag: "Lengua B",
      title: "Producción escrita",
      desc: "Evaluación de textos escritos con los criterios oficiales de la asignatura de Lengua B.",
      bullets: [
        "Criterios A–C propios de la asignatura",
        "Feedback por tipo de texto",
        "Anotaciones sobre registro y organización",
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
  testimonial_student_quote:
    "Después de dos iteraciones subí de banda 3 a banda 5 en criterio B. Por primera vez entendí exactamente qué estaba fallando en mi análisis.",
  testimonial_student_author: "Alumna de 12º · IB Diploma",
  testimonial_student_role: "Español A: Literatura",
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
    {
      q: "¿Funciona para Spanish B / Lengua B?",
      a: "Sí. LIBerico evalúa producción escrita de Spanish B con los criterios A–C propios de la asignatura. Selecciona la asignatura al subir tu texto.",
    },
    {
      q: "¿Qué pasa si no estoy de acuerdo con la nota?",
      a: "LIBerico da una estimación calibrada por docentes IB con décadas de experiencia, no una nota oficial. Si crees que hay un error, úsalo como punto de partida para la discusión con tu profesor. Nadie conoce tu trabajo mejor que tú.",
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
  demo_step_original: "Tu frase",
  demo_step_detect: "Qué detecta el examinador",
  demo_step_why: "Por qué baja de banda",
  demo_step_improved: "Cómo se vería mejor",
  trust_strip_calibration: "Calibrado con profesores IB",
  trust_strip_criteria: "Criterios oficiales del IB",
  trust_strip_privacy: "Sin datos compartidos",
  trust_strip_disclaimer: "Sin afiliación con la IBO",
};

const LANDING_COPY_EN: typeof LANDING_COPY_ES = {
  login_cta: "Sign in",
  nav_feedback: "Demo",
  nav_how: "How it works",
  nav_courses: "Courses",
  nav_pricing: "Pricing",
  nav_faq: "FAQ",
  badge: "Calibrated by IB examiners · Literature and Language",
  h1: "IB-calibrated correction. Feedback that sharpens your analysis.",
  sub: "Official IB criteria and guidance from teachers with decades of experience in the Diploma Programme. Paper 1, Paper 2 and Individual Oral.",
  cta_primary: "Get started",
  cta_demo: "See how it works",
  modules: [
    { label: "Paper 1", desc: "Textual analysis" },
    { label: "Paper 2", desc: "Comparative essay" },
    { label: "Individual Oral", desc: "Presentation + questions" },
  ],
  demo_title: "This is what the assessment looks like",
  demo_sub: "Estimated grade and calibrated feedback on your own text.",
  demo_flow: "Paste your analysis → choose the paper → get all this in seconds",
  before_label: "Without feedback · Band 2–3",
  after_label: "With LIBerico · Band 4–5",
  before_tags: ["Names without analysing", "No reader effect", "Vague"],
  after_tags: ["Effect explained", "Connects to theme", "IB level"],
  neruda_attr: "Based on Poem XX by Pablo Neruda",
  mockup_score_label: "Estimated grade",
  mockup_band_label: "Bands by criterion",
  mockup_annotation_label: "Criterion B:",
  mockup_rewrite_label: "Suggested rewrite",
  mockup_tier1_label: "Assessment · €1.50",
  mockup_tier2_separator: "With full feedback · +€2.00",
  mockup_annotated_label: "Your text — with examiner annotations",
  mockup_rewrite_full:
    "\"The anaphora of 'Tonight I can write the saddest lines' structures the poem as an internal struggle: each return of the line signals a new failure before the memory. The repetition is not ornamental — it mimics the impossibility of forgetting. The reader experiences the same loop as the speaker: the persistent awareness of loss, with no capacity for escape.\"",
  mockup_rewrite_note: "Your voice, better argued.",
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
  pricing_title: "No subscription. No lock-in. Pay for what you use.",
  pricing_sub:
    "Buy credits when you need them. If it's good, keep using it. If not, you've lost nothing.",
  trust_title: "Calibration and teacher judgement",
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
    { value: "4", label: "Assessed components" },
    { value: "20+", label: "Years of IB teaching experience" },
    { value: "ES / EN", label: "Literature and Language" },
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
      desc: "In seconds: Bands A–D, estimated grade out of 7, annotations in your text and model rewrite.",
    },
    {
      kicker: "Step 03",
      title: "Iterate and level up",
      desc: "Resubmit your revision and measure the difference. Your history tracks the progress.",
    },
  ],
  components_title: "Four components, one standard",
  components_sub:
    "LIBerico covers the IB's assessed components: literary analysis, comparative essay, individual oral, and written production.",
  components: [
    {
      tag: "Paper 1",
      title: "Textual analysis",
      desc: "Guided analysis of an unseen passage (prose or poetry) with a guiding question.",
      bullets: ["Curated text library", "Bands A–D with annotations", "Band 5 model rewrite"],
    },
    {
      tag: "Paper 2",
      title: "Comparative essay",
      desc: "Comparative argument across two studied works, following an IB question.",
      bullets: ["Catalogue of real IB prompts", "Comparative diagnosis", "High-band model essay"],
    },
    {
      tag: "Individual Oral",
      title: "Script and Q&A",
      desc: "Assessment of the script, balance across works, global issue and examiner questions.",
      bullets: ["Oral script notes", "Question simulator", "Per-criterion feedback"],
    },
    {
      tag: "Language B",
      title: "Written production",
      desc: "Assessment of written texts against the official Language B criteria.",
      bullets: [
        "Subject-specific criteria A–C",
        "Feedback by text type",
        "Annotations on register and organisation",
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
  testimonial_student_quote:
    "After two iterations I went from band 3 to band 5 in Criterion B. For the first time I understood exactly what was failing in my analysis.",
  testimonial_student_author: "Year 12 student · IB Diploma",
  testimonial_student_role: "English A: Literature",
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
    {
      q: "Does it work for Spanish B / Language B?",
      a: "Yes. LIBerico assesses Spanish B written production using the subject's official A–C criteria. Select the subject when you upload your text.",
    },
    {
      q: "What if I disagree with the grade?",
      a: "LIBerico gives a calibrated estimate based on IB criteria, not an official grade. If you think something is off, use it as a starting point for discussion with your teacher. Nobody knows your work better than you do.",
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
  demo_step_original: "Your sentence",
  demo_step_detect: "What the examiner detects",
  demo_step_why: "Why it drops a band",
  demo_step_improved: "How it could look better",
  trust_strip_calibration: "Calibrated with IB teachers",
  trust_strip_criteria: "Official IB criteria",
  trust_strip_privacy: "No data shared",
  trust_strip_disclaimer: "No IBO affiliation",
};

const LANDING_COPY = { es: LANDING_COPY_ES, en: LANDING_COPY_EN };

const RECEIVE_ICONS = [BarChart2, PenLine, Sparkles, History];

const CRITERION_COLORS: Record<string, string> = {
  A: "#16a34a",
  B: "#3b6fa0",
  C: "#d97706",
  D: "#e11d48",
};

const MOCKUP_BANDS_ES = [
  {
    letter: "A",
    name: "Comprensión e interpretación",
    score: 4,
    max: 5,
    desc: "Identificas el estado emocional y el tema de la pérdida. Falta desarrollar la ambigüedad del verso final.",
  },
  {
    letter: "B",
    name: "Análisis y evaluación",
    score: 3,
    max: 5,
    desc: "Nombras la anáfora pero no explicas el efecto específico que produce en el lector. Ves el 'qué', no el 'por qué'.",
  },
  {
    letter: "C",
    name: "Foco y organización",
    score: 4,
    max: 5,
    desc: "La estructura es clara. Las transiciones son funcionales pero el argumento podría ser más progresivo.",
  },
  {
    letter: "D",
    name: "Lengua",
    score: 4,
    max: 5,
    desc: "Registro académico correcto. Revisa la concordancia en el tercer párrafo.",
  },
];

const MOCKUP_BANDS_EN = [
  {
    letter: "A",
    name: "Understanding and interpretation",
    score: 4,
    max: 5,
    desc: "You identify the emotional state and the theme of loss. You need to develop the ambiguity of the final line.",
  },
  {
    letter: "B",
    name: "Analysis and evaluation",
    score: 3,
    max: 5,
    desc: "You name the anaphora but don't explain the specific effect it has on the reader. You see the 'what', not the 'why'.",
  },
  {
    letter: "C",
    name: "Focus and organisation",
    score: 4,
    max: 5,
    desc: "The structure is clear. Transitions are functional but the argument could develop more progressively.",
  },
  {
    letter: "D",
    name: "Language",
    score: 4,
    max: 5,
    desc: "Academic register is correct. Check the agreement in the third paragraph.",
  },
];

const MOCKUP_BANDS = { es: MOCKUP_BANDS_ES, en: MOCKUP_BANDS_EN };

const MOCKUP_ANNOTATIONS_ES = [
  {
    textBefore: '"El poema usa ',
    highlighted: "anáforas y metáforas",
    textAfter: " para mostrar el estado emocional del hablante lírico.",
    criterion: "B",
    note: "Nombras los recursos pero no explicas su efecto sobre el lector. ¿Qué emoción generan exactamente?",
  },
  {
    textBefore: "Hay ",
    highlighted: "muchos recursos",
    textAfter: ' que generan un efecto triste y melancólico en el lector."',
    criterion: "A",
    note: "Vago. Nombra exactamente cuáles y analiza el efecto de cada uno.",
  },
  {
    textBefore: "La repetición contribuye a ",
    highlighted: "la sensación general de melancolía que el poema quiere transmitir",
    textAfter: '."',
    criterion: "D",
    note: '"Quiere transmitir" — evita atribuir intención al poema. Di "que el hablante expresa" o "que el lector percibe".',
  },
];

const MOCKUP_ANNOTATIONS_EN = [
  {
    textBefore: '"The poem uses ',
    highlighted: "anaphoras and metaphors",
    textAfter: " to show the emotional state of the lyric speaker.",
    criterion: "B",
    note: "You name the devices but don't explain their effect on the reader. What specific emotion do they create?",
  },
  {
    textBefore: "There are ",
    highlighted: "many devices",
    textAfter: ' that create a sad and melancholic effect on the reader."',
    criterion: "A",
    note: "Vague. Name exactly which ones and analyse the effect of each.",
  },
  {
    textBefore: "The repetition contributes to ",
    highlighted: "the general feeling of melancholy the poem wants to convey",
    textAfter: '."',
    criterion: "D",
    note: '"Wants to convey" — avoid attributing intent to the poem. Say "the speaker expresses" or "the reader perceives".',
  },
];

const MOCKUP_ANNOTATIONS = { es: MOCKUP_ANNOTATIONS_ES, en: MOCKUP_ANNOTATIONS_EN };

type DemoStep = {
  original: string;
  detect: string;
  criterion: "A" | "B" | "C" | "D";
  why: string;
  improved: string;
};

const DEMO_STEPS_ES: DemoStep[] = [
  {
    original:
      "El poema usa anáforas y metáforas para mostrar el estado emocional del hablante lírico.",
    detect: "Nombras los recursos literarios pero no analizas el efecto que producen en el lector.",
    criterion: "B",
    why: "Criterio B · banda 2→3: «análisis» en IB significa explicar el efecto, no solo nombrar el recurso.",
    improved:
      "La anáfora de «Puedo escribir» estructura el poema como una lucha interna: cada retorno del verso supone un nuevo fracaso ante el recuerdo. El lector experimenta el mismo loop que el hablante.",
  },
  {
    original: "Hay muchos recursos que generan un efecto triste y melancólico.",
    detect: "La afirmación es vaga: no especifica qué recursos ni cuál es el matiz del efecto.",
    criterion: "A",
    why: "Criterio A · banda 2: «triste y melancólico» no distingue la especificidad del texto; cualquier poema de amor podría encajar.",
    improved:
      "La repetición de «la quise» en pasado simple frente al presente del yo poético crea una distancia temporal que el lector reconoce como irreversible.",
  },
];

const DEMO_STEPS_EN: DemoStep[] = [
  {
    original:
      "The poem uses anaphoras and metaphors to show the emotional state of the lyric speaker.",
    detect:
      "You name the literary devices but do not analyse the effect they produce on the reader.",
    criterion: "B",
    why: "Criterion B · band 2→3: 'analysis' in IB means explaining the effect, not just naming the device.",
    improved:
      "The anaphora of 'I can write' structures the poem as an internal struggle: each return of the line marks a new failure before memory. The reader experiences the same loop as the speaker.",
  },
  {
    original: "There are many devices that create a sad and melancholic effect.",
    detect:
      "The claim is vague: it does not specify which devices or what nuance the effect carries.",
    criterion: "A",
    why: "Criterion A · band 2: 'sad and melancholic' does not distinguish the text's specificity; any love poem could fit.",
    improved:
      "The repetition of 'I loved her' in the simple past against the speaker's present tense creates a temporal distance the reader recognises as irreversible.",
  },
];

const DEMO_STEPS = { es: DEMO_STEPS_ES, en: DEMO_STEPS_EN };

function LandingPage() {
  const demoRef = useRef<HTMLDivElement>(null);
  const [lang, setLang] = useState<LandingLang>("es");
  const copy = LANDING_COPY[lang];
  const navLinks = [
    { href: "#feedback", label: copy.nav_feedback },
    { href: "#how", label: copy.nav_how },
    { href: "#courses", label: copy.nav_courses },
    { href: "#pricing", label: copy.nav_pricing },
    { href: "#faq", label: copy.nav_faq },
  ];

  useEffect(() => {
    setLang(getInitialLandingLang());
  }, []);

  const changeLang = (l: LandingLang) => {
    setLang(l);
    try {
      localStorage.setItem(LANDING_LANG_STORAGE_KEY, l);
    } catch {
      return;
    }
  };

  const scrollToDemo = () => demoRef.current?.scrollIntoView({ behavior: "smooth" });

  const mockupBands = MOCKUP_BANDS[lang];
  const mockupAnnotations = MOCKUP_ANNOTATIONS[lang];
  const demoSteps = DEMO_STEPS[lang];

  return (
    <div
      id="top"
      className="w-full min-h-screen overflow-x-hidden"
      style={{
        ...fontSans,
        backgroundColor: NAVY.bg,
        color: NAVY.paper,
      }}
    >
      {/* NAV */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between gap-4 px-4 py-4 border-b backdrop-blur-md sm:px-8 sm:py-5"
        style={{
          borderColor: "rgba(232,237,243,0.1)",
          backgroundColor: "rgba(15,27,61,0.9)",
        }}
      >
        <a
          href="#top"
          className="text-xl font-bold tracking-tight italic sm:text-2xl hover:opacity-85"
          style={fontSerif}
        >
          LIBerico
        </a>
        <div className="hidden items-center gap-5 text-xs font-semibold uppercase tracking-[0.16em] text-white/55 lg:flex xl:gap-7">
          {navLinks.map((item) => (
            <a key={item.href} href={item.href} className="transition-colors hover:text-white">
              {item.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm font-medium tracking-wide uppercase sm:gap-4">
          <a
            href="#pricing"
            className="text-[10px] font-bold tracking-widest text-white/70 hover:text-white lg:hidden"
          >
            {copy.nav_pricing}
          </a>
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
            className="hidden px-3 py-2 border text-[10px] font-bold uppercase tracking-widest transition-all duration-300 hover:bg-[#e8edf3] hover:text-[#0f1b3d] sm:inline-block sm:px-5 sm:text-xs"
            style={{ borderColor: "rgba(232,237,243,0.3)" }}
          >
            {copy.login_cta}
          </Link>
          <Link
            to="/login"
            className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-white sm:px-5 sm:text-xs"
            style={{ backgroundColor: NAVY.paper, color: NAVY.bg }}
          >
            {copy.cta_primary}
          </Link>
        </div>
      </nav>

      {/* HERO con "7" gigante */}
      <section
        className="relative px-6 pt-16 pb-14 overflow-hidden border-b sm:px-8 sm:pt-24 sm:pb-16"
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
            className="text-4xl sm:text-7xl md:text-8xl font-normal leading-[1.05] mb-8"
            style={fontSerif}
          >
            {copy.h1}
          </h1>
          <p
            className="text-lg sm:text-xl md:text-2xl max-w-2xl mb-8 sm:mb-10 leading-relaxed"
            style={{ color: "rgba(232,237,243,0.7)" }}
          >
            {copy.sub}
          </p>
          <div className="flex flex-wrap gap-3 sm:gap-4 mb-10 sm:mb-12">
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
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6">
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
          <p className="text-xs" style={{ color: "rgba(232,237,243,0.45)" }}>
            {lang === "es"
              ? "Sin suscripción · Pagas solo lo que usas · Desde 1,50 €"
              : "No subscription · Pay only for what you use · From €1.50"}
          </p>
        </div>
      </section>

      {/* DEMO — corrección completa */}

      <section
        id="feedback"
        ref={demoRef}
        className="scroll-mt-24 py-20 sm:py-32 px-6 sm:px-8"
        style={{ backgroundColor: NAVY.paper, color: NAVY.bg }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
            <h2
              className="text-4xl sm:text-5xl font-normal max-w-xl leading-tight"
              style={fontSerif}
            >
              {copy.demo_title}
            </h2>
            <p
              className="font-medium uppercase tracking-widest text-xs sm:text-sm max-w-xs"
              style={{ color: "rgba(15,27,61,0.6)" }}
            >
              {copy.demo_sub}
            </p>
          </div>

          {/* Secuencia 4 pasos */}
          <div className="space-y-4 mb-16 sm:mb-20">
            {demoSteps.map((step, idx) => {
              const accentColor = CRITERION_COLORS[step.criterion];
              return (
                <div
                  key={idx}
                  className="grid md:grid-cols-4 gap-px overflow-hidden border"
                  style={{
                    borderColor: "rgba(15,27,61,0.1)",
                    backgroundColor: "rgba(15,27,61,0.08)",
                  }}
                >
                  {/* Col 1 — frase original */}
                  <div className="bg-white p-6 sm:p-8 flex flex-col gap-3">
                    <div
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: "rgba(15,27,61,0.4)" }}
                    >
                      {copy.demo_step_original}
                    </div>
                    <p
                      className="text-sm sm:text-base italic leading-relaxed flex-1"
                      style={{ ...fontSerif, color: "rgba(15,27,61,0.8)" }}
                    >
                      &ldquo;{step.original}&rdquo;
                    </p>
                  </div>

                  {/* Col 2 — qué detecta */}
                  <div
                    className="bg-white p-6 sm:p-8 flex flex-col gap-3 border-l-4"
                    style={{ borderLeftColor: accentColor + "66" }}
                  >
                    <div
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: "rgba(15,27,61,0.4)" }}
                    >
                      {copy.demo_step_detect}
                    </div>
                    <p
                      className="text-sm leading-relaxed flex-1"
                      style={{ color: "rgba(15,27,61,0.7)" }}
                    >
                      {step.detect}
                    </p>
                  </div>

                  {/* Col 3 — por qué baja */}
                  <div className="bg-white p-6 sm:p-8 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 text-white"
                        style={{ backgroundColor: accentColor }}
                      >
                        {step.criterion}
                      </span>
                      <div
                        className="text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: "rgba(15,27,61,0.4)" }}
                      >
                        {copy.demo_step_why}
                      </div>
                    </div>
                    <p
                      className="text-sm leading-relaxed flex-1"
                      style={{ color: "rgba(15,27,61,0.7)" }}
                    >
                      {step.why}
                    </p>
                  </div>

                  {/* Col 4 — versión mejorada */}
                  <div
                    className="p-6 sm:p-8 flex flex-col gap-3"
                    style={{ backgroundColor: accentColor + "0d" }}
                  >
                    <div
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: accentColor }}
                    >
                      {copy.demo_step_improved}
                    </div>
                    <p
                      className="text-sm sm:text-base italic leading-relaxed flex-1"
                      style={{ ...fontSerif, color: NAVY.bg }}
                    >
                      &ldquo;{step.improved}&rdquo;
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* MOCKUP — corrección completa */}
          <div className="overflow-hidden border" style={{ borderColor: "rgba(15,27,61,0.12)" }}>
            {/* Tier 1 label */}
            <div
              className="px-6 py-3 flex items-center gap-3 border-b"
              style={{ backgroundColor: NAVY.bg, borderColor: "rgba(232,237,243,0.1)" }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: NAVY.blue }}
              >
                {copy.mockup_tier1_label}
              </span>
            </div>

            {/* Score + criteria con texto */}
            <div className="p-8 sm:p-12" style={{ backgroundColor: NAVY.bg, color: NAVY.paper }}>
              <div className="flex flex-col sm:flex-row sm:items-start gap-8 sm:gap-12">
                {/* Score */}
                <div className="shrink-0 text-center sm:text-left">
                  <div className="text-7xl sm:text-8xl font-bold leading-none" style={fontSerif}>
                    5
                  </div>
                  <div className="text-lg font-medium opacity-50 mt-1">/ 7</div>
                  <div
                    className="text-[10px] uppercase tracking-widest mt-2 opacity-50"
                    style={fontSans}
                  >
                    {copy.mockup_score_label}
                  </div>
                </div>

                {/* Criteria list */}
                <div className="flex-1 divide-y" style={{ borderColor: "rgba(232,237,243,0.08)" }}>
                  {mockupBands.map((b) => (
                    <div key={b.letter} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className="text-xl font-bold shrink-0 w-6"
                          style={{ ...fontSerif, color: CRITERION_COLORS[b.letter] }}
                        >
                          {b.letter}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-widest opacity-70 flex-1">
                          {b.name}
                        </span>
                        <span
                          className="shrink-0 text-[10px] font-bold px-2 py-0.5"
                          style={{
                            backgroundColor: CRITERION_COLORS[b.letter] + "22",
                            color: CRITERION_COLORS[b.letter],
                          }}
                        >
                          {lang === "es" ? "Banda" : "Band"} {b.score}/{b.max}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mb-2 ml-9">
                        <div
                          className="flex-1 h-1 rounded-full overflow-hidden"
                          style={{ backgroundColor: "rgba(232,237,243,0.1)" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              backgroundColor: CRITERION_COLORS[b.letter],
                              width: `${(b.score / b.max) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <p className="text-xs leading-relaxed ml-9 opacity-70 italic">{b.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tier 2 separator */}
            <div
              className="px-6 py-3 flex items-center gap-3 border-t border-b"
              style={{
                backgroundColor: "rgba(59,111,160,0.12)",
                borderColor: "rgba(59,111,160,0.25)",
              }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: NAVY.blue }}
              >
                ↓ {copy.mockup_tier2_separator}
              </span>
            </div>

            {/* Ensayo anotado */}
            <div className="p-8 sm:p-12 bg-white">
              <div
                className="text-[10px] font-bold uppercase tracking-widest mb-6"
                style={{ color: "rgba(15,27,61,0.5)" }}
              >
                {copy.mockup_annotated_label}
              </div>
              <div className="space-y-6">
                {mockupAnnotations.map((seg, i) => (
                  <div key={i}>
                    <p
                      className="text-sm sm:text-base leading-relaxed italic"
                      style={{ ...fontSerif, color: "rgba(15,27,61,0.85)" }}
                    >
                      {seg.textBefore}
                      <span
                        className="border-b-2 font-medium not-italic"
                        style={{ borderColor: CRITERION_COLORS[seg.criterion], color: NAVY.bg }}
                      >
                        {seg.highlighted}
                      </span>
                      {seg.textAfter}
                    </p>
                    <div className="mt-2 ml-4 flex items-start gap-2">
                      <span
                        className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 text-white mt-0.5"
                        style={{ backgroundColor: CRITERION_COLORS[seg.criterion] }}
                      >
                        {seg.criterion}
                      </span>
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: "rgba(15,27,61,0.6)" }}
                      >
                        {seg.note}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reescritura modelo */}
            <div
              className="p-8 sm:p-12"
              style={{ backgroundColor: "rgba(59,111,160,0.07)", color: NAVY.bg }}
            >
              <div
                className="text-[10px] font-bold uppercase tracking-widest mb-4"
                style={{ color: "rgba(15,27,61,0.5)" }}
              >
                {copy.mockup_rewrite_label}
              </div>
              <blockquote
                className="text-base sm:text-lg italic leading-relaxed mb-4"
                style={{ ...fontSerif, color: NAVY.bg }}
              >
                {copy.mockup_rewrite_full}
              </blockquote>
              <p className="text-xs font-semibold" style={{ color: "rgba(15,27,61,0.45)" }}>
                {copy.mockup_rewrite_note}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section
        className="py-8 sm:py-12 px-6 sm:px-8 border-b"
        style={{ backgroundColor: NAVY.bgDeep, borderColor: "rgba(232,237,243,0.1)" }}
      >
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {[
            {
              icon: <GraduationCap className="h-4 w-4 shrink-0" style={{ color: NAVY.blue }} />,
              label: copy.trust_strip_calibration,
            },
            {
              icon: <BookOpen className="h-4 w-4 shrink-0" style={{ color: NAVY.blue }} />,
              label: copy.trust_strip_criteria,
            },
            {
              icon: <Check className="h-4 w-4 shrink-0" style={{ color: NAVY.blue }} />,
              label: copy.trust_strip_privacy,
            },
            {
              icon: <Library className="h-4 w-4 shrink-0" style={{ color: NAVY.blue }} />,
              label: copy.trust_strip_disclaimer,
            },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              {item.icon}
              <span
                className="text-xs font-semibold uppercase tracking-[0.15em]"
                style={{ color: "rgba(232,237,243,0.7)" }}
              >
                {item.label}
              </span>
            </div>
          ))}
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
              className={`flex flex-col gap-2 px-2 sm:px-6 ${i > 0 ? "md:border-l" : ""}`}
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

      {/* HOW IT WORKS */}
      <section
        id="how"
        className="scroll-mt-24 py-20 sm:py-32 px-6 sm:px-8 border-b"
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
          <div
            className="grid md:grid-cols-3 gap-px"
            style={{ backgroundColor: "rgba(232,237,243,0.08)" }}
          >
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
                <p className="text-sm leading-relaxed" style={{ color: "rgba(232,237,243,0.6)" }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPONENTS — tres pruebas */}
      <section
        id="courses"
        className="scroll-mt-24 py-20 sm:py-32 px-6 sm:px-8 border-b"
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
                      <Check className="h-3.5 w-3.5 mt-1 shrink-0" style={{ color: NAVY.blue }} />
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
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-px"
            style={{ backgroundColor: "rgba(15,27,61,0.12)" }}
          >
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

      <section
        id="pricing"
        className="scroll-mt-24 py-20 sm:py-32 px-6 sm:px-8"
        style={{ backgroundColor: NAVY.mid }}
      >
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-4xl sm:text-5xl font-normal mb-4 italic text-center leading-tight"
            style={fontSerif}
          >
            {copy.pricing_title}
          </h2>
          <p
            className="mx-auto mb-16 sm:mb-20 max-w-xl text-center text-sm sm:text-base leading-relaxed"
            style={{ color: "rgba(232,237,243,0.68)" }}
          >
            {copy.pricing_sub}
          </p>

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

          <div className="mb-10 text-center">
            <div
              className="text-[10px] font-bold tracking-[0.3em] uppercase mb-4"
              style={{ color: NAVY.blue }}
            >
              {lang === "es" ? "Confianza" : "Trust"}
            </div>
            <h3 className="text-2xl sm:text-3xl leading-tight" style={fontSerif}>
              {copy.trust_title}
            </h3>
          </div>

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
          "
        </div>
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-12 sm:gap-16">
            {/* Voz docente */}
            <div className="flex flex-col">
              <div
                className="text-[10px] font-bold tracking-[0.3em] uppercase mb-8"
                style={{ color: NAVY.blue }}
              >
                {lang === "es" ? "Voz docente" : "Teacher voice"}
              </div>
              <blockquote
                className="text-xl sm:text-2xl leading-[1.5] italic mb-8 flex-1"
                style={{ ...fontSerif, color: NAVY.paper }}
              >
                "{copy.testimonial_quote}"
              </blockquote>
              <div>
                <div
                  className="inline-block h-px w-12 mb-4"
                  style={{ backgroundColor: NAVY.blue }}
                />
                <div className="text-sm font-semibold" style={{ color: NAVY.paper }}>
                  {copy.testimonial_author}
                </div>
                <div
                  className="text-xs uppercase tracking-[0.2em] mt-1"
                  style={{ color: "rgba(232,237,243,0.5)" }}
                >
                  {copy.testimonial_role}
                </div>
              </div>
            </div>

            {/* Voz alumno */}
            <div
              className="flex flex-col p-8 sm:p-10 border"
              style={{ borderColor: "rgba(232,237,243,0.12)", backgroundColor: NAVY.mid }}
            >
              <div
                className="text-[10px] font-bold tracking-[0.3em] uppercase mb-8"
                style={{ color: NAVY.blue }}
              >
                {lang === "es" ? "Voz alumno" : "Student voice"}
              </div>
              <blockquote
                className="text-xl sm:text-2xl leading-[1.5] italic mb-8 flex-1"
                style={{ ...fontSerif, color: NAVY.paper }}
              >
                "{copy.testimonial_student_quote}"
              </blockquote>
              <div>
                <div
                  className="inline-block h-px w-12 mb-4"
                  style={{ backgroundColor: NAVY.blue }}
                />
                <div className="text-sm font-semibold" style={{ color: NAVY.paper }}>
                  {copy.testimonial_student_author}
                </div>
                <div
                  className="text-xs uppercase tracking-[0.2em] mt-1"
                  style={{ color: "rgba(232,237,243,0.5)" }}
                >
                  {copy.testimonial_student_role}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}

      <section
        id="faq"
        className="scroll-mt-24 py-20 sm:py-32 px-6 sm:px-8"
        style={{ backgroundColor: NAVY.bgDeep }}
      >
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
            <Link to="/login" className="underline underline-offset-4" style={{ color: NAVY.blue }}>
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
