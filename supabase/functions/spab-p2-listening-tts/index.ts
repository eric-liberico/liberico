// Edge Function: spab-p2-listening-tts
// Sirve (o genera y cachea) el audio de un ítem de comprensión auditiva de la
// Prueba 2 de Spanish B. Si el audio ya está generado, devuelve su URL pública;
// si no, sintetiza la transcripción con OpenAI TTS, lo sube al bucket público
// `audio-listening-b` y guarda la ruta en audios_paper2_b.audio_path.
//
// Reutiliza OPENAI_API_KEY (mismo patrón que transcribe-oral, pero a la inversa).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "audio-listening-b";
const DEFAULT_TTS_MODEL = "gpt-4o-mini-tts";
const DEFAULT_TTS_VOICE = "nova";
const LIMITE_DIARIO = 60; // el audio se cachea, así que el coste real es bajo
const OPENAI_TIMEOUT_MS = 60_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

function publicUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError("No autorizado", 401);
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer" || !parts[1])
      return jsonError("No autorizado", 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser(parts[1]);
    if (userErr || !userData.user) return jsonError("No autorizado", 401);
    const userId = userData.user.id;

    const { data: perfil, error: perfilErr } = await supabase
      .from("perfiles").select("activo").eq("user_id", userId).maybeSingle();
    if (perfilErr || !perfil) return jsonError("No se pudo verificar tu perfil.", 403);
    if (perfil.activo === false) return jsonError("Usuario inactivo.", 403);

    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_SERVICE_ROLE_KEY) return jsonError("Configuración del servidor incompleta.", 500);
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body: unknown = await req.json();
    if (!isRecord(body)) return jsonError("Cuerpo inválido.", 400);
    const audioId = typeof body.audio_id === "string" && UUID_RE.test(body.audio_id) ? body.audio_id : null;
    if (!audioId) return jsonError("audio_id inválido.", 400);

    const { data: audioRow, error: audioErr } = await adminClient
      .from("audios_paper2_b")
      .select("transcript_es,audio_path,activo")
      .eq("id", audioId)
      .maybeSingle();
    if (audioErr || !audioRow) return jsonError("Audio no encontrado.", 404);
    if (audioRow.activo === false) return jsonError("Audio no disponible.", 404);

    // Cache hit: ya generado.
    if (typeof audioRow.audio_path === "string" && audioRow.audio_path) {
      return jsonOk({ url: publicUrl(SUPABASE_URL, audioRow.audio_path) });
    }

    const transcript = typeof audioRow.transcript_es === "string" ? audioRow.transcript_es.trim() : "";
    if (!transcript) return jsonError("El audio no tiene transcripción.", 400);
    if (transcript.length > 4000) return jsonError("La transcripción es demasiado larga para sintetizar.", 400);

    // Límite diario de generaciones (no de reproducciones cacheadas).
    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await adminClient
      .from("llm_uso")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("edge_function", ["spab-p2-listening-tts", "tts-listening-b"])
      .gte("created_at", hace24h);
    if ((count ?? 0) >= LIMITE_DIARIO)
      return jsonError("Has alcanzado el límite diario de generación de audio. Vuelve mañana.", 429);

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) return jsonError("OPENAI_API_KEY no configurada.", 500);
    const TTS_MODEL = Deno.env.get("OPENAI_TTS_MODEL") ?? DEFAULT_TTS_MODEL;
    const TTS_VOICE = Deno.env.get("OPENAI_TTS_VOICE") ?? DEFAULT_TTS_VOICE;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
    let ttsRes: Response | null = null;
    try {
      ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: TTS_MODEL,
          voice: TTS_VOICE,
          input: transcript,
          response_format: "mp3",
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (!isAbortError(error)) console.error("OpenAI TTS fetch error:", error);
      return jsonError(
        isAbortError(error) ? "La síntesis de audio tardó demasiado." : "No se pudo conectar con el servicio de audio.",
        isAbortError(error) ? 504 : 502,
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!ttsRes.ok) {
      console.error("OpenAI TTS error:", ttsRes.status, await ttsRes.text());
      return jsonError("No se pudo generar el audio.", 502);
    }

    const audioBytes = new Uint8Array(await ttsRes.arrayBuffer());
    const path = `${audioId}.mp3`;

    const { error: uploadErr } = await adminClient.storage
      .from(BUCKET)
      .upload(path, audioBytes, { contentType: "audio/mpeg", upsert: true });
    if (uploadErr) {
      console.error("Storage upload error:", uploadErr);
      return jsonError("No se pudo guardar el audio.", 500);
    }

    await adminClient.from("audios_paper2_b").update({ audio_path: path }).eq("id", audioId);

    // Log de uso (coste de la síntesis).
    await adminClient.from("llm_uso").insert({
      user_id: userId,
      edge_function: "spab-p2-listening-tts",
      modelo: TTS_MODEL,
      tokens_entrada: 0,
      tokens_salida: 0,
      course_key: "spanish-b-language",
      paper: "p2",
    });

    return jsonOk({ url: publicUrl(SUPABASE_URL, path) });
  } catch (e) {
    console.error("tts-listening-b error:", e);
    return jsonError("Error interno del servidor.", 500);
  }
});

function jsonOk(payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
