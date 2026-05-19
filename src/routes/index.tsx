import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
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
  Globe2,
  GraduationCap,
  History,
  Library,
  Mic,
  PenLine,
  Quote,
  Sparkles,
  X,
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
  if (!user) return <ConversionLandingPage />;
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

const LANDING_COPY_ES_V2 = {
  header: {
    login_cta: "Iniciar sesión",
    lang_label: "Idioma",
    lang_es: "Español",
    lang_en: "Inglés",
  },
  hero: {
    eyebrow: "Una carta para un alumno de IB · Mayo 2026",
    h1_l1: "Llega al 7.",
    h1_l2: "Con tu propia voz.",
    opening_paragraphs: [
      "Llevamos más de veinte años corrigiendo exámenes de IB Language A y participando en mesas de estandarización. Hemos visto pasar miles de comentarios y ensayos. Lo que vimos una y otra vez es esto: alumnos que entienden la obra y se quedan en un 5, porque nadie les explica qué decisión —frase a frase— separa una banda de la siguiente.",
      "Hicimos LIBerico para eso. No para escribir por ti. Para enseñarte la decisión.",
      "Te corregimos como te corregirían en el examen. Sin suscripción. Pagas solo lo que usas: 1,5 € por corrección. Y tu primer crédito es nuestro — para que veas lo que recibes antes de poner un euro.",
    ],
    cta_primary: "Crear cuenta gratis",
    cta_secondary: "Ver lo que recibes",
    cta_micro: "Sin tarjeta. Tu primer crédito es de la casa.",
    peek_credit: "1 crédito",
    peek_eq: "= una corrección",
  },
  section_labels: {
    artefact: "Corrección",
    bands: "Bandas",
    promises: "Principios",
    pricing: "Precio",
    faq: "Dudas",
  },
  bridge_into_artefact: "Esto es exactamente lo que recibes por 1,5 €.",
  artefact: {
    grade_label: "Nota estimada",
    grade_value: "6",
    grade_max: "/ 7",
    meta: "Comentario P1 · Español A · NM",
    student_section_title: "Lo que tú escribiste",
    student_before_pin_1: "El poema construye un yo lírico que ",
    student_pin_1_text: "muestra",
    student_between_pins:
      " el paso del tiempo. La voz, fragmentada, dice que el recuerdo y el presente conviven. ",
    student_pin_2_text: "El contraste entre la luz y la sombra está presente en cada estrofa",
    student_after_pin_2: ", y eso es importante para entender el tema.",
    pin_1_note: "Verbo débil: vago.",
    pin_2_note: "Tesis genérica: el contraste se nombra, no se explica.",
    criteria_section_title: "Bandas por criterio",
    criteria: [
      {
        letter: "A",
        title: "Conocimiento y comprensión",
        band: 4,
        rationale: "Identificas recursos relevantes con precisión.",
      },
      {
        letter: "B",
        title: "Análisis y evaluación",
        band: 3,
        rationale: "Nombras los recursos, pero no explicas su efecto.",
      },
      {
        letter: "C",
        title: "Concentración y desarrollo",
        band: 4,
        rationale: "Estructura clara; algunas conexiones quedan implícitas.",
      },
      {
        letter: "D",
        title: "Lengua",
        band: 4,
        rationale: "Léxico literario; precisión variable en los verbos.",
      },
    ],
    weak_index: 1,
    weak_callout_label: "Punto débil",
    weak_callout_text:
      "Tu Criterio B baja la banda. Conviertes el contraste en cita en lugar de en argumento.",
    rewrite_section_title: "Reescritura sugerida",
    your_sentence_label: "Tu frase",
    your_sentence: "La voz narrativa muestra el paso del tiempo en el poema.",
    suggestion_label: "Sugerencia",
    suggestion_before: "La voz narrativa ",
    suggestion_highlight: "desplaza",
    suggestion_after: " el paso del tiempo en el poema.",
    suggestion_note:
      "Cambia ‘muestra’ por ‘desplaza’: el verbo sostiene el argumento en lugar de presentarlo.",
    next_step_label: "Siguiente paso",
    next_step_text:
      "Reescribe el párrafo 2 anclando cada cita en su efecto sobre el lector antes de nombrar el tema.",
    caption: "Ejemplo orientativo. Tu corrección se calibra con tu prompt y tu texto.",
  },
  bridge_into_scrubber: [
    "Lo difícil del IB no es escribir más. Es decidir qué hace tu frase.",
    "Un 5 nombra. Un 6 explica. Un 7 mueve algo en quien te lee.",
    "Mira el mismo párrafo en tres bandas:",
  ],
  scrubber: {
    legend: "Banda",
    options: [
      {
        band: 5,
        eyebrow: "Idea presente",
        paragraph:
          "El poema usa el contraste entre la luz y la sombra. Esto muestra el paso del tiempo y es importante para entender el tema.",
        caption: "Banda 5 — la idea está, pero no se explica.",
      },
      {
        band: 6,
        eyebrow: "Idea explicada",
        paragraph:
          "El poema construye un contraste entre la luz y la sombra para representar el paso del tiempo: la luz nombra el presente, la sombra nombra la memoria, y la alternancia entre ambas marca la estructura del texto.",
        caption: "Banda 6 — el contraste se explica con precisión.",
      },
      {
        band: 7,
        eyebrow: "Idea movida",
        paragraph:
          "La luz y la sombra no decoran el poema: lo organizan. La voz lírica desplaza al lector entre presente y memoria, y la alternancia obliga a leer cada estrofa dos veces — primero como instante, después como recuerdo. El contraste deja de ser tema y se vuelve método.",
        caption: "Banda 7 — el contraste mueve la lectura.",
      },
    ],
    final_caption: "Mismo párrafo. Tres decisiones. Esto es lo que enseñamos.",
  },
  promises: {
    intro: "Hay cuatro cosas que no haremos.",
    items: [
      {
        neg: "No escribiremos tu texto por ti.",
        aff: "Te corregimos. Las reescrituras son modelos formativos.",
      },
      {
        neg: "No te prometeremos un 7 que no te hayas trabajado.",
        aff: "El listón es real. Te enseñamos cómo subirlo.",
      },
      {
        neg: "No guardaremos tus textos para entrenar modelos.",
        aff: "Tus textos son privados.",
      },
      {
        neg: "No te cobraremos sin que uses.",
        aff: "Sin suscripción. Sin auto-renovación.",
      },
    ],
  },
  pricing: {
    intro: "Y una cosa de la que estamos orgullosos: no hay suscripción.",
    price: "1,5 €",
    unit: "una corrección",
    bullets: [
      "Los créditos no caducan",
      "Recarga mínima: 5 créditos",
      "Primer crédito gratis al registrarte",
    ],
    cta: "Crear cuenta y empezar",
    math_line:
      "Para hacer la cuenta: una suscripción típica de tutor IA cuesta ≈ 240 € al año, la uses o no. Diez correcciones aquí cuestan 15 €.",
    disclaimer: "Comparativa orientativa con suscripciones habituales. Marcas no mencionadas.",
  },
  faq_intro: "Tres dudas que oímos siempre.",
  faq: [
    {
      q: "¿LIBerico está afiliado al IB?",
      a: "No. LIBerico es independiente. No formamos parte de la IBO ni contamos con su respaldo oficial. Las referencias a las pruebas del IB son a efectos de práctica.",
    },
    {
      q: "¿Esto es trampa?",
      a: "No. LIBerico corrige lo que tú escribes; no entrega un texto por ti. Las reescrituras se presentan como modelos formativos. Lo que entregas a tu profesor sigue siendo tu trabajo.",
    },
    {
      q: "¿Qué pasa con mis textos?",
      a: "Privados. No los compartimos con terceros y no los usamos para entrenar modelos. Consulta la política de privacidad para el detalle.",
    },
  ],
  final: {
    line: "Una corrección. 1,5 €. Empieza ahora.",
    cta: "Crear cuenta gratis",
    micro: "Sin tarjeta. Tu primer crédito es nuestro.",
  },
  signature: {
    name: "El equipo de LIBerico",
    role: "Examinadores de IB Language A · 20+ años en mesas de corrección y estandarización · Independientes del IBO",
  },
  footer: {
    copyright: "© 2026 LIBerico",
    disclaimer: "LIBerico no está afiliado al International Baccalaureate Organization.",
    privacy: "Privacidad",
    cookies: "Cookies",
    terms: "Términos",
  },
  mobile_sticky: {
    price_line: "1,5 € · una corrección",
    cta: "Crear cuenta",
  },
};

const LANDING_COPY_EN_V2: typeof LANDING_COPY_ES_V2 = {
  header: {
    login_cta: "Sign in",
    lang_label: "Language",
    lang_es: "Spanish",
    lang_en: "English",
  },
  hero: {
    eyebrow: "A letter to an IB student · May 2026",
    h1_l1: "Reach a 7.",
    h1_l2: "In your own voice.",
    opening_paragraphs: [
      "We have spent over twenty years marking IB Language A papers and serving on standardization panels. We have read thousands of commentaries and essays. What we saw, over and over, is this: students who understand the work and stay at a 5, because no one ever explains what decision — sentence by sentence — separates one band from the next.",
      "That is why we built LIBerico. Not to write for you. To teach you the decision.",
      "We mark you the way you would be marked in the exam. No subscription. You pay only for what you use: €1.50 per correction. And your first credit is on us — so you see what you get before you spend a euro.",
    ],
    cta_primary: "Create free account",
    cta_secondary: "See what you get",
    cta_micro: "No card. Your first credit is on the house.",
    peek_credit: "1 credit",
    peek_eq: "= one correction",
  },
  section_labels: {
    artefact: "Correction",
    bands: "Bands",
    promises: "Principles",
    pricing: "Pricing",
    faq: "Questions",
  },
  bridge_into_artefact: "This is exactly what you get for €1.50.",
  artefact: {
    grade_label: "Estimated grade",
    grade_value: "6",
    grade_max: "/ 7",
    meta: "P1 commentary · Spanish A · SL",
    student_section_title: "What you wrote",
    student_before_pin_1: "The poem builds a lyrical self that ",
    student_pin_1_text: "shows",
    student_between_pins:
      " the passing of time. The voice, fragmented, says that memory and present coexist. ",
    student_pin_2_text: "The contrast between light and shadow is present in every stanza",
    student_after_pin_2: ", and that is important to understand the theme.",
    pin_1_note: "Weak verb: vague.",
    pin_2_note: "Generic thesis: the contrast is named, not explained.",
    criteria_section_title: "Bands by criterion",
    criteria: [
      {
        letter: "A",
        title: "Knowledge and understanding",
        band: 4,
        rationale: "You identify relevant resources with precision.",
      },
      {
        letter: "B",
        title: "Analysis and evaluation",
        band: 3,
        rationale: "You name the resources but don't explain their effect.",
      },
      {
        letter: "C",
        title: "Focus and development",
        band: 4,
        rationale: "Clear structure; some connections remain implicit.",
      },
      {
        letter: "D",
        title: "Language",
        band: 4,
        rationale: "Literary lexicon; uneven precision on verbs.",
      },
    ],
    weak_index: 1,
    weak_callout_label: "Weak point",
    weak_callout_text:
      "Your Criterion B drags the band down. You turn the contrast into a quote instead of into an argument.",
    rewrite_section_title: "Suggested rewrite",
    your_sentence_label: "Your sentence",
    your_sentence: "The narrative voice shows the passing of time in the poem.",
    suggestion_label: "Suggestion",
    suggestion_before: "The narrative voice ",
    suggestion_highlight: "displaces",
    suggestion_after: " the passing of time in the poem.",
    suggestion_note:
      "Swap ‘shows’ for ‘displaces’: the verb carries the argument instead of just presenting it.",
    next_step_label: "Next step",
    next_step_text:
      "Rewrite paragraph 2 anchoring each quote in its effect on the reader before naming the theme.",
    caption: "Sample correction. Yours is calibrated to your prompt and your text.",
  },
  bridge_into_scrubber: [
    "What's hard about the IB isn't writing more. It's deciding what your sentence does.",
    "A 5 names. A 6 explains. A 7 moves something in the reader.",
    "Look at the same paragraph in three bands:",
  ],
  scrubber: {
    legend: "Band",
    options: [
      {
        band: 5,
        eyebrow: "Idea present",
        paragraph:
          "The poem uses the contrast between light and shadow. This shows the passing of time and is important to understand the theme.",
        caption: "Band 5 — the idea is there, but it's not explained.",
      },
      {
        band: 6,
        eyebrow: "Idea explained",
        paragraph:
          "The poem builds a contrast between light and shadow to represent the passing of time: light names the present, shadow names memory, and the alternation between them marks the structure of the text.",
        caption: "Band 6 — the contrast is explained with precision.",
      },
      {
        band: 7,
        eyebrow: "Idea moved",
        paragraph:
          "Light and shadow do not decorate the poem: they organise it. The lyric voice displaces the reader between present and memory, and the alternation forces you to read each stanza twice — first as an instant, then as a memory. The contrast stops being a theme and becomes a method.",
        caption: "Band 7 — the contrast moves the reading.",
      },
    ],
    final_caption: "Same paragraph. Three decisions. This is what we teach.",
  },
  promises: {
    intro: "There are four things we will not do.",
    items: [
      {
        neg: "We won't write your text for you.",
        aff: "We mark you. Rewrites are formative models.",
      },
      {
        neg: "We won't promise you a 7 you haven't earned.",
        aff: "The bar is real. We teach you how to raise it.",
      },
      {
        neg: "We won't keep your texts to train models.",
        aff: "Your texts are private.",
      },
      {
        neg: "We won't charge you without you using it.",
        aff: "No subscription. No auto-renewal.",
      },
    ],
  },
  pricing: {
    intro: "And one thing we're proud of: there is no subscription.",
    price: "€1.50",
    unit: "one correction",
    bullets: ["Credits never expire", "Minimum top-up: 5 credits", "First credit free on signup"],
    cta: "Create account and start",
    math_line:
      "To do the math: a typical AI-tutor subscription costs ≈ €240 a year, whether you use it or not. Ten corrections here cost €15.",
    disclaimer: "Indicative comparison with common subscriptions. No brands named.",
  },
  faq_intro: "Three questions we hear often.",
  faq: [
    {
      q: "Is LIBerico affiliated with the IB?",
      a: "No. LIBerico is independent. We are not part of the IBO and are not officially endorsed by it. References to IB papers are for practice purposes.",
    },
    {
      q: "Is this academic dishonesty?",
      a: "No. LIBerico corrects what you write; it doesn't hand you a text. Rewrites are presented as formative models. What you hand in to your teacher stays your work.",
    },
    {
      q: "What happens to my texts?",
      a: "Private. We don't share them with third parties and we don't use them to train models. See our privacy policy for details.",
    },
  ],
  final: {
    line: "One correction. €1.50. Start now.",
    cta: "Create free account",
    micro: "No card. Your first credit is on us.",
  },
  signature: {
    name: "The LIBerico team",
    role: "IB Language A examiners · 20+ years on marking and standardization panels · Independent of the IBO",
  },
  footer: {
    copyright: "© 2026 LIBerico",
    disclaimer: "LIBerico is not affiliated with the International Baccalaureate Organization.",
    privacy: "Privacy",
    cookies: "Cookies",
    terms: "Terms",
  },
  mobile_sticky: {
    price_line: "€1.50 · one correction",
    cta: "Create account",
  },
};

const LANDING_COPY_V2 = {
  es: LANDING_COPY_ES_V2,
  en: LANDING_COPY_EN_V2,
};

type LandingCopyV2 = typeof LANDING_COPY_ES_V2;

function LandingDivider() {
  return (
    <div
      className="text-center text-primary/45 tracking-[0.4em] my-16 select-none"
      aria-hidden="true"
    >
      · · ·
    </div>
  );
}

function LandingSectionHeader({
  label,
  children,
  className,
  id,
  targetRef,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  id?: string;
  targetRef?: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div id={id} ref={targetRef} className={cn("scroll-mt-24", className)}>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-px w-8 bg-primary/50" aria-hidden="true" />
        <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-primary">
          {label}
        </span>
      </div>
      <p className="font-serif text-xl sm:text-2xl text-ink leading-snug">{children}</p>
    </div>
  );
}

type LangToggleLabels = { label: string; es: string; en: string };

const DEFAULT_LANG_TOGGLE_LABELS: LangToggleLabels = {
  label: "Idioma",
  es: "Español",
  en: "English",
};

function LangToggle({
  lang,
  onChange,
  labels,
}: {
  lang: LandingLang;
  onChange: (l: LandingLang) => void;
  labels?: Partial<LangToggleLabels>;
}) {
  const resolvedLabels = { ...DEFAULT_LANG_TOGGLE_LABELS, ...labels };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="flex h-8 w-8 rounded-full text-primary hover:bg-primary/10 hover:text-primary"
          aria-label={resolvedLabels.label}
          title={resolvedLabels.label}
        >
          <Globe2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {(["es", "en"] as LandingLang[]).map((l) => (
          <DropdownMenuItem
            key={l}
            className="cursor-pointer flex items-center justify-between"
            onClick={() => onChange(l)}
          >
            <span>{l === "es" ? resolvedLabels.es : resolvedLabels.en}</span>
            {lang === l && <Check className="h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CriterionBar({
  band,
  revealed,
  weak,
}: {
  band: number;
  revealed: boolean;
  weak: boolean;
}) {
  const targetPct = Math.max(0, Math.min(5, band)) * 20;
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-[1100ms] ease-out",
          weak ? "bg-amber-500" : "bg-primary",
        )}
        style={{ width: revealed ? `${targetPct}%` : "0%" }}
      />
    </div>
  );
}

function FullArtifactCard({ copy }: { copy: LandingCopyV2["artefact"] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setRevealed(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          io.disconnect();
        }
      },
      { threshold: 0.18 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <figure aria-hidden="true">
      <div
        ref={ref}
        data-revealed={revealed}
        className="group/artefact rounded-2xl border bg-card shadow-md overflow-hidden"
      >
        {/* Header strip */}
        <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-parchment/60 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "rounded-full bg-primary/10 text-primary px-3 py-1 font-serif text-xl sm:text-2xl leading-none transition-opacity duration-700",
                revealed ? "opacity-100" : "opacity-0",
              )}
            >
              <span className="text-[0.6em] uppercase tracking-[0.18em] text-primary/70 align-middle mr-1.5">
                {copy.grade_label}
              </span>
              <span className="font-semibold">{copy.grade_value}</span>
              <span className="text-primary/60 text-base ml-1">{copy.grade_max}</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-right">{copy.meta}</div>
        </div>

        {/* Student text */}
        <div className="px-5 py-5 sm:px-6 sm:py-6 border-b border-border/60">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">
            {copy.student_section_title}
          </div>
          <p className="font-serif italic text-foreground/85 leading-relaxed text-[0.95rem] sm:text-base">
            {copy.student_before_pin_1}
            <span className="relative inline">
              <span className="bg-amber-100/70 px-0.5 rounded-sm decoration-amber-400 underline decoration-2 underline-offset-4">
                {copy.student_pin_1_text}
              </span>
              <span
                className={cn(
                  "inline-flex items-center justify-center h-4 w-4 rounded-full bg-amber-500 text-amber-50 text-[10px] align-super ml-0.5 transition-opacity duration-500",
                  revealed ? "opacity-100" : "opacity-0",
                )}
                style={{ transitionDelay: revealed ? "350ms" : "0ms" }}
              >
                1
              </span>
            </span>
            {copy.student_between_pins}
            <span className="relative inline">
              <span className="bg-amber-100/70 px-0.5 rounded-sm decoration-amber-400 underline decoration-2 underline-offset-4">
                {copy.student_pin_2_text}
              </span>
              <span
                className={cn(
                  "inline-flex items-center justify-center h-4 w-4 rounded-full bg-amber-500 text-amber-50 text-[10px] align-super ml-0.5 transition-opacity duration-500",
                  revealed ? "opacity-100" : "opacity-0",
                )}
                style={{ transitionDelay: revealed ? "600ms" : "0ms" }}
              >
                2
              </span>
            </span>
            {copy.student_after_pin_2}
          </p>
          <div
            className={cn(
              "mt-4 grid sm:grid-cols-2 gap-3 text-xs text-muted-foreground transition-opacity duration-500",
              revealed ? "opacity-100" : "opacity-0",
            )}
            style={{ transitionDelay: revealed ? "750ms" : "0ms" }}
          >
            <div className="flex items-start gap-2">
              <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-amber-500 text-amber-50 text-[10px] shrink-0 mt-0.5">
                1
              </span>
              <span>{copy.pin_1_note}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-amber-500 text-amber-50 text-[10px] shrink-0 mt-0.5">
                2
              </span>
              <span>{copy.pin_2_note}</span>
            </div>
          </div>
        </div>

        {/* Criteria */}
        <div className="px-5 py-5 sm:px-6 sm:py-6 border-b border-border/60">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-4">
            {copy.criteria_section_title}
          </div>
          <div className="space-y-4">
            {copy.criteria.map((c, i) => {
              const weak = i === copy.weak_index;
              return (
                <div
                  key={c.letter}
                  className={cn("rounded-md px-3 py-3 -mx-3", weak && "bg-amber-50/70")}
                >
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-2xl text-ink leading-none">{c.letter}</span>
                      <span className="text-sm text-foreground/80">{c.title}</span>
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">{c.band} / 5</span>
                  </div>
                  <CriterionBar band={c.band} revealed={revealed} weak={weak} />
                  <p className="mt-2 text-xs text-muted-foreground">{c.rationale}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weak callout */}
        <div className="px-5 py-5 sm:px-6 sm:py-6 border-b border-border/60">
          <div
            className={cn(
              "rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 transition-opacity duration-500",
              revealed ? "opacity-100" : "opacity-0",
            )}
            style={{ transitionDelay: revealed ? "950ms" : "0ms" }}
          >
            <div className="text-[10px] uppercase tracking-[0.18em] text-amber-800/80 font-semibold mb-1">
              {copy.weak_callout_label}
            </div>
            <p className="text-sm text-amber-900 leading-relaxed">{copy.weak_callout_text}</p>
          </div>
        </div>

        {/* Rewrite */}
        <div className="px-5 py-5 sm:px-6 sm:py-6 border-b border-border/60">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-4">
            {copy.rewrite_section_title}
          </div>
          <div className="space-y-3">
            <div className="rounded-md border border-border/60 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                {copy.your_sentence_label}
              </div>
              <p className="font-serif italic text-sm text-foreground/75">{copy.your_sentence}</p>
            </div>
            <div className="rounded-md border border-emerald-200 bg-emerald-50/50 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-800/80 font-semibold mb-1">
                {copy.suggestion_label}
              </div>
              <p className="font-serif italic text-sm text-foreground/90">
                {copy.suggestion_before}
                <span className="bg-amber-200/70 px-1 rounded-sm not-italic font-medium text-ink">
                  {copy.suggestion_highlight}
                </span>
                {copy.suggestion_after}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{copy.suggestion_note}</p>
            </div>
          </div>
        </div>

        {/* Next step */}
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-800/80 font-semibold mb-1">
              {copy.next_step_label}
            </div>
            <p className="text-sm text-emerald-900 leading-relaxed">{copy.next_step_text}</p>
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-xs text-muted-foreground text-center">
        {copy.caption}
      </figcaption>
    </figure>
  );
}

function BandScrubber({ copy }: { copy: LandingCopyV2["scrubber"] }) {
  const [bandIdx, setBandIdx] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = copy.options[bandIdx];

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = (bandIdx + 1) % copy.options.length;
      setBandIdx(next);
      tabRefs.current[next]?.focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (bandIdx - 1 + copy.options.length) % copy.options.length;
      setBandIdx(next);
      tabRefs.current[next]?.focus();
    }
  };

  return (
    <figure>
      <div className="rounded-2xl border bg-card shadow-md p-6 sm:p-8">
        <div role="tablist" aria-label={copy.legend} className="flex items-center gap-2 mb-6">
          {copy.options.map((opt, i) => (
            <button
              key={opt.band}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              aria-selected={bandIdx === i}
              tabIndex={bandIdx === i ? 0 : -1}
              onClick={() => setBandIdx(i)}
              onKeyDown={onKeyDown}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                bandIdx === i
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.band}
            </button>
          ))}
        </div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-primary/80 font-semibold mb-2">
          {current.eyebrow}
        </div>
        <p
          key={current.band}
          className="font-serif italic text-foreground/85 leading-relaxed text-[1.05rem] sm:text-lg motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
        >
          {current.paragraph}
        </p>
        <p className="mt-4 text-xs text-muted-foreground">{current.caption}</p>
      </div>
      <figcaption className="mt-4 text-xs text-muted-foreground text-center">
        {copy.final_caption}
      </figcaption>
    </figure>
  );
}

function PriceFigure({ copy }: { copy: LandingCopyV2["pricing"] }) {
  return (
    <figure>
      <div className="mx-auto max-w-md rounded-2xl border-2 border-primary/30 bg-card p-8 sm:p-10 text-center shadow-md">
        <div className="font-serif text-7xl sm:text-8xl text-primary leading-none">
          {copy.price}
        </div>
        <div className="mt-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {copy.unit}
        </div>
        <ul className="mt-6 space-y-2 text-sm text-foreground/80 text-left max-w-xs mx-auto">
          {copy.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <Button size="lg" asChild>
            <Link to="/login">{copy.cta}</Link>
          </Button>
        </div>
      </div>
    </figure>
  );
}

function MobileStickyCta({
  copy,
  finalCtaRef,
}: {
  copy: LandingCopyV2["mobile_sticky"];
  finalCtaRef: RefObject<HTMLDivElement | null>;
}) {
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const el = finalCtaRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setHidden(entry.isIntersecting), {
      threshold: 0.2,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [finalCtaRef]);

  if (!mounted) return null;

  return (
    <div
      className={cn(
        "sm:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur h-14 px-4 flex items-center justify-between gap-3 transition-transform duration-300",
        hidden ? "translate-y-full" : "translate-y-0",
      )}
    >
      <div className="font-serif text-base text-ink">{copy.price_line}</div>
      <Button size="sm" asChild>
        <Link to="/login">{copy.cta}</Link>
      </Button>
    </div>
  );
}

function ConversionLandingPage() {
  const [lang, setLang] = useState<LandingLang>(getInitialLandingLang);
  const [scrolled, setScrolled] = useState(false);
  const artefactRef = useRef<HTMLDivElement>(null);
  const finalCtaRef = useRef<HTMLDivElement>(null);

  const copy = LANDING_COPY_V2[lang];

  const changeLang = (l: LandingLang) => {
    setLang(l);
    try {
      localStorage.setItem(LANDING_LANG_STORAGE_KEY, l);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToArtefact = (e: MouseEvent) => {
    e.preventDefault();
    const el = artefactRef.current;
    if (!el) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* Header */}
      <header
        className={cn(
          "sticky top-0 z-50 border-b backdrop-blur-sm transition-[background-color,border-color,box-shadow]",
          scrolled
            ? "border-primary/15 bg-parchment/90 shadow-sm shadow-primary/5 supports-[backdrop-filter]:bg-parchment/80"
            : "border-border/60 bg-parchment/75",
        )}
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8 h-16 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="-ml-1 flex items-center gap-2 rounded-md px-1 py-1 outline-none transition-colors hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm shadow-primary/20">
              <BookOpen className="h-5 w-5" />
            </span>
            <span className="font-serif text-lg font-semibold text-ink">LIBerico</span>
          </Link>
          <div className="flex items-center gap-2">
            <LangToggle
              lang={lang}
              onChange={changeLang}
              labels={{
                label: copy.header.lang_label,
                es: copy.header.lang_es,
                en: copy.header.lang_en,
              }}
            />
            <Button
              size="sm"
              className="h-9 bg-primary px-4 text-primary-foreground shadow-sm shadow-primary/15 hover:bg-primary/90"
              asChild
            >
              <Link to="/login">{copy.header.login_cta}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* The letter */}
      <main className="mx-auto max-w-6xl px-5 sm:px-8 pt-12 sm:pt-16 pb-32 sm:pb-24">
        {/* Hero — 2 columns on lg */}
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-start">
          <div className="max-w-2xl">
            {/* Eyebrow */}
            <div className="mb-6">
              <Badge
                variant="outline"
                className="border-primary/25 bg-primary/5 text-[10px] uppercase tracking-[0.22em] font-medium text-primary"
              >
                {copy.hero.eyebrow}
              </Badge>
            </div>

            {/* H1 */}
            <h1 className="font-serif text-ink text-5xl sm:text-6xl lg:text-6xl xl:text-7xl leading-[0.95]">
              {copy.hero.h1_l1}
              <br />
              <span className="italic text-primary">{copy.hero.h1_l2}</span>
            </h1>

            {/* Opening paragraphs */}
            <div className="mt-10 space-y-6">
              {copy.hero.opening_paragraphs.map((p, i) => (
                <p
                  key={i}
                  className="font-serif text-lg sm:text-xl leading-[1.7] text-foreground/85"
                >
                  {p}
                </p>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-start gap-3">
              <Button size="lg" asChild>
                <Link to="/login">
                  {copy.hero.cta_primary}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="text-primary hover:bg-primary/10 hover:text-primary"
                asChild
              >
                <a href="#artefacto" onClick={scrollToArtefact}>
                  {copy.hero.cta_secondary}
                </a>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{copy.hero.cta_micro}</p>
          </div>

          {/* Hero peek — desktop only */}
          <div className="hidden lg:block relative pt-10 pl-4">
            <div className="relative -rotate-2">
              <div className="rounded-2xl border bg-card shadow-xl shadow-primary/10 ring-1 ring-border/60 overflow-hidden">
                <div className="bg-parchment/60 border-b border-border/60 px-5 py-4 flex items-center justify-between gap-3">
                  <div className="rounded-full bg-primary/10 text-primary px-3 py-1.5 font-serif leading-none">
                    <span className="text-[0.6em] uppercase tracking-[0.18em] text-primary/70 align-middle mr-1.5">
                      {copy.artefact.grade_label}
                    </span>
                    <span className="font-semibold text-xl">{copy.artefact.grade_value}</span>
                    <span className="text-primary/60 text-sm ml-1">{copy.artefact.grade_max}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground text-right leading-tight">
                    {copy.artefact.meta}
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  {copy.artefact.criteria.map((c, i) => {
                    const weak = i === copy.artefact.weak_index;
                    const pct = c.band * 20;
                    return (
                      <div key={c.letter} className="flex items-center gap-3">
                        <span className="font-serif text-sm w-4 text-ink">{c.letter}</span>
                        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              weak ? "bg-amber-500" : "bg-primary",
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">
                          {c.band}/5
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Floating badge */}
              <div className="absolute -top-4 -right-3 rotate-3 bg-primary text-primary-foreground rounded-lg shadow-md px-3 py-2 text-xs">
                <div className="font-serif text-base leading-none">{copy.hero.peek_credit}</div>
                <div className="opacity-80 mt-0.5">{copy.hero.peek_eq}</div>
              </div>
            </div>
          </div>
        </div>

        <LandingDivider />

        {/* Bridge into artefact */}
        <div className="max-w-2xl mx-auto">
          <LandingSectionHeader
            id="artefacto"
            targetRef={artefactRef}
            label={copy.section_labels.artefact}
          >
            {copy.bridge_into_artefact}
          </LandingSectionHeader>
        </div>

        {/* Figure 1 — Artefact */}
        <div className="mt-8 max-w-3xl mx-auto">
          <FullArtifactCard copy={copy.artefact} />
        </div>

        {/* Bridge into scrubber */}
        <div className="mt-20 max-w-2xl mx-auto space-y-4">
          <LandingSectionHeader label={copy.section_labels.bands} className="mb-5">
            {copy.bridge_into_scrubber[0]}
          </LandingSectionHeader>
          {copy.bridge_into_scrubber.slice(1).map((line, i) => (
            <p
              key={line}
              className={cn(
                "font-serif leading-[1.7]",
                i === copy.bridge_into_scrubber.length - 2
                  ? "text-foreground/75 text-lg"
                  : "text-foreground/85 text-lg sm:text-xl",
              )}
            >
              {line}
            </p>
          ))}
        </div>

        {/* Figure 2 — Scrubber */}
        <div className="mt-8 max-w-3xl mx-auto">
          <BandScrubber copy={copy.scrubber} />
        </div>

        <LandingDivider />

        {/* Promises */}
        <div className="max-w-4xl mx-auto">
          <LandingSectionHeader label={copy.section_labels.promises} className="max-w-2xl">
            {copy.promises.intro}
          </LandingSectionHeader>
          <ul className="mt-6 grid sm:grid-cols-2 gap-x-8 border-y border-border/60 sm:divide-x sm:divide-border/60">
            {copy.promises.items.map((it, i) => (
              <li
                key={it.neg}
                className={cn(
                  "flex items-start gap-3 py-4 sm:px-4",
                  i < copy.promises.items.length - 2 && "border-b border-border/60 sm:border-b-0",
                  // 2-col grid: only bottom 2 cells need bottom border on mobile
                  i === copy.promises.items.length - 2 && "border-b border-border/60 sm:border-b-0",
                  i % 2 === 0 && "sm:pl-0",
                )}
              >
                <X className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                <div>
                  <span className="text-muted-foreground">{it.neg}</span>{" "}
                  <span className="text-foreground/90">{it.aff}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <LandingDivider />

        {/* Pricing — 2 columns on lg */}
        <div className="max-w-5xl mx-auto">
          <LandingSectionHeader label={copy.section_labels.pricing} className="max-w-2xl">
            {copy.pricing.intro}
          </LandingSectionHeader>
          <div className="mt-10 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <PriceFigure copy={copy.pricing} />
            </div>
            <div>
              <p className="font-serif text-base sm:text-lg leading-[1.7] text-foreground/80">
                {copy.pricing.math_line}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">{copy.pricing.disclaimer}</p>
            </div>
          </div>
        </div>

        <LandingDivider />

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <LandingSectionHeader label={copy.section_labels.faq}>
            {copy.faq_intro}
          </LandingSectionHeader>
          <Accordion type="single" collapsible className="mt-6 border-y border-border/60">
            {copy.faq.map((item, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border-b border-border/60 last:border-b-0"
              >
                <AccordionTrigger className="font-serif text-base sm:text-lg text-ink text-left py-5 hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-foreground/75 leading-relaxed text-base pb-5">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <LandingDivider />

        {/* Final CTA */}
        <div
          ref={finalCtaRef}
          id="final-cta"
          className="text-center scroll-mt-20 max-w-3xl mx-auto"
        >
          <p className="font-serif text-3xl sm:text-4xl md:text-5xl text-ink leading-[1.1]">
            {copy.final.line}
          </p>
          <div className="mt-8 flex justify-center">
            <Button size="lg" asChild>
              <Link to="/login">
                {copy.final.cta}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{copy.final.micro}</p>
        </div>

        {/* Signature */}
        <div className="mt-16 max-w-2xl mx-auto text-sm text-muted-foreground italic">
          <div className="flex items-start gap-2">
            <Quote className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 mt-1" />
            <div>
              <div>— {copy.signature.name}</div>
              <div className="mt-1 not-italic text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
                {copy.signature.role}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2 flex-wrap">
            <span>{copy.footer.copyright}</span>
            <span aria-hidden="true">·</span>
            <span>{copy.footer.disclaimer}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/privacy" className="hover:text-foreground underline underline-offset-2">
              {copy.footer.privacy}
            </Link>
            <Link to="/cookies" className="hover:text-foreground underline underline-offset-2">
              {copy.footer.cookies}
            </Link>
            <Link to="/terms" className="hover:text-foreground underline underline-offset-2">
              {copy.footer.terms}
            </Link>
          </div>
        </div>
      </footer>

      {/* Mobile sticky bottom CTA */}
      <MobileStickyCta copy={copy.mobile_sticky} finalCtaRef={finalCtaRef} />
    </div>
  );
}
