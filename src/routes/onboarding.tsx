import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { BookOpen, CalendarIcon, GraduationCap, Languages, Loader2, Sparkles } from "lucide-react";
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
import { COURSES, type CourseKey } from "@/lib/ib-courses";
import { getTextoDiagnostico } from "@/lib/diagnostico";
import { getFunctionErrorMessage } from "@/lib/functionErrors";
import { toast } from "sonner";
import {
  LANDING_FONT_LINK,
  LANDING as L,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Diagnóstico inicial — LIBerico" },
      {
        name: "description",
        content: "Configura tu perfil y recibe un plan de estudio personalizado.",
      },
    ],
    links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }],
  }),
  component: OnboardingPage,
});

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;

// CTA primario reutilizable (índigo + glow), igual que la landing/login
const ctaPrimary = {
  backgroundColor: L.primary,
  color: "#fff",
  boxShadow: "0 16px 30px -12px rgba(79,70,229,0.55)",
} as const;

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
  const { user, loading: authLoading, refreshRol, setCourseKey } = useAuth();
  const navigate = useNavigate();
  const [paso, setPaso] = useState(0); // 0 = selección de rol/curso, 1-3 = flujo alumno
  const [loadingPerfil, setLoadingPerfil] = useState(true);
  const [rolSeleccionado, setRolSeleccionado] = useState(false); // paso 0: muestra selector de curso
  const [courseOnboarding, setCourseOnboarding] = useState<CourseKey>("spanish-a-literature");

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
          navigate({ to: "/" });
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
          { user_id: user.id, rol: "profesor", email: user.email, diagnostico_completado: true },
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
      // Mostrar selector de asignatura antes de continuar
      setRolSeleccionado(true);
    }
  };

  const confirmarAlumnoConCurso = async () => {
    if (!user) return;
    const { error } = await supabase.from("perfiles").upsert(
      {
        user_id: user.id,
        rol: "alumno",
        email: user.email,
        paso_onboarding: 1,
        course_key: courseOnboarding,
      },
      { onConflict: "user_id" },
    );
    if (error) {
      console.error("confirmarAlumnoConCurso error:", error);
      toast.error("Error al guardar el perfil.");
      return;
    }
    // Sincronizar también el contexto de auth (actualiza UI inmediatamente)
    await setCourseKey(courseOnboarding);
    await refreshRol();
    setPaso(1);
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
      const { data, error } = await supabase.functions.invoke("core-study-plan", {});
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { error: perfilErr } = await supabase
        .from("perfiles")
        .update({ diagnostico_completado: true })
        .eq("user_id", user!.id);
      if (perfilErr) throw perfilErr;

      toast.success("Plan generado");
      navigate({ to: "/" });
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
      const textoDiag = getTextoDiagnostico(courseOnboarding);
      const { data, error } = await supabase.functions.invoke("lita-p1-evaluate", {
        body: {
          texto: textoDiag.texto,
          pregunta: textoDiag.pregunta,
          analisis: analisisDiag,
          guardar_historial: false,
          course_key: courseOnboarding,
        },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error, "Error al evaluar."));
      if (data?.error) throw new Error(data.error);
      const ev = data as Evaluacion;

      const { error: perfilErr } = await supabase
        .from("perfiles")
        .update({
          banda_inicial_a: ev.banda_a,
          banda_inicial_b: ev.banda_b,
          banda_inicial_c: ev.banda_c,
          banda_inicial_d: ev.banda_d,
          paso_onboarding: 3,
        })
        .eq("user_id", user!.id);
      if (perfilErr) throw perfilErr;

      toast.success("Diagnóstico evaluado");
      await generarPlan();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al evaluar.");
      setEvaluando(false);
    }
  };

  const saltarDiagnostico = async () => {
    const { error } = await supabase
      .from("perfiles")
      .update({ paso_onboarding: 3 })
      .eq("user_id", user!.id);
    if (error) {
      toast.error("No se pudo actualizar el onboarding.");
      return;
    }
    await generarPlan();
  };

  if (authLoading || !user || loadingPerfil) {
    return (
      <div
        className="flex min-h-screen items-center justify-center gap-2 text-sm"
        style={{ ...fontSans, backgroundColor: L.bg, color: L.muted }}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando…
      </div>
    );
  }

  return (
    <div
      id="onboarding-root"
      className="min-h-screen"
      style={{ ...fontSans, backgroundColor: L.bg, color: L.ink }}
    >
      <style>{`
        #onboarding-root{--primary:${L.primary};--ring:${L.primary};}
        #onboarding-root .lib-press{transition:transform 0.12s cubic-bezier(0.23,1,0.32,1);}
        #onboarding-root .lib-press:active{transform:scale(0.97);}
        #onboarding-root a:focus-visible,#onboarding-root button:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:10px;}
        #onboarding-root button:not([disabled]){cursor:pointer;}
        #onboarding-root .lib-reveal{animation:onbReveal 0.5s cubic-bezier(0.22,1,0.36,1) both;}
        @keyframes onbReveal{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}
        #onboarding-root .onb-card{transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease;}
        #onboarding-root .onb-card:hover{transform:translateY(-2px);box-shadow:0 22px 40px -22px rgba(15,23,42,0.32),0 3px 8px -4px rgba(15,23,42,0.10);}
        @media (prefers-reduced-motion: reduce){
          #onboarding-root .lib-reveal{animation:none !important;}
          #onboarding-root .lib-press{transition:none !important;}
          #onboarding-root .onb-card{transition:none !important;}
          #onboarding-root .onb-card:hover{transform:none !important;}
        }
      `}</style>
      <SiteHeader claro />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        {/* Progress — solo en pasos de alumno */}
        {paso >= 1 && (
          <div className="mb-8">
            <div
              className="mb-2 text-[10px] uppercase tracking-[0.22em]"
              style={{ ...fontMono, color: L.muted }}
            >
              Paso {paso} de 3
            </div>
            <div
              className="h-1 w-full overflow-hidden rounded-full"
              style={{ backgroundColor: L.line }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(paso / 3) * 100}%`,
                  backgroundColor: L.primary,
                }}
              />
            </div>
          </div>
        )}

        {/* Paso 0 — Selección de rol */}
        {paso === 0 && (
          <div className="lib-reveal">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold" style={{ ...headingStyle, color: L.ink }}>
                Bienvenido a L<span style={{ color: L.amber }}>IB</span>erico
              </h1>
              <p className="mt-2" style={{ color: L.muted }}>
                ¿Cómo vas a usar la aplicación?
              </p>
            </div>
            {!rolSeleccionado ? (
              /* ── Paso 0a: elegir rol ── */
              <div className="mx-auto grid max-w-xl gap-4 sm:grid-cols-2">
                <button
                  onClick={() => void elegirRol("alumno")}
                  className="group text-left lib-press"
                >
                  <Card
                    className="onb-card flex h-full flex-col gap-4 rounded-2xl border p-6"
                    style={{
                      backgroundColor: L.surface,
                      borderColor: L.line,
                      boxShadow: cardShadow,
                    }}
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{ backgroundColor: L.primary + "14", color: L.primary }}
                    >
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="font-semibold" style={{ color: L.ink }}>
                        Soy alumno
                      </div>
                      <p className="mt-1 text-sm" style={{ color: L.muted }}>
                        Practica la Prueba 1, recibe correcciones con los criterios del IB y sigue
                        tu plan de estudio personalizado.
                      </p>
                    </div>
                  </Card>
                </button>
                <button
                  onClick={() => void elegirRol("profesor")}
                  className="group text-left lib-press"
                >
                  <Card
                    className="onb-card flex h-full flex-col gap-4 rounded-2xl border p-6"
                    style={{
                      backgroundColor: L.surface,
                      borderColor: L.line,
                      boxShadow: cardShadow,
                    }}
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{ backgroundColor: "#7C3AED14", color: "#7C3AED" }}
                    >
                      <GraduationCap className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="font-semibold" style={{ color: L.ink }}>
                        Soy profesor
                      </div>
                      <p className="mt-1 text-sm" style={{ color: L.muted }}>
                        Gestiona el progreso de tus alumnos, diseña actividades y consulta a Claude
                        sobre criterios, textos y estrategias pedagógicas.
                      </p>
                    </div>
                  </Card>
                </button>
              </div>
            ) : (
              /* ── Paso 0b: elegir asignatura ── */
              <div className="mx-auto max-w-xl space-y-6 lib-reveal">
                <div className="text-center">
                  <p style={{ color: L.muted }}>¿Qué asignatura preparas?</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(Object.keys(COURSES) as CourseKey[]).map((key) => {
                    const selected = courseOnboarding === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setCourseOnboarding(key)}
                        className="group text-left lib-press"
                        aria-pressed={selected}
                      >
                        <Card
                          className="onb-card flex h-full flex-col gap-4 rounded-2xl border p-6"
                          style={{
                            backgroundColor: selected ? L.primary + "0F" : L.surface,
                            borderColor: selected ? L.primary : L.line,
                            boxShadow: selected
                              ? `0 0 0 1px ${L.primary}, ${cardShadow}`
                              : cardShadow,
                          }}
                        >
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-xl"
                            style={{ backgroundColor: L.primary + "14", color: L.primary }}
                          >
                            <Languages className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="font-semibold" style={{ color: L.ink }}>
                              {COURSES[key].label}
                            </div>
                            <p className="mt-1 text-sm" style={{ color: L.muted }}>
                              {key === "spanish-a-literature"
                                ? "Español A: Literatura · IB Nivel Medio / Superior"
                                : "English A: Literature · IB Standard / Higher Level"}
                            </p>
                          </div>
                        </Card>
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setRolSeleccionado(false)}>
                    Atrás
                  </Button>
                  <Button
                    onClick={() => void confirmarAlumnoConCurso()}
                    className="lib-press rounded-2xl"
                    style={{ boxShadow: ctaPrimary.boxShadow }}
                  >
                    Continuar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {paso === 1 && (
          <Card
            className="lib-reveal rounded-2xl border p-6 sm:p-8"
            style={{ backgroundColor: L.surface, borderColor: L.line, boxShadow: cardShadow }}
          >
            <h1 className="text-2xl font-bold" style={{ ...headingStyle, color: L.ink }}>
              Tu contexto
            </h1>
            <p className="mt-1 text-sm" style={{ color: L.muted }}>
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
                <Label>Nota objetivo</Label>
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
              <Button
                onClick={guardarPaso1}
                size="lg"
                className="lib-press rounded-2xl"
                style={{ boxShadow: ctaPrimary.boxShadow }}
              >
                Continuar
              </Button>
            </div>
          </Card>
        )}

        {paso === 2 && (
          <Card
            className="lib-reveal rounded-2xl border p-6 sm:p-8"
            style={{ backgroundColor: L.surface, borderColor: L.line, boxShadow: cardShadow }}
          >
            {(() => {
              const textoDiag = getTextoDiagnostico(courseOnboarding);
              const isENDiag = courseOnboarding === "english-a-literature";
              return (
                <>
                  <h1 className="text-2xl font-bold" style={{ ...headingStyle, color: L.ink }}>
                    {isENDiag ? "Diagnostic analysis" : "Análisis diagnóstico"}
                  </h1>
                  <p className="mt-1 text-sm" style={{ color: L.muted }}>
                    {isENDiag
                      ? "Read the extract and write your analysis. Recommended: 45 minutes. No timer."
                      : "Lee el fragmento y escribe tu análisis. Recomendación: 45 minutos. Sin temporizador obligatorio."}
                  </p>

                  <div
                    className="mt-6 rounded-2xl border p-5"
                    style={{ backgroundColor: L.bg2, borderColor: L.line }}
                  >
                    <div
                      className="text-[10px] uppercase tracking-[0.18em]"
                      style={{ ...fontMono, color: L.muted }}
                    >
                      {textoDiag.titulo} · {textoDiag.autor}
                    </div>
                    <div
                      className="mt-3 whitespace-pre-line font-serif text-[15px] leading-relaxed"
                      style={{ color: L.ink }}
                    >
                      {textoDiag.texto}
                    </div>
                    <div className="mt-4 border-t pt-4" style={{ borderColor: L.line }}>
                      <div
                        className="mb-1 text-[10px] uppercase tracking-[0.18em]"
                        style={{ ...fontMono, color: L.muted }}
                      >
                        {isENDiag ? "Guiding question" : "Pregunta de orientación"}
                      </div>
                      <p className="text-sm" style={{ color: L.ink }}>
                        {textoDiag.pregunta}
                      </p>
                    </div>
                  </div>
                </>
              );
            })()}

            <div className="mt-6 space-y-1.5">
              <Label htmlFor="analisis-diag">
                {courseOnboarding === "english-a-literature" ? "Your analysis" : "Tu análisis"}
              </Label>
              <Textarea
                id="analisis-diag"
                value={analisisDiag}
                onChange={(e) => setAnalisisDiag(e.target.value)}
                rows={12}
                placeholder={
                  courseOnboarding === "english-a-literature"
                    ? "Develop your analytical commentary…"
                    : "Desarrolla tu comentario analítico…"
                }
                className="text-[15px] leading-relaxed resize-y min-h-[280px]"
              />
            </div>

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
              <Button variant="ghost" onClick={saltarDiagnostico} disabled={evaluando}>
                Saltar análisis diagnóstico
              </Button>
              <Button
                onClick={enviarDiagnostico}
                disabled={evaluando}
                size="lg"
                className="lib-press rounded-2xl"
                style={{ boxShadow: ctaPrimary.boxShadow }}
              >
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
            <p className="mt-3 text-center text-xs sm:text-right" style={{ color: L.muted }}>
              Si saltas el diagnóstico, tu plan será marcado como preliminar.
            </p>
          </Card>
        )}

        {paso === 3 && (
          <Card
            className="lib-reveal rounded-2xl border p-10 text-center"
            style={{ backgroundColor: L.surface, borderColor: L.line, boxShadow: cardShadow }}
          >
            <Loader2 className="mx-auto h-10 w-10 animate-spin" style={{ color: L.primary }} />
            <h2 className="mt-6 text-2xl font-bold" style={{ ...headingStyle, color: L.ink }}>
              Generando tu plan personalizado…
            </h2>
            <p className="mt-2 text-sm" style={{ color: L.muted }}>
              Estamos diseñando una hoja de ruta a tu medida. Esto puede tardar unos segundos.
            </p>
            {!generandoPlan && (
              <Button
                className="lib-press mt-6 rounded-2xl"
                onClick={generarPlan}
                style={{ boxShadow: ctaPrimary.boxShadow }}
              >
                Reintentar
              </Button>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
