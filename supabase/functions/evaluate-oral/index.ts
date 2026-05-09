import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { procesarGamificacion } from "../_shared/gamificacion.ts";
import {
  type CourseKey,
  type Nivel,
  parseCourseKey,
  parseNivel,
  parseObraTipo,
} from "../_shared/courses.ts";
import { buildSystemPrompt } from "../_shared/prompts/index.ts";

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

const LIMITE_ORAL_DIARIO = 5;
const MIN_FEEDBACK_CHARS = 40;
const DEFAULT_EVALUATION_MODEL = "claude-opus-4-7";
const ANTHROPIC_MAX_TOKENS = 3500;
const ANTHROPIC_TIMEOUT_MS = 120_000;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

const JUSTIFICACION_SCHEMA: Record<string, unknown> = {
  type: "string",
  minLength: MIN_FEEDBACK_CHARS,
  description:
    "Comentario específico de 2-3 frases que justifica la puntuación con rasgos concretos del guion oral.",
};

const FEEDBACK_GENERAL_SCHEMA: Record<string, unknown> = {
  type: "string",
  minLength: MIN_FEEDBACK_CHARS,
  description: "Feedback específico y accionable; no puede estar vacío.",
};

const EVAL_TOOL_ORAL: Record<string, unknown> = {
  name: "registrar_evaluacion_oral",
  description:
    "Registra la evaluación básica del Trabajo Oral Individual según los criterios del IB.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "criterio_a",
      "criterio_b",
      "criterio_c",
      "criterio_d",
      "justificacion_a",
      "justificacion_b",
      "justificacion_c",
      "justificacion_d",
      "fortalezas",
      "areas_mejora",
      "comentario_global",
    ],
    properties: {
      criterio_a: { type: "integer", minimum: 0, maximum: 10 },
      criterio_b: { type: "integer", minimum: 0, maximum: 10 },
      criterio_c: { type: "integer", minimum: 0, maximum: 10 },
      criterio_d: { type: "integer", minimum: 0, maximum: 10 },
      justificacion_a: JUSTIFICACION_SCHEMA,
      justificacion_b: JUSTIFICACION_SCHEMA,
      justificacion_c: JUSTIFICACION_SCHEMA,
      justificacion_d: JUSTIFICACION_SCHEMA,
      fortalezas: FEEDBACK_GENERAL_SCHEMA,
      areas_mejora: FEEDBACK_GENERAL_SCHEMA,
      comentario_global: FEEDBACK_GENERAL_SCHEMA,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer" || !parts[1]) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = parts[1];

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const { data: perfil, error: perfilErr } = await supabase
      .from("perfiles")
      .select("activo")
      .eq("user_id", userId)
      .maybeSingle();

    if (perfilErr || !perfil) {
      return new Response(JSON.stringify({ error: "Perfil no encontrado." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (perfil.activo === false) {
      return new Response(JSON.stringify({ error: "Usuario inactivo." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Configuración del servidor incompleta." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body: unknown = await req.json();
    if (!isRecord(body)) {
      return new Response(JSON.stringify({ error: "Cuerpo de petición inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nivel: Nivel = parseNivel(body.nivel);
    const courseKey: CourseKey = parseCourseKey(body.course_key);
    const tipoOral = body.tipo_oral;
    const asuntoGlobal = body.asunto_global;
    const obra1Titulo = body.obra_1_titulo;
    const obra1Autor = body.obra_1_autor;
    const obra1Tipo = body.obra_1_tipo;
    const extracto1 = body.extracto_1;
    const notasObra1 = body.notas_obra_1;
    const obra2Titulo = body.obra_2_titulo;
    const obra2Autor = body.obra_2_autor;
    const obra2Tipo = body.obra_2_tipo;
    const extracto2 = body.extracto_2;
    const notasObra2 = body.notas_obra_2;
    const guionOral = body.guion_oral;
    const esSimulacion = body.es_simulacion === true;
    const duracionRealMinutos =
      typeof body.duracion_real_minutos === "number" &&
      body.duracion_real_minutos > 0 &&
      body.duracion_real_minutos <= 30
        ? body.duracion_real_minutos
        : null;

    if (!tipoOral || !asuntoGlobal || !obra1Titulo || !obra2Titulo || !guionOral) {
      return new Response(
        JSON.stringify({
          error: "Faltan campos obligatorios: tipo_oral, asunto_global, obras y guion_oral.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (
      typeof tipoOral !== "string" ||
      typeof asuntoGlobal !== "string" ||
      typeof obra1Titulo !== "string" ||
      typeof obra2Titulo !== "string" ||
      typeof guionOral !== "string"
    ) {
      return new Response(JSON.stringify({ error: "Campos inválidos." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["taught", "self_taught"].includes(tipoOral)) {
      return new Response(
        JSON.stringify({ error: "tipo_oral debe ser 'taught' o 'self_taught'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (asuntoGlobal.length > 500) {
      return new Response(
        JSON.stringify({ error: "El asunto global supera los 500 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (obra1Titulo.length > 300 || obra2Titulo.length > 300) {
      return new Response(
        JSON.stringify({ error: "El título de obra supera los 300 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (typeof obra1Autor === "string" && obra1Autor.length > 300) {
      return new Response(
        JSON.stringify({ error: "El autor de la obra 1 supera los 300 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (typeof obra2Autor === "string" && obra2Autor.length > 300) {
      return new Response(
        JSON.stringify({ error: "El autor de la obra 2 supera los 300 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (typeof extracto1 === "string" && extracto1.length > 5000) {
      return new Response(JSON.stringify({ error: "El extracto 1 supera los 5000 caracteres." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof extracto2 === "string" && extracto2.length > 5000) {
      return new Response(JSON.stringify({ error: "El extracto 2 supera los 5000 caracteres." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof notasObra1 === "string" && notasObra1.length > 8000) {
      return new Response(
        JSON.stringify({ error: "Las notas de la obra 1 superan los 8000 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (typeof notasObra2 === "string" && notasObra2.length > 8000) {
      return new Response(
        JSON.stringify({ error: "Las notas de la obra 2 superan los 8000 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (guionOral.length > 30000) {
      return new Response(JSON.stringify({ error: "El guion supera los 30000 caracteres." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (guionOral.trim().split(/\s+/).filter(Boolean).length < 100) {
      return new Response(
        JSON.stringify({
          error:
            "El guion o transcripción debe tener al menos 100 palabras. Un oral bien preparado requiere contenido suficiente para evaluar.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY no configurada." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const EVALUATION_MODEL = Deno.env.get("ANTHROPIC_EVALUATION_MODEL") ?? DEFAULT_EVALUATION_MODEL;

    const { data: reserva, error: reservaErr } = await adminClient.rpc("reservar_cuota_oral", {
      p_user_id: userId,
      p_limite: LIMITE_ORAL_DIARIO,
    });
    if (reservaErr) {
      console.error("Error reservando cuota oral:", reservaErr);
      return new Response(JSON.stringify({ error: "No se pudo verificar el límite de uso." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (reserva === null) {
      return new Response(
        JSON.stringify({
          error:
            "Has alcanzado el límite diario de evaluaciones del Oral Individual. Vuelve mañana.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const usoId = reserva as string;

    const cancelarCuota = async () => {
      await adminClient.from("llm_uso").delete().eq("id", usoId);
    };

    // Duración: real si el alumno la proporcionó; estimada a 160 ppm como fallback
    const palabrasGuion = guionOral.trim().split(/\s+/).filter(Boolean).length;
    const duracionEstimadaMinutos =
      duracionRealMinutos !== null
        ? duracionRealMinutos
        : Math.round((palabrasGuion / 160) * 10) / 10;
    const duracionEsReal = duracionRealMinutos !== null;

    const obra1Label = `${obra1Titulo}${typeof obra1Autor === "string" && obra1Autor.trim() ? ` — ${obra1Autor.trim()}` : ""}`;
    const obra2Label = `${obra2Titulo}${typeof obra2Autor === "string" && obra2Autor.trim() ? ` — ${obra2Autor.trim()}` : ""}`;

    const tipoObraLabel = (tipo: unknown) => {
      const parsed = parseObraTipo(tipo);
      if (parsed === "original_language") return "escrita originalmente en la lengua del curso";
      if (parsed === "in_translation") return "estudiada en traducción";
      return "tipo de obra no especificado";
    };

    const extractosSeccion =
      (typeof extracto1 === "string" && extracto1.trim()
        ? `\nEXTRACTO 1:\n${extracto1.trim()}`
        : "") +
      (typeof extracto2 === "string" && extracto2.trim()
        ? `\nEXTRACTO 2:\n${extracto2.trim()}`
        : "");

    const notasSeccion =
      (typeof notasObra1 === "string" && notasObra1.trim()
        ? `\nNOTAS SOBRE OBRA 1:\n${notasObra1.trim()}`
        : "") +
      (typeof notasObra2 === "string" && notasObra2.trim()
        ? `\nNOTAS SOBRE OBRA 2:\n${notasObra2.trim()}`
        : "");

    const userPrompt = `MODALIDAD: ${tipoOral === "taught" ? "Alumno con profesor (10 min exposición + 5 min preguntas)" : "aprendizaje autodidacta con apoyo del colegio (15 min exposición continua, sin preguntas del profesor)"}

ASUNTO GLOBAL: ${asuntoGlobal}

OBRA 1: ${obra1Label} (${tipoObraLabel(obra1Tipo)})
OBRA 2: ${obra2Label} (${tipoObraLabel(obra2Tipo)})

DURACIÓN${duracionEsReal ? " REAL" : " ESTIMADA"}: ${duracionEstimadaMinutos} minutos${duracionEsReal ? " (proporcionada por el alumno)" : " (estimada a 160 palabras/minuto; puede no coincidir si el guion es un borrador)"}
${extractosSeccion}${notasSeccion}

GUION / TRANSCRIPCIÓN DEL ORAL:
${guionOral}

Evalúa este Trabajo Oral Individual según los criterios del IB. Sé específico y concreto en cada justificación. Llama a la herramienta para registrar la evaluación completa.`;

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
              text: buildSystemPrompt({ courseKey, component: "oral-basic", nivel }),
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: userPrompt }],
          tools: [EVAL_TOOL_ORAL],
          tool_choice: { type: "tool", name: "registrar_evaluacion_oral" },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      await cancelarCuota();
      if (!isAbortError(error)) {
        console.error("Anthropic fetch error:", error);
      }
      return new Response(
        JSON.stringify({
          error: isAbortError(error)
            ? "La corrección tardó demasiado. Prueba con un guion más corto o inténtalo de nuevo en unos minutos."
            : "No se pudo conectar con el servicio de IA. Inténtalo de nuevo.",
        }),
        {
          status: isAbortError(error) ? 504 : 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response) {
      await cancelarCuota();
      return new Response(
        JSON.stringify({ error: "No se recibió respuesta del servicio de IA." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("evaluate-oral Anthropic completed", {
      model: EVALUATION_MODEL,
      status: response.status,
      ms: Date.now() - startedAt,
    });

    if (!response.ok) {
      await cancelarCuota();
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 529) {
        return new Response(
          JSON.stringify({ error: "El servicio de IA está sobrecargado. Inténtalo de nuevo." }),
          { status: 529, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("Anthropic API error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del servicio de IA." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = (await response.json()) as AnthropicResponse;

    if (data.stop_reason === "max_tokens") {
      await cancelarCuota();
      console.error("Anthropic max_tokens en evaluate-oral", {
        model: EVALUATION_MODEL,
        max_tokens: ANTHROPIC_MAX_TOKENS,
      });
      return new Response(
        JSON.stringify({
          error:
            "La evaluación quedó incompleta. Prueba con un guion más corto o inténtalo de nuevo.",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
      return new Response(JSON.stringify({ error: "La IA no devolvió una evaluación válida." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ev = toolUseBlock.input;
    const clampOral = (v: unknown): number =>
      typeof v === "number" && isFinite(v) ? Math.max(0, Math.min(10, Math.round(v))) : 0;

    const criterio_a = clampOral(ev.criterio_a);
    const criterio_b = clampOral(ev.criterio_b);
    const criterio_c = clampOral(ev.criterio_c);
    const criterio_d = clampOral(ev.criterio_d);
    const puntuacion_total = criterio_a + criterio_b + criterio_c + criterio_d;
    const feedbackText = {
      justificacion_a: typeof ev.justificacion_a === "string" ? ev.justificacion_a.trim() : "",
      justificacion_b: typeof ev.justificacion_b === "string" ? ev.justificacion_b.trim() : "",
      justificacion_c: typeof ev.justificacion_c === "string" ? ev.justificacion_c.trim() : "",
      justificacion_d: typeof ev.justificacion_d === "string" ? ev.justificacion_d.trim() : "",
      fortalezas: typeof ev.fortalezas === "string" ? ev.fortalezas.trim() : "",
      areas_mejora: typeof ev.areas_mejora === "string" ? ev.areas_mejora.trim() : "",
      comentario_global:
        typeof ev.comentario_global === "string" ? ev.comentario_global.trim() : "",
    };
    const feedbackFaltante = Object.entries(feedbackText)
      .filter(([, value]) => value.length < MIN_FEEDBACK_CHARS)
      .map(([key]) => key);

    if (feedbackFaltante.length > 0) {
      await cancelarCuota();
      console.error("Evaluación oral sin comentarios suficientes:", feedbackFaltante);
      return new Response(
        JSON.stringify({
          error: "La IA no devolvió comentarios completos para los criterios. Inténtalo de nuevo.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: insertada, error: insertErr } = await supabase
      .from("evaluaciones_oral")
      .insert({
        user_id: userId,
        tipo_oral: tipoOral,
        asunto_global: asuntoGlobal.trim(),
        obra_1_titulo: obra1Titulo.trim(),
        obra_1_autor:
          typeof obra1Autor === "string" && obra1Autor.trim() ? obra1Autor.trim() : null,
        obra_1_tipo: parseObraTipo(obra1Tipo),
        extracto_1: typeof extracto1 === "string" && extracto1.trim() ? extracto1.trim() : null,
        notas_obra_1:
          typeof notasObra1 === "string" && notasObra1.trim() ? notasObra1.trim() : null,
        obra_2_titulo: obra2Titulo.trim(),
        obra_2_autor:
          typeof obra2Autor === "string" && obra2Autor.trim() ? obra2Autor.trim() : null,
        obra_2_tipo: parseObraTipo(obra2Tipo),
        extracto_2: typeof extracto2 === "string" && extracto2.trim() ? extracto2.trim() : null,
        notas_obra_2:
          typeof notasObra2 === "string" && notasObra2.trim() ? notasObra2.trim() : null,
        guion_oral: guionOral,
        criterio_a,
        criterio_b,
        criterio_c,
        criterio_d,
        duracion_estimada_minutos: duracionEstimadaMinutos,
        justificacion_a: feedbackText.justificacion_a,
        justificacion_b: feedbackText.justificacion_b,
        justificacion_c: feedbackText.justificacion_c,
        justificacion_d: feedbackText.justificacion_d,
        fortalezas: feedbackText.fortalezas,
        areas_mejora: feedbackText.areas_mejora,
        comentario_global: feedbackText.comentario_global,
        nivel,
        course_key: courseKey,
        es_simulacion: esSimulacion,
      })
      .select("id")
      .single();

    if (insertErr || !insertada) {
      console.error("Error guardando evaluación oral:", insertErr);
      return new Response(
        JSON.stringify({ error: "La evaluación se generó, pero no se pudo guardar." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const gamificacion = await procesarGamificacion(
      adminClient,
      userId,
      {
        tipo: "oral",
        puntuacion_total,
      },
      courseKey,
    );

    return new Response(
      JSON.stringify({
        evaluacion_id: insertada.id,
        tipo_oral: tipoOral,
        criterio_a,
        criterio_b,
        criterio_c,
        criterio_d,
        puntuacion_total,
        duracion_estimada_minutos: duracionEstimadaMinutos,
        justificacion_a: feedbackText.justificacion_a,
        justificacion_b: feedbackText.justificacion_b,
        justificacion_c: feedbackText.justificacion_c,
        justificacion_d: feedbackText.justificacion_d,
        fortalezas: feedbackText.fortalezas,
        areas_mejora: feedbackText.areas_mejora,
        comentario_global: feedbackText.comentario_global,
        gamificacion,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("evaluate-oral error:", e);
    return new Response(JSON.stringify({ error: "Error interno del servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
