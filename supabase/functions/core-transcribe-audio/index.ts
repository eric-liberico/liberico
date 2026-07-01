import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { parseCourseKey } from "../_shared/courses.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LIMITE_TRANSCRIPCION_DIARIO = 3;
const WHISPER_MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const TRANSCRIPTION_TIMEOUT_MS = 120_000;
const DEFAULT_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
const LONG_AUDIO_SECONDS = 12 * 60;
const BUCKET = "audio-oral";

// {user_id}/{uuid}.ext  — evita path traversal
const PATH_RE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]+$/i;

// Extensión → MIME type para el FormData que envía Whisper
const EXT_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  mp4: "audio/mp4",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  wav: "audio/wav",
  webm: "audio/webm",
  aac: "audio/aac",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  const configuredModel = Deno.env.get("OPENAI_TRANSCRIPTION_MODEL");

  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "Transcripción no configurada en el servidor. Contacta al administrador.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "No autorizado." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "No autorizado." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verificar perfil activo
  const { data: perfil, error: perfilErr } = await adminClient
    .from("perfiles")
    .select("activo")
    .eq("user_id", user.id)
    .single();
  if (perfilErr || !perfil) {
    return new Response(
      JSON.stringify({ error: "No se pudo verificar tu perfil." }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  if (perfil.activo === false) {
    return new Response(JSON.stringify({ error: "Usuario inactivo." }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Leer body JSON
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Cuerpo de petición inválido." }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  if (!isRecord(body)) {
    return new Response(
      JSON.stringify({ error: "Cuerpo de petición inválido." }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const { storage_path, duracion_segundos: duracionRaw } = body;
  const courseKey = parseCourseKey(
    (body as Record<string, unknown>).course_key,
  );
  const isEN = courseKey === "english-a-literature";
  // Modo verbatim: para el oral conversacional de Spanish B necesitamos conservar
  // los errores propios de un hablante no nativo (gramática, concordancias, dudas)
  // para poder evaluar el Criterio A. Whisper en modo "smart" tiende a corregirlos.
  const verbatim = (body as Record<string, unknown>).verbatim === true;
  const transcriptionLanguage = isEN ? "en" : "es";
  const transcriptionPrompt = verbatim
    ? "Transcribe exactamente lo que se oye en este oral de Español B (alumno no nativo): conserva los errores gramaticales, las concordancias incorrectas, las repeticiones y las dudas tal cual se pronuncian. No corrijas, no reformules y no completes frases."
    : isEN
    ? "Transcribe an IB Individual Oral for English A: Literature. Preserve literary work titles, authors, short quotations, and IB literary analysis terminology in English."
    : "Transcribe con precisión un oral de Español A: Literatura del Bachillerato Internacional. Mantén nombres de obras, autores, citas breves y terminología literaria en español.";

  // Límite diario. Se exime el modo verbatim: pertenece a una sesión oral B ya
  // limitada y cobrada aguas arriba (create-oral-b-session), no a la subida libre.
  if (!verbatim) {
    const hoy = new Date().toISOString().slice(0, 10);
    const { count } = await adminClient
      .from("llm_uso")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("edge_function", ["core-transcribe-audio", "transcribe-oral"])
      .gte("created_at", `${hoy}T00:00:00Z`);

    if ((count ?? 0) >= LIMITE_TRANSCRIPCION_DIARIO) {
      return new Response(
        JSON.stringify({
          error:
            `Has alcanzado el límite diario de ${LIMITE_TRANSCRIPCION_DIARIO} transcripciones. Vuelve mañana.`,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  }

  // Validar storage_path: formato y pertenencia al usuario
  if (typeof storage_path !== "string" || !PATH_RE.test(storage_path)) {
    return new Response(
      JSON.stringify({ error: "Ruta de archivo inválida." }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  if (storage_path.split("/")[0] !== user.id) {
    return new Response(
      JSON.stringify({ error: "No autorizado para acceder a este archivo." }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const duracionCliente =
    typeof duracionRaw === "number" && Number.isFinite(duracionRaw)
      ? Math.max(0, Math.round(duracionRaw))
      : null;

  // En modo verbatim forzamos whisper-1: es más literal que gpt-4o-*-transcribe y
  // admite temperature 0 para minimizar la "corrección" automática del habla L2.
  const TRANSCRIPTION_MODEL = verbatim ? "whisper-1" : (configuredModel ??
    (duracionCliente !== null && duracionCliente > LONG_AUDIO_SECONDS
      ? "whisper-1"
      : DEFAULT_TRANSCRIPTION_MODEL));

  // Descargar audio desde Storage con service role
  const { data: audioBlob, error: dlError } = await adminClient.storage
    .from(BUCKET)
    .download(storage_path);

  const limpiarStorage = async () => {
    await adminClient.storage.from(BUCKET).remove([storage_path]);
  };

  if (dlError || !audioBlob) {
    return new Response(
      JSON.stringify({ error: "No se pudo recuperar el archivo de audio." }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  if (audioBlob.size > WHISPER_MAX_BYTES) {
    await limpiarStorage();
    return new Response(
      JSON.stringify({
        error:
          "El archivo supera el límite de 25 MB de Whisper. Comprime el audio antes de subir.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Reservar slot en llm_uso
  const { data: usoRow } = await adminClient
    .from("llm_uso")
    .insert({
      user_id: user.id,
      edge_function: "core-transcribe-audio",
      modelo: TRANSCRIPTION_MODEL,
      tokens_entrada: 0,
      tokens_salida: 0,
    })
    .select("id")
    .single();

  const cancelarUso = async () => {
    if (usoRow?.id) {
      await adminClient.from("llm_uso").delete().eq("id", usoRow.id);
    }
  };

  // Determinar MIME type a partir de la extensión del path
  const ext = storage_path.split(".").pop()?.toLowerCase() ?? "webm";
  const mimeType = EXT_MIME[ext] ?? "audio/webm";
  const fileName = storage_path.split("/").pop() ?? `audio.${ext}`;
  const audioFile = new File([audioBlob], fileName, { type: mimeType });

  const transcriptionForm = new FormData();
  transcriptionForm.append("file", audioFile, fileName);
  transcriptionForm.append("model", TRANSCRIPTION_MODEL);
  transcriptionForm.append("language", transcriptionLanguage);
  transcriptionForm.append(
    "response_format",
    TRANSCRIPTION_MODEL === "whisper-1" ? "verbose_json" : "json",
  );
  transcriptionForm.append("prompt", transcriptionPrompt);
  if (verbatim) transcriptionForm.append("temperature", "0");

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    TRANSCRIPTION_TIMEOUT_MS,
  );
  let transcriptionRes: Response;
  try {
    transcriptionRes = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: transcriptionForm,
        signal: controller.signal,
      },
    );
  } catch (error) {
    await limpiarStorage();
    await cancelarUso();
    const aborted = error instanceof DOMException &&
      error.name === "AbortError";
    return new Response(
      JSON.stringify({
        error: aborted
          ? "La transcripción tardó demasiado. Prueba con un archivo más corto o comprimido."
          : "Error al conectar con el servicio de transcripción.",
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } finally {
    clearTimeout(timeoutId);
  }

  // Borrar el audio de Storage independientemente del resultado de Whisper
  await limpiarStorage();

  if (!transcriptionRes.ok) {
    await cancelarUso();
    return new Response(
      JSON.stringify({
        error:
          `Error en la transcripción (${transcriptionRes.status}). Verifica que el archivo sea de audio válido y esté en un formato compatible.`,
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const transcriptionData = await transcriptionRes.json();
  if (
    !isRecord(transcriptionData) || typeof transcriptionData.text !== "string"
  ) {
    await cancelarUso();
    return new Response(
      JSON.stringify({
        error: "Respuesta inesperada del servicio de transcripción.",
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const transcript = transcriptionData.text.trim();
  if (!transcript) {
    await cancelarUso();
    return new Response(
      JSON.stringify({ error: "No se detectó voz en el archivo de audio." }),
      {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const duracionSegundos = typeof transcriptionData.duration === "number"
    ? Math.round(transcriptionData.duration)
    : duracionCliente;

  console.log("transcribe-oral completed", {
    model: TRANSCRIPTION_MODEL,
    bytes: audioBlob.size,
    ms: Date.now() - startedAt,
  });

  return new Response(
    JSON.stringify({
      transcript,
      duracion_segundos: duracionSegundos,
      modelo: TRANSCRIPTION_MODEL,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
