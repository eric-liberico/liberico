import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  type CourseKey,
  type Nivel,
  parseCourseKey,
  parseNivel,
} from "../_shared/courses.ts";
import { buildSystemPrompt } from "../_shared/prompts/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
    isRecord(evaluacion.introduccion) &&
    Array.isArray(evaluacion.parrafos) &&
    isRecord(evaluacion.conclusion) &&
    isRecord(evaluacion.lenguaje_analitico)
  );
}

function respuestaFeedback(evaluacion: JsonRecord): JsonRecord {
  return {
    evaluacion_id: evaluacion.id ?? null,
    introduccion: isRecord(evaluacion.introduccion)
      ? evaluacion.introduccion
      : null,
    parrafos: Array.isArray(evaluacion.parrafos) ? evaluacion.parrafos : null,
    conclusion: isRecord(evaluacion.conclusion) ? evaluacion.conclusion : null,
    lenguaje_analitico: isRecord(evaluacion.lenguaje_analitico)
      ? evaluacion.lenguaje_analitico
      : null,
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
      message:
        "Has alcanzado el límite diario de feedback completo. Vuelve mañana.",
    };
  }

  return { ok: true };
}

const SHORT_FEEDBACK_SCHEMA: Record<string, unknown> = {
  type: "string",
  minLength: 8,
};

const ELEMENTO_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["tipo", "estado", "fragmento", "evaluacion", "sugerencia"],
  properties: {
    tipo: { type: "string" },
    estado: { type: "string", enum: ["presente", "parcial", "ausente"] },
    fragmento: { type: "string" },
    evaluacion: SHORT_FEEDBACK_SCHEMA,
    sugerencia: SHORT_FEEDBACK_SCHEMA,
  },
};

const FEEDBACK_TOOL: Record<string, unknown> = {
  name: "registrar_feedback_completo",
  description:
    "Registra el feedback estructural y de lenguaje analítico de Prueba 1 solicitado por el alumno.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["introduccion", "parrafos", "conclusion", "lenguaje_analitico"],
    properties: {
      introduccion: {
        type: "object",
        additionalProperties: false,
        required: ["elementos", "valoracion"],
        properties: {
          elementos: { type: "array", items: ELEMENTO_SCHEMA },
          valoracion: SHORT_FEEDBACK_SCHEMA,
        },
      },
      parrafos: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "numero",
            "extracto_inicio",
            "elementos",
            "nivel_analisis",
            "sugerencia_global",
          ],
          properties: {
            numero: { type: "integer" },
            extracto_inicio: { type: "string" },
            elementos: { type: "array", items: ELEMENTO_SCHEMA },
            nivel_analisis: {
              type: "string",
              enum: ["descripcion", "analisis", "interpretacion", "evaluacion"],
            },
            sugerencia_global: SHORT_FEEDBACK_SCHEMA,
          },
        },
      },
      conclusion: {
        type: "object",
        additionalProperties: false,
        required: ["elementos", "valoracion"],
        properties: {
          elementos: { type: "array", items: ELEMENTO_SCHEMA },
          valoracion: SHORT_FEEDBACK_SCHEMA,
        },
      },
      lenguaje_analitico: {
        type: "object",
        additionalProperties: false,
        required: [
          "verbos_debiles",
          "verbos_fuertes_usados",
          "adverbios_presentes",
          "adverbios_sugeridos",
          "interferencias_ingles",
          "valoracion",
        ],
        properties: {
          verbos_debiles: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "verbo",
                "frecuencia",
                "ejemplo_original",
                "alternativa_mejorada",
              ],
              properties: {
                verbo: { type: "string" },
                frecuencia: { type: "integer" },
                ejemplo_original: { type: "string" },
                alternativa_mejorada: { type: "string" },
              },
            },
          },
          verbos_fuertes_usados: { type: "array", items: { type: "string" } },
          adverbios_presentes: { type: "array", items: { type: "string" } },
          adverbios_sugeridos: { type: "array", items: { type: "string" } },
          interferencias_ingles: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "tipo",
                "fragmento_original",
                "explicacion",
                "correccion",
              ],
              properties: {
                tipo: {
                  type: "string",
                  enum: [
                    "gerundio",
                    "como_que",
                    "calco_sintactico",
                    "estructura_traducida",
                    "orden_palabras",
                    "otro",
                  ],
                },
                fragmento_original: { type: "string" },
                explicacion: SHORT_FEEDBACK_SCHEMA,
                correccion: SHORT_FEEDBACK_SCHEMA,
              },
            },
          },
          valoracion: SHORT_FEEDBACK_SCHEMA,
        },
      },
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (Deno.env.get("ENABLE_LEGACY_FEEDBACK_ENDPOINTS") !== "true") {
    return new Response(
      JSON.stringify({
        error: "Endpoint retirado. Usa generate-analysis-extras.",
      }),
      {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
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
    if (
      parts.length !== 2 || parts[0].toLowerCase() !== "bearer" || !parts[1]
    ) {
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

    const { data: userData, error: userErr } = await supabase.auth.getUser(
      token,
    );
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
      return new Response(
        JSON.stringify({ error: "evaluacion_id inválido." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: evaluacion, error: evalErr } = await supabase
      .from("evaluaciones")
      .select("*")
      .eq("id", evaluacionId)
      .maybeSingle();

    if (evalErr || !evaluacion) {
      return new Response(
        JSON.stringify({ error: "Evaluación no encontrada." }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
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
        .in("edge_function", ["lita-p1-feedback", "generate-analysis-feedback"])
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
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY no configurada." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const nivel: Nivel = parseNivel(evaluacion.nivel);
    const courseKey: CourseKey = parseCourseKey(evaluacion.course_key);
    const textoLiterario = htmlATextoPlano(
      String(evaluacion.texto_literario ?? ""),
    );
    const analisisEstudiante = htmlATextoPlano(
      String(evaluacion.analisis_estudiante ?? ""),
    );
    const feedbackBasico = {
      bandas: {
        A: evaluacion.banda_a,
        B: evaluacion.banda_b,
        C: evaluacion.banda_c,
        D: evaluacion.banda_d,
      },
      justificaciones: {
        A: evaluacion.justificacion_a,
        B: evaluacion.justificacion_b,
        C: evaluacion.justificacion_c,
        D: evaluacion.justificacion_d,
      },
      comentario_global: evaluacion.comentario_global,
      fortalezas: evaluacion.fortalezas,
      areas_mejora: evaluacion.areas_mejora,
    };

    const userPrompt =
      `TEXTO LITERARIO:\n${textoLiterario}\n\nPREGUNTA DE ORIENTACION:\n${evaluacion.pregunta_orientacion}\n\nANALISIS DEL ESTUDIANTE:\n${analisisEstudiante}\n\nEVALUACION BASICA YA MOSTRADA AL ALUMNO:\n${
        JSON.stringify(feedbackBasico)
      }\n\nGenera ahora solo el análisis estructural (introducción, párrafos, conclusión) y el lenguaje analítico. No cambies las bandas ni las justificaciones ya asignadas, y no repitas fortalezas ni áreas de mejora. Llama a la herramienta para registrar el feedback estructural.`;

    // ── Deducir créditos ───────────────────────────────────────────────────
    const CREDITOS_FEEDBACK = 2.0;
    const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const adminClientFeedback = SRK ? createClient(SUPABASE_URL, SRK) : null;
    if (adminClientFeedback) {
      const { data: nuevoSaldo, error: creditErr } = await adminClientFeedback
        .rpc("deducir_creditos", {
          p_user_id: userId,
          p_cantidad: CREDITOS_FEEDBACK,
          p_concepto: "generate-analysis-feedback",
          p_metadata: null,
        });
      if (creditErr) {
        console.error("Error deduciendo créditos:", creditErr);
        return new Response(
          JSON.stringify({
            error: "No se pudo verificar tu saldo de créditos.",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (nuevoSaldo === null) {
        return new Response(
          JSON.stringify({
            error:
              "Créditos insuficientes. Necesitas 2 créditos para obtener el feedback completo.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    const reembolsarCreditosFeedback = async () => {
      if (!adminClientFeedback) return;
      await adminClientFeedback.rpc("reembolsar_creditos", {
        p_user_id: userId,
        p_cantidad: CREDITOS_FEEDBACK,
        p_concepto: "generate-analysis-feedback",
        p_metadata: { motivo: "error_anthropic" },
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
              text: buildSystemPrompt({
                courseKey,
                component: "analysis-feedback",
                nivel,
              }),
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: userPrompt }],
          tools: [FEEDBACK_TOOL],
          tool_choice: { type: "tool", name: "registrar_feedback_completo" },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      await reembolsarCreditosFeedback();
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
      await reembolsarCreditosFeedback();
      const t = await response.text();
      console.error("Anthropic API error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Error del servicio de IA." }),
        {
          status: response.status === 429
            ? 429
            : response.status === 529
            ? 529
            : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = (await response.json()) as AnthropicResponse;
    if (data.stop_reason === "max_tokens") {
      await reembolsarCreditosFeedback();
      return new Response(
        JSON.stringify({
          error:
            "El feedback completo quedó incompleto. Inténtalo de nuevo con un texto más corto.",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const toolUseBlock = data.content?.find((b) => b.type === "tool_use");
    if (!isRecord(toolUseBlock?.input)) {
      await reembolsarCreditosFeedback();
      console.error("No tool_use block:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "La IA no devolvió feedback válido." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const input = toolUseBlock.input;
    const update = {
      introduccion: isRecord(input.introduccion) ? input.introduccion : null,
      parrafos: Array.isArray(input.parrafos) ? input.parrafos : null,
      conclusion: isRecord(input.conclusion) ? input.conclusion : null,
      lenguaje_analitico: isRecord(input.lenguaje_analitico)
        ? input.lenguaje_analitico
        : null,
    };

    if (
      !update.introduccion ||
      !update.parrafos ||
      !update.conclusion ||
      !update.lenguaje_analitico
    ) {
      return new Response(
        JSON.stringify({ error: "La IA devolvió feedback incompleto." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { error: updateErr } = await supabase
      .from("evaluaciones")
      .update(update)
      .eq("id", evaluacionId);

    if (updateErr) {
      console.error("Error guardando feedback completo:", updateErr);
      // Ya se cobraron créditos pero no hay resultado guardado: reembolsar.
      await reembolsarCreditosFeedback();
      return new Response(
        JSON.stringify({
          error:
            "El feedback se generó, pero no se pudo guardar. Se han reembolsado tus créditos.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (SUPABASE_SERVICE_ROLE_KEY && data.usage) {
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { error: usoErr } = await adminClient.from("llm_uso").insert({
        user_id: userId,
        edge_function: "lita-p1-feedback",
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
    console.error("generate-analysis-feedback error:", e);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
