// Edge Function: evaluate-paper1-b
// Evalúa la Prueba 1 de Spanish B (producción escrita SL) usando Claude
// con tool_choice forzado. Modelo en src/lib/criteria/spanish-b-language.ts.
//
// Flujo:
//  1. Auth → perfil → cuota (RPC reservar_cuota_paper, scope user+course+paper).
//  2. System prompt cacheado (PAPER1_B_BASIC_ES/EN según uiLang del alumno).
//  3. Llamada a Anthropic con tool_choice = { name: "registrar_evaluacion_b1" }.
//  4. Parseo, clamp de bandas, cálculo de nota IB (escala /30 → 1-7).
//  5. INSERT en evaluaciones_paper1_b (RLS por user_id) si guardar_historial.
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

type AnthropicContentBlock = {
  type?: unknown;
  input?: unknown;
};

type AnthropicResponse = {
  stop_reason?: string;
  usage?: AnthropicUsage;
  content?: AnthropicContentBlock[];
};

const LIMITE_DIARIO = 15;
const MIN_FEEDBACK_CHARS = 40;
const DEFAULT_EVALUATION_MODEL = "claude-opus-4-7";
const ANTHROPIC_MAX_TOKENS = 3500;
const ANTHROPIC_TIMEOUT_MS = 90_000;

const TEXT_TYPES = new Set([
  "blog",
  "email",
  "article",
  "brochure",
  "speech",
  "interview",
  "instructions",
  "leaflet",
  "proposal",
  "report",
  "review",
]);
const THEMES = new Set([
  "identidades",
  "experiencias",
  "ingenio_humano",
  "organizacion_social",
  "planeta_compartido",
]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

const JUSTIFICACION_SCHEMA: Record<string, unknown> = {
  type: "string",
  minLength: MIN_FEEDBACK_CHARS,
  description:
    "Comentario específico de 2-3 frases que justifica la puntuación con referencias concretas al texto del alumno.",
};

const FEEDBACK_GENERAL_SCHEMA: Record<string, unknown> = {
  type: "string",
  minLength: MIN_FEEDBACK_CHARS,
  description: "Feedback específico y accionable; no puede estar vacío.",
};

const ERROR_LENGUA_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["categoria", "fragmento", "correccion"],
  properties: {
    categoria: {
      type: "string",
      enum: ["gramatica", "lexico", "registro", "ortografia", "conector", "otro"],
    },
    fragmento: { type: "string", minLength: 1 },
    correccion: { type: "string", minLength: 1 },
  },
};

const APROPIACION_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["nota", "estado"],
  properties: {
    nota: { type: "string", minLength: 5 },
    estado: { type: "string", enum: ["respeta", "incumple", "parcial"] },
  },
};

const EVAL_TOOL: Record<string, unknown> = {
  name: "registrar_evaluacion_b1",
  description:
    "Registra la evaluación de Prueba 1 Spanish B SL (producción escrita): puntuaciones A/B/C, justificaciones, feedback global, errores de lengua y notas de apropiación del tipo de texto.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "criterio_a",
      "criterio_b",
      "criterio_c",
      "justificacion_a",
      "justificacion_b",
      "justificacion_c",
      "comentario_global",
      "fortalezas",
      "areas_mejora",
      "errores_lengua",
      "apropiacion_tipo_texto",
    ],
    properties: {
      criterio_a: { type: "integer", minimum: 0, maximum: 12 },
      criterio_b: { type: "integer", minimum: 0, maximum: 12 },
      criterio_c: { type: "integer", minimum: 0, maximum: 6 },
      justificacion_a: JUSTIFICACION_SCHEMA,
      justificacion_b: JUSTIFICACION_SCHEMA,
      justificacion_c: JUSTIFICACION_SCHEMA,
      comentario_global: FEEDBACK_GENERAL_SCHEMA,
      fortalezas: FEEDBACK_GENERAL_SCHEMA,
      areas_mejora: FEEDBACK_GENERAL_SCHEMA,
      errores_lengua: {
        type: "array",
        minItems: 3,
        maxItems: 6,
        items: ERROR_LENGUA_SCHEMA,
      },
      apropiacion_tipo_texto: {
        type: "array",
        minItems: 2,
        maxItems: 4,
        items: APROPIACION_SCHEMA,
      },
    },
  },
};

function notaIBFromTotal(total: number): number {
  if (total <= 3) return 1;
  if (total <= 7) return 2;
  if (total <= 12) return 3;
  if (total <= 16) return 4;
  if (total <= 20) return 5;
  if (total <= 25) return 6;
  return 7;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError("No autorizado", 401);
    }
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer" || !parts[1]) {
      return jsonError("No autorizado", 401);
    }
    const token = parts[1];

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      return jsonError("No autorizado", 401);
    }
    const userId = userData.user.id;

    const { data: perfil, error: perfilErr } = await supabase
      .from("perfiles")
      .select("activo")
      .eq("user_id", userId)
      .maybeSingle();
    if (perfilErr) {
      console.error("Error leyendo perfil:", perfilErr);
      return jsonError("No se pudo verificar tu perfil.", 403);
    }
    if (perfil?.activo === false) {
      return jsonError("Usuario inactivo.", 403);
    }

    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return jsonError("Configuración del servidor incompleta.", 500);
    }
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Validar payload ─────────────────────────────────────────────────────
    const body: unknown = await req.json();
    if (!isRecord(body)) {
      return jsonError("Cuerpo de petición inválido.", 400);
    }

    const courseKey: CourseKey = parseCourseKey(body.course_key);
    if (courseKey !== "spanish-b-language") {
      return jsonError("Este endpoint solo evalúa Spanish B Paper 1.", 400);
    }

    const textType = typeof body.text_type === "string" ? body.text_type : "";
    const theme = typeof body.theme === "string" ? body.theme : "";
    if (!TEXT_TYPES.has(textType)) {
      return jsonError("Tipo de texto inválido.", 400);
    }
    if (!THEMES.has(theme)) {
      return jsonError("Tema inválido.", 400);
    }

    const promptText = typeof body.prompt_text === "string" ? body.prompt_text : "";
    const studentResponse = typeof body.student_response === "string" ? body.student_response : "";
    if (!promptText.trim() || !studentResponse.trim()) {
      return jsonError("Faltan campos: prompt_text o student_response.", 400);
    }
    if (promptText.length > 3000) {
      return jsonError("El estímulo supera el límite permitido.", 400);
    }
    if (studentResponse.length > 8000) {
      return jsonError("La respuesta del alumno supera el límite permitido.", 400);
    }

    const promptId =
      typeof body.prompt_id === "string" && UUID_RE.test(body.prompt_id) ? body.prompt_id : null;

    const uiLang: UiLang = body.ui_lang === "es" ? "es" : "en";
    const guardarHistorial = body.guardar_historial !== false;
    const wordCount = countWords(studentResponse);

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return jsonError("ANTHROPIC_API_KEY no configurada.", 500);
    }
    const EVALUATION_MODEL = Deno.env.get("ANTHROPIC_EVALUATION_MODEL") ?? DEFAULT_EVALUATION_MODEL;

    // ── Cuota atómica por (user, course, paper) ─────────────────────────────
    const { data: reserva, error: reservaErr } = await adminClient.rpc("reservar_cuota_paper", {
      p_user_id: userId,
      p_course_key: courseKey,
      p_paper: "p1",
      p_limite: LIMITE_DIARIO,
      p_edge_function: "evaluate-paper1-b",
      p_modelo: EVALUATION_MODEL,
    });
    if (reservaErr) {
      console.error("Error reservando cuota:", reservaErr);
      return jsonError("No se pudo verificar el límite de uso.", 500);
    }
    if (reserva === null) {
      return jsonError("Has alcanzado el límite diario de evaluaciones. Vuelve mañana.", 429);
    }
    const usoId = reserva as string;

    const cancelarCuota = async () => {
      await adminClient.from("llm_uso").delete().eq("id", usoId);
    };

    // ── Llamada a Anthropic ────────────────────────────────────────────────
    const userPrompt =
      `TIPO DE TEXTO REQUERIDO: ${textType}\n` +
      `TEMA: ${theme}\n\n` +
      `ESTÍMULO:\n${promptText}\n\n` +
      `RESPUESTA DEL ALUMNO (${wordCount} palabras detectadas):\n${studentResponse}\n\n` +
      `Evalúa esta respuesta según los criterios A (Lenguaje /12), B (Mensaje /12) y C (Comprensión conceptual /6) de Spanish B SL. Llama a la herramienta para registrar la evaluación.`;

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
              text: buildSystemPrompt({
                courseKey,
                component: "paper1-b-basic",
                nivel: "SL",
                uiLang,
              }),
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: userPrompt }],
          tools: [EVAL_TOOL],
          tool_choice: { type: "tool", name: "registrar_evaluacion_b1" },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      await cancelarCuota();
      if (!isAbortError(error)) console.error("Anthropic fetch error:", error);
      return jsonError(
        isAbortError(error)
          ? "La corrección tardó demasiado. Inténtalo de nuevo en unos minutos."
          : "No se pudo conectar con el servicio de IA. Inténtalo de nuevo.",
        isAbortError(error) ? 504 : 502,
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response) {
      await cancelarCuota();
      return jsonError("No se recibió respuesta del servicio de IA.", 502);
    }

    console.log("evaluate-paper1-b Anthropic completed", {
      model: EVALUATION_MODEL,
      status: response.status,
      ms: Date.now() - startedAt,
    });

    if (!response.ok) {
      await cancelarCuota();
      if (response.status === 429)
        return jsonError("Demasiadas solicitudes. Espera un momento.", 429);
      if (response.status === 529) return jsonError("Servicio de IA sobrecargado.", 529);
      const t = await response.text();
      console.error("Anthropic API error:", response.status, t);
      return jsonError("Error del servicio de IA.", 500);
    }

    const data = (await response.json()) as AnthropicResponse;

    if (data.stop_reason === "max_tokens") {
      await cancelarCuota();
      console.error("Anthropic max_tokens", { model: EVALUATION_MODEL });
      return jsonError("La corrección quedó incompleta. Prueba con un texto más corto.", 502);
    }

    if (data.usage) {
      const { error: usoErr } = await adminClient
        .from("llm_uso")
        .update({
          modelo: EVALUATION_MODEL,
          tokens_entrada: data.usage.input_tokens ?? 0,
          tokens_salida: data.usage.output_tokens ?? 0,
          cache_creation_tokens: data.usage.cache_creation_input_tokens ?? 0,
          cache_read_tokens: data.usage.cache_read_input_tokens ?? 0,
        })
        .eq("id", usoId);
      if (usoErr) console.error("Error actualizando uso LLM:", usoErr);
    }

    const toolUseBlock = data.content?.find((b) => b.type === "tool_use");
    if (!isRecord(toolUseBlock?.input)) {
      await cancelarCuota();
      console.error("No tool_use block:", JSON.stringify(data));
      return jsonError("La IA no devolvió una evaluación válida.", 500);
    }

    const ev = toolUseBlock.input;
    const clampInt = (v: unknown, min: number, max: number): number =>
      typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : 0;

    const criterio_a = clampInt(ev.criterio_a, 0, 12);
    const criterio_b = clampInt(ev.criterio_b, 0, 12);
    const criterio_c = clampInt(ev.criterio_c, 0, 6);
    const total = criterio_a + criterio_b + criterio_c;
    const nota_ib = notaIBFromTotal(total);

    const feedbackText = {
      justificacion_a: typeof ev.justificacion_a === "string" ? ev.justificacion_a.trim() : "",
      justificacion_b: typeof ev.justificacion_b === "string" ? ev.justificacion_b.trim() : "",
      justificacion_c: typeof ev.justificacion_c === "string" ? ev.justificacion_c.trim() : "",
      comentario_global:
        typeof ev.comentario_global === "string" ? ev.comentario_global.trim() : "",
      fortalezas: typeof ev.fortalezas === "string" ? ev.fortalezas.trim() : "",
      areas_mejora: typeof ev.areas_mejora === "string" ? ev.areas_mejora.trim() : "",
    };
    const feedbackFaltante = Object.entries(feedbackText)
      .filter(([, value]) => value.length < MIN_FEEDBACK_CHARS)
      .map(([key]) => key);
    if (feedbackFaltante.length > 0) {
      await cancelarCuota();
      console.error("Feedback insuficiente:", feedbackFaltante);
      return jsonError("La IA no devolvió comentarios completos. Inténtalo de nuevo.", 500);
    }

    const erroresLengua = Array.isArray(ev.errores_lengua) ? ev.errores_lengua : [];
    const apropiacion = Array.isArray(ev.apropiacion_tipo_texto) ? ev.apropiacion_tipo_texto : [];

    const evaluacion = {
      ...feedbackText,
      criterio_a,
      criterio_b,
      criterio_c,
      puntuacion_total: total,
      nota_ib,
      errores_lengua: erroresLengua,
      apropiacion_tipo_texto: apropiacion,
      word_count: wordCount,
    };

    let evaluacionId: string | null = null;
    if (guardarHistorial) {
      const { data: insertada, error: insertErr } = await supabase
        .from("evaluaciones_paper1_b")
        .insert({
          user_id: userId,
          course_key: courseKey,
          nivel: "SL",
          text_type: textType,
          theme,
          prompt_id: promptId,
          prompt_text: promptText.trim(),
          student_response: studentResponse,
          word_count: wordCount,
          criterio_a,
          criterio_b,
          criterio_c,
          nota_ib,
          justificacion_a: feedbackText.justificacion_a,
          justificacion_b: feedbackText.justificacion_b,
          justificacion_c: feedbackText.justificacion_c,
          comentario_global: feedbackText.comentario_global,
          fortalezas: feedbackText.fortalezas,
          areas_mejora: feedbackText.areas_mejora,
          errores_lengua: erroresLengua,
          apropiacion_tipo_texto: apropiacion,
          feedback_lang: uiLang,
        })
        .select("id")
        .single();

      if (insertErr || !insertada) {
        console.error("Error guardando evaluación Spanish B P1:", insertErr);
        return jsonError("La evaluación se generó, pero no se pudo guardar.", 500);
      }
      evaluacionId = insertada.id;

      // Gamificación no-fatal. Mapeamos al formato P1 ya soportado por
      // procesarGamificacion (banda_a..d 0-5). Para Spanish B mapeamos la
      // calidad global vía nota_ib; banda_* sintéticos ≈ nota_ib (rango 0-5).
      const sintetico = Math.min(5, nota_ib);
      const gamificacion = await procesarGamificacion(
        adminClient,
        userId,
        {
          tipo: "p1",
          banda_a: sintetico,
          banda_b: sintetico,
          banda_c: sintetico,
          banda_d: sintetico,
          nota_ib,
        },
        courseKey,
      );
      Object.assign(evaluacion, { gamificacion });
    }

    return new Response(JSON.stringify({ ...evaluacion, evaluacion_id: evaluacionId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate-paper1-b error:", e);
    return jsonError("Error interno del servidor.", 500);
  }
});

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
