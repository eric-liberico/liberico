// Edge Function: evaluate-paper2-b
// Evalúa las respuestas de comprensión lectora de Spanish B Paper 2.
//
// Flujo:
//  1. Auth → perfil → cuota (reservar_cuota_paper, scope user+course+p2).
//  2. System prompt cacheado (PAPER2_B_BASIC_ES/EN).
//  3. Llamada a Anthropic con tool_choice forzado.
//  4. Parseo, clamp de criterios, cálculo de nota IB (/20 → 1-7).
//  5. INSERT en evaluaciones_paper2_b (RLS por user_id).
//  6. Gamificación no-fatal.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { procesarGamificacion } from "../_shared/gamificacion.ts";
import { type CourseKey, parseCourseKey } from "../_shared/courses.ts";
import { buildSystemPrompt, type UiLang } from "../_shared/prompts/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type JsonRecord = Record<string, unknown>;

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

const LIMITE_DIARIO = 10;
const CREDITOS_EVALUACION = 2.0;
const MIN_FEEDBACK_CHARS = 40;
const DEFAULT_EVALUATION_MODEL = "claude-opus-4-7";
const ANTHROPIC_MAX_TOKENS = 2500;
const ANTHROPIC_TIMEOUT_MS = 90_000;

const THEMES = new Set([
  "identidades", "experiencias", "ingenio_humano",
  "organizacion_social", "planeta_compartido",
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(v: unknown): v is JsonRecord {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

function notaIBFromTotal(total: number): number {
  if (total <= 2) return 1;
  if (total <= 5) return 2;
  if (total <= 9) return 3;
  if (total <= 12) return 4;
  if (total <= 15) return 5;
  if (total <= 17) return 6;
  return 7;
}

const JUSTIFICACION_SCHEMA: Record<string, unknown> = {
  type: "string",
  minLength: MIN_FEEDBACK_CHARS,
  description: "Comentario específico de 2-3 frases con referencias concretas a las respuestas del alumno.",
};

const FEEDBACK_GENERAL_SCHEMA: Record<string, unknown> = {
  type: "string",
  minLength: MIN_FEEDBACK_CHARS,
  description: "Feedback específico y accionable.",
};

const EVAL_TOOL: Record<string, unknown> = {
  name: "registrar_evaluacion_paper2_b",
  description: "Registra la evaluación de comprensión lectora Spanish B: puntuaciones A/B, justificaciones y feedback global.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "criterio_a", "criterio_b",
      "justificacion_a", "justificacion_b",
      "comentario_global", "fortalezas", "areas_mejora",
    ],
    properties: {
      criterio_a: { type: "integer", minimum: 0, maximum: 10 },
      criterio_b: { type: "integer", minimum: 0, maximum: 10 },
      justificacion_a: JUSTIFICACION_SCHEMA,
      justificacion_b: JUSTIFICACION_SCHEMA,
      comentario_global: FEEDBACK_GENERAL_SCHEMA,
      fortalezas: FEEDBACK_GENERAL_SCHEMA,
      areas_mejora: FEEDBACK_GENERAL_SCHEMA,
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
    const token = parts[1];

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
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
    if (!isRecord(body)) return jsonError("Cuerpo de petición inválido.", 400);

    const courseKey: CourseKey = parseCourseKey(body.course_key);
    if (courseKey !== "spanish-b-language")
      return jsonError("Este endpoint solo evalúa Spanish B Paper 2.", 400);

    const textoContent = typeof body.texto_content === "string" ? body.texto_content.trim() : "";
    if (!textoContent || textoContent.length < 50) return jsonError("El texto es demasiado corto.", 400);
    if (textoContent.length > 8000) return jsonError("El texto supera el límite.", 400);

    const theme = typeof body.theme === "string" ? body.theme : "";
    if (!THEMES.has(theme)) return jsonError("Tema inválido.", 400);

    const preguntas = Array.isArray(body.preguntas) ? (body.preguntas as unknown[]).filter((p) => typeof p === "string") as string[] : [];
    const respuestas = Array.isArray(body.respuestas) ? (body.respuestas as unknown[]).filter((r) => typeof r === "string") as string[] : [];

    if (preguntas.length < 2) return jsonError("Se necesitan al menos 2 preguntas.", 400);
    if (respuestas.length < 2) return jsonError("Se necesitan al menos 2 respuestas.", 400);
    if (preguntas.length !== respuestas.length) return jsonError("El número de preguntas y respuestas no coincide.", 400);

    const textoId =
      typeof body.texto_id === "string" && UUID_RE.test(body.texto_id) ? body.texto_id : null;
    const uiLang: UiLang = body.ui_lang === "es" ? "es" : "en";
    const nivel: "SL" | "HL" = body.nivel === "HL" ? "HL" : "SL";

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) return jsonError("ANTHROPIC_API_KEY no configurada.", 500);
    const EVALUATION_MODEL = Deno.env.get("ANTHROPIC_EVALUATION_MODEL") ?? DEFAULT_EVALUATION_MODEL;

    const { data: reserva, error: reservaErr } = await adminClient.rpc("reservar_cuota_paper", {
      p_user_id: userId,
      p_course_key: courseKey,
      p_paper: "p2",
      p_limite: LIMITE_DIARIO,
      p_edge_function: "evaluate-paper2-b",
      p_modelo: EVALUATION_MODEL,
    });
    if (reservaErr) return jsonError("No se pudo verificar el límite de uso.", 500);
    if (reserva === null) return jsonError("Has alcanzado el límite diario de evaluaciones de lectura. Vuelve mañana.", 429);
    const usoId = reserva as string;

    const cancelarCuota = async () => {
      await adminClient.from("llm_uso").delete().eq("id", usoId);
    };

    // ── Deducir créditos ───────────────────────────────────────────────────
    const { data: nuevoSaldo, error: creditErr } = await adminClient.rpc("deducir_creditos", {
      p_user_id: userId,
      p_cantidad: CREDITOS_EVALUACION,
      p_concepto: "evaluate-paper2-b",
      p_metadata: { course_key: courseKey },
    });
    if (creditErr) {
      await cancelarCuota();
      console.error("Error deduciendo créditos:", creditErr);
      return jsonError("No se pudo verificar tu saldo de créditos.", 500);
    }
    if (nuevoSaldo === null) {
      await cancelarCuota();
      return jsonError(
        `Créditos insuficientes. Necesitas ${CREDITOS_EVALUACION} créditos para corregir esta prueba.`,
        402,
      );
    }

    const reembolsarCreditos = async () => {
      await adminClient.rpc("reembolsar_creditos", {
        p_user_id: userId,
        p_cantidad: CREDITOS_EVALUACION,
        p_concepto: "evaluate-paper2-b",
        p_metadata: { motivo: "error_anthropic" },
      });
    };

    const qaBlock = preguntas.map((q, i) =>
      `${i + 1}. ${q}\nRespuesta del alumno: ${respuestas[i] ?? "(sin respuesta)"}`
    ).join("\n\n");

    const userPrompt =
      `NIVEL: ${nivel}\n` +
      `TEMA: ${theme}\n\n` +
      `TEXTO LEÍDO:\n${textoContent}\n\n` +
      `PREGUNTAS Y RESPUESTAS DEL ALUMNO:\n${qaBlock}\n\n` +
      `Evalúa las respuestas según los criterios A (Lengua en las respuestas /10) y B (Comprensión del texto /10) de Spanish B ${nivel}. Llama a la herramienta para registrar la evaluación.`;

    const startedAt = Date.now();
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
          model: EVALUATION_MODEL,
          max_tokens: ANTHROPIC_MAX_TOKENS,
          system: [
            {
              type: "text",
              text: buildSystemPrompt({ courseKey, component: "paper2-b-basic", nivel, uiLang }),
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: userPrompt }],
          tools: [EVAL_TOOL],
          tool_choice: { type: "tool", name: "registrar_evaluacion_paper2_b" },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      await cancelarCuota();
      await reembolsarCreditos();
      if (!isAbortError(error)) console.error("Anthropic fetch error:", error);
      return jsonError(
        isAbortError(error) ? "La corrección tardó demasiado." : "No se pudo conectar con el servicio de IA.",
        isAbortError(error) ? 504 : 502,
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response) {
      await cancelarCuota();
      await reembolsarCreditos();
      return jsonError("Sin respuesta del servicio de IA.", 502);
    }

    console.log("evaluate-paper2-b completed", { model: EVALUATION_MODEL, status: response.status, ms: Date.now() - startedAt });

    if (!response.ok) {
      await cancelarCuota();
      await reembolsarCreditos();
      if (response.status === 429) return jsonError("Demasiadas solicitudes. Espera un momento.", 429);
      if (response.status === 529) return jsonError("Servicio de IA sobrecargado.", 529);
      console.error("Anthropic API error:", response.status, await response.text());
      return jsonError("Error del servicio de IA.", 500);
    }

    const data = (await response.json()) as AnthropicResponse;

    if (data.stop_reason === "max_tokens") {
      await cancelarCuota();
      await reembolsarCreditos();
      return jsonError("La corrección quedó incompleta. Inténtalo de nuevo.", 502);
    }

    if (data.usage) {
      await adminClient.from("llm_uso").update({
        modelo: EVALUATION_MODEL,
        tokens_entrada: data.usage.input_tokens ?? 0,
        tokens_salida: data.usage.output_tokens ?? 0,
        cache_creation_tokens: data.usage.cache_creation_input_tokens ?? 0,
        cache_read_tokens: data.usage.cache_read_input_tokens ?? 0,
      }).eq("id", usoId);
    }

    const toolUseBlock = data.content?.find((b) => b.type === "tool_use");
    if (!isRecord(toolUseBlock?.input)) {
      await cancelarCuota();
      await reembolsarCreditos();
      return jsonError("La IA no devolvió una evaluación válida.", 500);
    }

    const ev = toolUseBlock.input;
    const clampInt = (v: unknown, min: number, max: number): number =>
      typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : 0;

    const criterio_a = clampInt(ev.criterio_a, 0, 10);
    const criterio_b = clampInt(ev.criterio_b, 0, 10);
    const total = criterio_a + criterio_b;
    const nota_ib = notaIBFromTotal(total);

    const feedbackText = {
      justificacion_a: typeof ev.justificacion_a === "string" ? ev.justificacion_a.trim() : "",
      justificacion_b: typeof ev.justificacion_b === "string" ? ev.justificacion_b.trim() : "",
      comentario_global: typeof ev.comentario_global === "string" ? ev.comentario_global.trim() : "",
      fortalezas: typeof ev.fortalezas === "string" ? ev.fortalezas.trim() : "",
      areas_mejora: typeof ev.areas_mejora === "string" ? ev.areas_mejora.trim() : "",
    };

    const feedbackFaltante = Object.entries(feedbackText)
      .filter(([, v]) => v.length < MIN_FEEDBACK_CHARS).map(([k]) => k);
    if (feedbackFaltante.length > 0) {
      await cancelarCuota();
      await reembolsarCreditos();
      return jsonError("La IA no devolvió comentarios completos. Inténtalo de nuevo.", 500);
    }

    const evaluacion = {
      ...feedbackText,
      criterio_a, criterio_b,
      puntuacion_total: total,
      nota_ib,
    };

    let evaluacionId: string | null = null;
    const { data: insertada, error: insertErr } = await supabase
      .from("evaluaciones_paper2_b")
      .insert({
        user_id: userId,
        course_key: courseKey,
        nivel,
        texto_id: textoId,
        texto_content: textoContent,
        theme,
        preguntas,
        respuestas,
        criterio_a, criterio_b,
        nota_ib,
        justificacion_a: feedbackText.justificacion_a,
        justificacion_b: feedbackText.justificacion_b,
        comentario_global: feedbackText.comentario_global,
        fortalezas: feedbackText.fortalezas,
        areas_mejora: feedbackText.areas_mejora,
        feedback_lang: uiLang,
      })
      .select("id").single();

    if (insertErr || !insertada) {
      console.error("Error guardando evaluación paper2 B:", insertErr);
      return jsonError("La evaluación se generó, pero no se pudo guardar.", 500);
    }
    evaluacionId = insertada.id;

    const gamificacion = await procesarGamificacion(
      adminClient, userId,
      { tipo: "p2", puntuacion_total: total },
      courseKey,
    );
    Object.assign(evaluacion, { gamificacion });

    return new Response(JSON.stringify({ ...evaluacion, evaluacion_id: evaluacionId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate-paper2-b error:", e);
    return jsonError("Error interno del servidor.", 500);
  }
});

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
