import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { BookOpen, CalendarIcon, GraduationCap, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { CRITERIOS, type Evaluacion } from "@/lib/ib";
import { TEXTO_DIAGNOSTICO } from "@/lib/diagnostico";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Diagnóstico inicial — IB Literatura" },
      {
        name: "description",
        content: "Configura tu perfil y recibe un plan de estudio personalizado.",
      },
    ],
  }),
  component: OnboardingPage,
});

const MOVIMIENTOS = [
  "Renacimiento",
  "Barroco",
  "Romanticismo",
  "Realismo",
  "Modernismo",
  "Generación del 27",
  "Boom latinoamericano",
  "Posguerra",
  "Contemporáneo",
];

const GENEROS = ["prosa narrativa", "poesía", "teatro"];

function OnboardingPage() {
  const { user, loading: authLoading, refreshRol } = useAuth();
  const navigate = useNavigate();
  const [paso, setPaso] = useState(0); // 0 = selección de rol, 1-3 = flujo alumno
  const [loadingPerfil, setLoadingPerfil] = useState(true);

  // Paso 1
  const [fechaExamen, setFechaExamen] = useState<Date | undefined>();
  const [horas, setHoras] = useState(5);
  const [confA, setConfA] = useState(3);
  const [confB, setConfB] = useState(3);
  const [confC, setConfC] = useState(3);
  const [confD, setConfD] = useState(3);
  const [movimientos, setMovimientos] = useState<string[]>([]);
  const [generos, setGeneros] = useState<string[]>([]);
  const [notaObjetivo, setNotaObjetivo] = useState(6);

  // Paso 2
  const [analisisDiag, setAnalisisDiag] = useState("");
  const [evaluando, setEvaluando] = useState(false);

  // Paso 3
  const [generandoPlan, setGenerandoPlan] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  // Cargar perfil parcial existente
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("perfiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        // Profesor con perfil → panel del profesor
        if ((data as { rol?: string }).rol === "profesor") {
          navigate({ to: "/profesor" });
          return;
        }
        // Alumno que ya completó el onboarding → plan
        if (data.diagnostico_completado) {
          navigate({ to: "/mi-plan" });
          return;
        }
        // Alumno con onboarding parcial → restaurar paso (mínimo 1)
        if (data.fecha_examen) setFechaExamen(new Date(data.fecha_examen));
        if (data.horas_semanales) setHoras(data.horas_semanales);
        if (data.confianza_a) setConfA(data.confianza_a);
        if (data.confianza_b) setConfB(data.confianza_b);
        if (data.confianza_c) setConfC(data.confianza_c);
        if (data.confianza_d) setConfD(data.confianza_d);
        if (data.movimientos_conocidos) setMovimientos(data.movimientos_conocidos);
        if (data.generos_comodos) setGeneros(data.generos_comodos);
        if (data.nota_objetivo) setNotaObjetivo(data.nota_objetivo);
        setPaso(data.paso_onboarding ?? 1);
      }
      // Sin perfil → paso 0 (selección de rol)
      setLoadingPerfil(false);
    })();
  }, [user, navigate]);

  const toggleArr = (arr: string[], setter: (v: string[]) => void, val: string) => {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const elegirRol = async (rol: "alumno" | "profesor") => {
    if (!user) return;
    if (rol === "profesor") {
      const { error } = await supabase
        .from("perfiles")
        .upsert(
          { user_id: user.id, rol: "profesor", diagnostico_completado: true },
          { onConflict: "user_id" },
        );
      if (error) {
        console.error("elegirRol profesor error:", error);
        toast.error("Error al guardar el perfil.");
        return;
      }
      await refreshRol();
      navigate({ to: "/profesor" });
    } else {
      const { error } = await supabase
        .from("perfiles")
        .upsert({ user_id: user.id, rol: "alumno", paso_onboarding: 1 }, { onConflict: "user_id" });
      if (error) {
        console.error("elegirRol alumno error:", error);
        toast.error("Error al guardar el perfil.");
        return;
      }
      await refreshRol();
      setPaso(1);
    }
  };

  const guardarPaso1 = async (): Promise<boolean> => {
    if (!user || !fechaExamen) {
      toast.error("La fecha del examen es obligatoria.");
      return false;
    }
    const { error } = await supabase.from("perfiles").upsert(
      {
        user_id: user.id,
        fecha_examen: format(fechaExamen, "yyyy-MM-dd"),
        horas_semanales: horas,
        confianza_a: confA,
        confianza_b: confB,
        confianza_c: confC,
        confianza_d: confD,
        movimientos_conocidos: movimientos,
        generos_comodos: generos,
        nota_objetivo: notaObjetivo,
        paso_onboarding: 2,
      },
      { onConflict: "user_id" },
    );
    if (error) {
      toast.error("Error al guardar tu perfil.");
      console.error(error);
      return false;
    }
    setPaso(2);
    return true;
  };

  const generarPlan = async () => {
    setPaso(3);
    setGenerandoPlan(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-study-plan", {});
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await supabase
        .from("perfiles")
        .update({ diagnostico_completado: true })
        .eq("user_id", user!.id);

      toast.success("Plan generado");
      navigate({ to: "/mi-plan" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error generando el plan.");
      setGenerandoPlan(false);
      setPaso(2);
    }
  };

  const enviarDiagnostico = async () => {
    if (!analisisDiag.trim() || analisisDiag.trim().length < 100) {
      toast.error("Escribe un análisis más completo (mínimo 100 caracteres).");
      return;
    }
    setEvaluando(true);
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-analysis", {
        body: {
          texto: TEXTO_DIAGNOSTICO.texto,
          pregunta: TEXTO_DIAGNOSTICO.pregunta,
          analisis: analisisDiag,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const ev = data as Evaluacion;

      await supabase
        .from("perfiles")
        .update({
          banda_inicial_a: ev.banda_a,
          banda_inicial_b: ev.banda_b,
          banda_inicial_c: ev.banda_c,
          banda_inicial_d: ev.banda_d,
          paso_onboarding: 3,
        })
        .eq("user_id", user!.id);

      toast.success("Diagnóstico evaluado");
      await generarPlan();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al evaluar.");
      setEvaluando(false);
    }
  };

  const saltarDiagnostico = async () => {
    await supabase.from("perfiles").update({ paso_onboarding: 3 }).eq("user_id", user!.id);
    await generarPlan();
  };

  if (authLoading || !user || loadingPerfil) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        {/* Progress — solo en pasos de alumno */}
        {paso >= 1 && (
          <div className="mb-8">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
              Paso {paso} de 3
            </div>
            <div className="h-1 w-full bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(paso / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Paso 0 — Selección de rol */}
        {paso === 0 && (
          <div>
            <div className="mb-8 text-center">
              <h1 className="font-serif text-3xl text-ink">Bienvenido a IB Literatura</h1>
              <p className="text-muted-foreground mt-2">¿Cómo vas a usar la aplicación?</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto">
              <button onClick={() => void elegirRol("alumno")} className="group text-left">
                <Card className="p-6 h-full flex flex-col gap-4 hover:border-primary/50 hover:bg-accent/20 transition-colors">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-semibold text-ink">Soy alumno</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Practica la Prueba 1, recibe correcciones con los criterios del IB y sigue tu
                      plan de estudio personalizado.
                    </p>
                  </div>
                </Card>
              </button>
              <button onClick={() => void elegirRol("profesor")} className="group text-left">
                <Card className="p-6 h-full flex flex-col gap-4 hover:border-primary/50 hover:bg-accent/20 transition-colors">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-semibold text-ink">Soy profesor</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Gestiona el progreso de tus alumnos, diseña actividades y consulta a Claude
                      sobre criterios, textos y estrategias pedagógicas.
                    </p>
                  </div>
                </Card>
              </button>
            </div>
          </div>
        )}

        {paso === 1 && (
          <Card className="p-6 sm:p-8">
            <h1 className="font-serif text-2xl text-ink">Tu contexto</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Cuéntanos sobre ti para diseñar el plan más adecuado.
            </p>

            <div className="mt-6 space-y-6">
              {/* Fecha examen */}
              <div className="space-y-1.5">
                <Label>Fecha del examen IB *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fechaExamen && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="h-4 w-4" />
                      {fechaExamen ? format(fechaExamen, "PPP") : "Selecciona una fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fechaExamen}
                      onSelect={setFechaExamen}
                      disabled={(d) => d < new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Horas */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Horas semanales que puedes dedicar</Label>
                  <span className="text-sm font-medium text-ink">{horas} h</span>
                </div>
                <Slider
                  value={[horas]}
                  onValueChange={(v) => setHoras(v[0])}
                  min={1}
                  max={15}
                  step={1}
                />
              </div>

              {/* Confianza por criterio */}
              <div className="space-y-3">
                <Label>
                  Tu nivel autopercibido por criterio (1 = ninguna confianza, 5 = muy seguro)
                </Label>
                {CRITERIOS.map((c) => {
                  const val = { a: confA, b: confB, c: confC, d: confD }[c.key];
                  const setter = { a: setConfA, b: setConfB, c: setConfC, d: setConfD }[c.key];
                  return (
                    <div key={c.key} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                      <span className="text-sm text-foreground/80 w-44">
                        <span className="font-semibold">{c.letra}.</span> {c.nombre}
                      </span>
                      <Slider
                        value={[val]}
                        onValueChange={(v) => setter(v[0])}
                        min={1}
                        max={5}
                        step={1}
                      />
                      <span className="text-sm tabular-nums w-6 text-right">{val}</span>
                    </div>
                  );
                })}
              </div>

              {/* Movimientos */}
              <div className="space-y-2">
                <Label>Movimientos literarios que ya conoces</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MOVIMIENTOS.map((m) => (
                    <label
                      key={m}
                      className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-accent"
                    >
                      <Checkbox
                        checked={movimientos.includes(m)}
                        onCheckedChange={() => toggleArr(movimientos, setMovimientos, m)}
                      />
                      {m}
                    </label>
                  ))}
                </div>
              </div>

              {/* Géneros */}
              <div className="space-y-2">
                <Label>Géneros con los que te sientes cómodo/a</Label>
                <div className="grid grid-cols-3 gap-2">
                  {GENEROS.map((g) => (
                    <label
                      key={g}
                      className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-accent capitalize"
                    >
                      <Checkbox
                        checked={generos.includes(g)}
                        onCheckedChange={() => toggleArr(generos, setGeneros, g)}
                      />
                      {g}
                    </label>
                  ))}
                </div>
              </div>

              {/* Nota objetivo */}
              <div className="space-y-1.5">
                <Label>Nota IB objetivo</Label>
                <Select
                  value={String(notaObjetivo)}
                  onValueChange={(v) => setNotaObjetivo(Number(v))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[4, 5, 6, 7].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button onClick={guardarPaso1} size="lg">
                Continuar
              </Button>
            </div>
          </Card>
        )}

        {paso === 2 && (
          <Card className="p-6 sm:p-8">
            <h1 className="font-serif text-2xl text-ink">Análisis diagnóstico</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Lee el fragmento y escribe tu análisis. Recomendación: 45 minutos. Sin temporizador
              obligatorio.
            </p>

            <div className="mt-6 p-5 bg-parchment rounded-md border border-border">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {TEXTO_DIAGNOSTICO.titulo} · {TEXTO_DIAGNOSTICO.autor}
              </div>
              <div className="mt-3 font-serif text-[15px] leading-relaxed text-ink whitespace-pre-line">
                {TEXTO_DIAGNOSTICO.texto}
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                  Pregunta de orientación
                </div>
                <p className="text-sm text-foreground/90">{TEXTO_DIAGNOSTICO.pregunta}</p>
              </div>
            </div>

            <div className="mt-6 space-y-1.5">
              <Label htmlFor="analisis-diag">Tu análisis</Label>
              <Textarea
                id="analisis-diag"
                value={analisisDiag}
                onChange={(e) => setAnalisisDiag(e.target.value)}
                rows={12}
                placeholder="Desarrolla tu comentario analítico…"
                className="text-[15px] leading-relaxed resize-y min-h-[280px]"
              />
            </div>

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
              <Button variant="ghost" onClick={saltarDiagnostico} disabled={evaluando}>
                Saltar análisis diagnóstico
              </Button>
              <Button onClick={enviarDiagnostico} disabled={evaluando} size="lg">
                {evaluando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Evaluando…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Enviar y generar plan
                  </>
                )}
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground text-center sm:text-right">
              Si saltas el diagnóstico, tu plan será marcado como preliminar.
            </p>
          </Card>
        )}

        {paso === 3 && (
          <Card className="p-10 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <h2 className="mt-6 font-serif text-2xl text-ink">Generando tu plan personalizado…</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Estamos diseñando una hoja de ruta a tu medida. Esto puede tardar unos segundos.
            </p>
            {!generandoPlan && (
              <Button className="mt-6" onClick={generarPlan}>
                Reintentar
              </Button>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
