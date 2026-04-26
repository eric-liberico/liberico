import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { CRITERIOS } from "@/lib/ib";
import { toast } from "sonner";
import { GraficoProgresion } from "@/components/GraficoProgresion";
import { GraficoPlan } from "@/components/GraficoPlan";

export const Route = createFileRoute("/profesor-alumno/$alumnoId")({
  head: () => ({
    meta: [{ title: "Alumno — IB Literatura" }],
  }),
  component: ProfesorAlumnoPage,
});

type Evaluacion = {
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
  nota_ib: number | null;
  puntuacion_total: number | null;
  fortalezas: string | null;
  areas_mejora: string | null;
  comentario_global: string | null;
};

type AlumnoInfo = {
  email: string;
  nota_ib_media: number | null;
  banda_a_media: number | null;
  banda_b_media: number | null;
  banda_c_media: number | null;
  banda_d_media: number | null;
  num_evaluaciones: number;
};

function MiniBarras({ banda }: { banda: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <div
          key={n}
          className={cn("h-1.5 w-3 rounded-full", n <= banda ? "bg-primary" : "bg-border")}
        />
      ))}
    </div>
  );
}

function ProfesorAlumnoPage() {
  const { user, loading: authLoading, rol } = useAuth();
  const navigate = useNavigate();
  const { alumnoId } = Route.useParams();
  const [alumnoInfo, setAlumnoInfo] = useState<AlumnoInfo | null>(null);
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [tareasPlan, setTareasPlan] = useState<{ semana: number; completada: boolean | null }[]>(
    [],
  );
  const [expandida, setExpandida] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (rol !== null && rol !== "profesor") navigate({ to: "/" });
  }, [user, authLoading, rol, navigate]);

  useEffect(() => {
    if (!user || rol !== "profesor") return;
    (async () => {
      const [{ data: alumnos, error: rpcErr }, { data: evs, error: evErr }, { data: planData }] =
        await Promise.all([
          supabase.rpc("get_mis_alumnos"),
          supabase
            .from("evaluaciones")
            .select("*")
            .eq("user_id", alumnoId)
            .order("created_at", { ascending: false }),
          supabase
            .from("planes_estudio")
            .select("id")
            .eq("user_id", alumnoId)
            .eq("activo", true)
            .order("generado_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

      if (rpcErr) toast.error("No se pudo cargar la información del alumno.");
      if (evErr) toast.error("No se pudo cargar las evaluaciones.");

      const alumno = (alumnos ?? []).find((a) => a.user_id === alumnoId);
      if (!alumno) {
        toast.error("Alumno no encontrado.");
        navigate({ to: "/profesor-alumnos" });
        return;
      }
      setAlumnoInfo(alumno as AlumnoInfo);
      setEvaluaciones((evs ?? []) as Evaluacion[]);

      if (planData?.id) {
        const { data: tareasData } = await supabase
          .from("tareas_plan")
          .select("semana, completada")
          .eq("plan_id", planData.id);
        setTareasPlan(tareasData ?? []);
      }

      setCargando(false);
    })();
  }, [user, rol, alumnoId, navigate]);

  if (authLoading || !user || rol !== "profesor") {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        {/* Breadcrumb */}
        <Link
          to="/profesor-alumnos"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Mis alumnos
        </Link>

        {cargando ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Cabecera del alumno */}
            <div className="mb-8">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
                Alumno
              </div>
              <h1 className="font-serif text-2xl text-ink break-all">{alumnoInfo?.email}</h1>
            </div>

            {/* Stats globales */}
            {alumnoInfo && alumnoInfo.num_evaluaciones > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                <Card className="p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                    Nota IB media
                  </div>
                  <div className="font-serif text-3xl font-semibold text-ink">
                    {alumnoInfo.nota_ib_media?.toFixed(1) ?? "—"}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                    Evaluaciones
                  </div>
                  <div className="font-serif text-3xl font-semibold text-ink">
                    {alumnoInfo.num_evaluaciones}
                  </div>
                </Card>
                <Card className="p-4 col-span-2 sm:col-span-1">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                    Bandas medias
                  </div>
                  <div className="space-y-1.5">
                    {CRITERIOS.map((c) => {
                      const val =
                        {
                          a: alumnoInfo.banda_a_media,
                          b: alumnoInfo.banda_b_media,
                          c: alumnoInfo.banda_c_media,
                          d: alumnoInfo.banda_d_media,
                        }[c.key] ?? 0;
                      return (
                        <div key={c.key} className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-muted-foreground w-4">
                            {c.letra}
                          </span>
                          <MiniBarras banda={Math.round(val)} />
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {val.toFixed(1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}

            {/* Gráficos de progresión */}
            {(evaluaciones.length >= 2 || tareasPlan.length > 0) && (
              <div className="grid lg:grid-cols-2 gap-4 mb-8">
                {evaluaciones.length >= 2 && (
                  <div className="bg-card border border-border rounded-lg p-5">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-4">
                      Progresión de notas
                    </div>
                    <GraficoProgresion evaluaciones={evaluaciones} />
                  </div>
                )}
                {tareasPlan.length > 0 && (
                  <div className="bg-card border border-border rounded-lg p-5">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-4">
                      Progreso del plan
                    </div>
                    <GraficoPlan tareas={tareasPlan} />
                  </div>
                )}
              </div>
            )}

            {/* Historial de evaluaciones */}
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
                Historial de evaluaciones
              </div>

              {evaluaciones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
                  <FileText className="h-8 w-8 opacity-30" />
                  <p className="text-sm">Este alumno aún no tiene evaluaciones.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {evaluaciones.map((ev) => (
                    <Card key={ev.id} className="overflow-hidden">
                      {/* Fila resumen — siempre visible */}
                      <button
                        onClick={() => setExpandida(expandida === ev.id ? null : ev.id)}
                        className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              {new Date(ev.created_at).toLocaleDateString("es-ES", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                            {ev.nota_ib !== null && (
                              <span className="text-xs font-semibold text-primary">
                                IB {ev.nota_ib} · {ev.puntuacion_total}/20
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2 mt-1.5 flex-wrap">
                            {CRITERIOS.map((c) => {
                              const b = {
                                a: ev.banda_a,
                                b: ev.banda_b,
                                c: ev.banda_c,
                                d: ev.banda_d,
                              }[c.key];
                              return (
                                <span key={c.key} className="text-[10px] text-muted-foreground">
                                  <span className="font-semibold">{c.letra}</span> {b}/5
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <ChevronLeft
                          className={cn(
                            "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
                            expandida === ev.id ? "-rotate-90" : "rotate-180",
                          )}
                        />
                      </button>

                      {/* Detalle expandido */}
                      {expandida === ev.id && (
                        <div className="border-t border-border px-5 py-5 space-y-5 bg-muted/20">
                          {/* Texto literario */}
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                              Texto literario
                            </div>
                            <p className="text-sm font-serif leading-relaxed text-ink whitespace-pre-line line-clamp-6">
                              {ev.texto_literario}
                            </p>
                          </div>

                          {/* Pregunta */}
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                              Pregunta de orientación
                            </div>
                            <p className="text-sm text-foreground/80">{ev.pregunta_orientacion}</p>
                          </div>

                          {/* Análisis del alumno */}
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                              Análisis del alumno
                            </div>
                            <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">
                              {ev.analisis_estudiante}
                            </p>
                          </div>

                          {/* Justificaciones por criterio */}
                          <div className="grid sm:grid-cols-2 gap-3">
                            {CRITERIOS.map((c) => {
                              const b = {
                                a: ev.banda_a,
                                b: ev.banda_b,
                                c: ev.banda_c,
                                d: ev.banda_d,
                              }[c.key];
                              const j = {
                                a: ev.justificacion_a,
                                b: ev.justificacion_b,
                                c: ev.justificacion_c,
                                d: ev.justificacion_d,
                              }[c.key];
                              return (
                                <div
                                  key={c.key}
                                  className="bg-card rounded-lg border border-border p-4"
                                >
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                                      Criterio {c.letra} — {c.nombre}
                                    </span>
                                    <span className="font-semibold text-primary text-sm">
                                      {b}/5
                                    </span>
                                  </div>
                                  <MiniBarras banda={b} />
                                  {j && (
                                    <p className="text-xs text-foreground/80 leading-relaxed mt-2">
                                      {j}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Fortalezas y áreas de mejora */}
                          {(ev.fortalezas || ev.areas_mejora) && (
                            <div className="grid sm:grid-cols-2 gap-3">
                              {ev.fortalezas && (
                                <div className="rounded-lg border-l-4 border-green-400 bg-green-50 px-4 py-3">
                                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                                    Fortalezas
                                  </div>
                                  <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">
                                    {ev.fortalezas}
                                  </p>
                                </div>
                              )}
                              {ev.areas_mejora && (
                                <div className="rounded-lg border-l-4 border-primary/50 bg-primary/5 px-4 py-3">
                                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                                    Áreas de mejora
                                  </div>
                                  <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">
                                    {ev.areas_mejora}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Comentario global */}
                          {ev.comentario_global && (
                            <div className="bg-parchment rounded-lg border border-border px-4 py-3">
                              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                                Comentario global
                              </div>
                              <p className="font-serif text-sm leading-relaxed text-ink">
                                {ev.comentario_global}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
