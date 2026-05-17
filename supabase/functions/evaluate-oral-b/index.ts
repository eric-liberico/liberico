// Edge Function: evaluate-oral-b
// Evalúa el Oral Individual de Spanish B (guion + notas de discusión) usando Claude.
//
// Flujo:
//  1. Auth → perfil → cuota (reservar_cuota_paper, scope user+course+oral).
//  2. System prompt cacheado (ORAL_B_BASIC_ES/EN según uiLang).
//  3. Llamada a Anthropic con tool_choice = { name: "registrar_evaluacion_oral_b" }.
//  4. Parseo, clamp de criterios, cálculo de nota IB (/30 → 1-7).
//  5. INSERT en evaluaciones_oral_b (RLS por user_id).
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
const ANTHROPIC_MAX_TOKENS = 3000;
const ANTHROPIC_TIMEOUT_MS = 90_000;

const THEMES = new Set([
  "identidades",
  "experiencias",
  "ingenio_humano",
  "organizacion_social",
  "planeta_compartido",
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(v: unknown): v is JsonRecord {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function notaIBFromTotal(total: number): number {
  if (total <= 3) return 1;
  if (total <= 7) return 2;
  if (total <= 12) return 3;
  if (total <= 16) return 4;
  if (total <= 20) return 5;
  if (total <= 25) return 6;
  return 7;
}

const JUSTIFICACION_SCHEMA: Record<string, unknown> = {
  type: "string",
  minLength: MIN_FEEDBACK_CHARS,
  description: "Comentario específico de 2-3 frases que justifica la puntuación con referencias concretas al guion del alumno.",
};

const FEEDBACK_GENERAL_SCHEMA: Record<string, unknown> = {
  type: "string",
  minLength: MIN_FEEDBACK_CHARS,
  description: "Feedback específico y accionable; no puede estar vacío.",
};

const EVAL_TOOL: Record<string, unknown> = {
  name: "registrar_evaluacion_oral_b",
  description: "Registra la evaluación del Oral Individual Spanish B: puntuaciones A/B/C, justificaciones y feedback global.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "criterio_a", "criterio_b", "criterio_c",
      "justificacion_a", "justificacion_b", "justificacion_c",
      "comentario_global", "fortalezas", "areas_mejora",
    ],
    properties: {
      criterio_a: { type: "integer", minimum: 0, maximum: 10 },
      criterio_b: { type: "integer", minimum: 0, maximum: 10 },
      criterio_c: { type: "integer", minimum: 0, maximum: 10 },
      justificacion_a: JUSTIFICACION_SCHEMA,
      justificacion_b: JUSTIFICACION_SCHEMA,
      justificacion_c: JUSTIFICACION_SCHEMA,
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
      return jsonError("Este endpoint solo evalúa Spanish B Oral.", 400);

    const stimulusDescription = typeof body.stimulus_description === "string" ? body.stimulus_description.trim() : "";
    const globalIssue = typeof body.global_issue === "string" ? body.global_issue.trim() : "";
    const theme = typeof body.theme === "string" ? body.theme : "";
    const guion = typeof body.guion === "string" ? body.guion.trim() : "";

    if (!stimulusDescription) return jsonError("Falta la descripción del estímulo.", 400);
    if (!globalIssue) return jsonError("Falta la cuestión global.", 400);
    if (!THEMES.has(theme)) return jsonError("Tema inválido.", 400);
    if (!guion) return jsonError("Falta el guion del oral.", 400);
    if (guion.length > 15000) return jsonError("El guion supera el límite permitido.", 400);
    if (stimulusDescription.length > 2000) return jsonError("La descripción del estímulo supera el límite.", 400);

    const stimulusId =
      typeof body.stimulus_id === "string" && UUID_RE.test(body.stimulus_id)
        ? body.stimulus_id : null;
    const uiLang: UiLang = body.ui_lang === "es" ? "es" : "en";
    const nivel: "SL" | "HL" = body.nivel === "HL" ? "HL" : "SL";
    const guardarHistorial = body.guardar_historial !== false;
    const wordCount = countWords(guion);

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) return jsonError("ANTHROPIC_API_KEY no configurada.", 500);
    const EVALUATION_MODEL = Deno.env.get("ANTHROPIC_EVALUATION_MODEL") ?? DEFAULT_EVALUATION_MODEL;

    const { data: reserva, error: reservaErr } = await adminClient.rpc("reservar_cuota_paper", {
      p_user_id: userId,
      p_course_key: courseKey,
      p_paper: "oral",
      p_limite: LIMITE_DIARIO,
      p_edge_function: "evaluate-oral-b",
      p_modelo: EVALUATION_MODEL,
    });
    if (reservaErr) return jsonError("No se pudo verificar el límite de uso.", 500);
    if (reserva === null) return jsonError("Has alcanzado el límite diario de evaluaciones orales. Vuelve mañana.", 429);
    const usoId = reserva as string;

    const cancelarCuota = async () => {
      await adminClient.from("llm_uso").delete().eq("id", usoId);
    };

    // ── Deducir créditos ───────────────────────────────────────────────────
    const { data: nuevoSaldo, error: creditErr } = await adminClient.rpc("deducir_creditos", {
      p_user_id: userId,
      p_cantidad: CREDITOS_EVALUACION,
      p_concepto: "evaluate-oral-b",
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
        `Créditos insuficientes. Necesitas ${CREDITOS_EVALUACION} créditos para corregir este oral.`,
        402,
      );
    }

    const reembolsarCreditos = async () => {
      await adminClient.rpc("reembolsar_creditos", {
        p_user_id: userId,
        p_cantidad: CREDITOS_EVALUACION,
        p_concepto: "evaluate-oral-b",
        p_metadata: { motivo: "error_anthropic" },
      });
    };

    const userPrompt =
      `NIVEL: ${nivel}\n` +
      `TEMA PRESCRITO: ${theme}\n` +
      `CUESTIÓN GLOBAL: ${globalIssue}\n\n` +
      `ESTÍMULO VISUAL (descripción):\n${stimulusDescription}\n\n` +
      `GUION / TRANSCRIPCIÓN DEL ALUMNO (${wordCount} palabras detectadas):\n${guion}\n\n` +
      `Evalúa este oral según los criterios A (Lengua /10), B (Mensaje /10) y C (Habilidades interactivas /10) de Spanish B ${nivel}. Llama a la herramienta para registrar la evaluación.`;

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
              text: buildSystemPrompt({ courseKey, component: "oral-b-basic", nivel, uiLang }),
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: userPrompt }],
          tools: [EVAL_TOOL],
          tool_choice: { type: "tool", name: "registrar_evaluacion_oral_b" },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      await cancelarCuota();
      await reembolsarCreditos();
      if (!isAbortError(error)) console.error("Anthropic fetch error:", error);
      return jsonError(
        isAbortError(error)
          ? "La corrección tardó demasiado. Inténtalo de nuevo."
          : "No se pudo conectar con el servicio de IA.",
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

    console.log("evaluate-oral-b completed", { model: EVALUATION_MODEL, status: response.status, ms: Date.now() - startedAt });

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
      return jsonError("La corrección quedó incompleta. Prueba con un guion más corto.", 502);
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
    const criterio_c = clampInt(ev.criterio_c, 0, 10);
    const total = criterio_a + criterio_b + criterio_c;
    const nota_ib = notaIBFromTotal(total);

    const feedbackText = {
      justificacion_a: typeof ev.justificacion_a === "string" ? ev.justificacion_a.trim() : "",
      justificacion_b: typeof ev.justificacion_b === "string" ? ev.justificacion_b.trim() : "",
      justificacion_c: typeof ev.justificacion_c === "string" ? ev.justificacion_c.trim() : "",
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
      criterio_a, criterio_b, criterio_c,
      puntuacion_total: total,
      nota_ib,
      word_count: wordCount,
    };

    let evaluacionId: string | null = null;
    if (guardarHistorial) {
      const { data: insertada, error: insertErr } = await supabase
        .from("evaluaciones_oral_b")
        .insert({
          user_id: userId,
          course_key: courseKey,
          nivel,
          stimulus_id: stimulusId,
          stimulus_description: stimulusDescription,
          global_issue: globalIssue,
          theme,
          guion,
          word_count: wordCount,
          criterio_a, criterio_b, criterio_c,
          nota_ib,
          justificacion_a: feedbackText.justificacion_a,
          justificacion_b: feedbackText.justificacion_b,
          justificacion_c: feedbackText.justificacion_c,
          comentario_global: feedbackText.comentario_global,
          fortalezas: feedbackText.fortalezas,
          areas_mejora: feedbackText.areas_mejora,
          feedback_lang: uiLang,
        })
        .select("id").single();

      if (insertErr || !insertada) {
        console.error("Error guardando evaluación oral B:", insertErr);
        return jsonError("La evaluación se generó, pero no se pudo guardar.", 500);
      }
      evaluacionId = insertada.id;

      const gamificacion = await procesarGamificacion(
        adminClient, userId,
        { tipo: "oral", puntuacion_total: total },
        courseKey,
      );
      Object.assign(evaluacion, { gamificacion });
    }

    return new Response(JSON.stringify({ ...evaluacion, evaluacion_id: evaluacionId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate-oral-b error:", e);
    return jsonError("Error interno del servidor.", 500);
  }
});

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
