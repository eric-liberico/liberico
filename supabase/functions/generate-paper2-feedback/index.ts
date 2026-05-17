import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { type CourseKey, type Nivel, parseCourseKey, parseNivel } from "../_shared/courses.ts";
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIMITE_DIARIO = 20;
const MODEL = "claude-opus-4-7";
const MAX_TOKENS = 8000;
const TIMEOUT_MS = 150_000;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function htmlATextoPlano(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|li|div|h[1-6])>/gi, "\n\n")
      .replace(/<[^>]*>/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

function feedbackCompletoExiste(evaluacion: JsonRecord): boolean {
  return (
    isRecord(evaluacion.diagnostico_comparativo) &&
    Array.isArray(evaluacion.anotaciones) &&
    evaluacion.anotaciones.length > 0
  );
}

function respuestaFeedback(evaluacion: JsonRecord): JsonRecord {
  return {
    evaluacion_id: evaluacion.id ?? null,
    diagnostico_comparativo: isRecord(evaluacion.diagnostico_comparativo)
      ? evaluacion.diagnostico_comparativo
      : null,
    anotaciones: Array.isArray(evaluacion.anotaciones) ? evaluacion.anotaciones : [],
    feedback_completo_generado: true,
  };
}

async function verificarLimiteDiario(
  consultarUso: () => Promise<{ count: number | null; error: unknown }>,
  limite: number,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const { count, error } = await consultarUso();

  if (error) {
    console.error("Error comprobando límite diario:", error);
    return {
      ok: false,
      status: 500,
      message: "No se pudo verificar el límite de uso.",
    };
  }

  if ((count ?? 0) >= limite) {
    return {
      ok: false,
      status: 429,
      message: "Has alcanzado el límite diario de feedback completo. Vuelve mañana.",
    };
  }

  return { ok: true };
}

const SHORT_FEEDBACK_SCHEMA: Record<string, unknown> = {
  type: "string",
  minLength: 8,
};

const ESTADO_ELEMENTO_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["estado", "fragmento", "evaluacion", "sugerencia"],
  properties: {
    estado: { type: "string", enum: ["presente", "parcial", "ausente"] },
    fragmento: { type: "string" },
    evaluacion: SHORT_FEEDBACK_SCHEMA,
    sugerencia: SHORT_FEEDBACK_SCHEMA,
  },
};

const ANOTACION_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["fragmento_original", "criterio", "problema", "sugerencia", "prioridad"],
  properties: {
    fragmento_original: { type: "string", minLength: 5 },
    criterio: { type: "string", enum: ["A", "B1", "B2", "C", "D"] },
    problema: SHORT_FEEDBACK_SCHEMA,
    sugerencia: SHORT_FEEDBACK_SCHEMA,
    prioridad: { type: "integer", minimum: 1, maximum: 5 },
  },
};

const FEEDBACK_TOOL: Record<string, unknown> = {
  name: "registrar_feedback_prueba2",
  description:
    "Registra el diagnóstico comparativo y las anotaciones localizables de Prueba 2 solicitados por el alumno.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["diagnostico_comparativo", "anotaciones"],
    properties: {
      diagnostico_comparativo: {
        type: "object",
        additionalProperties: false,
        required: [
          "tesis_comparativa",
          "equilibrio_obras",
          "respuesta_pregunta",
          "uso_evidencia",
          "comparacion_integrada",
        ],
        properties: {
          tesis_comparativa: ESTADO_ELEMENTO_SCHEMA,
          equilibrio_obras: ESTADO_ELEMENTO_SCHEMA,
          respuesta_pregunta: ESTADO_ELEMENTO_SCHEMA,
          uso_evidencia: ESTADO_ELEMENTO_SCHEMA,
          comparacion_integrada: ESTADO_ELEMENTO_SCHEMA,
        },
      },
      anotaciones: {
        type: "array",
        items: ANOTACION_SCHEMA,
        minItems: 4,
        maxItems: 8,
      },
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

    const body: unknown = await req.json();
    if (!isRecord(body) || typeof body.evaluacion_id !== "string") {
      return new Response(JSON.stringify({ error: "Falta evaluacion_id." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const evaluacionId = body.evaluacion_id;
    if (!UUID_RE.test(evaluacionId)) {
      return new Response(JSON.stringify({ error: "evaluacion_id inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: evaluacion, error: evalErr } = await supabase
      .from("evaluaciones_prueba2")
      .select("*")
      .eq("id", evaluacionId)
      .maybeSingle();

    if (evalErr || !evaluacion) {
      return new Response(JSON.stringify({ error: "Evaluación no encontrada." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (feedbackCompletoExiste(evaluacion)) {
      return new Response(JSON.stringify(respuestaFeedback(evaluacion)), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const limite = await verificarLimiteDiario(async () => {
      const resultado = await supabase
        .from("llm_uso")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("edge_function", "generate-paper2-feedback")
        .gte("created_at", hace24h);

      return resultado;
    }, LIMITE_DIARIO);
    if (!limite.ok) {
      return new Response(JSON.stringify({ error: limite.message }), {
        status: limite.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY no configurada." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nivel: Nivel = parseNivel(evaluacion.nivel);
    const courseKey: CourseKey = parseCourseKey(evaluacion.course_key);
    const ensayoEstudiante = htmlATextoPlano(String(evaluacion.ensayo_estudiante ?? ""));
    const feedbackBasico = {
      criterios: {
        A: evaluacion.criterio_a,
        B1: evaluacion.criterio_b1,
        B2: evaluacion.criterio_b2,
        C: evaluacion.criterio_c,
        D: evaluacion.criterio_d,
      },
      justificaciones: {
        A: evaluacion.justificacion_a,
        B1: evaluacion.justificacion_b1,
        B2: evaluacion.justificacion_b2,
        C: evaluacion.justificacion_c,
        D: evaluacion.justificacion_d,
      },
      comentario_global: evaluacion.comentario_global,
      fortalezas: evaluacion.fortalezas,
      areas_mejora: evaluacion.areas_mejora,
    };

    const notasSeccion =
      evaluacion.notas_obra_1 || evaluacion.notas_obra_2
        ? `\nNOTAS OPCIONALES:\n${evaluacion.notas_obra_1 ?? ""}\n${evaluacion.notas_obra_2 ?? ""}`
        : "";

    const userPrompt = `PREGUNTA DE PRUEBA 2:\n${evaluacion.pregunta}\n\nOBRA 1:\n${evaluacion.obra_1}\n\nOBRA 2:\n${evaluacion.obra_2}${notasSeccion}\n\nENSAYO DEL ESTUDIANTE:\n${ensayoEstudiante}\n\nEVALUACION BASICA YA MOSTRADA AL ALUMNO:\n${JSON.stringify(feedbackBasico)}\n\nGenera ahora solo el diagnóstico comparativo y las anotaciones localizables. No cambies las notas ni las justificaciones ya asignadas, y no repitas fortalezas ni áreas de mejora. Llama a la herramienta para registrar el feedback completo de Prueba 2.`;

    // ── Deducir créditos ───────────────────────────────────────────────────
    const CREDITOS_FEEDBACK_P2 = 2.0;
    const SRK_P2 = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const adminClientP2 = SRK_P2 ? createClient(SUPABASE_URL, SRK_P2) : null;
    if (adminClientP2) {
      const { data: nuevoSaldo, error: creditErr } = await adminClientP2.rpc("deducir_creditos", {
        p_user_id: userId, p_cantidad: CREDITOS_FEEDBACK_P2,
        p_concepto: "generate-paper2-feedback", p_metadata: null,
      });
      if (creditErr) {
        return new Response(JSON.stringify({ error: "No se pudo verificar tu saldo de créditos." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (nuevoSaldo === null) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Necesitas 2 créditos para el feedback completo." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    const reembolsarP2 = async () => {
      if (!adminClientP2) return;
      await adminClientP2.rpc("reembolsar_creditos", {
        p_user_id: userId, p_cantidad: CREDITOS_FEEDBACK_P2,
        p_concepto: "generate-paper2-feedback", p_metadata: { motivo: "error_anthropic" },
      });
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
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
          max_tokens: MAX_TOKENS,
          system: [
            {
              type: "text",
              text: buildSystemPrompt({ courseKey, component: "paper2-feedback", nivel }),
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: userPrompt }],
          tools: [FEEDBACK_TOOL],
          tool_choice: { type: "tool", name: "registrar_feedback_prueba2" },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      await reembolsarP2();
      if (!isAbortError(error)) console.error("Anthropic fetch error:", error);
      return new Response(
        JSON.stringify({
          error: isAbortError(error)
            ? "El feedback completo tardó demasiado. Inténtalo de nuevo en unos minutos."
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

    if (!response.ok) {
      await reembolsarP2();
      const t = await response.text();
      console.error("Anthropic API error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del servicio de IA." }), {
        status: response.status === 429 ? 429 : response.status === 529 ? 529 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = (await response.json()) as AnthropicResponse;
    if (data.stop_reason === "max_tokens") {
      await reembolsarP2();
      return new Response(
        JSON.stringify({
          error:
            "El feedback completo quedó incompleto. Inténtalo de nuevo con un ensayo más corto.",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const toolUseBlock = data.content?.find((b) => b.type === "tool_use");
    if (!isRecord(toolUseBlock?.input)) {
      await reembolsarP2();
      console.error("No tool_use block:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "La IA no devolvió feedback válido." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const input = toolUseBlock.input;
    const update = {
      diagnostico_comparativo: isRecord(input.diagnostico_comparativo)
        ? input.diagnostico_comparativo
        : null,
      anotaciones: Array.isArray(input.anotaciones) ? input.anotaciones : null,
    };

    if (!update.diagnostico_comparativo || !update.anotaciones || update.anotaciones.length < 4) {
      return new Response(JSON.stringify({ error: "La IA devolvió feedback incompleto." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateErr } = await supabase
      .from("evaluaciones_prueba2")
      .update(update)
      .eq("id", evaluacionId);

    if (updateErr) {
      console.error("Error guardando feedback completo Prueba 2:", updateErr);
      return new Response(
        JSON.stringify({ error: "El feedback se generó, pero no se pudo guardar." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (SUPABASE_SERVICE_ROLE_KEY && data.usage) {
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { error: usoErr } = await adminClient.from("llm_uso").insert({
        user_id: userId,
        edge_function: "generate-paper2-feedback",
        modelo: MODEL,
        tokens_entrada: data.usage.input_tokens ?? 0,
        tokens_salida: data.usage.output_tokens ?? 0,
        cache_creation_tokens: data.usage.cache_creation_input_tokens ?? 0,
        cache_read_tokens: data.usage.cache_read_input_tokens ?? 0,
      });
      if (usoErr) console.error("Error registrando uso LLM:", usoErr);
    }

    return new Response(
      JSON.stringify({
        evaluacion_id: evaluacionId,
        ...update,
        feedback_completo_generado: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("generate-paper2-feedback error:", e);
    return new Response(JSON.stringify({ error: "Error interno del servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
