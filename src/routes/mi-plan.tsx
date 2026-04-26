import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { differenceInWeeks, parseISO } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  BookOpen,
  PencilLine,
  FileText,
  Brain,
  Loader2,
  RefreshCw,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CRITERIOS } from "@/lib/ib";
import { toast } from "sonner";
import { GraficoProgresion } from "@/components/GraficoProgresion";
import { GraficoPlan } from "@/components/GraficoPlan";

export const Route = createFileRoute("/mi-plan")({
  head: () => ({
    meta: [
      { title: "Mi plan — IB Literatura" },
      { name: "description", content: "Tu plan de estudio personalizado para la Prueba 1." },
    ],
  }),
  component: MiPlanPage,
});

type Perfil = {
  fecha_examen: string | null;
  nota_objetivo: number | null;
  banda_inicial_a: number | null;
  banda_inicial_b: number | null;
  banda_inicial_c: number | null;
  banda_inicial_d: number | null;
  diagnostico_completado: boolean | null;
  profesor_id: string | null;
};

type Plan = {
  id: string;
  resumen_diagnostico: string;
  enfoque_principal: string;
  semanas_totales: number;
  preliminar: boolean | null;
  generado_at: string;
};

type Tarea = {
  id: string;
  semana: number;
  titulo: string;
  descripcion: string;
  tipo: string;
  criterio_objetivo: string | null;
  duracion_estimada_min: number;
  completada: boolean | null;
};

const TIPO_ICON: Record<string, typeof BookOpen> = {
  lectura: BookOpen,
  ejercicio: PencilLine,
  analisis_practica: FileText,
  repaso_teoria: Brain,
};

const CRITERIO_COLOR: Record<string, string> = {
  A: "bg-blue-500/15 text-blue-700 border-blue-300",
  B: "bg-amber-500/15 text-amber-700 border-amber-300",
  C: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
  D: "bg-rose-500/15 text-rose-700 border-rose-300",
  global: "bg-muted text-foreground/70 border-border",
};

function MiPlanPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerando, setRegenerando] = useState(false);
  const [codigoInput, setCodigoInput] = useState("");
  const [uniendose, setUniendose] = useState(false);
  const [evaluaciones, setEvaluaciones] = useState<
    {
      created_at: string;
      puntuacion_total: number | null;
      nota_ib: number | null;
      banda_a: number;
      banda_b: number;
      banda_c: number;
      banda_d: number;
    }[]
  >([]);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  const cargar = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: perfilData, error: perfilErr } = await supabase
      .from("perfiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (perfilErr) {
      toast.error("Error al cargar tu perfil.");
      setLoading(false);
      return;
    }
    setPerfil(perfilData as Perfil | null);

    if (!perfilData) {
      navigate({ to: "/onboarding" });
      return;
    }

    const { data: planData, error: planErr } = await supabase
      .from("planes_estudio")
      .select("*")
      .eq("user_id", user.id)
      .eq("activo", true)
      .order("generado_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (planErr) {
      toast.error("Error al cargar tu plan.");
      setLoading(false);
      return;
    }

    if (!planData) {
      navigate({ to: "/onboarding" });
      return;
    }
    setPlan(planData as Plan);

    const { data: tareasData, error: tareasErr } = await supabase
      .from("tareas_plan")
      .select("*")
      .eq("plan_id", planData.id)
      .order("semana", { ascending: true })
      .order("created_at", { ascending: true });

    if (tareasErr) toast.error("Error al cargar las tareas.");
    setTareas((tareasData ?? []) as Tarea[]);

    const { data: evsData } = await supabase
      .from("evaluaciones")
      .select("created_at, puntuacion_total, nota_ib, banda_a, banda_b, banda_c, banda_d")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    setEvaluaciones(evsData ?? []);

    setLoading(false);
  }, [user, navigate]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const toggleTarea = async (t: Tarea) => {
    const nuevo = !t.completada;
    setTareas((prev) => prev.map((x) => (x.id === t.id ? { ...x, completada: nuevo } : x)));
    const { error } = await supabase
      .from("tareas_plan")
      .update({ completada: nuevo, completada_at: nuevo ? new Date().toISOString() : null })
      .eq("id", t.id);
    if (error) {
      toast.error("No se pudo guardar el cambio.");
      setTareas((prev) => prev.map((x) => (x.id === t.id ? { ...x, completada: !nuevo } : x)));
    }
  };

  const regenerar = async () => {
    setRegenerando(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-study-plan", {});
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Plan regenerado");
      await cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al regenerar.");
    } finally {
      setRegenerando(false);
    }
  };

  const unirseAClase = async () => {
    const codigo = codigoInput.trim().toUpperCase();
    if (!codigo) return;
    setUniendose(true);
    try {
      const { data, error } = await supabase.rpc("unirse_a_clase", { p_codigo: codigo });
      if (error) throw error;
      if (data === "error:codigo_invalido") {
        toast.error("Código de clase no válido. Comprueba que lo has escrito correctamente.");
        return;
      }
      if (data === "error:solo_alumnos") {
        toast.error("Solo los alumnos pueden unirse a una clase.");
        return;
      }
      toast.success("Te has unido a la clase correctamente.");
      setCodigoInput("");
      await cargar();
    } catch {
      toast.error("No se pudo procesar el código. Inténtalo de nuevo.");
    } finally {
      setUniendose(false);
    }
  };

  const salirDeClase = async () => {
    try {
      const { error } = await supabase.rpc("salir_de_clase");
      if (error) throw error;
      toast.success("Has abandonado la clase.");
      await cargar();
    } catch {
      toast.error("No se pudo abandonar la clase.");
    }
  };

  const semanasRestantes = useMemo(() => {
    if (!perfil?.fecha_examen) return null;
    return Math.max(0, differenceInWeeks(parseISO(perfil.fecha_examen), new Date()));
  }, [perfil]);

  const completadas = tareas.filter((t) => t.completada).length;
  const progreso = tareas.length ? Math.round((completadas / tareas.length) * 100) : 0;

  const tareasPorSemana = useMemo(() => {
    const map = new Map<number, Tarea[]>();
    for (const t of tareas) {
      if (!map.has(t.semana)) map.set(t.semana, []);
      map.get(t.semana)!.push(t);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [tareas]);

  // Semana actual (aproximación: primera semana con tareas no completadas)
  const semanaActual = useMemo(() => {
    for (const [sem, ts] of tareasPorSemana) {
      if (ts.some((t) => !t.completada)) return sem;
    }
    return tareasPorSemana[0]?.[0] ?? 1;
  }, [tareasPorSemana]);

  const bandas = perfil
    ? [
        { letra: "A", val: perfil.banda_inicial_a ?? 0 },
        { letra: "B", val: perfil.banda_inicial_b ?? 0 },
        { letra: "C", val: perfil.banda_inicial_c ?? 0 },
        { letra: "D", val: perfil.banda_inicial_d ?? 0 },
      ]
    : [];

  const puedeRegenerar = plan
    ? differenceInWeeks(new Date(), parseISO(plan.generado_at)) >= 2
    : false;

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="flex items-center justify-center py-32 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando tu plan…
        </div>
      </div>
    );
  }

  if (!plan || !perfil) return null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
              Tu plan de estudio{" "}
              {plan.preliminar && <span className="ml-2 text-amber-700">· preliminar</span>}
            </div>
            <h1 className="font-serif text-3xl text-ink">Mi plan</h1>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-foreground/80">
              <span>
                Nota objetivo: <strong className="text-ink">{perfil.nota_objetivo}</strong>
              </span>
              {semanasRestantes !== null && (
                <span>
                  Semanas restantes: <strong className="text-ink">{semanasRestantes}</strong>
                </span>
              )}
              <span>
                Progreso: <strong className="text-ink">{progreso}%</strong> ({completadas}/
                {tareas.length})
              </span>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={!puedeRegenerar || regenerando}>
                {regenerando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Regenerar plan
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Regenerar tu plan?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esto reemplazará tu plan activo y sus tareas. El progreso actual se perderá.
                  {!puedeRegenerar && " Aún no han pasado 2 semanas desde el último plan."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={regenerar}>Regenerar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Resumen */}
        <div className="grid lg:grid-cols-3 gap-4 mb-10">
          <Card className="p-5 lg:col-span-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
              Resumen del diagnóstico
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">{plan.resumen_diagnostico}</p>
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                Tu enfoque principal
              </div>
              <p className="font-serif text-lg text-ink">{plan.enfoque_principal}</p>
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
              Bandas iniciales
            </div>
            <div className="space-y-3">
              {bandas.map((b) => {
                const crit = CRITERIOS.find((c) => c.letra === b.letra);
                return (
                  <div key={b.letra}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-foreground/80">
                        <strong>{b.letra}.</strong> {crit?.nombre}
                      </span>
                      <span className="tabular-nums text-foreground/70">{b.val}/5</span>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <div
                          key={n}
                          className={cn(
                            "h-1.5 flex-1 rounded-full",
                            n <= b.val ? "bg-primary" : "bg-border",
                          )}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Gráficos de progresión */}
        {(evaluaciones.length >= 2 || tareas.length > 0) && (
          <div className="grid lg:grid-cols-2 gap-4 mb-10">
            {evaluaciones.length >= 2 && (
              <div className="bg-card border border-border rounded-lg p-5">
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-4">
                  Progresión de notas
                </div>
                <GraficoProgresion evaluaciones={evaluaciones} />
              </div>
            )}
            {tareas.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-5">
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-4">
                  Progreso del plan
                </div>
                <GraficoPlan tareas={tareas} />
              </div>
            )}
          </div>
        )}

        {/* Semanas */}
        <Accordion type="multiple" defaultValue={[`semana-${semanaActual}`]} className="space-y-3">
          {tareasPorSemana.map(([semana, ts]) => {
            const completSem = ts.filter((t) => t.completada).length;
            return (
              <AccordionItem
                key={semana}
                value={`semana-${semana}`}
                className="border border-border rounded-lg bg-card px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-3">
                    <div className="flex items-center gap-3">
                      <span className="font-serif text-lg text-ink">Semana {semana}</span>
                      {semana === semanaActual && (
                        <Badge variant="secondary" className="text-[10px]">
                          Actual
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {completSem}/{ts.length}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-3 pb-2">
                    {ts.map((t) => {
                      const Icon = TIPO_ICON[t.tipo] ?? FileText;
                      const colorCls = t.criterio_objetivo
                        ? (CRITERIO_COLOR[t.criterio_objetivo] ?? CRITERIO_COLOR.global)
                        : CRITERIO_COLOR.global;
                      return (
                        <li
                          key={t.id}
                          className={cn(
                            "flex gap-3 p-3 rounded-md border border-border bg-background transition",
                            t.completada && "opacity-60",
                          )}
                        >
                          <Checkbox
                            checked={!!t.completada}
                            onCheckedChange={() => toggleTarea(t)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span
                                className={cn(
                                  "font-medium text-sm text-ink",
                                  t.completada && "line-through",
                                )}
                              >
                                {t.titulo}
                              </span>
                              {t.criterio_objetivo && (
                                <span
                                  className={cn(
                                    "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border",
                                    colorCls,
                                  )}
                                >
                                  {t.criterio_objetivo}
                                </span>
                              )}
                              <span className="text-[11px] text-muted-foreground tabular-nums ml-auto">
                                {t.duracion_estimada_min} min
                              </span>
                            </div>
                            <p
                              className={cn(
                                "mt-1 text-sm text-foreground/75 leading-relaxed",
                                t.completada && "line-through",
                              )}
                            >
                              {t.descripcion}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Sección clase del profesor */}
        <Card className="mt-10 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-ink text-sm">Clase con profesor</div>
              {perfil?.profesor_id ? (
                <>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Estás vinculado a una clase. Tu profesor puede ver tu historial de evaluaciones.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="mt-3">
                        Abandonar clase
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Abandonar la clase?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tu profesor dejará de tener acceso a tu historial de evaluaciones.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={salirDeClase}>Abandonar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Introduce el código de clase de tu profesor para vincularte. Podrá ver tu
                    historial de evaluaciones.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Input
                      value={codigoInput}
                      onChange={(e) => setCodigoInput(e.target.value.toUpperCase())}
                      placeholder="ABC12345"
                      maxLength={8}
                      className="font-mono w-36 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void unirseAClase();
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => void unirseAClase()}
                      disabled={!codigoInput.trim() || uniendose}
                    >
                      {uniendose ? <Loader2 className="h-4 w-4 animate-spin" /> : "Unirse"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          ¿Quieres practicar fuera del plan?{" "}
          <Link to="/" className="text-primary hover:underline">
            Ir al corrector
          </Link>
        </div>
      </main>
    </div>
  );
}
