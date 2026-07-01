import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { type CSSProperties, useEffect, useState, useCallback } from "react";
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
import {
  ChevronLeft,
  Loader2,
  FileText,
  Pencil,
  BookOpen,
  Mic,
  MicOff,
  Sparkles,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CRITERIOS } from "@/lib/ib";
import { toast } from "sonner";
import { GraficoProgresion } from "@/components/GraficoProgresion";
import { GraficoPlan } from "@/components/GraficoPlan";
import { TextoLectura } from "@/components/TextoLectura";
import { TextoAnotado, type Anotacion, type TipoAnotacion } from "@/components/TextoAnotado";
import { useDictado } from "@/hooks/useDictado";
import {
  LANDING_FONT_LINK,
  LANDING as L,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";

export const Route = createFileRoute("/profesor-alumno/$alumnoId")({
  head: () => ({
    meta: [{ title: "Alumno — LIBerico" }],
    links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }],
  }),
  component: ProfesorAlumnoPage,
});

type CSSVarStyle = CSSProperties & Record<`--${string}`, string>;

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;
const rootStyle: CSSVarStyle = {
  ...fontSans,
  backgroundColor: L.bg,
  color: L.ink,
  "--background": L.bg,
  "--foreground": L.ink,
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
};
const cardStyle = { backgroundColor: L.surface, borderColor: L.line, boxShadow: cardShadow };
const ctaStyle = {
  backgroundColor: L.primary,
  color: "#fff",
  boxShadow: "0 16px 30px -12px rgba(79,70,229,0.55)",
};

const scopedCss = `
  #profesor-alumno-root .teacher-card{background:${L.surface};border-color:${L.line};box-shadow:${cardShadow};}
  #profesor-alumno-root .teacher-soft{background:${L.bg2};border-color:${L.line};}
  #profesor-alumno-root .teacher-press{transition:transform 0.14s cubic-bezier(0.23,1,0.32,1),border-color 0.18s ease,background-color 0.18s ease,box-shadow 0.18s ease;}
  #profesor-alumno-root .teacher-press:active{transform:scale(0.985);}
  #profesor-alumno-root a:focus-visible,#profesor-alumno-root button:focus-visible,#profesor-alumno-root textarea:focus-visible,#profesor-alumno-root input:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:14px;}
  #profesor-alumno-root button:not([disabled]){cursor:pointer;}
  @media (hover:hover) and (pointer:fine){
    #profesor-alumno-root .teacher-hover:hover{transform:translateY(-1px);border-color:${L.primary};box-shadow:0 20px 38px -28px rgba(15,23,42,0.42),0 4px 10px -6px rgba(15,23,42,0.12);}
  }
  @media (prefers-reduced-motion: reduce){
    #profesor-alumno-root .teacher-press,#profesor-alumno-root .teacher-hover{transition:none !important;}
  }
`;

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
          className="h-1.5 w-3 rounded-full"
          style={{ backgroundColor: n <= banda ? L.primary : L.line }}
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
    const { data, error } = await supabase.functions.invoke("lita-p1-rewrite-feedback", {
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
    if (error) {
      toast.error("No se pudo guardar el comentario.");
      return;
    }
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
    if (error) {
      toast.error("No se pudo eliminar el comentario.");
      return;
    }
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
        .insert({
          evaluacion_id: evaluacionId,
          profesor_id: user.id,
          inicio,
          fin,
          texto_seleccionado: textoSel,
          tipo,
          comentario,
        })
        .select("id, inicio, fin, texto_seleccionado, tipo, comentario")
        .single();
      if (error) {
        toast.error("No se pudo guardar la anotación.");
        return;
      }
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
      if (error) {
        toast.error("No se pudo eliminar la anotación.");
        return;
      }
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
      setTareas((prev) =>
        prev.map((t) => (t.id === tarea.id ? { ...t, completada: tarea.completada } : t)),
      );
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
      <div className="flex min-h-screen items-center justify-center" style={rootStyle}>
        Cargando…
      </div>
    );
  }

  return (
    <div id="profesor-alumno-root" className="min-h-screen" style={rootStyle}>
      <style>{scopedCss}</style>
      <SiteHeader claro />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link
          to="/profesor-alumnos"
          className="teacher-press mb-6 inline-flex items-center gap-1.5 rounded-xl text-sm font-semibold transition-colors hover:opacity-80"
          style={{ color: L.muted }}
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          Mis alumnos
        </Link>

        {cargando ? (
          <div className="flex justify-center py-20">
            <Loader2
              aria-hidden="true"
              className="h-5 w-5 animate-spin"
              style={{ color: L.muted }}
            />
          </div>
        ) : (
          <>
            {/* Cabecera */}
            <div className="mb-8">
              <div
                className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={{ ...fontMono, color: L.primary }}
              >
                Alumno
              </div>
              <h1 className="break-all text-2xl font-semibold" style={headingStyle}>
                {alumnoInfo?.email}
              </h1>
            </div>

            {/* Stats globales */}
            {alumnoInfo && alumnoInfo.num_evaluaciones > 0 && (
              <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Card className="teacher-card rounded-2xl border p-4">
                  <div
                    className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                    style={{ ...fontMono, color: L.muted }}
                  >
                    Nota media
                  </div>
                  <div className="text-3xl font-semibold" style={{ ...fontMono, color: L.ink }}>
                    {alumnoInfo.nota_ib_media?.toFixed(1) ?? "—"}
                  </div>
                </Card>
                <Card className="teacher-card rounded-2xl border p-4">
                  <div
                    className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                    style={{ ...fontMono, color: L.muted }}
                  >
                    Evaluaciones
                  </div>
                  <div className="text-3xl font-semibold" style={{ ...fontMono, color: L.ink }}>
                    {alumnoInfo.num_evaluaciones}
                  </div>
                </Card>
                <Card className="teacher-card col-span-2 rounded-2xl border p-4 sm:col-span-1">
                  <div
                    className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
                    style={{ ...fontMono, color: L.muted }}
                  >
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
                          <span
                            className="w-4 text-[10px] font-semibold"
                            style={{ color: L.muted }}
                          >
                            {c.letra}
                          </span>
                          <MiniBarras banda={Math.round(val)} />
                          <span className="text-[10px] tabular-nums" style={{ color: L.muted }}>
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
              <div className="mb-8 grid gap-4 lg:grid-cols-2">
                {evaluaciones.length >= 2 && (
                  <div className="teacher-card rounded-2xl border p-5">
                    <div
                      className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em]"
                      style={{ ...fontMono, color: L.muted }}
                    >
                      Progresión de notas
                    </div>
                    <GraficoProgresion evaluaciones={evaluaciones} />
                  </div>
                )}
                {tareasPlanGrafico.length > 0 && (
                  <div className="teacher-card rounded-2xl border p-5">
                    <div
                      className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em]"
                      style={{ ...fontMono, color: L.muted }}
                    >
                      Progreso del plan
                    </div>
                    <GraficoPlan tareas={tareasPlanGrafico} />
                  </div>
                )}
              </div>
            )}

            {/* ── Plan de estudios ── */}
            <div className="mb-10">
              <div
                className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={{ ...fontMono, color: L.primary }}
              >
                Plan de estudios
              </div>

              {!tienePlan ? (
                <Card className="teacher-card rounded-2xl border border-dashed p-8 text-center">
                  <BookOpen
                    aria-hidden="true"
                    className="mx-auto mb-2 h-8 w-8 opacity-40"
                    style={{ color: L.muted }}
                  />
                  <p className="text-sm" style={{ color: L.muted }}>
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
                      <Card
                        key={semana}
                        className="teacher-card overflow-hidden rounded-2xl border"
                      >
                        {/* Cabecera de semana */}
                        <div
                          className="flex items-center justify-between border-b px-5 py-3"
                          style={{ backgroundColor: L.bg2, borderColor: L.line }}
                        >
                          <span
                            className="text-[11px] font-semibold uppercase tracking-wider"
                            style={{ color: L.muted }}
                          >
                            Semana {semana}
                          </span>
                          <span
                            className="text-[10px] font-semibold tabular-nums"
                            style={{
                              color: pct === 100 ? L.ok : pct >= 50 ? L.primary : L.muted,
                            }}
                          >
                            {completadas}/{tareasS.length} · {pct}%
                          </span>
                        </div>

                        {/* Lista de tareas */}
                        <ul className="divide-y" style={{ borderColor: L.line }}>
                          {tareasS.map((tarea) => (
                            <li
                              key={tarea.id}
                              className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-primary/5"
                            >
                              {/* Checkbox */}
                              <button
                                type="button"
                                onClick={() => toggleCompletada(tarea)}
                                aria-label={
                                  tarea.completada
                                    ? "Marcar como pendiente"
                                    : "Marcar como completada"
                                }
                                className={cn(
                                  "teacher-press mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
                                  tarea.completada ? "" : "hover:border-primary",
                                )}
                                style={{
                                  backgroundColor: tarea.completada ? L.ok : L.surface,
                                  borderColor: tarea.completada ? L.ok : L.line,
                                }}
                              >
                                {tarea.completada && (
                                  <svg
                                    aria-hidden="true"
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
                              <div className="min-w-0 flex-1">
                                <p
                                  className={cn(
                                    "text-sm leading-snug",
                                    tarea.completada ? "line-through" : "",
                                  )}
                                  style={{ color: tarea.completada ? L.muted : L.ink }}
                                >
                                  {tarea.titulo}
                                </p>
                                {tarea.descripcion && (
                                  <p
                                    className="mt-0.5 text-xs leading-relaxed"
                                    style={{ color: L.muted }}
                                  >
                                    {tarea.descripcion}
                                  </p>
                                )}
                              </div>

                              {/* Botón editar */}
                              <button
                                type="button"
                                onClick={() => abrirEdicion(tarea)}
                                aria-label="Editar tarea"
                                className="teacher-press mt-0.5 shrink-0 rounded-xl transition-colors hover:opacity-80"
                                style={{ color: L.muted }}
                              >
                                <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
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
              <div
                className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={{ ...fontMono, color: L.primary }}
              >
                Historial de evaluaciones
              </div>

              {evaluaciones.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center gap-2 py-16 text-center"
                  style={{ color: L.muted }}
                >
                  <FileText aria-hidden="true" className="h-8 w-8 opacity-40" />
                  <p className="text-sm">Este alumno aún no tiene evaluaciones.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {evaluaciones.map((ev) => {
                    const evAnotaciones = anotaciones[ev.id] ?? [];
                    return (
                      <Card key={ev.id} className="teacher-card overflow-hidden rounded-2xl border">
                        <button
                          type="button"
                          onClick={() => handleExpandir(ev.id)}
                          className="teacher-press flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-primary/5"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-xs" style={{ color: L.muted }}>
                                {new Date(ev.created_at).toLocaleDateString("es-ES", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                              {ev.nota_ib !== null && (
                                <span
                                  className="text-xs font-semibold"
                                  style={{ color: L.primary }}
                                >
                                  Nota {ev.nota_ib} · {ev.puntuacion_total}/20
                                </span>
                              )}
                              {evAnotaciones.length > 0 && (
                                <span
                                  className="rounded-full px-1.5 py-0.5 text-[10px]"
                                  style={{ backgroundColor: L.bg2, color: L.muted }}
                                >
                                  {evAnotaciones.length} anotación
                                  {evAnotaciones.length !== 1 ? "es" : ""}
                                </span>
                              )}
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-2">
                              {CRITERIOS.map((c) => {
                                const b = {
                                  a: ev.banda_a,
                                  b: ev.banda_b,
                                  c: ev.banda_c,
                                  d: ev.banda_d,
                                }[c.key];
                                return (
                                  <span
                                    key={c.key}
                                    className="text-[10px]"
                                    style={{ color: L.muted }}
                                  >
                                    <span className="font-semibold">{c.letra}</span> {b}/5
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                          <ChevronLeft
                            aria-hidden="true"
                            className={cn(
                              "h-4 w-4 shrink-0 transition-transform",
                              expandida === ev.id ? "-rotate-90" : "rotate-180",
                            )}
                            style={{ color: L.muted }}
                          />
                        </button>

                        {expandida === ev.id && (
                          <div
                            className="space-y-5 border-t px-5 py-5"
                            style={{ backgroundColor: L.bg2, borderColor: L.line }}
                          >
                            <div>
                              <div
                                className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                                style={{ ...fontMono, color: L.muted }}
                              >
                                Texto literario
                              </div>
                              <TextoLectura
                                texto={ev.texto_literario}
                                className="text-sm font-serif leading-relaxed"
                              />
                            </div>

                            <div>
                              <div
                                className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                                style={{ ...fontMono, color: L.muted }}
                              >
                                Pregunta de orientación
                              </div>
                              <p className="text-sm" style={{ color: L.ink }}>
                                {ev.pregunta_orientacion}
                              </p>
                            </div>

                            <div>
                              <div
                                className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
                                style={{ ...fontMono, color: L.muted }}
                              >
                                Análisis del alumno
                              </div>
                              <TextoAnotado
                                texto={ev.analisis_estudiante}
                                anotaciones={evAnotaciones}
                                modoEdicion
                                onCrear={(inicio, fin, textoSel, tipo, comentario) =>
                                  handleCrearAnotacion(
                                    ev.id,
                                    inicio,
                                    fin,
                                    textoSel,
                                    tipo,
                                    comentario,
                                  )
                                }
                                onEliminar={(anotacionId) =>
                                  handleEliminarAnotacion(ev.id, anotacionId)
                                }
                              />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
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
                                  <div key={c.key} className="teacher-card rounded-2xl border p-4">
                                    <div className="mb-2 flex items-center justify-between">
                                      <span
                                        className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                                        style={{ color: L.muted }}
                                      >
                                        Criterio {c.letra} — {c.nombre}
                                      </span>
                                      <span
                                        className="text-sm font-semibold"
                                        style={{ color: L.primary }}
                                      >
                                        {b}/5
                                      </span>
                                    </div>
                                    <MiniBarras banda={b} />
                                    {j && (
                                      <p
                                        className="mt-2 text-xs leading-relaxed"
                                        style={{ color: L.muted }}
                                      >
                                        {j}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {(ev.fortalezas || ev.areas_mejora) && (
                              <div className="grid gap-3 sm:grid-cols-2">
                                {ev.fortalezas && (
                                  <div
                                    className="rounded-2xl border border-l-4 px-4 py-3"
                                    style={{
                                      backgroundColor: "#ECFDF5",
                                      borderColor: L.line,
                                      borderLeftColor: L.ok,
                                    }}
                                  >
                                    <div
                                      className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                                      style={{ ...fontMono, color: L.muted }}
                                    >
                                      Fortalezas
                                    </div>
                                    <p
                                      className="whitespace-pre-line text-xs leading-relaxed"
                                      style={{ color: L.ink }}
                                    >
                                      {ev.fortalezas}
                                    </p>
                                  </div>
                                )}
                                {ev.areas_mejora && (
                                  <div
                                    className="rounded-2xl border border-l-4 px-4 py-3"
                                    style={{
                                      backgroundColor: L.primary + "08",
                                      borderColor: L.line,
                                      borderLeftColor: L.primary,
                                    }}
                                  >
                                    <div
                                      className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                                      style={{ ...fontMono, color: L.muted }}
                                    >
                                      Áreas de mejora
                                    </div>
                                    <p
                                      className="whitespace-pre-line text-xs leading-relaxed"
                                      style={{ color: L.ink }}
                                    >
                                      {ev.areas_mejora}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {ev.comentario_global && (
                              <div className="teacher-card rounded-2xl border px-4 py-3">
                                <div
                                  className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                                  style={{ ...fontMono, color: L.muted }}
                                >
                                  Comentario global
                                </div>
                                <p
                                  className="font-serif text-sm leading-relaxed"
                                  style={{ color: L.ink }}
                                >
                                  {ev.comentario_global}
                                </p>
                              </div>
                            )}

                            {/* ── Comentario del profesor ── */}
                            <div className="border-t pt-4" style={{ borderColor: L.line }}>
                              <div
                                className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em]"
                                style={{ ...fontMono, color: L.muted }}
                              >
                                Tu comentario
                              </div>

                              {editandoComentarioId !== ev.id ? (
                                comentarios[ev.id] ? (
                                  <div
                                    className="rounded-2xl border px-4 py-3"
                                    style={{ backgroundColor: "#FEF3C7", borderColor: "#F59E0B" }}
                                  >
                                    <p
                                      className="whitespace-pre-line text-sm leading-relaxed"
                                      style={{ color: L.ink }}
                                    >
                                      {comentarios[ev.id]}
                                    </p>
                                    <div className="mt-3 flex gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="teacher-press rounded-xl"
                                        onClick={() =>
                                          iniciarComentario(ev.id, comentarios[ev.id]!)
                                        }
                                      >
                                        <Pencil aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
                                        Editar
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => eliminarComentario(ev.id)}
                                      >
                                        <Trash2 aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
                                        Eliminar
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="teacher-press rounded-xl"
                                    onClick={() => iniciarComentario(ev.id)}
                                  >
                                    <Mic aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
                                    Añadir comentario
                                  </Button>
                                )
                              ) : (
                                <div className="space-y-3">
                                  {textoMejorado !== null ? (
                                    <>
                                      <div
                                        className="text-[10px] font-semibold uppercase tracking-wider"
                                        style={{ ...fontMono, color: L.primary }}
                                      >
                                        Versión de Claude — edita si quieres
                                      </div>
                                      <Textarea
                                        value={textoMejorado}
                                        onChange={(e) => setTextoMejorado(e.target.value)}
                                        rows={6}
                                        className="resize-none rounded-2xl text-sm"
                                        style={{
                                          backgroundColor: L.surface,
                                          borderColor: L.line,
                                          color: L.ink,
                                        }}
                                      />
                                      <div className="flex flex-wrap gap-2">
                                        <Button
                                          type="button"
                                          size="sm"
                                          className="teacher-press rounded-xl"
                                          style={ctaStyle}
                                          onClick={() => guardarComentario(ev.id)}
                                          disabled={guardandoComentario || !textoMejorado.trim()}
                                        >
                                          {guardandoComentario ? "Guardando…" : "Guardar"}
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          className="teacher-press rounded-xl"
                                          onClick={() => setTextoMejorado(null)}
                                        >
                                          Volver al original
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          className="teacher-press rounded-xl"
                                          onClick={cancelarComentario}
                                        >
                                          Cancelar
                                        </Button>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex items-end gap-2">
                                        <Textarea
                                          value={textoComentario}
                                          onChange={(e) => setTextoComentario(e.target.value)}
                                          placeholder={
                                            dictando
                                              ? "Habla ahora…"
                                              : "Dicta o escribe tus apuntes sobre este análisis…"
                                          }
                                          rows={4}
                                          className="flex-1 resize-none rounded-2xl text-sm"
                                          style={{
                                            backgroundColor: L.surface,
                                            borderColor: L.line,
                                            color: L.ink,
                                          }}
                                        />
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant={dictando ? "destructive" : "outline"}
                                          className={cn(
                                            "teacher-press h-[88px] w-10 shrink-0 rounded-2xl",
                                            dictando && "animate-pulse",
                                          )}
                                          onClick={toggleDictado}
                                          title={dictando ? "Detener dictado" : "Dictar por voz"}
                                        >
                                          {dictando ? (
                                            <MicOff aria-hidden="true" className="h-4 w-4" />
                                          ) : (
                                            <Mic aria-hidden="true" className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </div>
                                      {dictando && (
                                        <p
                                          className="truncate text-xs italic"
                                          style={{ color: L.muted }}
                                        >
                                          {interimTexto ? `${interimTexto}…` : "Escuchando…"}
                                        </p>
                                      )}
                                      <div className="flex flex-wrap gap-2">
                                        <Button
                                          type="button"
                                          size="sm"
                                          className="teacher-press rounded-xl"
                                          style={ctaStyle}
                                          onClick={reescribirConClaude}
                                          disabled={!textoComentario.trim() || reescribiendo}
                                        >
                                          {reescribiendo ? (
                                            <>
                                              <Loader2
                                                aria-hidden="true"
                                                className="mr-1.5 h-3.5 w-3.5 animate-spin"
                                              />
                                              Procesando…
                                            </>
                                          ) : (
                                            <>
                                              <Sparkles
                                                aria-hidden="true"
                                                className="mr-1.5 h-3.5 w-3.5"
                                              />
                                              Reescribir con Claude
                                            </>
                                          )}
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          className="teacher-press rounded-xl"
                                          onClick={() => guardarComentario(ev.id)}
                                          disabled={!textoComentario.trim() || guardandoComentario}
                                        >
                                          Guardar sin mejorar
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          className="teacher-press rounded-xl"
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
      <Dialog
        open={!!editandoTarea}
        onOpenChange={(open) => {
          if (!open) setEditandoTarea(null);
        }}
      >
        <DialogContent className="rounded-2xl border sm:max-w-md" style={cardStyle}>
          <DialogHeader>
            <DialogTitle style={headingStyle}>Editar tarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p
                className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{ ...fontMono, color: L.muted }}
              >
                Título
              </p>
              <Input
                value={editTitulo}
                onChange={(e) => setEditTitulo(e.target.value)}
                autoFocus
                className="rounded-2xl"
                style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
              />
            </div>
            <div>
              <p
                className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{ ...fontMono, color: L.muted }}
              >
                Descripción (opcional)
              </p>
              <Textarea
                value={editDescripcion}
                onChange={(e) => setEditDescripcion(e.target.value)}
                className="resize-none rounded-2xl"
                style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
                rows={3}
                placeholder="Añade más detalles sobre esta tarea…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="teacher-press rounded-xl"
              onClick={() => setEditandoTarea(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="teacher-press rounded-xl"
              style={ctaStyle}
              onClick={guardarEdicion}
              disabled={guardandoEdicion || !editTitulo.trim()}
            >
              {guardandoEdicion ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
