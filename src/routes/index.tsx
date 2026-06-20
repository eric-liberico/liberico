import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type CSSProperties } from "react";
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
import { LANDING as L, landingFontSans as fontSans, LANDING_FONT_LINK } from "@/lib/landing-theme";
import { LandingPage } from "@/components/LandingPage";
import {
  ArrowRight,
  BarChart2,
  BookOpen,
  CalendarDays,
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

type DashboardCSSVar = CSSProperties & Record<`--${string}`, string>;

// Raíz Claro premium del panel logueado (home). Remapea los tokens shadcn de
// este subárbol al sistema claro (lienzo cálido, índigo única acción, Plex Sans
// también para los titulares serif). Sin tocar CSS global ni cascada a otras rutas.
const dashboardRootStyle: DashboardCSSVar = {
  ...fontSans,
  backgroundColor: L.bg,
  color: L.ink,
  "--background": L.bg,
  "--foreground": L.ink,
  "--ink": L.ink,
  "--card": L.surface,
  "--card-foreground": L.ink,
  "--popover": L.surface,
  "--popover-foreground": L.ink,
  "--primary": L.primary,
  "--primary-foreground": "#FFFFFF",
  "--secondary": L.bg2,
  "--secondary-foreground": L.ink,
  "--muted": L.bg2,
  "--muted-foreground": L.muted,
  "--accent": L.primary + "10",
  "--accent-foreground": L.ink,
  "--border": L.line,
  "--input": L.line,
  "--ring": L.primary,
  "--font-serif": "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
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
    <div id="dashboard-root" className="min-h-screen" style={dashboardRootStyle}>
      <style>{`
        #dashboard-root a:focus-visible,#dashboard-root button:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:14px;}
        #dashboard-root button:not([disabled]){cursor:pointer;}
      `}</style>
      <SiteHeader claro />
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
              <Button size="sm" className="w-full sm:w-auto gap-1.5 shrink-0">
                {criterioLabel[debilenCriterio].ejercicio}
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
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
