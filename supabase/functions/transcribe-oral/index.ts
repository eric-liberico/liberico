import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LIMITE_TRANSCRIPCION_DIARIO = 3;
const WHISPER_MAX_BYTES = 25 * 1024 * 1024; // 25 MB

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

  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Transcripción no configurada en el servidor. Contacta al administrador." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
  const { data: perfil } = await adminClient
    .from("perfiles")
    .select("activo")
    .eq("user_id", user.id)
    .single();
  if (perfil?.activo === false) {
    return new Response(JSON.stringify({ error: "Usuario inactivo." }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Límite diario (soft lock — sin advisory lock, coste de Whisper es bajo)
  const hoy = new Date().toISOString().slice(0, 10);
  const { count } = await adminClient
    .from("llm_uso")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("edge_function", "transcribe-oral")
    .gte("created_at", `${hoy}T00:00:00Z`);

  if ((count ?? 0) >= LIMITE_TRANSCRIPCION_DIARIO) {
    return new Response(
      JSON.stringify({
        error: `Has alcanzado el límite diario de ${LIMITE_TRANSCRIPCION_DIARIO} transcripciones. Vuelve mañana.`,
      }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Leer multipart
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return new Response(JSON.stringify({ error: "No se pudo leer el archivo de audio." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const audioFile = formData.get("audio");
  if (!(audioFile instanceof File)) {
    return new Response(
      JSON.stringify({ error: "No se recibió un archivo de audio válido (campo 'audio' requerido)." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (audioFile.size > WHISPER_MAX_BYTES) {
    return new Response(
      JSON.stringify({
        error: "El archivo supera el límite de 25 MB de Whisper. Comprime el audio antes de subir.",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Reservar slot en llm_uso
  const { data: usoRow } = await adminClient
    .from("llm_uso")
    .insert({
      user_id: user.id,
      edge_function: "transcribe-oral",
      modelo: "whisper-1",
      tokens_entrada: 0,
      tokens_salida: 0,
    })
    .select("id")
    .single();

  const cancelarUso = async () => {
    if (usoRow?.id) await adminClient.from("llm_uso").delete().eq("id", usoRow.id);
  };

  // Llamar a OpenAI Whisper
  const whisperForm = new FormData();
  whisperForm.append("file", audioFile, audioFile.name);
  whisperForm.append("model", "whisper-1");
  whisperForm.append("language", "es");
  whisperForm.append("response_format", "verbose_json");

  let whisperRes: Response;
  try {
    whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: whisperForm,
    });
  } catch {
    await cancelarUso();
    return new Response(
      JSON.stringify({ error: "Error al conectar con el servicio de transcripción." }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!whisperRes.ok) {
    await cancelarUso();
    return new Response(
      JSON.stringify({
        error: `Error en la transcripción (${whisperRes.status}). Verifica que el archivo sea de audio válido y esté en un formato compatible.`,
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const whisperData = await whisperRes.json();
  if (!isRecord(whisperData) || typeof whisperData.text !== "string") {
    await cancelarUso();
    return new Response(
      JSON.stringify({ error: "Respuesta inesperada del servicio de transcripción." }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const transcript = (whisperData.text as string).trim();
  const duracionSegundos =
    typeof whisperData.duration === "number" ? Math.round(whisperData.duration) : null;

  return new Response(
    JSON.stringify({ transcript, duracion_segundos: duracionSegundos }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
