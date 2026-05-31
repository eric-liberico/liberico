// Edge Function: generate-questions-paper2-b
// Genera ítems de comprensión (opción múltiple, V/F con justificación, respuesta
// corta) para una sección de la Prueba 2 (auditiva o lectura) a partir de un
// texto o transcripción. Devuelve los ítems SIN las respuestas correctas: la
// corrección la realiza evaluate-paper2-b re-juzgando contra la fuente.
// Usa Sonnet (barato), con cuota/log de uso propio y tool use forzado.

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

type AnthropicContentBlock = { type?: unknown; input?: unknown };

type AnthropicResponse = {
  stop_reason?: string;
  usage?: AnthropicUsage;
  content?: AnthropicContentBlock[];
};

function isRecord(v: unknown): v is JsonRecord {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FORMATOS = new Set([
  "opcion_multiple",
  "vf_justificacion",
  "respuesta_corta",
  "completar_espacios",
  "completar_oracion",
  "vocabulario_contexto",
  "referencia_pronominal",
]);
const FORMATOS_ENUM = [...FORMATOS];

const ITEMS_TOOL: Record<string, unknown> = {
  name: "registrar_items",
  description:
    "Devuelve los ítems de comprensión generados para la sección (sin las respuestas correctas).",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["items"],
    properties: {
      items: {
        type: "array",
        minItems: 6,
        maxItems: 10,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["formato", "enunciado", "puntos"],
          properties: {
            formato: { type: "string", enum: FORMATOS_ENUM },
            enunciado: { type: "string", minLength: 5 },
            opciones: { type: "array", items: { type: "string" }, maxItems: 8 },
            puntos: { type: "integer", minimum: 1, maximum: 2 },
          },
        },
      },
    },
  },
};

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

    const seccion = body.seccion === "auditiva" ? "auditiva" : "lectura";
    const uiLang: UiLang = body.ui_lang === "es" ? "es" : "en";
    const nivel: "SL" | "HL" = body.nivel === "HL" ? "HL" : "SL";
    const audioId =
      typeof body.audio_id === "string" && UUID_RE.test(body.audio_id) ? body.audio_id : null;

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) return jsonError("ANTHROPIC_API_KEY no configurada.", 500);
    const MODEL = Deno.env.get("ANTHROPIC_QUESTIONS_MODEL") ?? DEFAULT_QUESTIONS_MODEL;

    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_SERVICE_ROLE_KEY) return jsonError("Configuración del servidor incompleta.", 500);
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Para la sección auditiva, la fuente es la transcripción del audio, que se
    // recupera server-side (el alumno nunca la recibe). Para lectura, llega en el body.
    let sourceText = "";
    if (seccion === "auditiva") {
      if (!audioId) return jsonError("Falta el audio para la sección auditiva.", 400);
      const { data: audioRow, error: audioErr } = await adminClient
        .from("audios_paper2_b")
        .select("transcript_es,activo")
        .eq("id", audioId)
        .maybeSingle();
      if (audioErr || !audioRow?.transcript_es) return jsonError("No se encontró la transcripción del audio.", 400);
      if (audioRow.activo === false) return jsonError("Audio no disponible.", 404);
      sourceText = String(audioRow.transcript_es).trim();
    } else {
      sourceText = typeof body.source_text === "string" ? body.source_text.trim() : "";
    }
    if (!sourceText || sourceText.length < 50) return jsonError("La fuente es demasiado corta.", 400);
    if (sourceText.length > 8000) return jsonError("La fuente supera el límite permitido.", 400);

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

    const { data: nuevoSaldo, error: creditErr } = await adminClient.rpc("deducir_creditos", {
      p_user_id: userId,
      p_cantidad: CREDITOS_PREGUNTAS,
      p_concepto: "generate-questions-paper2-b",
      p_metadata: { course_key: "spanish-b-language", seccion },
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

    const fuenteLabel = seccion === "auditiva" ? "TRANSCRIPCIÓN DEL AUDIO" : "TEXTO";
    const userPrompt =
      `SECCIÓN: ${seccion === "auditiva" ? "comprensión auditiva" : "comprensión de lectura"}\n\n` +
      `${fuenteLabel}:\n${sourceText}\n\n` +
      `Genera entre 6 y 10 ítems de comprensión variados (al menos 4 formatos distintos) sobre esta fuente y llama a la herramienta registrar_items.`;

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
          max_tokens: 2600,
          system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: userPrompt }],
          tools: [ITEMS_TOOL],
          tool_choice: { type: "tool", name: "registrar_items" },
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

    const data = (await response.json()) as AnthropicResponse;
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
      await reembolsarCreditos();
      return jsonError("La generación quedó incompleta. Prueba con una fuente más corta.", 502);
    }

    const toolUseBlock = data.content?.find((b) => b.type === "tool_use");
    const rawItems = isRecord(toolUseBlock?.input) ? toolUseBlock.input.items : null;
    if (!Array.isArray(rawItems)) {
      await reembolsarCreditos();
      return jsonError("La IA no devolvió ítems válidos. Inténtalo de nuevo.", 502);
    }

    const prefix = seccion === "auditiva" ? "a" : "l";
    const items = rawItems
      .filter(isRecord)
      .filter((it) => typeof it.formato === "string" && FORMATOS.has(it.formato) && typeof it.enunciado === "string")
      .map((it, i) => {
        const puntos = typeof it.puntos === "number" && Number.isFinite(it.puntos)
          ? Math.max(1, Math.min(2, Math.round(it.puntos)))
          : 1;
        const opciones = Array.isArray(it.opciones)
          ? (it.opciones as unknown[]).filter((o) => typeof o === "string").slice(0, 8) as string[]
          : undefined;
        return {
          id: `${prefix}${i + 1}`,
          seccion,
          formato: it.formato as string,
          enunciado: (it.enunciado as string).trim(),
          ...(opciones && opciones.length >= 2 ? { opciones } : {}),
          puntos,
        };
      });

    if (items.length < 3) {
      await reembolsarCreditos();
      return jsonError("No se generaron suficientes ítems. Inténtalo de nuevo.", 502);
    }

    return new Response(JSON.stringify({ items }), {
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
