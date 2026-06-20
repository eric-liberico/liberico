import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { supabase } from "@/integrations/supabase/client";
import { CreditCostBadge } from "@/components/CreditGate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AvatarProfesor } from "@/components/AvatarProfesor";
import { EvaluacionOralPanel } from "@/components/EvaluacionOralPanel";
import { JuegoEsperaEvaluacion } from "@/components/JuegoEsperaEvaluacion";
import type { EvaluacionOral, TipoOral, TipoObraOral } from "@/lib/ib-oral";
import { getObraTipoOpciones } from "@/lib/ib-courses";
import { getFunctionErrorMessage } from "@/lib/functionErrors";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LANDING_FONT_LINK,
  LANDING as L,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";

const headingStyle = { ...fontSans, letterSpacing: "0" } as const;
const ctaGlow = { boxShadow: "0 16px 30px -12px rgba(79,70,229,0.55)" } as const;
const cardStyle = {
  backgroundColor: L.surface,
  borderColor: L.line,
  boxShadow: cardShadow,
  color: L.ink,
} as const;
const warmCardStyle = {
  backgroundColor: L.bg2,
  borderColor: L.line,
  color: L.ink,
} as const;
const eyebrowMono = { ...fontMono, color: L.muted } as const;

const scopedCss = `
  #simular-oral-root{--primary:${L.primary};--ring:${L.primary};}
  #simular-oral-root .lib-press{transition:transform 0.12s cubic-bezier(0.23,1,0.32,1);}
  #simular-oral-root .lib-press:active{transform:scale(0.97);}
  #simular-oral-root .lib-reveal{animation:simOralReveal 0.28s cubic-bezier(0.23,1,0.32,1) both;}
  #simular-oral-root a:focus-visible,#simular-oral-root button:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:10px;}
  #simular-oral-root button:not([disabled]){cursor:pointer;}
  @keyframes simOralReveal{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}
  @media (prefers-reduced-motion: reduce){
    #simular-oral-root .lib-reveal{animation:none !important;}
    #simular-oral-root .lib-press{transition:none !important;}
  }
`;

export const Route = createFileRoute("/simular-oral")({
  head: () => ({
    meta: [
      { title: "LIBerico — Individual Oral Simulator" },
      {
        name: "description",
        content:
          "Practice your Literature Individual Oral with an AI evaluator. Supports teacher-assessed and school-supported self-taught formats.",
      },
    ],
    links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }],
  }),
  component: SimularOralPage,
});

// ── Tipos locales ─────────────────────────────────────────────────────────────

type FaseSimulacion = "configurar" | "fase1" | "transicion" | "fase2" | "procesando" | "resultado";

type ModoAgente = "inactivo" | "escuchando" | "hablando";

interface Mensaje {
  source: "ai" | "user";
  text: string;
  fase: 1 | 2;
}

// Interfaz mínima del objeto Conversation de @11labs/client
interface ConvSession {
  endSession: () => Promise<void>;
}

function fmtTiempo(seg: number): string {
  const m = Math.floor(seg / 60)
    .toString()
    .padStart(2, "0");
  const s = (seg % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── Componente principal ──────────────────────────────────────────────────────

function SimularOralPage() {
  const { user, loading: authLoading, rol, courseKey } = useAuth();
  const isEN = useUiLang() === "en";
  const navigate = useNavigate();
  const obraTipoOpciones = getObraTipoOpciones(isEN);

  // ─ Formulario de configuración ─
  const [tipoOral, setTipoOral] = useState<TipoOral>("taught");
  const [asuntoGlobal, setAsuntoGlobal] = useState("");
  const [obra1Titulo, setObra1Titulo] = useState("");
  const [obra1Autor, setObra1Autor] = useState("");
  const [obra1Tipo, setObra1Tipo] = useState<TipoObraOral>("original_language");
  const [extracto1, setExtracto1] = useState("");
  const [obra2Titulo, setObra2Titulo] = useState("");
  const [obra2Autor, setObra2Autor] = useState("");
  const [obra2Tipo, setObra2Tipo] = useState<TipoObraOral>("in_translation");
  const [extracto2, setExtracto2] = useState("");
  const [notasObra1, setNotasObra1] = useState("");
  const [notasObra2, setNotasObra2] = useState("");

  // ─ Estado de simulación ─
  const [fase, setFase] = useState<FaseSimulacion>("configurar");
  const [modoAgente, setModoAgente] = useState<ModoAgente>("inactivo");
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [evaluacion, setEvaluacion] = useState<EvaluacionOral | null>(null);
  const [errorSim, setErrorSim] = useState<string | null>(null);
  const [iniciando, setIniciando] = useState(false);
  const [tiempoSegundos, setTiempoSegundos] = useState(0);

  // Refs para mantener valores actualizados en callbacks de ElevenLabs
  const convRef = useRef<ConvSession | null>(null);
  const mensajesRef = useRef<Mensaje[]>([]);
  const faseNumRef = useRef<1 | 2>(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // ─ Auth guard ─
  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate({ to: "/login" });
    if (rol === "profesor") navigate({ to: "/profesor" });
  }, [user, authLoading, rol, navigate]);

  // ─ Scroll automático al último mensaje ─
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  // ─ Cleanup al desmontar ─
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      convRef.current?.endSession().catch(() => {});
    };
  }, []);

  // ─ Timer ─
  const iniciarTimer = () => {
    setTiempoSegundos(0);
    timerRef.current = setInterval(() => {
      setTiempoSegundos((t) => t + 1);
    }, 1000);
  };

  const detenerTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  // ─ Iniciar una fase de la simulación ─
  const iniciarFase = async (faseNum: 1 | 2, transcripcionFase1 = "") => {
    setErrorSim(null);
    setIniciando(true);
    faseNumRef.current = faseNum;

    const { data, error: fnError } = await supabase.functions.invoke(
      "create-oral-simulation-session",
      {
        body: {
          fase: faseNum,
          tipo_oral: tipoOral,
          asunto_global: asuntoGlobal,
          obra1_titulo: obra1Titulo,
          obra1_autor: obra1Autor,
          obra1_tipo: obra1Tipo,
          extracto_1: extracto1,
          obra2_titulo: obra2Titulo,
          obra2_autor: obra2Autor,
          obra2_tipo: obra2Tipo,
          extracto_2: extracto2,
          transcripcion_fase1: transcripcionFase1,
          course_key: courseKey,
        },
      },
    );

    if (fnError || !data?.signed_url) {
      const msg = await getFunctionErrorMessage(
        fnError,
        isEN ? "Could not start the simulation." : "No se pudo iniciar la simulación.",
      );
      setErrorSim(msg);
      setIniciando(false);
      setFase("configurar");
      return;
    }

    // Importación dinámica para evitar problemas con SSR
    let Conversation: {
      startSession: (config: {
        signedUrl: string;
        onMessage?: (p: { message: string; source: "ai" | "user" }) => void;
        onStatusChange?: (p: { status: string }) => void;
        onModeChange?: (p: unknown) => void;
        onError?: (e: unknown) => void;
      }) => Promise<ConvSession>;
    };
    try {
      const mod = await import("@11labs/client");
      Conversation = mod.Conversation as typeof Conversation;
    } catch {
      setErrorSim(
        isEN
          ? "Could not load the simulation module."
          : "No se pudo cargar el módulo de simulación.",
      );
      setIniciando(false);
      setFase("configurar");
      return;
    }

    try {
      const conv = await Conversation.startSession({
        signedUrl: data.signed_url,

        onMessage: ({ message, source }) => {
          const msg: Mensaje = {
            source,
            text: message,
            fase: faseNumRef.current,
          };
          mensajesRef.current = [...mensajesRef.current, msg];
          setMensajes((prev) => [...prev, msg]);
        },

        onStatusChange: ({ status }) => {
          if (status === "connected") {
            setFase(faseNum === 1 ? "fase1" : "fase2");
            setIniciando(false);
            iniciarTimer();
          } else if (status === "disconnected") {
            setModoAgente("inactivo");
          }
        },

        onModeChange: (p) => {
          // @11labs/client devuelve { mode: { mode: "listening" | "speaking" } }
          const modo = (p as { mode?: { mode?: string } })?.mode?.mode;
          if (modo === "speaking") setModoAgente("hablando");
          else setModoAgente("escuchando");
        },

        onError: (e) => {
          console.error("ElevenLabs error:", e);
          setErrorSim(
            isEN
              ? "Lost connection with the evaluator. Try again."
              : "Se ha perdido la conexión con el evaluador. Inténtalo de nuevo.",
          );
          setFase("configurar");
          detenerTimer();
        },
      });

      convRef.current = conv;
    } catch (e) {
      console.error("startSession error:", e);
      setErrorSim(
        isEN
          ? "Could not connect with the evaluator. Check that your microphone is available."
          : "No se pudo conectar con el evaluador. Comprueba que el micrófono esté disponible.",
      );
      setIniciando(false);
      setFase("configurar");
    }
  };

  // ─ Terminar la presentación (Fase 1 → Fase 2) ─
  const terminarFase1 = async () => {
    detenerTimer();
    await convRef.current?.endSession().catch(() => {});
    convRef.current = null;
    setModoAgente("inactivo");

    // Construir transcripción de la presentación (solo palabras del alumno)
    const transcripcionFase1 = mensajesRef.current
      .filter((m) => m.source === "user" && m.fase === 1)
      .map((m) => m.text)
      .join("\n\n");

    if (tipoOral === "self_taught") {
      await finalizarSimulacion();
      return;
    }

    setFase("transicion");
    setTimeout(() => iniciarFase(2, transcripcionFase1), 1500);
  };

  // ─ Finalizar la sesión → evaluación ─
  const finalizarSimulacion = async () => {
    detenerTimer();
    await convRef.current?.endSession().catch(() => {});
    convRef.current = null;
    setFase("procesando");
    setModoAgente("inactivo");

    // Reunir todo lo que dijo el alumno en ambas fases
    const guionOral = mensajesRef.current
      .filter((m) => m.source === "user")
      .map((m) => m.text)
      .join("\n\n");

    if (!guionOral.trim()) {
      toast.error(
        isEN
          ? "Not enough audio was recorded to evaluate. Try again."
          : "No se recogió suficiente audio para evaluar. Inténtalo de nuevo.",
      );
      setFase("configurar");
      return;
    }

    const { data, error: fnError } = await supabase.functions.invoke("evaluate-oral", {
      body: {
        guion_oral: guionOral,
        tipo_oral: tipoOral,
        asunto_global: asuntoGlobal,
        obra_1_titulo: obra1Titulo,
        obra_1_autor: obra1Autor,
        obra_1_tipo: obra1Tipo,
        extracto_1: extracto1,
        notas_obra_1: notasObra1,
        obra_2_titulo: obra2Titulo,
        obra_2_autor: obra2Autor,
        obra_2_tipo: obra2Tipo,
        extracto_2: extracto2,
        notas_obra_2: notasObra2,
        es_simulacion: true,
        course_key: courseKey,
      },
    });

    if (fnError || !data) {
      const msg = await getFunctionErrorMessage(
        fnError,
        isEN ? "Could not process the evaluation." : "No se pudo procesar la evaluación.",
      );
      toast.error(msg);
      setFase(tipoOral === "taught" ? "fase2" : "configurar");
      return;
    }

    setEvaluacion(data as EvaluacionOral);
    setFase("resultado");
  };

  // ─ Cancelar y volver al formulario ─
  const cancelar = async () => {
    detenerTimer();
    await convRef.current?.endSession().catch(() => {});
    convRef.current = null;
    setFase("configurar");
    setMensajes([]);
    mensajesRef.current = [];
    setModoAgente("inactivo");
    setTiempoSegundos(0);
  };

  // ─ Wizard de configuración ─
  const [pasoSetup, setPasoSetup] = useState<1 | 2 | 3>(1);

  const paso2Valido =
    !!obra1Titulo.trim() &&
    !!obra1Autor.trim() &&
    extracto1.trim().length >= 20 &&
    !!obra2Titulo.trim() &&
    !!obra2Autor.trim() &&
    extracto2.trim().length >= 20;

  const formValido = paso2Valido && asuntoGlobal.trim().length >= 10;

  // ═════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════════

  if (authLoading) {
    return (
      <div
        id="simular-oral-root"
        className="flex min-h-screen items-center justify-center"
        style={{ ...fontSans, backgroundColor: L.bg, color: L.ink }}
      >
        <style>{scopedCss}</style>
        <div className="flex flex-col items-center gap-3" style={{ color: L.muted }}>
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm">{isEN ? "Loading…" : "Cargando…"}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      id="simular-oral-root"
      className="min-h-screen"
      style={{ ...fontSans, backgroundColor: L.bg, color: L.ink }}
    >
      <style>{scopedCss}</style>
      <SiteHeader claro />

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
          style={{ color: L.muted }}
        >
          <ArrowLeft className="h-4 w-4" />
          {isEN ? "Home" : "Inicio"}
        </Link>

        {/* ── FASE: configurar (wizard 3 pasos) ── */}
        {fase === "configurar" && (
          <>
            {/* Encabezado + indicador de paso */}
            <div className="lib-reveal space-y-2">
              <div
                className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em]"
                style={eyebrowMono}
              >
                <Mic className="h-3.5 w-3.5" />
                {isEN ? "Live practice" : "Práctica en vivo"}
              </div>
              <h1
                className="text-3xl leading-tight font-bold sm:text-4xl"
                style={{ ...headingStyle, color: L.ink }}
              >
                {isEN ? "Individual Oral Simulator" : "Simulador de Oral Individual"}
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed" style={{ color: L.muted }}>
                {isEN
                  ? "Practice with an AI evaluator. Choose teacher-assessed mode for a 10-minute presentation plus questions, or self-taught mode for a continuous 15-minute oral."
                  : "Practica con un evaluador de IA. Elige la modalidad con profesor para una exposición de 10 minutos con preguntas, o la autodidacta para un oral continuo de 15 minutos."}
              </p>
            </div>

            {/* Barra de pasos */}
            <div className="lib-reveal flex flex-wrap items-center gap-2 text-xs">
              {(
                [
                  { n: 1, label: isEN ? "Mode" : "Modalidad" },
                  { n: 2, label: isEN ? "Works" : "Obras" },
                  { n: 3, label: isEN ? "Topic + start" : "Asunto + iniciar" },
                ] as const
              ).map(({ n, label }) => (
                <div key={n} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                      pasoSetup === n ? "text-white" : pasoSetup > n ? "border" : "border",
                    )}
                    style={{
                      ...fontMono,
                      backgroundColor: pasoSetup === n ? L.primary : L.surface,
                      borderColor: pasoSetup > n ? L.primary + "55" : L.line,
                      color: pasoSetup === n ? "#fff" : pasoSetup > n ? L.primary : L.muted,
                    }}
                  >
                    {pasoSetup > n ? <CheckCircle2 className="h-3.5 w-3.5" /> : n}
                  </div>
                  <span
                    className={pasoSetup === n ? "font-medium" : undefined}
                    style={{ color: pasoSetup === n ? L.ink : L.muted }}
                  >
                    {label}
                  </span>
                  {n < 3 && (
                    <span className="mx-1" style={{ color: L.muted + "66" }}>
                      ›
                    </span>
                  )}
                </div>
              ))}
            </div>

            {errorSim && (
              <div
                className="lib-reveal flex items-start gap-2 rounded-2xl border p-3 text-sm"
                style={{ backgroundColor: "#FEF2F2", borderColor: "#FCA5A5", color: "#B91C1C" }}
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {errorSim}
              </div>
            )}

            {/* ── Paso 1: Modalidad ── */}
            {pasoSetup === 1 && (
              <Card className="lib-reveal space-y-6 rounded-2xl border p-5" style={cardStyle}>
                <div className="space-y-2">
                  <Label className="font-semibold">
                    {isEN ? "How will you present your oral?" : "¿Cómo harás el oral?"}
                  </Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(["taught", "self_taught"] as TipoOral[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTipoOral(t)}
                        className={cn(
                          "lib-press rounded-2xl border p-4 text-left transition-colors hover:opacity-95",
                          tipoOral === t ? "ring-1" : "",
                        )}
                        style={{
                          backgroundColor: tipoOral === t ? L.primary + "0F" : L.bg2,
                          borderColor: tipoOral === t ? L.primary + "66" : L.line,
                          color: L.ink,
                          boxShadow:
                            tipoOral === t ? "0 12px 24px -18px rgba(79,70,229,0.5)" : "none",
                        }}
                      >
                        <p className="font-semibold text-sm">
                          {t === "taught"
                            ? isEN
                              ? "Taught"
                              : "Con profesor"
                            : isEN
                              ? "School-supported self-taught"
                              : "Aprendizaje autodidacta con apoyo del colegio"}
                        </p>
                        <p className="mt-1 text-xs" style={{ color: L.muted }}>
                          {t === "taught"
                            ? isEN
                              ? "10 min presentation + 5 min of teacher questions."
                              : "10 min de presentación + 5 min de preguntas del profesor."
                            : isEN
                              ? "15 min continuous presentation without teacher questions."
                              : "15 min de exposición continua, sin preguntas del profesor."}
                        </p>
                        <p className="mt-2 text-[11px]" style={{ color: L.primary }}>
                          {t === "taught"
                            ? isEN
                              ? "We'll include likely teacher questions."
                              : "Incluiremos preguntas probables del profesor."
                            : isEN
                              ? "We'll highlight areas you should develop in your 15 min."
                              : "Señalaremos zonas que debes desarrollar en tus 15 min."}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() => setPasoSetup(2)}
                    className="lib-press gap-2 rounded-2xl"
                    style={ctaGlow}
                  >
                    {isEN ? "Next — Works" : "Siguiente — Obras"}
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )}

            {/* ── Paso 2: Obras ── */}
            {pasoSetup === 2 && (
              <Card className="lib-reveal space-y-6 rounded-2xl border p-5" style={cardStyle}>
                {(["1", "2"] as const).map((n) => {
                  const titulo = n === "1" ? obra1Titulo : obra2Titulo;
                  const setTitulo = n === "1" ? setObra1Titulo : setObra2Titulo;
                  const autor = n === "1" ? obra1Autor : obra2Autor;
                  const setAutor = n === "1" ? setObra1Autor : setObra2Autor;
                  const tipoObra = n === "1" ? obra1Tipo : obra2Tipo;
                  const setTipoObra = n === "1" ? setObra1Tipo : setObra2Tipo;
                  const extracto = n === "1" ? extracto1 : extracto2;
                  const setExtracto = n === "1" ? setExtracto1 : setExtracto2;
                  const notas = n === "1" ? notasObra1 : notasObra2;
                  const setNotas = n === "1" ? setNotasObra1 : setNotasObra2;

                  return (
                    <div key={n} className="space-y-3 rounded-2xl border p-4" style={warmCardStyle}>
                      <p
                        className="text-xs font-semibold uppercase tracking-wider"
                        style={eyebrowMono}
                      >
                        {isEN ? "Work" : "Obra"} {n}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">{isEN ? "Title" : "Título"}</Label>
                          <Input
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            placeholder={isEN ? "Work title" : "Título de la obra"}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{isEN ? "Author" : "Autor/a"}</Label>
                          <Input
                            value={autor}
                            onChange={(e) => setAutor(e.target.value)}
                            placeholder={isEN ? "Author name" : "Nombre del autor/a"}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{isEN ? "Work type" : "Tipo de obra"}</Label>
                        <Select
                          value={tipoObra}
                          onValueChange={(v) => setTipoObra(v as TipoObraOral)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {obraTipoOpciones.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          {isEN ? "Chosen extract" : "Extracto elegido"}
                        </Label>
                        <p className="text-[11px]" style={{ color: L.muted }}>
                          {isEN
                            ? "Paste the literary excerpt you will analyze in the oral."
                            : "Pega el fragmento literario sobre el que vas a hablar en el oral."}
                        </p>
                        <Textarea
                          value={extracto}
                          onChange={(e) => setExtracto(e.target.value)}
                          placeholder={
                            isEN
                              ? "Paste the literary excerpt here…"
                              : "Pega aquí el fragmento literario…"
                          }
                          rows={4}
                          className="resize-none text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          {isEN ? "Personal notes" : "Notas personales"}{" "}
                          <span className="font-normal" style={{ color: L.muted }}>
                            {isEN ? "(optional)" : "(opcional)"}
                          </span>
                        </Label>
                        <Textarea
                          value={notas}
                          onChange={(e) => setNotas(e.target.value)}
                          placeholder={
                            isEN
                              ? "Ideas, resources, arguments you want to mention…"
                              : "Ideas, recursos, argumentos que quieras mencionar…"
                          }
                          rows={2}
                          className="resize-none text-sm"
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="flex justify-between gap-2">
                  <Button variant="outline" onClick={() => setPasoSetup(1)}>
                    {isEN ? "← Back" : "← Anterior"}
                  </Button>
                  <Button
                    onClick={() => setPasoSetup(3)}
                    disabled={!paso2Valido}
                    className="lib-press gap-2 rounded-2xl"
                    style={ctaGlow}
                  >
                    {isEN ? "Next — Topic" : "Siguiente — Asunto"}
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )}

            {/* ── Paso 3: Asunto + checklist + iniciar ── */}
            {pasoSetup === 3 && (
              <Card className="lib-reveal space-y-6 rounded-2xl border p-5" style={cardStyle}>
                <div className="space-y-1.5">
                  <Label htmlFor="asunto" className="font-semibold">
                    {isEN ? "Global issue" : "Asunto global"}
                  </Label>
                  <p className="text-xs" style={{ color: L.muted }}>
                    {isEN
                      ? "The central idea that connects the two works. It should be specific and debatable."
                      : "La idea central que conecta las dos obras. Debe ser específico y debatible."}
                  </p>
                  <Input
                    id="asunto"
                    value={asuntoGlobal}
                    onChange={(e) => setAsuntoGlobal(e.target.value)}
                    placeholder={
                      isEN
                        ? "E.g.: The tension between individual ambition and societal expectation"
                        : "Ej.: El desencanto ante el ideal romántico como motor del conflicto"
                    }
                  />
                </div>

                <div
                  className="space-y-2 rounded-2xl border p-4"
                  style={{ backgroundColor: L.amber + "14", borderColor: L.amber + "55" }}
                >
                  <p className="text-sm font-semibold" style={{ color: L.amberDeep }}>
                    {isEN ? "Checklist before starting" : "Checklist antes de iniciar"}
                  </p>
                  <ul className="space-y-1.5 text-xs" style={{ color: L.amberDeep }}>
                    {(isEN
                      ? [
                          "Microphone connected and not blocked in the browser.",
                          "Quiet environment without interruptions (oral lasts ~15 min).",
                          "You have the extract printed or visible on another screen.",
                          `Mode selected: ${tipoOral === "taught" ? "Taught (10+5 min)" : "School-supported self-taught (15 min)"}.`,
                        ]
                      : [
                          "Micrófono conectado y sin bloqueos en el navegador.",
                          "Entorno tranquilo sin interrupciones (el oral dura ~15 min).",
                          "Tienes el extracto impreso o visible en otra pantalla.",
                          `Modalidad seleccionada: ${tipoOral === "taught" ? "Con profesor (10+5 min)" : "Aprendizaje autodidacta con apoyo del colegio (15 min)"}.`,
                        ]
                    ).map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2
                          className="mt-0.5 h-3.5 w-3.5 shrink-0"
                          style={{ color: L.amberDeep }}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex justify-end">
                    <CreditCostBadge coste={2} />
                  </div>
                  <Button
                    className="lib-press w-full gap-2 rounded-2xl"
                    size="lg"
                    disabled={!formValido || iniciando}
                    style={ctaGlow}
                    onClick={() => {
                      setMensajes([]);
                      mensajesRef.current = [];
                      iniciarFase(1);
                    }}
                  >
                    {iniciando ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                    {iniciando
                      ? isEN
                        ? "Connecting to evaluator…"
                        : "Conectando con el evaluador…"
                      : isEN
                        ? "Start simulation"
                        : "Iniciar simulación"}
                  </Button>
                  <Button variant="outline" onClick={() => setPasoSetup(2)} className="w-full">
                    {isEN ? "← Back to works" : "← Volver a las obras"}
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}

        {/* ── FASE: transición ── */}
        {fase === "transicion" && (
          <div className="lib-reveal flex flex-col items-center justify-center gap-4 py-24">
            <Loader2 className="h-10 w-10 animate-spin" style={{ color: L.primary }} />
            <p className="text-lg font-medium" style={{ color: L.ink }}>
              {isEN ? "Preparing evaluator questions…" : "Preparando las preguntas del evaluador…"}
            </p>
            <p className="text-sm" style={{ color: L.muted }}>
              {isEN
                ? "Claude is analyzing your presentation"
                : "Claude está analizando tu presentación"}
            </p>
          </div>
        )}

        {/* ── FASE: fase1 | fase2 ── */}
        {(fase === "fase1" || fase === "fase2") && (
          <div className="space-y-4">
            {/* Cabecera de sesión */}
            <div className="flex items-center justify-between">
              <div>
                <h1
                  className="text-xl leading-tight font-bold"
                  style={{ ...headingStyle, color: L.ink }}
                >
                  {fase === "fase1"
                    ? isEN
                      ? "Phase 1 — Presentation"
                      : "Fase 1 — Presentación"
                    : isEN
                      ? "Phase 2 — Evaluator questions"
                      : "Fase 2 — Preguntas del evaluador"}
                </h1>
                <p className="text-xs" style={{ color: L.muted }}>
                  {fase === "fase1"
                    ? tipoOral === "self_taught"
                      ? isEN
                        ? "Present your continuous oral. The evaluator listens silently."
                        : "Presenta tu oral continuo. El evaluador escucha en silencio."
                      : isEN
                        ? "Present your oral. The evaluator listens silently."
                        : "Presenta tu oral. El evaluador escucha en silencio."
                    : isEN
                      ? "Answer the questions with detail and textual evidence."
                      : "Responde las preguntas con detalle y evidencia textual."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg tabular-nums" style={{ ...fontMono, color: L.ink }}>
                  {fmtTiempo(tiempoSegundos)}
                </span>
                <button
                  onClick={cancelar}
                  className="text-xs transition-colors hover:opacity-80"
                  style={{ color: L.muted }}
                >
                  {isEN ? "Cancel" : "Cancelar"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-5">
              {/* Avatar + controles */}
              <div className="flex flex-col items-center gap-6 lg:col-span-2">
                <Card
                  className="lib-reveal flex w-full flex-col items-center gap-2 rounded-2xl border px-4 py-8"
                  style={cardStyle}
                >
                  <AvatarProfesor modo={modoAgente} />

                  {fase === "fase1" ? (
                    <Button
                      className="lib-press mt-4 w-full gap-2 rounded-2xl text-white"
                      style={{
                        backgroundColor: L.amberDeep,
                        boxShadow: "0 16px 30px -12px rgba(180,83,9,0.45)",
                      }}
                      onClick={terminarFase1}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {tipoOral === "self_taught"
                        ? isEN
                          ? "I've finished my oral"
                          : "He terminado mi oral"
                        : isEN
                          ? "I've finished my presentation"
                          : "He terminado mi presentación"}
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      className="lib-press mt-4 w-full gap-2 rounded-2xl"
                      onClick={finalizarSimulacion}
                    >
                      <MicOff className="h-4 w-4" />
                      {isEN ? "End session and see feedback" : "Finalizar sesión y ver feedback"}
                    </Button>
                  )}
                </Card>

                {/* Info de fase */}
                <div
                  className={cn("w-full space-y-1 rounded-2xl border p-3 text-xs")}
                  style={{
                    backgroundColor: fase === "fase1" ? L.amber + "14" : L.primary + "0F",
                    borderColor: fase === "fase1" ? L.amber + "55" : L.primary + "33",
                    color: fase === "fase1" ? L.amberDeep : L.primary,
                  }}
                >
                  {fase === "fase1" ? (
                    <>
                      <p className="font-semibold">
                        {isEN ? "Presentation in progress" : "Presentación en curso"}
                      </p>
                      <p>
                        {isEN
                          ? "The evaluator only confirms with brief affirmations. When you finish, press the yellow button."
                          : "El evaluador solo confirma con afirmaciones breves. Cuando termines, pulsa el botón amarillo."}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">
                        {isEN ? "Question phase" : "Fase de preguntas"}
                      </p>
                      <p>
                        {isEN
                          ? "Claude has generated questions based on your presentation. Answer with specific textual evidence. When you finish, press «End»."
                          : "Claude ha generado preguntas basadas en tu presentación. Responde con evidencia textual concreta. Cuando acabes, pulsa «Finalizar»."}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Transcript */}
              <Card
                className="lib-reveal flex flex-col overflow-hidden rounded-2xl border lg:col-span-3"
                style={cardStyle}
              >
                <div
                  className="flex items-center gap-2 border-b px-4 py-3"
                  style={{ backgroundColor: L.bg2, borderColor: L.line }}
                >
                  <MessageSquare className="h-4 w-4" style={{ color: L.muted }} />
                  <span className="text-sm font-medium" style={{ color: L.muted }}>
                    {isEN ? "Transcript" : "Transcripción"}
                  </span>
                </div>
                <div className="min-h-[300px] flex-1 space-y-3 overflow-y-auto p-4 sm:max-h-[480px]">
                  {mensajes.length === 0 && (
                    <p className="py-8 text-center text-sm" style={{ color: L.muted }}>
                      {isEN
                        ? "The transcript will appear here when you start speaking…"
                        : "La transcripción aparecerá aquí cuando comiences a hablar…"}
                    </p>
                  )}
                  {mensajes.map((m, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-2 text-sm",
                        m.source === "user" ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed",
                          m.source === "user" ? "rounded-tr-sm text-white" : "rounded-tl-sm",
                        )}
                        style={{
                          backgroundColor: m.source === "user" ? L.primary : L.bg2,
                          color: m.source === "user" ? "#fff" : L.ink,
                        }}
                      >
                        {m.source === "ai" && (
                          <span
                            className="mb-1 block text-[10px] font-semibold uppercase tracking-wide opacity-60"
                            style={fontMono}
                          >
                            {m.fase === 1
                              ? isEN
                                ? "Evaluator"
                                : "Evaluador"
                              : isEN
                                ? "Question"
                                : "Pregunta"}
                          </span>
                        )}
                        {m.text}
                      </div>
                    </div>
                  ))}
                  <div ref={transcriptEndRef} />
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ── FASE: procesando ── */}
        {fase === "procesando" && (
          <div className="space-y-4">
            <div className="space-y-1 pt-4 text-center">
              <h2
                className="text-xl leading-tight font-bold"
                style={{ ...headingStyle, color: L.ink }}
              >
                {isEN ? "Analyzing your oral…" : "Analizando tu oral…"}
              </h2>
              <p className="text-sm" style={{ color: L.muted }}>
                {isEN
                  ? tipoOral === "self_taught"
                    ? "Claude is evaluating your continuous presentation using the four IB criteria."
                    : "Claude is evaluating your presentation and answers using the four IB criteria."
                  : tipoOral === "self_taught"
                    ? "Claude está evaluando tu exposición continua con los cuatro criterios IB."
                    : "Claude está evaluando tu presentación y tus respuestas con los cuatro criterios IB."}
              </p>
            </div>
            <JuegoEsperaEvaluacion />
          </div>
        )}

        {/* ── FASE: resultado ── */}
        {fase === "resultado" && evaluacion && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" style={{ color: L.ok }} />
              <h2
                className="text-xl leading-tight font-bold"
                style={{ ...headingStyle, color: L.ink }}
              >
                {isEN ? "Simulation feedback" : "Feedback de tu simulación"}
              </h2>
            </div>
            <p className="text-sm" style={{ color: L.muted }}>
              {isEN
                ? "This evaluation has been saved to your Oral history."
                : "Esta evaluación se ha guardado en tu historial de Orales."}
            </p>
            <EvaluacionOralPanel ev={evaluacion} />
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => {
                setFase("configurar");
                setMensajes([]);
                mensajesRef.current = [];
                setEvaluacion(null);
                setTiempoSegundos(0);
              }}
            >
              {isEN ? "New simulation" : "Nueva simulación"}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
