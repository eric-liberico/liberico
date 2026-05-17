// Edge Function: generate-questions-paper2-b
// Genera 3-4 preguntas de comprensión lectora para un texto dado.
// Usa Sonnet (barato), con cuota/log de uso propio, sin guardado de preguntas en DB.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildSystemPrompt, type UiLang } from "../_shared/prompts/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type JsonRecord = Record<string, unknown>;

const DEFAULT_QUESTIONS_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_TIMEOUT_MS = 40_000;
const LIMITE_DIARIO = 30;
const CREDITOS_PREGUNTAS = 0.5;

type AnthropicUsage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

type AnthropicResponse = {
  stop_reason?: string;
  usage?: AnthropicUsage;
  content?: Array<{ type?: unknown; text?: unknown }>;
};

function isRecord(v: unknown): v is JsonRecord {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
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
      .from("perfiles")
      .select("activo")
      .eq("user_id", userId)
      .maybeSingle();
    if (perfilErr || !perfil) return jsonError("No se pudo verificar tu perfil.", 403);
    if (perfil.activo === false) return jsonError("Usuario inactivo.", 403);

    const body: unknown = await req.json();
    if (!isRecord(body)) return jsonError("Cuerpo inválido.", 400);

    const textoContent = typeof body.texto_content === "string" ? body.texto_content.trim() : "";
    if (!textoContent || textoContent.length < 50) return jsonError("El texto es demasiado corto.", 400);
    if (textoContent.length > 8000) return jsonError("El texto supera el límite permitido.", 400);

    const uiLang: UiLang = body.ui_lang === "es" ? "es" : "en";
    const nivel: "SL" | "HL" = body.nivel === "HL" ? "HL" : "SL";

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) return jsonError("ANTHROPIC_API_KEY no configurada.", 500);
    const MODEL = Deno.env.get("ANTHROPIC_QUESTIONS_MODEL") ?? DEFAULT_QUESTIONS_MODEL;

    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_SERVICE_ROLE_KEY) return jsonError("Configuración del servidor incompleta.", 500);
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countErr } = await adminClient
      .from("llm_uso")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("edge_function", "generate-questions-paper2-b")
      .gte("created_at", hace24h);
    if (countErr) return jsonError("No se pudo verificar el límite de uso.", 500);
    if ((count ?? 0) >= LIMITE_DIARIO) {
      return jsonError("Has alcanzado el límite diario de generación de preguntas. Vuelve mañana.", 429);
    }

    const { data: usoRow, error: usoErr } = await adminClient
      .from("llm_uso")
      .insert({
        user_id: userId,
        edge_function: "generate-questions-paper2-b",
        modelo: MODEL,
        tokens_entrada: 0,
        tokens_salida: 0,
        course_key: "spanish-b-language",
        paper: "p2",
      })
      .select("id")
      .single();
    if (usoErr || !usoRow) return jsonError("No se pudo registrar el uso.", 500);
    const usoId = usoRow.id as string;

    const cancelarCuota = async () => {
      await adminClient.from("llm_uso").delete().eq("id", usoId);
    };

    // ── Deducir créditos ───────────────────────────────────────────────────
    const { data: nuevoSaldo, error: creditErr } = await adminClient.rpc("deducir_creditos", {
      p_user_id: userId,
      p_cantidad: CREDITOS_PREGUNTAS,
      p_concepto: "generate-questions-paper2-b",
      p_metadata: { course_key: "spanish-b-language" },
    });
    if (creditErr) {
      await cancelarCuota();
      console.error("Error deduciendo créditos:", creditErr);
      return jsonError("No se pudo verificar tu saldo de créditos.", 500);
    }
    if (nuevoSaldo === null) {
      await cancelarCuota();
      return jsonError(
        `Créditos insuficientes. Necesitas ${CREDITOS_PREGUNTAS} créditos para generar preguntas.`,
        402,
      );
    }

    const reembolsarCreditos = async () => {
      await adminClient.rpc("reembolsar_creditos", {
        p_user_id: userId,
        p_cantidad: CREDITOS_PREGUNTAS,
        p_concepto: "generate-questions-paper2-b",
        p_metadata: { motivo: "error_anthropic" },
      });
    };

    const systemPrompt = buildSystemPrompt({
      courseKey: "spanish-b-language",
      component: "questions-paper2-b",
      nivel,
      uiLang,
    });

    const userPrompt =
      `Genera 3 preguntas de comprensión para el siguiente texto. Devuelve SOLO las preguntas numeradas, sin explicaciones ni encabezados adicionales.\n\nTEXTO:\n${textoContent}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS);
    let response: Response | null = null;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 800,
          system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      await cancelarCuota();
      await reembolsarCreditos();
      if (!isAbortError(error)) console.error("Anthropic fetch error:", error);
      return jsonError(
        isAbortError(error) ? "La generación tardó demasiado. Inténtalo de nuevo." : "No se pudo conectar con el servicio de IA.",
        isAbortError(error) ? 504 : 502,
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response?.ok) {
      await cancelarCuota();
      await reembolsarCreditos();
      console.error("Anthropic error:", response?.status);
      return jsonError("Error del servicio de IA.", 500);
    }

    const data = await response.json() as AnthropicResponse;
    if (data.usage) {
      await adminClient
        .from("llm_uso")
        .update({
          modelo: MODEL,
          tokens_entrada: data.usage.input_tokens ?? 0,
          tokens_salida: data.usage.output_tokens ?? 0,
          cache_creation_tokens: data.usage.cache_creation_input_tokens ?? 0,
          cache_read_tokens: data.usage.cache_read_input_tokens ?? 0,
        })
        .eq("id", usoId);
    }

    if (data.stop_reason === "max_tokens") {
      return jsonError("La generación quedó incompleta. Prueba con un texto más corto.", 502);
    }

    const textBlock = data.content?.find((b) => b.type === "text");
    const text = typeof textBlock?.text === "string" ? textBlock.text : "";

    // Parsear preguntas numeradas del texto libre
    const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);
    const preguntas: string[] = [];
    for (const line of lines) {
      const match = line.match(/^(\d+[\.\):])\s+(.+)$/);
      if (match) preguntas.push(match[2].trim());
      else if (preguntas.length > 0 && !line.match(/^\d/)) {
        // continuación de la pregunta anterior
        preguntas[preguntas.length - 1] += " " + line;
      }
    }

    if (preguntas.length < 2) {
      return jsonError("No se generaron suficientes preguntas. Inténtalo de nuevo.", 502);
    }

    return new Response(JSON.stringify({ preguntas: preguntas.slice(0, 4) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-questions-paper2-b error:", e);
    return jsonError("Error interno del servidor.", 500);
  }
});

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
