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
import {
  LANDING as L,
  landingFontSans as fontSans,
  landingFontMono as fontMono,
  LANDING_FONT_LINK,
} from "@/lib/landing-theme";
import { LandingPage } from "@/components/LandingPage";
import {
  ArrowRight,
  BarChart2,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Library,
  Mic,
  PenLine,
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
  // Héroe corrections-centric
  estimacion_eyebrow: "Estimación del examinador",
  estimacion_formando: "Tu nota se está formando",
  completa_las_3: "Completa las 3 pruebas para verla",
  siguiente_eyebrow: "Tu siguiente paso",
  paso_debil: (letra: string) => `El Criterio ${letra} fue tu banda más floja.`,
  paso_falta: (comp: string) => `Te falta ${comp} para tu nota IB completa.`,
  paso_seguir: "Sigue corrigiendo para mantener afinada tu estimación.",
  nueva: "Nueva", // "Nueva Prueba 1"
  o_practica: "o practica el Criterio",
  // Bloque Corregir (el foco)
  corregir_title: "Corregir",
  corregir_sub: "Sube tu trabajo y recibe bandas A–D + nota IB",
  comp_p1_title: "Prueba 1",
  comp_p1_sub: "Comentario de texto",
  comp_p2_title: "Prueba 2",
  comp_p2_sub: "Ensayo comparativo",
  comp_oral_title: "Oral Individual",
  comp_oral_sub: "Guion y respuestas",
  // Correcciones recientes
  recientes_title: "Tus últimas correcciones",
  ver_historial: "Ver historial",
  // Extras (referencia tenue)
  extras_title: "Extras",
  // Empty state
  empty_hero_title: "Aún no tienes correcciones",
  empty_hero_body:
    "Sube tu primer comentario de Prueba 1 y verás aquí tu nota IB estimada y tus bandas A–D.",
  empty_hero_cta: "Empezar Prueba 1",
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
  estimacion_eyebrow: "Examiner's estimate",
  estimacion_formando: "Your grade is taking shape",
  completa_las_3: "Complete all three papers to see it",
  siguiente_eyebrow: "Your next step",
  paso_debil: (letra: string) => `Criterion ${letra} was your weakest band.`,
  paso_falta: (comp: string) => `You still need ${comp} for your full IB grade.`,
  paso_seguir: "Keep getting marked to keep your estimate sharp.",
  nueva: "New",
  o_practica: "or practise Criterion",
  corregir_title: "Get marked",
  corregir_sub: "Submit your work and get A–D bands + IB grade",
  comp_p1_title: "Paper 1",
  comp_p1_sub: "Literary analysis",
  comp_p2_title: "Paper 2",
  comp_p2_sub: "Comparative essay",
  comp_oral_title: "Individual Oral",
  comp_oral_sub: "Script and responses",
  recientes_title: "Your latest corrections",
  ver_historial: "View history",
  extras_title: "Extras",
  empty_hero_title: "No corrections yet",
  empty_hero_body:
    "Submit your first Paper 1 analysis and your estimated IB grade and A–D bands will appear here.",
  empty_hero_cta: "Start Paper 1",
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

// Fecha relativa breve y bilingüe para la lista de correcciones recientes.
function relTime(iso: string, isEN: boolean): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return isEN ? "today" : "hoy";
  if (days === 1) return isEN ? "yesterday" : "ayer";
  if (days < 7) return isEN ? `${days} days ago` : `hace ${days} días`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return isEN ? `${weeks} wk ago` : `hace ${weeks} sem`;
  const months = Math.floor(days / 30);
  return isEN ? `${months} mo ago` : `hace ${months} mes${months > 1 ? "es" : ""}`;
}

// Firma del home: escalera de banda 1→7. La nota IB se posa en su peldaño y un
// trazo de pluma ámbar marca el avance. Mono = "estimación de examinador".
function BandLadder({ nota }: { nota: number | null }) {
  return (
    <div>
      <div className="flex gap-1" style={fontMono}>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => {
          const active = nota === n;
          return (
            <span
              key={n}
              className="flex-1 text-center text-xs py-1.5 rounded-md transition-colors"
              style={
                active
                  ? { background: L.primary, color: "#fff", fontWeight: 600 }
                  : { color: L.muted, border: `1px solid ${L.line}` }
              }
            >
              {n}
            </span>
          );
        })}
      </div>
      <div
        className="mt-1.5 h-[3px] rounded-full transition-all"
        style={{
          width: `${((nota ?? 0) / 7) * 100}%`,
          background: nota ? L.amber : "transparent",
        }}
        aria-hidden="true"
      />
    </div>
  );
}

function DashboardPage() {
  const { rol, courseKey } = useAuth();
  const isEN = useUiLang() === "en";
  const navigate = useNavigate();
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

  // ── Datos derivados del héroe (la corrección es el foco) ────────────────────
  const ultimaP1 = chartData.p1.at(-1);
  const ultimaP2 = chartData.p2.at(-1);
  const ultimaOral = chartData.oral.at(-1);
  const p1Raw = ultimaP1
    ? (ultimaP1.banda_a ?? 0) +
      (ultimaP1.banda_b ?? 0) +
      (ultimaP1.banda_c ?? 0) +
      (ultimaP1.banda_d ?? 0)
    : null;
  const p2Raw = ultimaP2 ? ultimaP2.puntuacion_total : null;
  const oralRaw = ultimaOral ? ultimaOral.puntuacion_total : null;
  const total =
    p1Raw != null && p2Raw != null && oralRaw != null
      ? escalarP1(p1Raw) + escalarP2(p2Raw) + escalarOral(oralRaw)
      : null;
  const notaFinal = total != null ? notaIBFinal(total) : null;

  // Entradas de corrección — el foco primario del panel (gateadas por curso).
  const correcciones = (
    [
      {
        key: "p1",
        to: "/prueba-1",
        title: t.comp_p1_title,
        sub: t.comp_p1_sub,
        icon: BookOpen,
        done: stats.p1 > 0,
        show: caps.paper1Enabled,
      },
      {
        key: "p2",
        to: "/prueba-2",
        title: t.comp_p2_title,
        sub: t.comp_p2_sub,
        icon: PenLine,
        done: stats.p2 > 0,
        show: caps.paper2Enabled,
      },
      {
        key: "oral",
        to: "/oral",
        title: t.comp_oral_title,
        sub: t.comp_oral_sub,
        icon: Mic,
        done: stats.oral > 0,
        show: caps.oralEnabled,
      },
    ] as const
  ).filter((c) => c.show);
  const primerPendiente = correcciones.find((c) => !c.done);

  // Lista unificada de correcciones recientes (el artefacto que el alumno revisita).
  const recientes = [
    ...chartData.p1.map((e, i) => ({
      id: `p1-${i}`,
      tipo: "P1",
      date: e.created_at,
      to: "/historial" as const,
      detail: `${t.nota_ib_label} ${e.nota_ib} · A${e.banda_a} B${e.banda_b} C${e.banda_c} D${e.banda_d}`,
    })),
    ...chartData.p2.map((e, i) => ({
      id: `p2-${i}`,
      tipo: "P2",
      date: e.created_at,
      to: "/historial-prueba-2" as const,
      detail: `${e.puntuacion_total}/25`,
    })),
    ...chartData.oral.map((e, i) => ({
      id: `oral-${i}`,
      tipo: "Oral",
      date: e.created_at,
      to: "/historial-oral" as const,
      detail: `${e.puntuacion_total}/40`,
    })),
  ]
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 5);

  // Extras (referencia tenue): práctica/teoría/tutoría — nunca el foco.
  const extras = (
    [
      { to: "/biblioteca", label: t.biblioteca_link, icon: Library, show: caps.practiceLibrary },
      { to: "/ejercicios", label: t.ejercicios_link, icon: PenLine, show: caps.exercises },
      { to: "/simular-oral", label: t.simular_link, icon: Mic, show: caps.oralSimulator },
      { to: "/teoria", label: t.teoria_link, icon: GraduationCap, show: caps.theory },
      { to: "/reservar-sesion", label: t.reservar, icon: CalendarDays, show: !isEnglishA },
    ] as const
  ).filter((x) => x.show);

  // Siguiente paso: mensaje + CTA primario, siempre dentro del bucle de corrección.
  const paso = debilenCriterio
    ? {
        msg: t.paso_debil(criterioLabel[debilenCriterio].letra),
        to: "/prueba-1" as const,
        cta: `${t.nueva} ${t.comp_p1_title}`,
      }
    : primerPendiente
      ? {
          msg: t.paso_falta(primerPendiente.title),
          to: primerPendiente.to,
          cta: `${t.nueva} ${primerPendiente.title}`,
        }
      : {
          msg: t.paso_seguir,
          to: "/prueba-1" as const,
          cta: `${t.nueva} ${t.comp_p1_title}`,
        };

  return (
    <div id="dashboard-root" className="min-h-screen" style={dashboardRootStyle}>
      <style>{`
        #dashboard-root a:focus-visible,#dashboard-root button:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:14px;}
        #dashboard-root button:not([disabled]){cursor:pointer;}
      `}</style>
      <SiteHeader claro />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14">
        {/* Encabezado compacto */}
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              {COURSES[courseKey]?.label}
            </p>
            <h1 className="font-serif text-2xl sm:text-3xl text-ink mt-0.5">{t.heading}</h1>
          </div>
        </div>

        {/* HÉROE — estimación del examinador + siguiente paso */}
        {totalEvals === 0 ? (
          <Card className="mb-8 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  {t.estimacion_eyebrow}
                </p>
                <h2 className="font-serif text-xl sm:text-2xl text-ink mt-1">
                  {t.empty_hero_title}
                </h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-md">{t.empty_hero_body}</p>
                <Link to="/prueba-1" className="inline-block mt-4">
                  <Button className="gap-1.5">
                    {t.empty_hero_cta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
              <div className="w-full sm:w-52 opacity-45" aria-hidden="true">
                <BandLadder nota={null} />
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-[1.35fr_1fr] gap-3 sm:gap-4 mb-8">
            {/* Estimación */}
            <Card className="p-5 sm:p-6">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                {t.estimacion_eyebrow}
              </p>
              <div className="flex items-end gap-4 mt-3">
                <div className="leading-none shrink-0">
                  <span className="font-serif text-6xl sm:text-7xl font-semibold text-ink">
                    {notaFinal ?? "–"}
                  </span>
                  <span className="font-serif text-2xl text-muted-foreground">/7</span>
                </div>
                <div className="flex-1 min-w-0 pb-1.5">
                  <BandLadder nota={notaFinal} />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2" style={fontMono}>
                {(
                  [
                    { label: "P1", raw: p1Raw, max: 20 },
                    { label: "P2", raw: p2Raw, max: 25 },
                    { label: "Oral", raw: oralRaw, max: 40 },
                  ] as const
                ).map((c) => (
                  <span
                    key={c.label}
                    className="text-[11px] px-2 py-1 rounded-md border"
                    style={
                      c.raw != null
                        ? { borderColor: L.line, color: L.ink, background: L.bg2 }
                        : { borderColor: L.line, color: L.muted, borderStyle: "dashed" }
                    }
                  >
                    {c.label} {c.raw != null ? `${c.raw}/${c.max}` : "—"}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {total != null
                  ? `${t.nota_final_sub} · ${t.puntos_compuestos(total)}`
                  : t.completa_las_3}
              </p>
            </Card>

            {/* Siguiente paso */}
            <Card className="p-5 sm:p-6 flex flex-col" style={{ background: L.bg2 }}>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                {t.siguiente_eyebrow}
              </p>
              <p className="text-sm text-ink mt-2 flex-1 leading-relaxed">{paso.msg}</p>
              <div className="mt-4 flex flex-col gap-2">
                <Link to={paso.to}>
                  <Button className="w-full gap-1.5">
                    {paso.cta}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </Link>
                {debilenCriterio && (
                  <Link
                    to="/ejercicios"
                    search={{ tab: criterioLabel[debilenCriterio].tab }}
                    className="text-xs text-center hover:underline"
                    style={{ color: L.primary }}
                  >
                    {t.o_practica} {criterioLabel[debilenCriterio].letra}
                  </Link>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* CORREGIR — el foco del panel */}
        <section className="mb-8">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <h2 className="font-serif text-lg text-ink">{t.corregir_title}</h2>
            <p className="text-xs text-muted-foreground hidden sm:block">{t.corregir_sub}</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {correcciones.map((c) => {
              const Icon = c.icon;
              return (
                <Link
                  key={c.key}
                  to={c.to}
                  className="group rounded-xl border bg-card p-5 flex flex-col gap-3 transition-shadow hover:shadow-md"
                  style={{ borderColor: L.line }}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center"
                      style={{ background: L.primary + "12", color: L.primary }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-ink">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.sub}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ÚLTIMAS CORRECCIONES */}
        {recientes.length > 0 && (
          <section className="mb-8">
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <h2 className="font-serif text-lg text-ink">{t.recientes_title}</h2>
              <Link
                to="/historial"
                className="text-xs flex items-center gap-1 hover:underline"
                style={{ color: L.primary }}
              >
                {t.ver_historial}
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </div>
            <Card className="divide-y overflow-hidden">
              {recientes.map((r) => (
                <Link
                  key={r.id}
                  to={r.to}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors"
                >
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded shrink-0"
                    style={{ background: L.primary + "12", color: L.primary }}
                  >
                    {r.tipo}
                  </span>
                  <span className="text-sm text-ink truncate flex-1" style={fontMono}>
                    {r.detail}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {relTime(r.date, isEN)}
                  </span>
                  <ArrowRight
                    className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </Card>
          </section>
        )}

        {/* PROGRESIÓN */}
        {totalEvals > 0 && (
          <Card className="p-6 mb-8">
            <div className="flex items-center gap-2.5 mb-4">
              <div
                className="h-9 w-9 rounded-md flex items-center justify-center shrink-0"
                style={{ background: L.primary + "12", color: L.primary }}
              >
                <BarChart2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-base text-ink">{t.progresion_title}</h2>
                <p className="text-xs text-muted-foreground">{t.progresion_sub}</p>
              </div>
            </div>
            <GraficoProgresoIB p1={chartData.p1} p2={chartData.p2} oral={chartData.oral} />
          </Card>
        )}

        {/* EXTRAS — referencia tenue, nunca el foco */}
        {extras.length > 0 && (
          <section>
            <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
              {t.extras_title}
            </h2>
            {extras.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {extras.map((x) => {
                  const Icon = x.icon;
                  return (
                    <Link
                      key={x.to}
                      to={x.to}
                      className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-colors hover:bg-accent text-foreground/70 hover:text-foreground"
                      style={{ borderColor: L.line }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {x.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
