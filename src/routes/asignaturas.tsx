import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { COURSES, type CourseKey, type UiLang } from "@/lib/ib-courses";
import {
  LANDING_FONT_LINK,
  LANDING as L,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";
import { BookOpen, CheckCircle2, Loader2, Mic, PenLine } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/asignaturas")({
  head: () => ({
    meta: [
      { title: "Asignaturas — LIBerico" },
      { name: "description", content: "Cambia de asignatura y consulta tu progreso en cada una." },
    ],
    links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }],
  }),
  component: AsignaturasPage,
});

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;

// CTA primario reutilizable (índigo + glow), igual que la landing/login
const ctaPrimary = {
  backgroundColor: L.primary,
  color: "#fff",
  boxShadow: "0 16px 30px -12px rgba(79,70,229,0.55)",
} as const;

// ── Textos por curso ─────────────────────────────────────────────────────────

type CourseTexts = {
  heading: string;
  sub: string;
  p1Label: string;
  p2Label: string;
  oralLabel: string;
  evalSingular: string;
  evalPlural: string;
  sinEvals: string;
  activar: string;
  activa: string;
  p1Desc: string;
  p2Desc: string;
  oralDesc: string;
  notaLabel: string;
};

const SUBJECTS_LANG_STORAGE_KEY = "liberico.subjectsLang";

function readSubjectsLang(): UiLang {
  if (typeof window === "undefined") return "es";
  try {
    return window.localStorage.getItem(SUBJECTS_LANG_STORAGE_KEY) === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

const PAGE_TEXTS: Record<
  UiLang,
  {
    title: string;
    subtitle: string;
    languageLabel: string;
    languageNames: Record<UiLang, string>;
    loading: string;
    statsUnavailable: string;
    switched: (course: string) => string;
    goToDashboard: string;
  }
> = {
  es: {
    title: "Asignaturas",
    subtitle: "Selecciona la asignatura con la que quieres trabajar hoy.",
    languageLabel: "Idioma",
    languageNames: { es: "Español", en: "English" },
    loading: "Cargando...",
    statsUnavailable: "No pudimos cargar tu progreso ahora.",
    switched: (course) => `Asignatura cambiada a ${course}`,
    goToDashboard: "Ir al inicio",
  },
  en: {
    title: "Subjects",
    subtitle: "Choose the subject you want to work with today.",
    languageLabel: "Language",
    languageNames: { es: "Español", en: "English" },
    loading: "Loading...",
    statsUnavailable: "We could not load your progress right now.",
    switched: (course) => `Subject changed to ${course}`,
    goToDashboard: "Go to dashboard",
  },
};

const COURSE_TEXTS: Record<UiLang, Record<CourseKey, CourseTexts>> = {
  es: {
    "spanish-a-literature": {
      heading: "Español A: Literatura",
      sub: "IB · Nivel Medio / Superior",
      p1Label: "Prueba 1",
      p2Label: "Prueba 2",
      oralLabel: "Oral Individual",
      evalSingular: "evaluación",
      evalPlural: "evaluaciones",
      sinEvals: "Sin evaluaciones aún",
      activar: "Cambiar a esta asignatura",
      activa: "Asignatura activa",
      p1Desc: "Análisis literario guiado",
      p2Desc: "Ensayo comparativo",
      oralDesc: "Trabajo Oral Individual",
      notaLabel: "Nota media IB",
    },
    "english-a-literature": {
      heading: "Inglés A: Literatura",
      sub: "IB · Nivel Medio / Superior",
      p1Label: "Prueba 1",
      p2Label: "Prueba 2",
      oralLabel: "Oral Individual",
      evalSingular: "análisis",
      evalPlural: "análisis / ensayos",
      sinEvals: "Sin evaluaciones aún",
      activar: "Cambiar a esta asignatura",
      activa: "Asignatura activa",
      p1Desc: "Análisis literario guiado",
      p2Desc: "Ensayo comparativo",
      oralDesc: "Oral Individual",
      notaLabel: "Nota media",
    },
    "spanish-b-language": {
      heading: "Español B (Adquisición)",
      sub: "IB · Nivel Medio",
      p1Label: "Prueba 1",
      p2Label: "Prueba 2",
      oralLabel: "Oral Individual",
      evalSingular: "tarea escrita",
      evalPlural: "tareas escritas",
      sinEvals: "Sin evaluaciones aún",
      activar: "Cambiar a esta asignatura",
      activa: "Asignatura activa",
      p1Desc: "Producción escrita",
      p2Desc: "Comprensión lectora y auditiva (próximamente)",
      oralDesc: "Oral Individual (próximamente)",
      notaLabel: "Nota media",
    },
  },
  en: {
    "spanish-a-literature": {
      heading: "Spanish A: Literature",
      sub: "IB · Standard / Higher Level",
      p1Label: "Paper 1",
      p2Label: "Paper 2",
      oralLabel: "Individual Oral",
      evalSingular: "assessment",
      evalPlural: "assessments",
      sinEvals: "No evaluations yet",
      activar: "Switch to this subject",
      activa: "Active subject",
      p1Desc: "Guided literary analysis",
      p2Desc: "Comparative essay",
      oralDesc: "Individual Oral",
      notaLabel: "Average IB grade",
    },
    "english-a-literature": {
      heading: "English A: Literature",
      sub: "IB · Standard / Higher Level",
      p1Label: "Paper 1",
      p2Label: "Paper 2",
      oralLabel: "Individual Oral",
      evalSingular: "analysis",
      evalPlural: "analyses / essays",
      sinEvals: "No evaluations yet",
      activar: "Switch to this subject",
      activa: "Active subject",
      p1Desc: "Guided literary analysis",
      p2Desc: "Comparative essay",
      oralDesc: "Individual Oral",
      notaLabel: "Average grade",
    },
    "spanish-b-language": {
      heading: "Spanish B (Acquisition)",
      sub: "IB · Standard Level",
      p1Label: "Paper 1",
      p2Label: "Paper 2",
      oralLabel: "Individual Oral",
      evalSingular: "writing task",
      evalPlural: "writing tasks",
      sinEvals: "No evaluations yet",
      activar: "Switch to this subject",
      activa: "Active subject",
      p1Desc: "Written production",
      p2Desc: "Reading + Listening (coming soon)",
      oralDesc: "Individual Oral (coming soon)",
      notaLabel: "Average grade",
    },
  },
};

// ── Tipos de stats ────────────────────────────────────────────────────────────

type CourseStats = {
  p1: number;
  p2: number;
  oral: number;
  notaMediaP1: number | null;
  notaMediaP2: number | null;
  notaMediaOral: number | null;
};

type LiteratureCourseKey = Exclude<CourseKey, "spanish-b-language">;
type NotaRow = { nota_ib?: number | null };
type CourseRow = NotaRow & { course_key?: string | null };

const LITERATURE_COURSE_KEYS: LiteratureCourseKey[] = [
  "spanish-a-literature",
  "english-a-literature",
];

function emptyStats(): CourseStats {
  return {
    p1: 0,
    p2: 0,
    oral: 0,
    notaMediaP1: null,
    notaMediaP2: null,
    notaMediaOral: null,
  };
}

function isLiteratureCourseKey(value: string | null | undefined): value is LiteratureCourseKey {
  return value === "spanish-a-literature" || value === "english-a-literature";
}

function rowsByCourse<T extends CourseRow>(rows: T[]): Record<LiteratureCourseKey, T[]> {
  const grouped: Record<LiteratureCourseKey, T[]> = {
    "spanish-a-literature": [],
    "english-a-literature": [],
  };
  for (const row of rows) {
    if (isLiteratureCourseKey(row.course_key)) {
      grouped[row.course_key].push(row);
    }
  }
  return grouped;
}

function notaMediaDesde(rows: { nota_ib?: number | null }[]): number | null {
  const validas = rows.map((r) => r.nota_ib).filter((n): n is number => typeof n === "number");
  if (validas.length === 0) return null;
  return Math.round((validas.reduce((a, b) => a + b, 0) / validas.length) * 10) / 10;
}

// ── Componente principal ──────────────────────────────────────────────────────

function AsignaturasPage() {
  const { user, loading: authLoading, rol, courseKey, setCourseKey } = useAuth();
  const navigate = useNavigate();

  const [pageLang, setPageLangState] = useState<UiLang>(readSubjectsLang);
  const [statsMap, setStatsMap] = useState<Partial<Record<CourseKey, CourseStats>>>({});
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsFailed, setStatsFailed] = useState(false);
  const [switching, setSwitching] = useState<CourseKey | null>(null);

  const pageTexts = PAGE_TEXTS[pageLang];
  const courseTexts = COURSE_TEXTS[pageLang];

  const setPageLang = (next: UiLang) => {
    setPageLangState(next);
    try {
      window.localStorage.setItem(SUBJECTS_LANG_STORAGE_KEY, next);
    } catch {
      /* noop */
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (rol === "admin") {
      navigate({ to: "/admin" });
    }
  }, [user, rol, authLoading, navigate]);

  // Carga stats de TODOS los cursos disponibles en paralelo
  useEffect(() => {
    if (!user || rol === "admin") return;
    let cancelled = false;

    const fetchAll = async () => {
      setLoadingStats(true);
      setStatsFailed(false);

      try {
        const [paper1Res, paper2Res, oralRes, paper1BRes] = await Promise.all([
          supabase
            .from("evaluaciones")
            .select("course_key,nota_ib")
            .eq("user_id", user.id)
            .in("course_key", LITERATURE_COURSE_KEYS),
          supabase
            .from("evaluaciones_prueba2")
            .select("course_key")
            .eq("user_id", user.id)
            .in("course_key", LITERATURE_COURSE_KEYS),
          supabase
            .from("evaluaciones_oral")
            .select("course_key")
            .eq("user_id", user.id)
            .in("course_key", LITERATURE_COURSE_KEYS),
          supabase.from("evaluaciones_paper1_b").select("nota_ib").eq("user_id", user.id),
        ]);

        if (cancelled) return;

        const failed =
          Boolean(paper1Res.error) ||
          Boolean(paper2Res.error) ||
          Boolean(oralRes.error) ||
          Boolean(paper1BRes.error);

        const paper1ByCourse = rowsByCourse((paper1Res.data ?? []) as CourseRow[]);
        const paper2ByCourse = rowsByCourse((paper2Res.data ?? []) as CourseRow[]);
        const oralByCourse = rowsByCourse((oralRes.data ?? []) as CourseRow[]);
        const paper1BRows = (paper1BRes.data ?? []) as NotaRow[];

        const nextStats: Record<CourseKey, CourseStats> = {
          "spanish-a-literature": emptyStats(),
          "english-a-literature": emptyStats(),
          "spanish-b-language": emptyStats(),
        };

        for (const ck of LITERATURE_COURSE_KEYS) {
          const p1Rows = paper1ByCourse[ck];
          nextStats[ck] = {
            p1: p1Rows.length,
            p2: paper2ByCourse[ck].length,
            oral: oralByCourse[ck].length,
            notaMediaP1: notaMediaDesde(p1Rows),
            notaMediaP2: null,
            notaMediaOral: null,
          };
        }

        nextStats["spanish-b-language"] = {
          ...emptyStats(),
          p1: paper1BRows.length,
          notaMediaP1: notaMediaDesde(paper1BRows),
        };

        setStatsMap(nextStats);
        setStatsFailed(failed);
      } catch {
        if (!cancelled) {
          setStatsMap({});
          setStatsFailed(true);
        }
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    };
    void fetchAll();

    return () => {
      cancelled = true;
    };
  }, [user, rol]);

  const handleSwitch = async (key: CourseKey) => {
    if (key === courseKey) return;
    setSwitching(key);
    await setCourseKey(key);
    setSwitching(null);
    toast.success(pageTexts.switched(courseTexts[key].heading));
    navigate({ to: "/" });
  };

  if (authLoading || !user || rol === "admin") return null;

  const courseKeys = Object.keys(COURSES) as CourseKey[];

  return (
    <div
      id="asignaturas-root"
      className="min-h-screen"
      style={{ ...fontSans, backgroundColor: L.bg, color: L.ink }}
    >
      <style>{`
        #asignaturas-root .lib-press{transition:transform 0.12s cubic-bezier(0.23,1,0.32,1);}
        #asignaturas-root .lib-press:active{transform:scale(0.97);}
        #asignaturas-root a:focus-visible,#asignaturas-root button:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:10px;}
        #asignaturas-root button:not([disabled]){cursor:pointer;}
        @media (prefers-reduced-motion: reduce){
          #asignaturas-root .lib-reveal{animation:none !important;}
        }
        #asignaturas-root .lib-reveal{animation:asignReveal 0.5s cubic-bezier(0.22,1,0.36,1) both;}
        @keyframes asignReveal{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}
      `}</style>

      <SiteHeader
        minimal
        claro
        languageSwitcher={{
          lang: pageLang,
          label: pageTexts.languageLabel,
          labels: pageTexts.languageNames,
          onChange: setPageLang,
        }}
      />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8">
          <h1 className="text-2xl font-bold sm:text-3xl" style={headingStyle}>
            {pageTexts.title}
          </h1>
          <p className="mt-1 text-sm" style={{ color: L.muted }}>
            {pageTexts.subtitle}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {courseKeys.map((ck) => {
            const t = courseTexts[ck];
            const s = statsMap[ck];
            const isActive = ck === courseKey;
            const isSwitching = switching === ck;
            const total = (s?.p1 ?? 0) + (s?.p2 ?? 0) + (s?.oral ?? 0);

            const tiles = [
              { icon: BookOpen, n: s?.p1 ?? 0, label: t.p1Label, desc: t.p1Desc },
              { icon: PenLine, n: s?.p2 ?? 0, label: t.p2Label, desc: t.p2Desc },
              { icon: Mic, n: s?.oral ?? 0, label: t.oralLabel, desc: t.oralDesc },
            ];

            return (
              <Card
                key={ck}
                className="lib-reveal flex flex-col gap-5 rounded-2xl border p-6"
                style={{
                  backgroundColor: isActive ? L.primary + "0F" : L.surface,
                  borderColor: isActive ? L.primary : L.line,
                  color: L.ink,
                  boxShadow: isActive ? `0 0 0 1px ${L.primary}, ${cardShadow}` : cardShadow,
                }}
              >
                {/* Cabecera del curso */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xl font-semibold" style={headingStyle}>
                      {t.heading}
                    </div>
                    <div
                      className="mt-1 text-[10px] uppercase tracking-[0.15em]"
                      style={{ ...fontMono, color: L.muted }}
                    >
                      {t.sub}
                    </div>
                  </div>
                  {isActive && (
                    <span
                      className="flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{ backgroundColor: L.primary + "14", color: L.primary }}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {t.activa}
                    </span>
                  )}
                </div>

                {/* Stats */}
                {loadingStats ? (
                  <div className="flex items-center gap-2 text-sm" style={{ color: L.muted }}>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{pageTexts.loading}</span>
                  </div>
                ) : statsFailed ? (
                  <p className="text-sm italic" style={{ color: L.muted }}>
                    {pageTexts.statsUnavailable}
                  </p>
                ) : total === 0 ? (
                  <p className="text-sm italic" style={{ color: L.muted }}>
                    {t.sinEvals}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {tiles.map((tile) => (
                      <div
                        key={tile.label}
                        className="rounded-xl border p-3 text-center"
                        style={{ backgroundColor: L.bg2, borderColor: L.line }}
                      >
                        <tile.icon className="mx-auto mb-1 h-4 w-4" style={{ color: L.muted }} />
                        <div
                          className="text-2xl font-semibold tabular-nums"
                          style={{ ...fontMono, color: L.ink }}
                        >
                          {tile.n}
                        </div>
                        <div
                          className="mt-0.5 text-[10px] uppercase leading-tight tracking-wider"
                          style={{ ...fontMono, color: L.muted }}
                        >
                          {tile.label}
                          <br />
                          <span
                            className="text-[11px] normal-case tracking-normal"
                            style={{ color: L.muted }}
                          >
                            {tile.desc}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Nota media P1 si hay datos */}
                {!loadingStats && (s?.notaMediaP1 ?? null) !== null && (
                  <div className="text-sm" style={{ color: L.muted }}>
                    {t.notaLabel} (P1):{" "}
                    <span
                      className="font-semibold tabular-nums"
                      style={{ ...fontMono, color: L.ink }}
                    >
                      {s!.notaMediaP1}/7
                    </span>
                  </div>
                )}

                {/* Acción */}
                <div className="mt-auto pt-1">
                  {isActive ? (
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/" })}
                      className="lib-press h-11 w-full rounded-2xl border text-sm font-semibold transition-colors hover:bg-[#EFEDE7]"
                      style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
                    >
                      {pageTexts.goToDashboard}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleSwitch(ck)}
                      disabled={isSwitching}
                      className="lib-press flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold uppercase tracking-[0.07em] transition-opacity hover:opacity-95 disabled:opacity-60"
                      style={ctaPrimary}
                    >
                      {isSwitching && <Loader2 className="h-4 w-4 animate-spin" />}
                      {t.activar}
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
