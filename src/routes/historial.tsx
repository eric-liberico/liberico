import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SpanishBHistoryView } from "@/components/SpanishBHistoryView";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { EvaluacionPanel } from "@/components/EvaluacionPanel";
import type { Evaluacion } from "@/lib/ib";
import { notaIBFinal, escalarP1, escalarP2, escalarOral } from "@/lib/ib";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { PanelLogros } from "@/components/gamificacion/PanelLogros";
import { useGamificacion } from "@/hooks/useGamificacion";
import { toast } from "sonner";
import { MdProse } from "@/components/MdProse";
import { nivelDisplayLabel, parseCourseKey, parseNivel, courseBadge } from "@/lib/ib-courses";
import { textoLecturaPlano } from "@/lib/textFormatting";

export const Route = createFileRoute("/historial")({
  head: () => ({
    meta: [
      { title: "My assessments — LIBerico" },
      { name: "description", content: "History of your evaluated literary analyses." },
    ],
  }),
  component: HistorialPageDispatcher,
});

// Dispatcher: Spanish B usa una vista propia (lee de evaluaciones_paper1_b);
// Lit conserva la página completa en HistorialPage. Hooks rules respetadas:
// los hooks Lit nunca se llaman cuando el usuario está en Spanish B.
function HistorialPageDispatcher() {
  const { courseKey } = useAuth();
  const isEN = useUiLang() === "en";
  if (courseKey === "spanish-b-language") {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            {isEN ? "Home" : "Inicio"}
          </Link>
          <SpanishBHistoryView />
        </main>
      </div>
    );
  }
  return <HistorialPage />;
}

type Row = {
  id: string;
  created_at: string;
  texto_literario: string;
  pregunta_orientacion: string;
  analisis_estudiante: string;
  banda_a: number;
  banda_b: number;
  banda_c: number;
  banda_d: number;
  justificacion_a: string | null;
  justificacion_b: string | null;
  justificacion_c: string | null;
  justificacion_d: string | null;
  fortalezas: string | null;
  areas_mejora: string | null;
  comentario_global: string | null;
  puntuacion_total: number;
  nota_ib: number | null;
  nivel?: string | null;
  course_key?: string | null;
  introduccion: Evaluacion["introduccion"] | null;
  parrafos: Evaluacion["parrafos"] | null;
  conclusion: Evaluacion["conclusion"] | null;
  ensayo_banda_5: Evaluacion["ensayo_banda_5"] | null;
  lenguaje_analitico: Evaluacion["lenguaje_analitico"] | null;
  sugerencias_reescritura: Evaluacion["sugerencias_reescritura"] | null;
};

type RowP2Preview = {
  id: string;
  created_at: string;
  pregunta: string;
  obra_1: string;
  obra_2: string;
  puntuacion_total: number;
};

type RowOralPreview = {
  id: string;
  created_at: string;
  tipo_oral: string;
  asunto_global: string;
  obra_1_titulo: string;
  obra_2_titulo: string;
  puntuacion_total: number;
};

type Vista = "portal" | "lista" | "detalle";

function rowToEvaluacion(row: Row): Evaluacion {
  return {
    evaluacion_id: row.id,
    banda_a: row.banda_a,
    banda_b: row.banda_b,
    banda_c: row.banda_c,
    banda_d: row.banda_d,
    justificacion_a: row.justificacion_a ?? "",
    justificacion_b: row.justificacion_b ?? "",
    justificacion_c: row.justificacion_c ?? "",
    justificacion_d: row.justificacion_d ?? "",
    fortalezas: row.fortalezas ?? "",
    areas_mejora: row.areas_mejora ?? "",
    comentario_global: row.comentario_global ?? "",
    puntuacion_total: row.puntuacion_total,
    nota_ib: row.nota_ib ?? 1,
    introduccion: row.introduccion ?? undefined,
    parrafos: row.parrafos ?? undefined,
    conclusion: row.conclusion ?? undefined,
    ensayo_banda_5: row.ensayo_banda_5 ?? undefined,
    lenguaje_analitico: row.lenguaje_analitico ?? undefined,
    sugerencias_reescritura: row.sugerencias_reescritura ?? undefined,
  };
}

function HistorialPage() {
  const { user, loading: authLoading, courseKey } = useAuth();
  const isEN = useUiLang() === "en";
  const navigate = useNavigate();
  const gamif = useGamificacion();

  const [vista, setVista] = useState<Vista>("portal");

  // Portal preview data
  const [p1Count, setP1Count] = useState<number | null>(null);
  const [p1Recent, setP1Recent] = useState<{
    nota: number | null;
    fecha: string;
    puntuacion_total: number | null;
  } | null>(null);
  const [p2Count, setP2Count] = useState<number | null>(null);
  const [p2Recent, setP2Recent] = useState<RowP2Preview | null>(null);
  const [oralCount, setOralCount] = useState<number | null>(null);
  const [oralRecent, setOralRecent] = useState<RowOralPreview | null>(null);
  const [portalLoading, setPortalLoading] = useState(true);

  // P1 list/detail
  const [rows, setRows] = useState<Row[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const [comentarioProfesor, setComentarioProfesor] = useState<string | null>(null);
  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const handleEvaluacionChangeP1 = useCallback((updatedEv: Evaluacion) => {
    const id = selectedRef.current?.id;
    if (!id) return;
    const merge = (row: Row): Row => ({
      ...row,
      fortalezas: updatedEv.fortalezas?.trim() ? updatedEv.fortalezas : row.fortalezas,
      areas_mejora: updatedEv.areas_mejora?.trim() ? updatedEv.areas_mejora : row.areas_mejora,
      introduccion: updatedEv.introduccion ?? row.introduccion,
      parrafos: updatedEv.parrafos ?? row.parrafos,
      conclusion: updatedEv.conclusion ?? row.conclusion,
      lenguaje_analitico: updatedEv.lenguaje_analitico ?? row.lenguaje_analitico,
      ensayo_banda_5: updatedEv.ensayo_banda_5 ?? row.ensayo_banda_5,
      sugerencias_reescritura: updatedEv.sugerencias_reescritura ?? row.sugerencias_reescritura,
    });
    setSelected((actual) => (actual?.id === id ? merge(actual) : actual));
    setRows((actuales) => actuales.map((row) => (row.id === id ? merge(row) : row)));
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  // Fetch portal preview (lightweight) — filtrado por asignatura activa
  useEffect(() => {
    if (!user) return;
    setP1Count(null);
    setP2Count(null);
    setOralCount(null);
    setP1Recent(null);
    setP2Recent(null);
    setOralRecent(null);
    setPortalLoading(true);
    (async () => {
      const [p1Res, p2Res, oralRes] = await Promise.all([
        supabase
          .from("evaluaciones")
          .select("id, created_at, nota_ib, puntuacion_total", { count: "exact" })
          .eq("course_key", courseKey)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("evaluaciones_prueba2")
          .select("id, created_at, pregunta, obra_1, obra_2, puntuacion_total", { count: "exact" })
          .eq("course_key", courseKey)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("evaluaciones_oral")
          .select(
            "id, created_at, tipo_oral, asunto_global, obra_1_titulo, obra_2_titulo, puntuacion_total",
            { count: "exact" },
          )
          .eq("course_key", courseKey)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      setP1Count(p1Res.count ?? 0);
      if (p1Res.data && p1Res.data.length > 0) {
        setP1Recent({
          nota: p1Res.data[0].nota_ib,
          fecha: p1Res.data[0].created_at,
          puntuacion_total:
            (p1Res.data[0] as { puntuacion_total?: number | null }).puntuacion_total ?? null,
        });
      }

      setP2Count(p2Res.count ?? 0);
      if (p2Res.data && p2Res.data.length > 0) {
        setP2Recent(p2Res.data[0] as RowP2Preview);
      }

      setOralCount(oralRes.count ?? 0);
      if (oralRes.data && oralRes.data.length > 0) {
        setOralRecent(oralRes.data[0] as RowOralPreview);
      }

      setPortalLoading(false);
    })();
  }, [user, courseKey]);

  // Resetear lista cuando cambia el curso
  useEffect(() => {
    setRows([]);
    setSelected(null);
    setVista("portal");
  }, [courseKey]);

  // Load P1 list when entering lista view — filtrado por asignatura activa
  const entrarP1 = async () => {
    setVista("lista");
    if (rows.length > 0) return;
    setListLoading(true);
    const { data, error } = await supabase
      .from("evaluaciones")
      .select("*")
      .eq("course_key", courseKey)
      .order("created_at", { ascending: false });
    if (error) toast.error(isEN ? "Error loading history." : "Error al cargar el historial.");
    else if (data) setRows(data as Row[]);
    setListLoading(false);
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {isEN ? "Loading…" : "Cargando…"}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          {isEN ? "Home" : "Inicio"}
        </Link>

        {/* ── Portal ── */}
        {vista === "portal" && (
          <>
            <div className="mb-8">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
                {isEN ? "History" : "Historial"}
              </div>
              <h1 className="font-serif text-3xl text-ink">
                {isEN ? "My assessments" : "Mis evaluaciones"}
              </h1>
              <p className="text-foreground/70 mt-2">
                {isEN
                  ? "Choose a component to review your previous feedback."
                  : "Elige la prueba para revisar tus correcciones anteriores."}
              </p>
            </div>

            {!portalLoading &&
              p1Recent?.puntuacion_total != null &&
              p2Recent?.puntuacion_total != null &&
              oralRecent?.puntuacion_total != null &&
              (() => {
                const escP1 = escalarP1(p1Recent.puntuacion_total!);
                const escP2 = escalarP2(p2Recent.puntuacion_total);
                const escOral = escalarOral(oralRecent.puntuacion_total);
                const total = escP1 + escP2 + escOral;
                const nota = notaIBFinal(total);
                return (
                  <div className="mb-6 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                      <div className="text-center shrink-0">
                        <div className="font-serif text-5xl font-bold text-primary leading-none">
                          {nota}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                          {isEN ? "Grade" : "Nota"}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-ink">
                          {isEN ? "Estimated final grade" : "Nota final estimada"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isEN
                            ? `Based on most recent assessments · ${total}/100 composite points`
                            : `Basada en tus evaluaciones más recientes · ${total}/100 puntos compuestos`}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {[
                            {
                              label: "P1",
                              raw: p1Recent.puntuacion_total!,
                              max: 20,
                              esc: escP1,
                              contrib: 35,
                            },
                            {
                              label: "P2",
                              raw: p2Recent.puntuacion_total,
                              max: 25,
                              esc: escP2,
                              contrib: 35,
                            },
                            {
                              label: "Oral",
                              raw: oralRecent.puntuacion_total,
                              max: 40,
                              esc: escOral,
                              contrib: 30,
                            },
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

            {portalLoading ? (
              <p className="text-muted-foreground">{isEN ? "Loading…" : "Cargando…"}</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Bloque P1 */}
                <button onClick={entrarP1} className="text-left group">
                  <Card className="p-6 h-full hover:border-primary/40 hover:bg-accent/30 transition-colors flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          {isEN ? "Assessments" : "Corrector"}
                        </div>
                        <div className="font-serif text-xl text-ink mt-0.5">
                          {isEN ? "Paper 1" : "Prueba 1"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {isEN ? "Literary analysis" : "Análisis literario de texto no visto"}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 group-hover:text-primary transition-colors" />
                    </div>

                    {p1Count !== null && p1Count > 0 ? (
                      <div className="mt-auto">
                        <div className="flex items-center gap-3">
                          {p1Recent?.nota != null && (
                            <div className="text-center">
                              <div className="font-serif text-3xl font-semibold text-primary leading-none">
                                {p1Recent.nota}
                              </div>
                              <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">
                                / 7 IB
                              </div>
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {p1Count}{" "}
                            {isEN
                              ? p1Count === 1
                                ? "analysis"
                                : "analyses"
                              : p1Count === 1
                                ? "evaluación"
                                : "evaluaciones"}{" "}
                            · {isEN ? "last " : "última el "}
                            {p1Recent
                              ? new Date(p1Recent.fecha).toLocaleDateString(
                                  isEN ? "en-GB" : "es-ES",
                                  {
                                    day: "numeric",
                                    month: "short",
                                  },
                                )
                              : "—"}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-auto text-xs text-muted-foreground">
                        {isEN
                          ? "No Paper 1 analyses yet."
                          : "Aún no tienes evaluaciones de Prueba 1."}
                      </p>
                    )}
                  </Card>
                </button>

                {/* Bloque P2 */}
                <Link to="/historial-prueba-2" className="text-left group">
                  <Card className="p-6 h-full hover:border-primary/40 hover:bg-accent/30 transition-colors flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          {isEN ? "Assessments" : "Corrector"}
                        </div>
                        <div className="font-serif text-xl text-ink mt-0.5">
                          {isEN ? "Paper 2" : "Prueba 2"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {isEN
                            ? "Comparative essay on two works"
                            : "Ensayo comparativo de dos obras"}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 group-hover:text-primary transition-colors" />
                    </div>

                    {p2Count !== null && p2Count > 0 && p2Recent ? (
                      <div className="mt-auto">
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <div className="font-serif text-3xl font-semibold text-primary leading-none">
                              {p2Recent.puntuacion_total}
                            </div>
                            <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">
                              / 25
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {p2Count}{" "}
                            {isEN
                              ? p2Count === 1
                                ? "essay"
                                : "essays"
                              : `evaluación${p2Count !== 1 ? "es" : ""}`}{" "}
                            · {isEN ? "last" : "última el"}{" "}
                            {new Date(p2Recent.created_at).toLocaleDateString(
                              isEN ? "en-GB" : "es-ES",
                              {
                                day: "numeric",
                                month: "short",
                              },
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                          {p2Recent.obra_1} · {p2Recent.obra_2}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-auto text-xs text-muted-foreground">
                        {isEN
                          ? "No Paper 2 essays yet."
                          : "Aún no tienes evaluaciones de Prueba 2."}
                      </p>
                    )}
                  </Card>
                </Link>

                {/* Bloque Oral */}
                <Link to="/historial-oral" className="text-left group">
                  <Card className="p-6 h-full hover:border-primary/40 hover:bg-accent/30 transition-colors flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          {isEN ? "Assessments" : "Corrector"}
                        </div>
                        <div className="font-serif text-xl text-ink mt-0.5">
                          {isEN ? "Individual Oral" : "Oral Individual"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {isEN ? "Individual Oral" : "Trabajo Oral Individual"}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 group-hover:text-primary transition-colors" />
                    </div>

                    {oralCount !== null && oralCount > 0 && oralRecent ? (
                      <div className="mt-auto">
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <div className="font-serif text-3xl font-semibold text-primary leading-none">
                              {oralRecent.puntuacion_total}
                            </div>
                            <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">
                              / 40
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {oralCount}{" "}
                            {isEN
                              ? `oral${oralCount !== 1 ? "s" : ""}`
                              : `evaluación${oralCount !== 1 ? "es" : ""}`}{" "}
                            · {isEN ? "last" : "última el"}{" "}
                            {new Date(oralRecent.created_at).toLocaleDateString(
                              isEN ? "en-GB" : "es-ES",
                              {
                                day: "numeric",
                                month: "short",
                              },
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                          {oralRecent.asunto_global}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-auto text-xs text-muted-foreground">
                        {isEN
                          ? "No Individual Oral assessments yet."
                          : "Aún no tienes evaluaciones del Oral."}
                      </p>
                    )}
                  </Card>
                </Link>
              </div>
            )}

            {/* Logros */}
            {!gamif.loading && (
              <div className="mt-10">
                <PanelLogros
                  logrosDesbloqueados={gamif.logrosDesbloqueados}
                  fechas={gamif.fechas}
                />
              </div>
            )}
          </>
        )}

        {/* ── Lista P1 ── */}
        {(vista === "lista" || vista === "detalle") && (
          <>
            {vista === "lista" && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVista("portal")}
                  className="mb-6"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {isEN ? "Back to my assessments" : "Volver a mis evaluaciones"}
                </Button>

                <div className="mb-8">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
                    {isEN ? "History · Paper 1" : "Historial · Prueba 1"}
                  </div>
                  <h1 className="font-serif text-3xl text-ink">
                    {isEN ? "My literary analyses" : "Mis análisis literarios"}
                  </h1>
                  <p className="text-foreground/70 mt-2">
                    {isEN
                      ? "Review your previous analyses and track your progress."
                      : "Revisa tus análisis anteriores y observa tu progreso."}
                  </p>
                </div>

                {listLoading ? (
                  <p className="text-muted-foreground">{isEN ? "Loading…" : "Cargando…"}</p>
                ) : rows.length === 0 ? (
                  <Card className="p-10 text-center border-dashed">
                    <p className="font-serif text-lg text-ink">
                      {isEN ? "No assessments yet." : "Aún no tienes evaluaciones."}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {isEN
                        ? "Go back to the evaluator and assess your first analysis."
                        : "Vuelve al corrector y evalúa tu primer análisis."}
                    </p>
                    <Button className="mt-6" asChild>
                      <Link to="/">{isEN ? "Go to evaluator" : "Ir al corrector"}</Link>
                    </Button>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {rows.map((r) => (
                      <button
                        key={r.id}
                        onClick={async () => {
                          setSelected(r);
                          setVista("detalle");
                          setComentarioProfesor(null);
                          const { data: comentData } = await supabase
                            .from("comentarios_profesor")
                            .select("contenido")
                            .eq("evaluacion_id", r.id)
                            .maybeSingle();
                          setComentarioProfesor(comentData?.contenido ?? null);
                        }}
                        className="w-full text-left"
                      >
                        <Card className="p-5 hover:border-primary/40 hover:bg-accent/30 transition-colors">
                          <div className="flex items-center gap-6">
                            <div className="text-center shrink-0 w-16">
                              <div className="font-serif text-3xl font-semibold text-primary leading-none">
                                {r.nota_ib ?? "–"}
                              </div>
                              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-1">
                                IB
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-serif text-ink truncate">
                                {r.pregunta_orientacion}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {new Date(r.created_at).toLocaleDateString(
                                  isEN ? "en-GB" : "es-ES",
                                  {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </div>
                              <div className="mt-2 flex gap-2 flex-wrap">
                                {(["a", "b", "c", "d"] as const).map((k) => (
                                  <span
                                    key={k}
                                    className="text-[11px] px-2 py-0.5 rounded bg-secondary text-secondary-foreground"
                                  >
                                    {k.toUpperCase()} {r[`banda_${k}` as const]}
                                  </span>
                                ))}
                                <span className="text-[11px] px-2 py-0.5 rounded border border-border text-muted-foreground">
                                  {nivelDisplayLabel(
                                    parseNivel(r.nivel),
                                    parseCourseKey(r.course_key),
                                  )}
                                </span>
                                {r.course_key === "english-a-literature" && (
                                  <span className="text-[11px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                                    EN
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-serif text-2xl font-semibold text-ink">
                                {r.puntuacion_total}
                                <span className="text-sm text-muted-foreground font-normal">
                                  /20
                                </span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {vista === "detalle" && selected && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelected(null);
                    setVista("lista");
                  }}
                  className="mb-6"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {isEN ? "Back to history" : "Volver al historial"}
                </Button>

                <div className="mb-6">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                    {new Date(selected.created_at).toLocaleDateString(isEN ? "en-GB" : "es-ES", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  <h1 className="font-serif text-2xl text-ink">{selected.pregunta_orientacion}</h1>
                </div>

                <EvaluacionPanel
                  ev={rowToEvaluacion(selected)}
                  textoLiterario={selected.texto_literario}
                  analisisTexto={textoLecturaPlano(selected.analisis_estudiante)}
                  resultadoInicialBasico
                  onEvaluacionChange={handleEvaluacionChangeP1}
                />

                {comentarioProfesor && (
                  <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg px-5 py-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-amber-700 mb-2">
                      {isEN ? "Your professor's comment" : "Comentario de tu profesor"}
                    </div>
                    <MdProse size="base">{comentarioProfesor}</MdProse>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
