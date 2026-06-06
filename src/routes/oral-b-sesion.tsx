import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarProfesorVideo } from "@/components/AvatarProfesorVideo";
import { JuegoEsperaEvaluacion } from "@/components/JuegoEsperaEvaluacion";
import { CreditCostBadge } from "@/components/CreditGate";
import { ResultadoOralB, type EvaluacionOralB } from "@/components/oral-b/ResultadoOralB";
import { useGrabacionMic } from "@/hooks/useGrabacionMic";
import { type Nivel } from "@/lib/ib-courses";
import { getFunctionErrorMessage } from "@/lib/functionErrors";
import { startOralLiveKitSession } from "@/lib/oral-livekit";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  Info,
  Loader2,
  Mic,
  MicOff,
  Shuffle,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/oral-b-sesion")({
  head: () => ({
    meta: [
      { title: "LIBerico — Oral en vivo · Spanish B" },
      {
        name: "description",
        content:
          "Practica el Oral Individual de Spanish B en una videoconferencia con un profesor IA y recibe feedback criterio por criterio.",
      },
    ],
  }),
  component: OralBSesionPage,
});

// ── Tipos ───────────────────────────────────────────────────────────────────

type StimulusRow = {
  id: string;
  theme: string;
  tipo: "visual" | "literario";
  image_url: string | null;
  title_es: string;
  title_en: string;
  description_es: string;
  description_en: string;
  image_alt_es: string | null;
  image_alt_en: string | null;
  literary_passage_es: string | null;
  literary_passage_en: string | null;
  obra: string | null;
  autor: string | null;
  cultura_conexion: string | null;
};

type Fase =
  | "configurar"
  | "preparacion"
  | "parte1"
  | "parte2"
  | "parte3"
  | "procesando"
  | "resultado";
type FaseNum = 1 | 2 | 3;
type ModoAgente = "inactivo" | "escuchando" | "hablando";

interface Mensaje {
  source: "ai" | "user";
  text: string;
  parte: FaseNum;
}

interface ConvSession {
  endSession: () => Promise<void>;
  setMicEnabled: (on: boolean) => Promise<void>;
}

// Segundos de preparación restantes a los que se lanza el precalentamiento del bot (dispatch + conexión con
// el micro apagado), para que el avatar esté caliente cuando el alumno pulse "comenzar". ~3 min cubre el
// cold-start (~2 min con la caché de compilación) con margen.
const WARMUP_LEAD_SECS = 180;

const THEME_LABELS_ES: Record<string, string> = {
  identidades: "Identidades",
  experiencias: "Experiencias",
  ingenio_humano: "Ingenio humano",
  organizacion_social: "Organización social",
  planeta_compartido: "Cómo compartimos el planeta",
};

function fmt(seg: number): string {
  const m = Math.floor(seg / 60)
    .toString()
    .padStart(2, "0");
  const s = (seg % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function pickTwo<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, 2);
}

// ── Componente ────────────────────────────────────────────────────────────────

function OralBSesionPage() {
  const { user, loading: authLoading, rol, courseKey } = useAuth();
  const isEN = useUiLang() === "en";
  const navigate = useNavigate();
  const mic = useGrabacionMic();

  const [nivel, setNivel] = useState<Nivel>("SL");
  const [stimuli, setStimuli] = useState<StimulusRow[]>([]);
  const [opciones, setOpciones] = useState<StimulusRow[]>([]);
  const [elegido, setElegido] = useState<StimulusRow | null>(null);
  const [loadingStimuli, setLoadingStimuli] = useState(false);

  const [fase, setFase] = useState<Fase>("configurar");
  const [modoAgente, setModoAgente] = useState<ModoAgente>("inactivo");
  const [videoTrack, setVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [evaluacion, setEvaluacion] = useState<EvaluacionOralB | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [iniciando, setIniciando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [prepSegundos, setPrepSegundos] = useState(0);
  const [notas, setNotas] = useState("");
  // Readiness del avatar: el bot solo conecta a LiveKit DESPUÉS de su warm-up, así que recibir su pista de
  // vídeo == avatar listo. No se entra a la Parte 1 hasta entonces.
  const [avatarListo, setAvatarListo] = useState(false);
  const [esperandoAvatar, setEsperandoAvatar] = useState(false); // alumno pulsó "comenzar" y el avatar aún calienta

  // Fuente del estímulo: aleatorio (banco) o material propio del alumno.
  const [fuente, setFuente] = useState<"aleatorio" | "propio">("aleatorio");
  const [customTheme, setCustomTheme] = useState<string>("experiencias");
  const [customDesc, setCustomDesc] = useState(""); // NM: descripción de la imagen para el examinador
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const [customPassage, setCustomPassage] = useState(""); // NS: pasaje literario
  const [customObra, setCustomObra] = useState("");
  const [customAutor, setCustomAutor] = useState("");

  const convRef = useRef<ConvSession | null>(null);
  const roomRef = useRef<string | null>(null); // room de LiveKit (se reutiliza en fase 2/3)
  const mensajesRef = useRef<Mensaje[]>([]);
  const faseNumRef = useRef<FaseNum>(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const warmRef = useRef(false); // ya se lanzó el precalentamiento (dispatch + conexión) de la Parte 1
  const analisisRef = useRef<string | null>(null); // dossier Opus del estímulo (se computa en fase 1, se reusa)
  const entrandoRef = useRef(false); // guard de idempotencia: evita doble confirm/cobro si el efecto re-dispara

  // ─ Guards ─
  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate({ to: "/login" });
    else if (rol === "profesor") navigate({ to: "/profesor" });
  }, [user, authLoading, rol, navigate]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
      convRef.current?.endSession().catch(() => {});
      mic.cancelar();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─ Cargar estímulos según nivel ─
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      setLoadingStimuli(true);
      const tipo = nivel === "HL" ? "literario" : "visual";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: err } = await (supabase as any)
        .from("prompts_oral_b")
        .select(
          "id,theme,tipo,image_url,title_es,title_en,description_es,description_en,image_alt_es,image_alt_en,literary_passage_es,literary_passage_en,obra,autor,cultura_conexion",
        )
        .eq("activo", true)
        .eq("tipo", tipo);
      if (cancelled) return;
      if (err) {
        console.error("prompts_oral_b fetch error:", err);
        setStimuli([]);
      } else {
        setStimuli((data ?? []) as StimulusRow[]);
      }
      setLoadingStimuli(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [nivel, authLoading, user]);

  const t = useMemo(
    () => ({
      title: isEN ? "Live oral feedback" : "Feedback de tu oral en vivo",
      backToForm: isEN ? "New session" : "Nueva sesión",
      score: isEN ? "Score" : "Puntuación",
      ibGrade: isEN ? "IB grade" : "Nota IB",
      wordsDetected: isEN ? "words detected" : "palabras detectadas",
      strengths: isEN ? "Strengths" : "Fortalezas",
      improve: isEN ? "Areas to improve" : "Áreas de mejora",
      global: isEN ? "Overall comment" : "Comentario global",
    }),
    [isEN],
  );

  const stimulusTexto = (s: StimulusRow): string =>
    s.tipo === "literario"
      ? ((isEN ? s.literary_passage_en : s.literary_passage_es) ?? "")
      : ((isEN ? s.image_alt_en : s.image_alt_es) ??
        (isEN ? s.description_en : s.description_es) ??
        "");

  // ─ Timers ─
  const iniciarTimer = () => {
    setSegundos(0);
    timerRef.current = setInterval(() => setSegundos((x) => x + 1), 1000);
  };
  const detenerTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  // ─ Iniciar una parte de la sesión (ElevenLabs) ─
  const iniciarParte = async (faseNum: FaseNum) => {
    if (!elegido) return;
    setError(null);
    setIniciando(true);
    faseNumRef.current = faseNum;

    const transcripcionPrevia = mensajesRef.current
      .filter((m) => m.source === "user")
      .map((m) => m.text)
      .join("\n\n");

    const { data, error: fnError } = await supabase.functions.invoke("create-oral-b-session", {
      body: {
        fase: faseNum,
        nivel,
        course_key: courseKey,
        tema_area: THEME_LABELS_ES[elegido.theme] ?? elegido.theme,
        cultura_conexion: elegido.cultura_conexion ?? "",
        image_alt: elegido.image_alt_es ?? elegido.description_es,
        image_url: elegido.image_url ?? "",
        stimulus_description: elegido.description_es,
        literary_passage: elegido.literary_passage_es ?? "",
        obra: elegido.obra ?? "",
        autor: elegido.autor ?? "",
        transcripcion_previa: faseNum === 1 ? "" : transcripcionPrevia,
        analisis_estimulo: analisisRef.current ?? "",
        room: faseNum === 1 ? undefined : roomRef.current,
      },
    });

    if (fnError || !data?.livekit_url || !data?.token) {
      const msg = await getFunctionErrorMessage(
        fnError,
        isEN ? "Could not start the session." : "No se pudo iniciar la sesión.",
      );
      setError(msg);
      setIniciando(false);
      setFase(faseNum === 1 ? "preparacion" : fase);
      return;
    }
    roomRef.current = data.room ?? roomRef.current;

    try {
      // La grabación del micrófono corre de forma continua durante toda la sesión.
      if (faseNum === 1 && !mic.grabando) {
        try {
          await mic.iniciar();
        } catch {
          setError(
            isEN
              ? "Microphone access is required for the oral. Allow it and try again."
              : "Se necesita acceso al micrófono para el oral. Permítelo e inténtalo de nuevo.",
          );
          setIniciando(false);
          setFase("preparacion");
          return;
        }
      }

      const conv = await startOralLiveKitSession(data.livekit_url, data.token, {
        onMessage: ({ message, source }) => {
          const msg: Mensaje = { source, text: message, parte: faseNumRef.current };
          mensajesRef.current = [...mensajesRef.current, msg];
          setMensajes((prev) => [...prev, msg]);
        },
        onStatus: ({ status }) => {
          if (status === "connected") {
            setFase(faseNum === 1 ? "parte1" : faseNum === 2 ? "parte2" : "parte3");
            setIniciando(false);
            if (faseNum === 1) iniciarTimer();
          } else if (status === "disconnected") {
            setModoAgente("inactivo");
            setVideoTrack(null);
          }
        },
        onMode: (modo) => setModoAgente(modo),
        onVideoTrack: (track) => {
          setVideoTrack(track);
          setAvatarListo(!!track); // pista de vídeo == bot ya calentado y listo
        },
        onError: (e) => {
          console.error("LiveKit error:", e);
          setError(
            isEN
              ? "Lost connection with the examiner. Try again."
              : "Se ha perdido la conexión con el examinador. Inténtalo de nuevo.",
          );
        },
      });
      convRef.current = conv;
    } catch (e) {
      console.error("startSession error:", e);
      setError(
        isEN
          ? "Could not connect with the examiner. Check your microphone."
          : "No se pudo conectar con el examinador. Comprueba tu micrófono.",
      );
      setIniciando(false);
      setFase("preparacion");
    }
  };

  // ─ Transiciones entre partes ─
  const avanzarA = async (siguiente: FaseNum) => {
    await convRef.current?.endSession().catch(() => {});
    convRef.current = null;
    setModoAgente("inactivo");
    setFase(siguiente === 2 ? "parte2" : "parte3");
    setTimeout(() => iniciarParte(siguiente), 800);
  };

  // ─ Finalizar sesión → transcribir + evaluar ─
  const finalizar = async () => {
    detenerTimer();
    await convRef.current?.endSession().catch(() => {});
    convRef.current = null;
    setModoAgente("inactivo");
    setFase("procesando");

    // 1) Transcripción limpia por partes (de ElevenLabs).
    const porParte = (p: FaseNum) =>
      mensajesRef.current
        .filter((m) => m.source === "user" && m.parte === p)
        .map((m) => m.text)
        .join("\n\n")
        .trim();
    const guionPresentacion = porParte(1);
    const guionDiscusionB1 = porParte(2);
    const guionDiscusionB2 = porParte(3);
    const guionLimpio = [guionPresentacion, guionDiscusionB1, guionDiscusionB2]
      .filter(Boolean)
      .join("\n\n");

    if (!guionLimpio) {
      mic.cancelar();
      toast.error(
        isEN
          ? "Not enough speech was captured to evaluate. Try again."
          : "No se recogió suficiente intervención para evaluar. Inténtalo de nuevo.",
      );
      setFase("configurar");
      return;
    }

    // 2) Verbatim para el Criterio A (lengua): usamos la transcripción de faster-whisper del propio bot
    //    (GPU de Modal), que YA conserva lo que dijo el alumno con sus errores L2. Sin depender de OpenAI y
    //    sin almacenar el audio crudo del alumno (más privado). La calidad del Criterio A depende del tamaño
    //    del modelo Whisper del bot (ver STT_MODEL en avatar-service/bot.py).
    mic.cancelar();
    const transcriptVerbatim: string | null = guionLimpio || null;

    // 3) Evaluación /30.
    const issue =
      elegido?.cultura_conexion ||
      (isEN ? elegido?.title_en : elegido?.title_es) ||
      (isEN ? "General discussion of the theme" : "Discusión general del tema");

    const { data, error: fnError } = await supabase.functions.invoke("evaluate-oral-b", {
      body: {
        course_key: courseKey,
        nivel,
        ui_lang: isEN ? "en" : "es",
        modo: "conversacion",
        stimulus_id: elegido?.id ?? null,
        stimulus_description: elegido ? stimulusTexto(elegido) : "",
        global_issue: issue,
        theme: elegido?.theme ?? "experiencias",
        guion: guionLimpio,
        guion_presentacion: guionPresentacion || null,
        guion_discusion_b1: guionDiscusionB1 || null,
        guion_discusion_b2: guionDiscusionB2 || null,
        transcript_verbatim: transcriptVerbatim,
        dialogo: mensajesRef.current,
      },
    });

    if (fnError || !data) {
      const msg = await getFunctionErrorMessage(
        fnError,
        isEN ? "Could not process the evaluation." : "No se pudo procesar la evaluación.",
      );
      toast.error(msg);
      setFase("configurar");
      return;
    }

    setEvaluacion(data as EvaluacionOralB);
    setFase("resultado");
  };

  // ─ Reset ─
  const reiniciar = () => {
    detenerTimer();
    mic.cancelar();
    convRef.current?.endSession().catch(() => {});
    convRef.current = null;
    warmRef.current = false;
    analisisRef.current = null;
    entrandoRef.current = false;
    setAvatarListo(false);
    setEsperandoAvatar(false);
    setVideoTrack(null);
    setFase("configurar");
    setMensajes([]);
    mensajesRef.current = [];
    setEvaluacion(null);
    setElegido(null);
    setOpciones([]);
    setSegundos(0);
    setNotas("");
    setError(null);
    if (customImageUrl) URL.revokeObjectURL(customImageUrl);
    setCustomImageUrl(null);
    setCustomDesc("");
    setCustomPassage("");
    setCustomObra("");
    setCustomAutor("");
  };

  // ─ Material propio ─
  const onImagePick = (file: File | null) => {
    if (customImageUrl) URL.revokeObjectURL(customImageUrl);
    setCustomImageUrl(file ? URL.createObjectURL(file) : null);
  };

  // Construye un estímulo a partir del material propio del alumno (o null si falta).
  const buildCustomStimulus = (): StimulusRow | null => {
    if (nivel === "HL") {
      if (customPassage.trim().length < 20) return null;
      return {
        id: "custom",
        theme: customTheme,
        tipo: "literario",
        image_url: null,
        title_es: "Mi pasaje",
        title_en: "My passage",
        description_es: "",
        description_en: "",
        image_alt_es: null,
        image_alt_en: null,
        literary_passage_es: customPassage.trim(),
        literary_passage_en: customPassage.trim(),
        obra: customObra.trim() || null,
        autor: customAutor.trim() || null,
        cultura_conexion: null,
      };
    }
    if (customDesc.trim().length < 20) return null;
    return {
      id: "custom",
      theme: customTheme,
      tipo: "visual",
      image_url: customImageUrl,
      title_es: "Mi imagen",
      title_en: "My image",
      description_es: customDesc.trim(),
      description_en: customDesc.trim(),
      image_alt_es: customDesc.trim(),
      image_alt_en: customDesc.trim(),
      literary_passage_es: null,
      literary_passage_en: null,
      obra: null,
      autor: null,
      cultura_conexion: null,
    };
  };

  // ─ Preparación: temporizador IB ─
  const prepTotal = nivel === "HL" ? 20 * 60 : 15 * 60;
  const empezarPreparacion = () => {
    if (fuente === "propio") {
      const custom = buildCustomStimulus();
      if (!custom) {
        setError(
          nivel === "HL"
            ? isEN
              ? "Paste a literary passage (at least 20 characters)."
              : "Pega un pasaje literario (al menos 20 caracteres)."
            : isEN
              ? "Describe your image for the examiner (at least 20 characters)."
              : "Describe tu imagen para el examinador (al menos 20 caracteres).",
        );
        return;
      }
      setOpciones([]);
      setElegido(custom);
    } else {
      setOpciones(pickTwo(stimuli));
      setElegido(null);
    }
    setError(null);
    setFase("preparacion");
    setPrepSegundos(prepTotal);
    prepTimerRef.current = setInterval(() => {
      setPrepSegundos((x) => {
        const next = x <= 1 ? 0 : x - 1;
        // En la cola de la preparación, precalienta el bot para que el avatar esté listo al "comenzar".
        if (next > 0 && next <= WARMUP_LEAD_SECS) void precalentarParte1();
        if (next === 0 && prepTimerRef.current) clearInterval(prepTimerRef.current);
        return next;
      });
    }, 1000);
  };

  // Precalienta la Parte 1 SIN empezar el oral: lanza el bot (dispatch + cargo) y conecta a la room con el
  // MICRO APAGADO. Así el avatar (cold-start ~2 min) está caliente y visible (retrato) cuando el alumno
  // pulse "comenzar". Idempotente (warmRef). Se dispara en la cola de la preparación o al pulsar comenzar.
  const precalentarParte1 = async () => {
    if (warmRef.current || convRef.current || !elegido) return;
    warmRef.current = true;
    faseNumRef.current = 1;
    try {
      const { data, error: fnError } = await supabase.functions.invoke("create-oral-b-session", {
        body: {
          fase: 1,
          warmup: true, // V4: solo despacha el bot; el cobro va luego con {confirm} al iniciar el oral
          nivel,
          course_key: courseKey,
          tema_area: THEME_LABELS_ES[elegido.theme] ?? elegido.theme,
          cultura_conexion: elegido.cultura_conexion ?? "",
          image_alt: elegido.image_alt_es ?? elegido.description_es,
          image_url: elegido.image_url ?? "",
          stimulus_description: elegido.description_es,
          literary_passage: elegido.literary_passage_es ?? "",
          obra: elegido.obra ?? "",
          autor: elegido.autor ?? "",
          transcripcion_previa: "",
          room: undefined,
        },
      });
      if (fnError || !data?.livekit_url || !data?.token) {
        warmRef.current = false; // permite reintento al pulsar "comenzar"
        return;
      }
      if (data.analisis_estimulo) analisisRef.current = data.analisis_estimulo; // dossier Opus → reusar en fase 2/3
      roomRef.current = data.room ?? roomRef.current;
      convRef.current = await startOralLiveKitSession(
        data.livekit_url,
        data.token,
        {
          onMessage: ({ message, source }) => {
            const msg: Mensaje = { source, text: message, parte: faseNumRef.current };
            mensajesRef.current = [...mensajesRef.current, msg];
            setMensajes((prev) => [...prev, msg]);
          },
          onStatus: ({ status }) => {
            if (status === "disconnected") {
              setModoAgente("inactivo");
              setVideoTrack(null);
            }
          },
          onMode: (modo) => setModoAgente(modo),
          onVideoTrack: (track) => {
            setVideoTrack(track);
            setAvatarListo(!!track); // pista de vídeo == bot ya calentado y listo
          },
          onError: (e) => console.error("LiveKit warm error:", e),
        },
        { enableMic: false },
      );
    } catch (e) {
      console.error("precalentar error:", e);
      warmRef.current = false;
    }
  };

  // Entra de verdad a la Parte 1 (SOLO cuando el avatar está listo): arranca la grabación cruda (verbatim) y
  // ENCIENDE el micro → el bot detecta la pista, saluda y arranca la conversación (y su corte duro de 15 min).
  const entrarParte1 = async () => {
    if (!convRef.current || entrandoRef.current) return; // guard: una sola confirmación/cobro
    entrandoRef.current = true;
    // V4: cobrar AHORA (al iniciar el oral de verdad), no en el precalentamiento. Si no hay cuota/créditos,
    // no se entra y se cierra el bot caliente (no se queda quemando).
    const { data: conf, error: confErr } = await supabase.functions.invoke(
      "create-oral-b-session",
      {
        body: { fase: 1, confirm: true, nivel, room: roomRef.current },
      },
    );
    if (confErr || !conf?.ok) {
      const msg = await getFunctionErrorMessage(
        confErr,
        isEN ? "Could not start the oral." : "No se pudo iniciar el oral.",
      );
      setError(msg);
      setEsperandoAvatar(false);
      entrandoRef.current = false;
      await convRef.current?.endSession().catch(() => {});
      convRef.current = null;
      warmRef.current = false;
      setAvatarListo(false);
      setVideoTrack(null);
      return;
    }
    if (!mic.grabando) {
      try {
        await mic.iniciar();
      } catch {
        setError(
          isEN
            ? "Microphone access is required for the oral. Allow it and try again."
            : "Se necesita acceso al micrófono para el oral. Permítelo e inténtalo de nuevo.",
        );
        setEsperandoAvatar(false);
        entrandoRef.current = false;
        return;
      }
    }
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    setMensajes([]);
    mensajesRef.current = [];
    try {
      await convRef.current.setMicEnabled(true);
    } catch (e) {
      console.error("setMicEnabled:", e);
    }
    setEsperandoAvatar(false);
    setFase("parte1");
    iniciarTimer();
  };

  // "Comenzar": expresa la intención de empezar. NO entra a la Parte 1 hasta que el avatar esté listo
  // (warm-up terminado = llega su pista de vídeo). Si aún calienta, deja el botón en "Preparando…" y la
  // entrada la dispara el efecto de abajo al estar listo.
  const comenzarOral = async () => {
    if (!elegido || esperandoAvatar) return;
    setError(null);
    setEsperandoAvatar(true);
    if (!convRef.current) await precalentarParte1();
    if (!convRef.current && !warmRef.current) {
      setError(
        isEN
          ? "Could not connect with the examiner. Try again."
          : "No se pudo conectar con el examinador. Inténtalo de nuevo.",
      );
      setEsperandoAvatar(false);
    }
    // Si ya estaba listo, entra de inmediato; si no, el efecto entrará al llegar la pista de vídeo.
  };

  // Entrada diferida a la Parte 1: en cuanto el avatar esté listo y el alumno haya pulsado "comenzar".
  useEffect(() => {
    if (esperandoAvatar && avatarListo && fase === "preparacion" && convRef.current) {
      void entrarParte1();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esperandoAvatar, avatarListo, fase]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (authLoading) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const enSesion = fase === "parte1" || fase === "parte2" || fase === "parte3";

  return (
    <div className="min-h-screen bg-parchment">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {isEN ? "Home" : "Inicio"}
        </Link>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Configurar ── */}
        {fase === "configurar" && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-serif font-bold text-ink">
                {isEN ? "Live Individual Oral — Spanish B" : "Oral Individual en vivo — Spanish B"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {isEN
                  ? "A videoconference with an AI examiner. Present, answer questions and get criterion-by-criterion feedback."
                  : "Una videoconferencia con un examinador IA. Presenta, responde preguntas y recibe feedback criterio por criterio."}
              </p>
            </div>

            {/* Bloque 1 — Cómo funciona el oral */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                <h2 className="font-serif text-lg text-ink">
                  {isEN ? "How the oral works" : "Cómo funciona el oral"}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {isEN
                  ? "It lasts about 12–15 minutes and has three parts. You are scored /30 on four criteria: A (Language, /12), B1 (Message: stimulus, /6), B2 (Message: conversation, /6) and C (Interaction, /6)."
                  : "Dura unos 12–15 minutos y tiene tres partes. Se puntúa /30 con cuatro criterios: A (Lengua, /12), B1 (Mensaje: estímulo, /6), B2 (Mensaje: conversación, /6) y C (Interacción, /6)."}
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                {(
                  [
                    {
                      n: "1",
                      min: "3–4 min",
                      title: isEN ? "Presentation" : "Presentación",
                      desc: isEN
                        ? "You present your stimulus on your own."
                        : "Presentas tu estímulo por tu cuenta.",
                    },
                    {
                      n: "2",
                      min: "4–5 min",
                      title: isEN ? "Discussion of the stimulus" : "Discusión del estímulo",
                      desc: isEN
                        ? "The examiner asks about your presentation."
                        : "El examinador pregunta sobre tu presentación.",
                    },
                    {
                      n: "3",
                      min: "5–6 min",
                      title: isEN ? "General discussion" : "Discusión general",
                      desc: isEN
                        ? "A broader conversation on the theme."
                        : "Una conversación más amplia sobre el tema.",
                    },
                  ] as const
                ).map((p) => (
                  <div key={p.n} className="rounded-lg border border-border/70 p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-semibold">
                        {p.n}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{p.min}</span>
                    </div>
                    <p className="text-sm font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {isEN
                  ? `Before starting you get ${nivel === "HL" ? "20" : "15"} minutes of preparation with brief notes (max 10 lines). The presentation must be spontaneous — don't read a full script.`
                  : `Antes de empezar tienes ${nivel === "HL" ? "20" : "15"} minutos de preparación con notas breves (máx. 10 líneas). La presentación debe ser espontánea: no leas un guion completo.`}
              </p>
            </Card>

            {/* Bloque 2 — Tu estímulo (NM/NS, aleatorio o propio) */}
            <Card className="p-5 space-y-5">
              <h2 className="font-serif text-lg text-ink">
                {isEN ? "Your stimulus" : "Tu estímulo"}
              </h2>

              {/* Nivel */}
              <div className="space-y-2">
                <p className="text-sm font-semibold">{isEN ? "Level" : "Nivel"}</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(["SL", "HL"] as Nivel[]).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNivel(n)}
                      className={cn(
                        "text-left rounded-lg border p-4 transition-colors",
                        nivel === n
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      <p className="font-semibold text-sm">{n === "SL" ? "NM (SL)" : "NS (HL)"}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {n === "SL"
                          ? isEN
                            ? "Visual stimulus (image) + cultural links."
                            : "Estímulo visual (imagen) + vínculos culturales."
                          : isEN
                            ? "Literary passage from a studied work."
                            : "Pasaje literario de una obra estudiada."}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fuente */}
              <div className="space-y-2">
                <p className="text-sm font-semibold">
                  {isEN ? "Where does it come from?" : "¿De dónde sale?"}
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFuente("aleatorio")}
                    className={cn(
                      "text-left rounded-lg border p-4 transition-colors flex items-start gap-3",
                      fuente === "aleatorio"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <Shuffle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">{isEN ? "Random" : "Aleatorio"}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {nivel === "HL"
                          ? isEN
                            ? "Two passages from the bank; you'll pick one."
                            : "Dos pasajes del banco; elegirás uno."
                          : isEN
                            ? "Two images from the bank; you'll pick one."
                            : "Dos imágenes del banco; elegirás una."}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFuente("propio")}
                    className={cn(
                      "text-left rounded-lg border p-4 transition-colors flex items-start gap-3",
                      fuente === "propio"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <ImagePlus className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">
                        {isEN ? "My own material" : "Mi propio material"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {nivel === "HL"
                          ? isEN
                            ? "Paste your own literary passage."
                            : "Pega tu propio pasaje literario."
                          : isEN
                            ? "Upload your own image and describe it."
                            : "Sube tu propia imagen y descríbela."}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Material propio */}
              {fuente === "propio" && (
                <div className="space-y-4 rounded-lg border border-border/70 p-4 bg-white/40">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{isEN ? "Thematic area" : "Área temática"}</Label>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(THEME_LABELS_ES).map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setCustomTheme(k)}
                          className={cn(
                            "text-xs rounded-full border px-3 py-1 transition-colors",
                            customTheme === k
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40",
                          )}
                        >
                          {THEME_LABELS_ES[k]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {nivel === "HL" ? (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          {isEN ? "Literary passage" : "Pasaje literario"}
                        </Label>
                        <Textarea
                          value={customPassage}
                          onChange={(e) => setCustomPassage(e.target.value)}
                          rows={5}
                          placeholder={
                            isEN ? "Paste the literary passage…" : "Pega aquí el pasaje literario…"
                          }
                          className="resize-none text-sm"
                        />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">{isEN ? "Work" : "Obra"}</Label>
                          <Input
                            value={customObra}
                            onChange={(e) => setCustomObra(e.target.value)}
                            placeholder={isEN ? "Title (optional)" : "Título (opcional)"}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">{isEN ? "Author" : "Autor/a"}</Label>
                          <Input
                            value={customAutor}
                            onChange={(e) => setCustomAutor(e.target.value)}
                            placeholder={isEN ? "Author (optional)" : "Autor/a (opcional)"}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          {isEN ? "Image" : "Imagen"}{" "}
                          <span className="text-muted-foreground font-normal">
                            {isEN ? "(optional)" : "(opcional)"}
                          </span>
                        </Label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => onImagePick(e.target.files?.[0] ?? null)}
                          className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-primary file:text-xs"
                        />
                        {customImageUrl && (
                          <img
                            src={customImageUrl}
                            alt=""
                            className="mt-2 w-full max-h-48 object-contain rounded-md border border-border"
                          />
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          {isEN
                            ? "Describe the image for the examiner"
                            : "Describe la imagen para el examinador"}
                        </Label>
                        <p className="text-[11px] text-muted-foreground/70">
                          {isEN
                            ? "The examiner can't see the image — describe what's in it so it can ask relevant questions."
                            : "El examinador no ve la imagen — describe qué aparece para que pueda hacer preguntas pertinentes."}
                        </p>
                        <Textarea
                          value={customDesc}
                          onChange={(e) => setCustomDesc(e.target.value)}
                          rows={3}
                          placeholder={
                            isEN
                              ? "E.g.: A street market in Oaxaca with…"
                              : "Ej.: Un mercado callejero en Oaxaca con…"
                          }
                          className="resize-none text-sm"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {fuente === "aleatorio" && (
                <p className="text-xs text-muted-foreground">
                  {loadingStimuli
                    ? isEN
                      ? "Loading the stimulus bank…"
                      : "Cargando el banco de estímulos…"
                    : stimuli.length === 0
                      ? isEN
                        ? "No stimuli available in the bank for this level yet."
                        : "Aún no hay estímulos en el banco para este nivel."
                      : isEN
                        ? "You'll see 2 options at random and choose one during preparation (you don't see them beforehand)."
                        : "Verás 2 opciones al azar y elegirás una durante la preparación (no las ves antes)."}
                </p>
              )}
            </Card>

            {/* Bloque 3 — Cómo funciona el avatar */}
            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                <h2 className="font-serif text-lg text-ink">
                  {isEN ? "How the AI examiner works" : "Cómo funciona el avatar"}
                </h2>
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {(isEN
                  ? [
                      "It's an AI examiner you see and hear by video; you only use your microphone (no camera).",
                      "During your presentation it listens in silence; then it asks open questions one at a time.",
                      "It speaks Spanish and won't correct your mistakes live — language feedback comes at the end.",
                      "Your voice is transcribed twice: a clean version for content and a verbatim one to assess language.",
                    ]
                  : [
                      "Es un examinador IA al que ves y oyes por vídeo; tú solo usas el micrófono (sin cámara).",
                      "Durante tu presentación escucha en silencio; luego hace preguntas abiertas de una en una.",
                      "Habla en español y no corrige tus errores en vivo: el feedback de lengua llega al final.",
                      "Tu voz se transcribe dos veces: una limpia para el contenido y otra literal para evaluar la lengua.",
                    ]
                ).map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/70" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3">
              <CreditCostBadge coste={5} />
              <Button
                size="lg"
                disabled={fuente === "aleatorio" && (loadingStimuli || stimuli.length === 0)}
                onClick={empezarPreparacion}
                className="gap-2"
              >
                {loadingStimuli && fuente === "aleatorio" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {isEN ? "Start preparation" : "Iniciar preparación"}
              </Button>
            </div>
          </div>
        )}

        {/* ── Preparación ── */}
        {fase === "preparacion" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-serif font-bold text-ink">
                {isEN ? "Preparation" : "Preparación"}
              </h1>
              <span className="font-mono text-lg tabular-nums text-foreground/80">
                {fmt(prepSegundos)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {opciones.length > 0
                ? isEN
                  ? "Choose one stimulus and prepare your presentation. Jot brief notes (max 10 lines) — you must not read a full script aloud."
                  : "Elige un estímulo y prepara tu presentación. Toma notas breves (máx. 10 líneas) — no puedes leer un guion completo en voz alta."
                : isEN
                  ? "Prepare your presentation on your material. Jot brief notes (max 10 lines) — you must not read a full script aloud."
                  : "Prepara tu presentación sobre tu material. Toma notas breves (máx. 10 líneas) — no puedes leer un guion completo en voz alta."}
            </p>

            {/* Material propio: vista previa (no hay que elegir) */}
            {opciones.length === 0 && elegido && (
              <Card className="p-4 space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {THEME_LABELS_ES[elegido.theme] ?? elegido.theme}
                </div>
                {elegido.tipo === "visual" && elegido.image_url && (
                  <img
                    src={elegido.image_url}
                    alt=""
                    className="w-full max-h-56 object-contain rounded-md border border-border"
                  />
                )}
                {elegido.tipo === "literario" ? (
                  <p className="text-sm whitespace-pre-wrap text-foreground/80">
                    {elegido.literary_passage_es}
                    {elegido.obra
                      ? `\n\n— ${elegido.obra}${elegido.autor ? `, ${elegido.autor}` : ""}`
                      : ""}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">{elegido.description_es}</p>
                )}
              </Card>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              {opciones.map((s) => {
                const sel = elegido?.id === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setElegido(s)}
                    className={cn(
                      "text-left rounded-lg border p-4 space-y-2 transition-colors",
                      sel ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                    )}
                  >
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {THEME_LABELS_ES[s.theme] ?? s.theme}
                    </div>
                    {s.tipo === "visual" && s.image_url && (
                      <img
                        src={s.image_url}
                        alt={(isEN ? s.image_alt_en : s.image_alt_es) ?? ""}
                        className="w-full h-40 object-cover rounded-md"
                      />
                    )}
                    <p className="font-semibold text-sm">{isEN ? s.title_en : s.title_es}</p>
                    {s.tipo === "literario" ? (
                      <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                        {(isEN ? s.literary_passage_en : s.literary_passage_es) ?? ""}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {isEN ? s.description_en : s.description_es}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">{isEN ? "Your notes" : "Tus notas"}</p>
              <Textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value.split("\n").slice(0, 10).join("\n"))}
                rows={6}
                placeholder={isEN ? "Up to 10 short lines…" : "Hasta 10 líneas breves…"}
                className="resize-none text-sm font-mono"
              />
            </div>

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={reiniciar}>
                {isEN ? "← Cancel" : "← Cancelar"}
              </Button>
              <Button
                disabled={!elegido || esperandoAvatar}
                onClick={comenzarOral}
                className="gap-2"
              >
                {esperandoAvatar ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isEN ? "Preparing examiner…" : "Preparando al examinador…"}
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    {isEN ? "Start the oral" : "Comenzar el oral"}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── En sesión (parte 1/2/3) ── */}
        {enSesion && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-serif font-bold text-ink">
                  {fase === "parte1"
                    ? isEN
                      ? "Part 1 — Presentation"
                      : "Parte 1 — Presentación"
                    : fase === "parte2"
                      ? isEN
                        ? "Part 2 — Discussion of the stimulus"
                        : "Parte 2 — Discusión del estímulo"
                      : isEN
                        ? "Part 3 — General discussion"
                        : "Parte 3 — Discusión general"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {fase === "parte1"
                    ? isEN
                      ? "Present your stimulus. The examiner listens."
                      : "Presenta tu estímulo. El examinador escucha."
                    : isEN
                      ? "Answer the examiner's questions with detail."
                      : "Responde las preguntas del examinador con detalle."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {mic.grabando && <span className="text-[10px] text-destructive">● REC</span>}
                <span className="font-mono text-lg tabular-nums text-foreground/80">
                  {fmt(segundos)}
                </span>
                <button
                  onClick={reiniciar}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  {isEN ? "Cancel" : "Cancelar"}
                </button>
              </div>
            </div>

            {/* Avatar EN GRANDE — el examinador es el foco de la pantalla */}
            <Card className="flex flex-col items-center gap-4 p-4 sm:p-6">
              <div className="w-full max-w-2xl">
                <AvatarProfesorVideo modo={modoAgente} videoTrack={videoTrack} />
              </div>
              <div className="w-full max-w-2xl flex flex-col sm:flex-row gap-2">
                {fase === "parte1" && (
                  <Button
                    className="flex-1 gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={() => avanzarA(2)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {isEN ? "I've finished presenting" : "He terminado la presentación"}
                  </Button>
                )}
                {fase === "parte2" && (
                  <Button className="flex-1 gap-2" onClick={() => avanzarA(3)}>
                    <CheckCircle2 className="h-4 w-4" />
                    {isEN ? "Go to general discussion" : "Pasar a la discusión general"}
                  </Button>
                )}
                {fase === "parte3" && (
                  <Button variant="destructive" className="flex-1 gap-2" onClick={finalizar}>
                    <MicOff className="h-4 w-4" />
                    {isEN ? "End and see feedback" : "Finalizar y ver feedback"}
                  </Button>
                )}
                {(fase === "parte1" || fase === "parte2") && (
                  <Button
                    variant="outline"
                    className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10"
                    onClick={finalizar}
                  >
                    <MicOff className="h-4 w-4" />
                    {isEN ? "Stop the oral" : "Parar el oral"}
                  </Button>
                )}
              </div>
            </Card>

            {/* Debajo: el estímulo y, al lado, los apuntes del alumno. (La transcripción NO se le muestra
                al alumno: ocurre en back-stage para la evaluación.) */}
            <div className="grid md:grid-cols-2 gap-4">
              {elegido && (
                <Card className="p-3 space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {isEN ? "Your stimulus" : "Tu estímulo"}
                  </div>
                  {elegido.tipo === "visual" && elegido.image_url ? (
                    <img
                      src={elegido.image_url}
                      alt={(isEN ? elegido.image_alt_en : elegido.image_alt_es) ?? ""}
                      className="w-full rounded-md"
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap text-foreground/80 max-h-72 overflow-y-auto">
                      {(isEN ? elegido.literary_passage_en : elegido.literary_passage_es) ?? ""}
                      {elegido.obra
                        ? `\n\n— ${elegido.obra}${elegido.autor ? `, ${elegido.autor}` : ""}`
                        : ""}
                    </p>
                  )}
                </Card>
              )}

              <Card className="p-3 space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {isEN ? "Your notes" : "Tus apuntes"}
                </div>
                {notas.trim() ? (
                  <p className="text-sm whitespace-pre-wrap font-mono text-foreground/80 max-h-72 overflow-y-auto">
                    {notas}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {isEN ? "You didn't take any notes." : "No tomaste apuntes."}
                  </p>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* ── Procesando ── */}
        {fase === "procesando" && (
          <div className="space-y-4">
            <div className="text-center space-y-1 pt-4">
              <h2 className="text-xl font-serif font-bold text-ink">
                {isEN ? "Analyzing your oral…" : "Analizando tu oral…"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isEN
                  ? "Transcribing your speech and evaluating the four IB criteria."
                  : "Transcribiendo tu intervención y evaluando los cuatro criterios IB."}
              </p>
            </div>
            <JuegoEsperaEvaluacion />
          </div>
        )}

        {/* ── Resultado ── */}
        {fase === "resultado" && evaluacion && (
          <ResultadoOralB evaluacion={evaluacion} t={t} onReset={reiniciar} isEN={isEN} />
        )}
      </main>
    </div>
  );
}
