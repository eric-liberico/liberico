import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { COURSES, type CourseKey, type UiLang } from "@/lib/ib-courses";
import { BookOpen, CheckCircle2, Loader2, Mic, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/asignaturas")({
  head: () => ({
    meta: [
      { title: "Asignaturas — LIBerico" },
      { name: "description", content: "Cambia de asignatura y consulta tu progreso en cada una." },
    ],
  }),
  component: AsignaturasPage,
});

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
    switched: (course) => `Asignatura cambiada a ${course}`,
    goToDashboard: "Ir al inicio",
  },
  en: {
    title: "Subjects",
    subtitle: "Choose the subject you want to work with today.",
    languageLabel: "Language",
    languageNames: { es: "Español", en: "English" },
    loading: "Loading...",
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
    const fetchAll = async () => {
      setLoadingStats(true);
      const courseKeys = Object.keys(COURSES) as CourseKey[];
      const results = await Promise.all(
        courseKeys.map(async (ck): Promise<[CourseKey, CourseStats]> => {
          // Spanish B usa una tabla dedicada: evaluaciones_paper1_b. P2 y Oral
          // aún no implementados en MVP — devolvemos 0.
          if (ck === "spanish-b-language") {
            const [{ count: p1 }, { data: p1Rows }] = await Promise.all([
              supabase
                .from("evaluaciones_paper1_b")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.id),
              supabase.from("evaluaciones_paper1_b").select("nota_ib").eq("user_id", user.id),
            ]);
            return [
              ck,
              {
                p1: p1 ?? 0,
                p2: 0,
                oral: 0,
                notaMediaP1: notaMediaDesde((p1Rows ?? []) as { nota_ib?: number | null }[]),
                notaMediaP2: null,
                notaMediaOral: null,
              },
            ];
          }

          const [{ count: p1 }, { count: p2 }, { count: oral }, { data: p1Rows }] =
            await Promise.all([
              supabase
                .from("evaluaciones")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("course_key", ck),
              supabase
                .from("evaluaciones_prueba2")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("course_key", ck),
              supabase
                .from("evaluaciones_oral")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("course_key", ck),
              supabase
                .from("evaluaciones")
                .select("nota_ib")
                .eq("user_id", user.id)
                .eq("course_key", ck),
            ]);
          return [
            ck,
            {
              p1: p1 ?? 0,
              p2: p2 ?? 0,
              oral: oral ?? 0,
              notaMediaP1: notaMediaDesde((p1Rows ?? []) as { nota_ib?: number | null }[]),
              notaMediaP2: null,
              notaMediaOral: null,
            },
          ];
        }),
      );
      setStatsMap(Object.fromEntries(results));
      setLoadingStats(false);
    };
    void fetchAll();
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
    <div className="min-h-screen bg-background">
      <SiteHeader
        minimal
        languageSwitcher={{
          lang: pageLang,
          label: pageTexts.languageLabel,
          labels: pageTexts.languageNames,
          onChange: setPageLang,
        }}
      />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-14">
        <div className="mb-8">
          <h1 className="font-serif text-2xl sm:text-3xl text-ink">{pageTexts.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{pageTexts.subtitle}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {courseKeys.map((ck) => {
            const t = courseTexts[ck];
            const s = statsMap[ck];
            const isActive = ck === courseKey;
            const isSwitching = switching === ck;
            const total = (s?.p1 ?? 0) + (s?.p2 ?? 0) + (s?.oral ?? 0);

            return (
              <Card
                key={ck}
                className={cn(
                  "p-6 flex flex-col gap-5 transition-all",
                  isActive
                    ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                    : "hover:border-border/80",
                )}
              >
                {/* Cabecera del curso */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-serif text-xl font-semibold text-ink">{t.heading}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 uppercase tracking-[0.15em]">
                      {t.sub}
                    </div>
                  </div>
                  {isActive && (
                    <span className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                      <CheckCircle2 className="h-3 w-3" />
                      {t.activa}
                    </span>
                  )}
                </div>

                {/* Stats */}
                {loadingStats ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{pageTexts.loading}</span>
                  </div>
                ) : total === 0 ? (
                  <p className="text-sm text-muted-foreground italic">{t.sinEvals}</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {/* P1 */}
                    <div className="text-center p-3 rounded-lg bg-background border border-border">
                      <BookOpen className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                      <div className="text-2xl font-semibold text-ink tabular-nums">
                        {s?.p1 ?? 0}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5 leading-tight">
                        {t.p1Label}
                        <br />
                        <span className="normal-case tracking-normal text-muted-foreground/70">
                          {t.p1Desc}
                        </span>
                      </div>
                    </div>

                    {/* P2 */}
                    <div className="text-center p-3 rounded-lg bg-background border border-border">
                      <PenLine className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                      <div className="text-2xl font-semibold text-ink tabular-nums">
                        {s?.p2 ?? 0}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5 leading-tight">
                        {t.p2Label}
                        <br />
                        <span className="normal-case tracking-normal text-muted-foreground/70">
                          {t.p2Desc}
                        </span>
                      </div>
                    </div>

                    {/* Oral */}
                    <div className="text-center p-3 rounded-lg bg-background border border-border">
                      <Mic className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                      <div className="text-2xl font-semibold text-ink tabular-nums">
                        {s?.oral ?? 0}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5 leading-tight">
                        {t.oralLabel}
                        <br />
                        <span className="normal-case tracking-normal text-muted-foreground/70">
                          {t.oralDesc}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Nota media P1 si hay datos */}
                {!loadingStats && (s?.notaMediaP1 ?? null) !== null && (
                  <div className="text-sm text-muted-foreground">
                    {t.notaLabel} (P1):{" "}
                    <span className="font-semibold text-ink">{s!.notaMediaP1}/7</span>
                  </div>
                )}

                {/* Acción */}
                <div className="mt-auto pt-1">
                  {isActive ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate({ to: "/" })}
                    >
                      {pageTexts.goToDashboard}
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => void handleSwitch(ck)}
                      disabled={isSwitching}
                    >
                      {isSwitching && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {t.activar}
                    </Button>
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
