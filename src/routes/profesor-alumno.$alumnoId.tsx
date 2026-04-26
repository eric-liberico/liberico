import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ChevronLeft, Loader2, FileText, Pencil, BookOpen, Mic, MicOff, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CRITERIOS } from "@/lib/ib";
import { toast } from "sonner";
import { GraficoProgresion } from "@/components/GraficoProgresion";
import { GraficoPlan } from "@/components/GraficoPlan";
import { TextoAnotado, type Anotacion, type TipoAnotacion } from "@/components/TextoAnotado";
import { useDictado } from "@/hooks/useDictado";

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

type TareaPlan = {
  id: string;
  plan_id: string;
  semana: number;
  titulo: string;
  descripcion: string;
  completada: boolean | null;
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
  const [tareas, setTareas] = useState<TareaPlan[]>([]);
  const [tienePlan, setTienePlan] = useState(false);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [anotaciones, setAnotaciones] = useState<Record<string, Anotacion[]>>({});
  const [cargando, setCargando] = useState(true);

  // Estado para editar una tarea
  const [editandoTarea, setEditandoTarea] = useState<TareaPlan | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  // Estado para comentarios del profesor por evaluación
  // undefined = no cargado aún; null = cargado, sin comentario; string = comentario guardado
  const [comentarios, setComentarios] = useState<Record<string, string | null | undefined>>({});
  const [editandoComentarioId, setEditandoComentarioId] = useState<string | null>(null);
  const [textoComentario, setTextoComentario] = useState("");
  const [textoMejorado, setTextoMejorado] = useState<string | null>(null);
  const [reescribiendo, setReescribiendo] = useState(false);
  const [guardandoComentario, setGuardandoComentario] = useState(false);

  const { dictando, interimTexto, toggleDictado } = useDictado((texto) => {
    setTextoComentario((prev) => {
      const sep = prev && !prev.endsWith(" ") ? " " : "";
      return prev + sep + texto;
    });
  });

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
        setTienePlan(true);
        const { data: tareasData } = await supabase
          .from("tareas_plan")
          .select("id, plan_id, semana, titulo, descripcion, completada")
          .eq("plan_id", planData.id)
          .order("semana")
          .order("id");
        setTareas((tareasData ?? []) as TareaPlan[]);
      }

      setCargando(false);
    })();
  }, [user, rol, alumnoId, navigate]);

  // ── Anotaciones ────────────────────────────────────────────────

  const cargarAnotaciones = useCallback(
    async (evaluacionId: string) => {
      if (anotaciones[evaluacionId]) return;
      const { data } = await supabase
        .from("anotaciones_evaluacion")
        .select("id, inicio, fin, texto_seleccionado, tipo, comentario")
        .eq("evaluacion_id", evaluacionId)
        .order("inicio");
      setAnotaciones((prev) => ({ ...prev, [evaluacionId]: (data ?? []) as Anotacion[] }));
    },
    [anotaciones],
  );

  const cargarComentario = useCallback(
    async (evaluacionId: string) => {
      if (evaluacionId in comentarios) return;
      const { data } = await supabase
        .from("comentarios_profesor")
        .select("contenido")
        .eq("evaluacion_id", evaluacionId)
        .eq("profesor_id", user!.id)
        .maybeSingle();
      setComentarios((prev) => ({ ...prev, [evaluacionId]: data?.contenido ?? null }));
    },
    [comentarios, user],
  );

  const handleExpandir = (evaluacionId: string) => {
    const siguiente = expandida === evaluacionId ? null : evaluacionId;
    if (expandida && editandoComentarioId === expandida) cancelarComentario();
    setExpandida(siguiente);
    if (siguiente) {
      cargarAnotaciones(siguiente);
      cargarComentario(siguiente);
    }
  };

  // ── Comentarios del profesor ────────────────────────────────────

  const iniciarComentario = (evaluacionId: string, textoExistente = "") => {
    setEditandoComentarioId(evaluacionId);
    setTextoComentario(textoExistente);
    setTextoMejorado(null);
  };

  const cancelarComentario = () => {
    setEditandoComentarioId(null);
    setTextoComentario("");
    setTextoMejorado(null);
  };

  const reescribirConClaude = async () => {
    if (!textoComentario.trim()) return;
    setReescribiendo(true);
    const { data, error } = await supabase.functions.invoke("rewrite-feedback", {
      body: { texto: textoComentario.trim() },
    });
    setReescribiendo(false);
    if (error || data?.error) {
      toast.error(data?.error ?? "No se pudo procesar el comentario con Claude.");
      return;
    }
    setTextoMejorado((data as { texto: string }).texto);
  };

  const guardarComentario = async (evaluacionId: string) => {
    const contenido = (textoMejorado ?? textoComentario).trim();
    if (!contenido) return;
    setGuardandoComentario(true);
    const { error } = await supabase
      .from("comentarios_profesor")
      .upsert(
        { evaluacion_id: evaluacionId, profesor_id: user!.id, contenido },
        { onConflict: "evaluacion_id,profesor_id" },
      );
    setGuardandoComentario(false);
    if (error) { toast.error("No se pudo guardar el comentario."); return; }
    setComentarios((prev) => ({ ...prev, [evaluacionId]: contenido }));
    cancelarComentario();
    toast.success("Comentario guardado.");
  };

  const eliminarComentario = async (evaluacionId: string) => {
    const { error } = await supabase
      .from("comentarios_profesor")
      .delete()
      .eq("evaluacion_id", evaluacionId)
      .eq("profesor_id", user!.id);
    if (error) { toast.error("No se pudo eliminar el comentario."); return; }
    setComentarios((prev) => ({ ...prev, [evaluacionId]: null }));
  };

  const handleCrearAnotacion = useCallback(
    async (
      evaluacionId: string,
      inicio: number,
      fin: number,
      textoSel: string,
      tipo: TipoAnotacion,
      comentario: string,
    ) => {
      if (!user) return;
      const { data, error } = await supabase
        .from("anotaciones_evaluacion")
        .insert({ evaluacion_id: evaluacionId, profesor_id: user.id, inicio, fin, texto_seleccionado: textoSel, tipo, comentario })
        .select("id, inicio, fin, texto_seleccionado, tipo, comentario")
        .single();
      if (error) { toast.error("No se pudo guardar la anotación."); return; }
      setAnotaciones((prev) => ({
        ...prev,
        [evaluacionId]: [...(prev[evaluacionId] ?? []), data as Anotacion],
      }));
    },
    [user],
  );

  const handleEliminarAnotacion = useCallback(
    async (evaluacionId: string, anotacionId: string) => {
      const { error } = await supabase
        .from("anotaciones_evaluacion")
        .delete()
        .eq("id", anotacionId)
        .eq("profesor_id", user!.id);
      if (error) { toast.error("No se pudo eliminar la anotación."); return; }
      setAnotaciones((prev) => ({
        ...prev,
        [evaluacionId]: (prev[evaluacionId] ?? []).filter((a) => a.id !== anotacionId),
      }));
    },
    [user],
  );

  // ── Plan de estudios ────────────────────────────────────────────

  const toggleCompletada = async (tarea: TareaPlan) => {
    const nueva = !tarea.completada;
    setTareas((prev) => prev.map((t) => (t.id === tarea.id ? { ...t, completada: nueva } : t)));
    const { error } = await supabase
      .from("tareas_plan")
      .update({ completada: nueva })
      .eq("id", tarea.id);
    if (error) {
      toast.error("No se pudo actualizar la tarea.");
      setTareas((prev) => prev.map((t) => (t.id === tarea.id ? { ...t, completada: tarea.completada } : t)));
    }
  };

  const abrirEdicion = (tarea: TareaPlan) => {
    setEditandoTarea(tarea);
    setEditTitulo(tarea.titulo);
    setEditDescripcion(tarea.descripcion ?? "");
  };

  const guardarEdicion = async () => {
    if (!editandoTarea) return;
    setGuardandoEdicion(true);
    const { error } = await supabase
      .from("tareas_plan")
      .update({ titulo: editTitulo.trim(), descripcion: editDescripcion.trim() })
      .eq("id", editandoTarea.id);
    if (error) {
      toast.error("No se pudo guardar la edición.");
      setGuardandoEdicion(false);
      return;
    }
    setTareas((prev) =>
      prev.map((t) =>
        t.id === editandoTarea.id
          ? { ...t, titulo: editTitulo.trim(), descripcion: editDescripcion.trim() }
          : t,
      ),
    );
    setGuardandoEdicion(false);
    setEditandoTarea(null);
  };

  // Derivar datos para los gráficos
  const tareasPlanGrafico = tareas.map(({ semana, completada }) => ({ semana, completada }));

  // Agrupar tareas por semana
  const semanas = Array.from(new Set(tareas.map((t) => t.semana))).sort((a, b) => a - b);
  const tareasPorSemana = semanas.reduce<Record<number, TareaPlan[]>>((acc, s) => {
    acc[s] = tareas.filter((t) => t.semana === s);
    return acc;
  }, {});

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
            {/* Cabecera */}
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
                        ({
                          a: alumnoInfo.banda_a_media,
                          b: alumnoInfo.banda_b_media,
                          c: alumnoInfo.banda_c_media,
                          d: alumnoInfo.banda_d_media,
                        }[c.key]) ?? 0;
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

            {/* Gráficos */}
            {(evaluaciones.length >= 2 || tareasPlanGrafico.length > 0) && (
              <div className="grid lg:grid-cols-2 gap-4 mb-8">
                {evaluaciones.length >= 2 && (
                  <div className="bg-card border border-border rounded-lg p-5">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-4">
                      Progresión de notas
                    </div>
                    <GraficoProgresion evaluaciones={evaluaciones} />
                  </div>
                )}
                {tareasPlanGrafico.length > 0 && (
                  <div className="bg-card border border-border rounded-lg p-5">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-4">
                      Progreso del plan
                    </div>
                    <GraficoPlan tareas={tareasPlanGrafico} />
                  </div>
                )}
              </div>
            )}

            {/* ── Plan de estudios ── */}
            <div className="mb-10">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
                Plan de estudios
              </div>

              {!tienePlan ? (
                <Card className="p-8 text-center border-dashed">
                  <BookOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Este alumno aún no tiene un plan de estudios activo.
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {semanas.map((semana) => {
                    const tareasS = tareasPorSemana[semana];
                    const completadas = tareasS.filter((t) => t.completada).length;
                    const pct = Math.round((completadas / tareasS.length) * 100);
                    return (
                      <Card key={semana} className="overflow-hidden">
                        {/* Cabecera de semana */}
                        <div className="px-5 py-3 flex items-center justify-between border-b border-border bg-muted/30">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Semana {semana}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-semibold tabular-nums",
                              pct === 100
                                ? "text-green-600"
                                : pct >= 50
                                  ? "text-primary"
                                  : "text-muted-foreground",
                            )}
                          >
                            {completadas}/{tareasS.length} · {pct}%
                          </span>
                        </div>

                        {/* Lista de tareas */}
                        <ul className="divide-y divide-border">
                          {tareasS.map((tarea) => (
                            <li
                              key={tarea.id}
                              className="px-5 py-3 flex items-start gap-3 hover:bg-accent/20 transition-colors"
                            >
                              {/* Checkbox */}
                              <button
                                onClick={() => toggleCompletada(tarea)}
                                aria-label={tarea.completada ? "Marcar como pendiente" : "Marcar como completada"}
                                className={cn(
                                  "mt-0.5 h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors",
                                  tarea.completada
                                    ? "border-green-500 bg-green-500"
                                    : "border-border bg-background hover:border-primary",
                                )}
                              >
                                {tarea.completada && (
                                  <svg
                                    className="h-2.5 w-2.5 text-white"
                                    viewBox="0 0 12 12"
                                    fill="none"
                                  >
                                    <path
                                      d="M2 6l3 3 5-5"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </button>

                              {/* Contenido */}
                              <div className="flex-1 min-w-0">
                                <p
                                  className={cn(
                                    "text-sm leading-snug",
                                    tarea.completada
                                      ? "line-through text-muted-foreground"
                                      : "text-foreground",
                                  )}
                                >
                                  {tarea.titulo}
                                </p>
                                {tarea.descripcion && (
                                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                    {tarea.descripcion}
                                  </p>
                                )}
                              </div>

                              {/* Botón editar */}
                              <button
                                onClick={() => abrirEdicion(tarea)}
                                aria-label="Editar tarea"
                                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Historial de evaluaciones ── */}
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
                  {evaluaciones.map((ev) => {
                    const evAnotaciones = anotaciones[ev.id] ?? [];
                    return (
                      <Card key={ev.id} className="overflow-hidden">
                        <button
                          onClick={() => handleExpandir(ev.id)}
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
                              {evAnotaciones.length > 0 && (
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                                  {evAnotaciones.length} anotación
                                  {evAnotaciones.length !== 1 ? "es" : ""}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2 mt-1.5 flex-wrap">
                              {CRITERIOS.map((c) => {
                                const b = { a: ev.banda_a, b: ev.banda_b, c: ev.banda_c, d: ev.banda_d }[c.key];
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

                        {expandida === ev.id && (
                          <div className="border-t border-border px-5 py-5 space-y-5 bg-muted/20">
                            <div>
                              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                                Texto literario
                              </div>
                              <p className="text-sm font-serif leading-relaxed text-ink whitespace-pre-line line-clamp-6">
                                {ev.texto_literario}
                              </p>
                            </div>

                            <div>
                              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                                Pregunta de orientación
                              </div>
                              <p className="text-sm text-foreground/80">{ev.pregunta_orientacion}</p>
                            </div>

                            <div>
                              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                                Análisis del alumno
                              </div>
                              <TextoAnotado
                                texto={ev.analisis_estudiante}
                                anotaciones={evAnotaciones}
                                modoEdicion
                                onCrear={(inicio, fin, textoSel, tipo, comentario) =>
                                  handleCrearAnotacion(ev.id, inicio, fin, textoSel, tipo, comentario)
                                }
                                onEliminar={(anotacionId) =>
                                  handleEliminarAnotacion(ev.id, anotacionId)
                                }
                              />
                            </div>

                            <div className="grid sm:grid-cols-2 gap-3">
                              {CRITERIOS.map((c) => {
                                const b = { a: ev.banda_a, b: ev.banda_b, c: ev.banda_c, d: ev.banda_d }[c.key];
                                const j = { a: ev.justificacion_a, b: ev.justificacion_b, c: ev.justificacion_c, d: ev.justificacion_d }[c.key];
                                return (
                                  <div key={c.key} className="bg-card rounded-lg border border-border p-4">
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                                        Criterio {c.letra} — {c.nombre}
                                      </span>
                                      <span className="font-semibold text-primary text-sm">{b}/5</span>
                                    </div>
                                    <MiniBarras banda={b} />
                                    {j && (
                                      <p className="text-xs text-foreground/80 leading-relaxed mt-2">{j}</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

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

                            {/* ── Comentario del profesor ── */}
                            <div className="border-t border-border pt-4">
                              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
                                Tu comentario
                              </div>

                              {editandoComentarioId !== ev.id ? (
                                comentarios[ev.id] ? (
                                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                                      {comentarios[ev.id]}
                                    </p>
                                    <div className="flex gap-2 mt-3">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => iniciarComentario(ev.id, comentarios[ev.id]!)}
                                      >
                                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                                        Editar
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => eliminarComentario(ev.id)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                        Eliminar
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => iniciarComentario(ev.id)}
                                  >
                                    <Mic className="h-3.5 w-3.5 mr-1.5" />
                                    Añadir comentario
                                  </Button>
                                )
                              ) : (
                                <div className="space-y-3">
                                  {textoMejorado !== null ? (
                                    <>
                                      <div className="text-[10px] text-primary uppercase tracking-wider">
                                        Versión de Claude — edita si quieres
                                      </div>
                                      <Textarea
                                        value={textoMejorado}
                                        onChange={(e) => setTextoMejorado(e.target.value)}
                                        rows={6}
                                        className="resize-none text-sm"
                                      />
                                      <div className="flex gap-2 flex-wrap">
                                        <Button
                                          size="sm"
                                          onClick={() => guardarComentario(ev.id)}
                                          disabled={guardandoComentario || !textoMejorado.trim()}
                                        >
                                          {guardandoComentario ? "Guardando…" : "Guardar"}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setTextoMejorado(null)}
                                        >
                                          Volver al original
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={cancelarComentario}>
                                          Cancelar
                                        </Button>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex gap-2 items-end">
                                        <Textarea
                                          value={textoComentario}
                                          onChange={(e) => setTextoComentario(e.target.value)}
                                          placeholder={
                                            dictando
                                              ? "Habla ahora…"
                                              : "Dicta o escribe tus apuntes sobre este análisis…"
                                          }
                                          rows={4}
                                          className="resize-none text-sm flex-1"
                                        />
                                        <Button
                                          size="icon"
                                          variant={dictando ? "destructive" : "outline"}
                                          className={cn(
                                            "h-[88px] w-10 shrink-0",
                                            dictando && "animate-pulse",
                                          )}
                                          onClick={toggleDictado}
                                          title={dictando ? "Detener dictado" : "Dictar por voz"}
                                        >
                                          {dictando ? (
                                            <MicOff className="h-4 w-4" />
                                          ) : (
                                            <Mic className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </div>
                                      {dictando && (
                                        <p className="text-xs text-muted-foreground italic truncate">
                                          {interimTexto ? `${interimTexto}…` : "Escuchando…"}
                                        </p>
                                      )}
                                      <div className="flex gap-2 flex-wrap">
                                        <Button
                                          size="sm"
                                          onClick={reescribirConClaude}
                                          disabled={!textoComentario.trim() || reescribiendo}
                                        >
                                          {reescribiendo ? (
                                            <>
                                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                              Procesando…
                                            </>
                                          ) : (
                                            <>
                                              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                                              Reescribir con Claude
                                            </>
                                          )}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => guardarComentario(ev.id)}
                                          disabled={!textoComentario.trim() || guardandoComentario}
                                        >
                                          Guardar sin mejorar
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={cancelarComentario}
                                        >
                                          Cancelar
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Dialog para editar tarea */}
      <Dialog open={!!editandoTarea} onOpenChange={(open) => { if (!open) setEditandoTarea(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Editar tarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                Título
              </p>
              <Input
                value={editTitulo}
                onChange={(e) => setEditTitulo(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                Descripción (opcional)
              </p>
              <Textarea
                value={editDescripcion}
                onChange={(e) => setEditDescripcion(e.target.value)}
                className="resize-none"
                rows={3}
                placeholder="Añade más detalles sobre esta tarea…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditandoTarea(null)}>
              Cancelar
            </Button>
            <Button onClick={guardarEdicion} disabled={guardandoEdicion || !editTitulo.trim()}>
              {guardandoEdicion ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
