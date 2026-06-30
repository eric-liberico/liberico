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
const LIMITE_DIARIO = 5;
const MODEL = "claude-opus-4-7";
const MAX_TOKENS = 10000;
const TIMEOUT_MS = 140_000;

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

function extrasExisten(evaluacion: JsonRecord): boolean {
  return (
    isRecord(evaluacion.introduccion) &&
    Array.isArray(evaluacion.parrafos) &&
    (evaluacion.parrafos as unknown[]).length > 0 &&
    isRecord(evaluacion.conclusion) &&
    isRecord(evaluacion.lenguaje_analitico) &&
    Array.isArray(evaluacion.sugerencias_reescritura) &&
    (evaluacion.sugerencias_reescritura as unknown[]).length > 0
  );
}

function respuestaExtras(evaluacion: JsonRecord): JsonRecord {
  return {
    evaluacion_id: evaluacion.id ?? null,
    introduccion: evaluacion.introduccion,
    parrafos: evaluacion.parrafos,
    conclusion: evaluacion.conclusion,
    lenguaje_analitico: evaluacion.lenguaje_analitico,
    sugerencias_reescritura: evaluacion.sugerencias_reescritura,
    feedback_completo_generado: true,
  };
}

function systemPromptForModoIdeas(
  base: string,
  modoIdeas: "conservar" | "ideas_nuevas",
): string {
  if (modoIdeas === "ideas_nuevas") {
    return `${base}

MODO DE MICRO-REESCRITURAS
El alumno ha activado ideas nuevas. En las micro-reescrituras puedes proponer ideas interpretativas originales, profundas y persuasivas cuando eleven el análisis, siempre específicas del texto. No inventes citas, líneas, versos ni detalles: ancla cualquier idea nueva en el texto literario proporcionado o en referencias que el alumno ya haya usado.`;
  }

  return `${base}

MODO DE MICRO-REESCRITURAS
El alumno ha pedido mantener su voz, ideas y estructura. Las micro-reescrituras deben elevar desde dentro: conservar el argumento, el orden y la voz reconocible del alumno, y mejorar precisión, profundidad y cohesión sin reemplazar sus ideas por otras ajenas.`;
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
        "Has alcanzado el límite diario de análisis completo. Vuelve mañana.",
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

const SUGERENCIA_REESCRITURA_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "fragmento_original",
    "criterio",
    "tipo",
    "problema",
    "propuesta_reescritura",
    "explicacion_pedagogica",
    "nivel_intervencion",
    "prioridad",
  ],
  properties: {
    fragmento_original: { type: "string" },
    criterio: { type: "string", enum: ["A", "B", "C", "D"] },
    tipo: {
      type: "string",
      enum: [
        "tesis",
        "interpretacion",
        "analisis_efecto",
        "integracion_cita",
        "estructura_parrafo",
        "transicion",
        "conclusion",
        "precision_lenguaje",
        "registro",
        "otro",
      ],
    },
    problema: { type: "string" },
    propuesta_reescritura: { type: "string" },
    explicacion_pedagogica: { type: "string" },
    nivel_intervencion: {
      type: "string",
      enum: ["minima", "media", "profunda"],
    },
    prioridad: { type: "integer", minimum: 1, maximum: 5 },
  },
};

const EXTRAS_TOOL: Record<string, unknown> = {
  name: "registrar_extras_p1",
  description:
    "Registra el análisis estructural y las micro-reescrituras de Prueba 1.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "introduccion",
      "parrafos",
      "conclusion",
      "lenguaje_analitico",
      "sugerencias_reescritura",
    ],
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
      sugerencias_reescritura: {
        type: "array",
        minItems: 4,
        maxItems: 8,
        items: SUGERENCIA_REESCRITURA_SCHEMA,
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
      .select("activo, creditos")
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
    const modoIdeas = body.modo_ideas === "ideas_nuevas"
      ? "ideas_nuevas"
      : "conservar";
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

    if (extrasExisten(evaluacion)) {
      return new Response(JSON.stringify(respuestaExtras(evaluacion)), {
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
        .eq("edge_function", "generate-analysis-extras")
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

    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Configuración del servidor incompleta." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const claveCobro = `fc-p1:${evaluacionId}`;
    const conceptoCobro = "feedback-completo-p1";

    const { data: cobro, error: cobroErr } = await adminClient.rpc(
      "deducir_creditos_idempotente",
      {
        p_user_id: userId,
        p_cantidad: 2.0,
        p_concepto: conceptoCobro,
        p_clave: claveCobro,
        p_metadata: { origen: "generate-analysis-extras" },
      },
    );
    if (cobroErr) {
      console.error("cobro idempotente (analysis-extras) falló:", cobroErr);
      return new Response(
        JSON.stringify({ error: "No se pudo verificar tu saldo de créditos." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const estadoCobro = isRecord(cobro) && typeof cobro.estado === "string"
      ? cobro.estado
      : "";
    if (estadoCobro === "insuficiente") {
      return new Response(
        JSON.stringify({
          error:
            "Créditos insuficientes. Necesitas 2 créditos para el feedback completo.",
        }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (estadoCobro !== "cobrado" && estadoCobro !== "ya_cobrado") {
      console.error("Estado inesperado del cobro:", cobro);
      return new Response(
        JSON.stringify({ error: "No se pudo verificar tu saldo de créditos." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const cobradoAqui = estadoCobro === "cobrado";
    const reembolsarCobro = async (motivo: string) => {
      if (!cobradoAqui) return;
      const { error: reembolsoErr } = await adminClient.rpc(
        "reembolsar_creditos",
        {
          p_user_id: userId,
          p_cantidad: 2.0,
          p_concepto: conceptoCobro,
          p_metadata: {
            clave: claveCobro,
            motivo,
            origen: "generate-analysis-extras",
          },
        },
      );
      if (reembolsoErr) {
        console.error("reembolso analysis-extras falló:", reembolsoErr);
      }
    };

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

    const politicaIdeas = modoIdeas === "ideas_nuevas"
      ? "El alumno ha elegido recibir ideas nuevas: las micro-reescrituras pueden introducir líneas interpretativas originales, profundas y persuasivas cuando el análisis sea genérico. Evita ideas obvias. No inventes citas, líneas, versos ni detalles; si propones una idea nueva, ancla su evidencia en el texto literario o en referencias ya usadas por el alumno."
      : "El alumno ha elegido mantener su voz e ideas: desarrolla y precisa lo que ya está en el análisis, sin sustituir el argumento por otro. Puedes añadir matices solo si nacen claramente de su planteamiento.";

    const userPrompt =
      `TEXTO LITERARIO:\n${textoLiterario}\n\nPREGUNTA DE ORIENTACIÓN:\n${evaluacion.pregunta_orientacion}\n\nANÁLISIS ORIGINAL DEL ESTUDIANTE:\n${analisisEstudiante}\n\nEVALUACIÓN BÁSICA YA MOSTRADA AL ALUMNO:\n${
        JSON.stringify(
          feedbackBasico,
        )
      }\n\nMODO DE IDEAS:\n${politicaIdeas}\n\nGenera el análisis estructural completo (introducción, párrafos, conclusión, lenguaje analítico) y las micro-reescrituras basadas en ese análisis. No cambies las bandas ni las justificaciones ya asignadas, y no repitas fortalezas ni áreas de mejora. Llama a la herramienta para registrar.`;

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
              text: systemPromptForModoIdeas(
                buildSystemPrompt({
                  courseKey,
                  component: "analysis-extras",
                  nivel,
                }),
                modoIdeas,
              ),
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: userPrompt }],
          tools: [EXTRAS_TOOL],
          tool_choice: { type: "tool", name: "registrar_extras_p1" },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (!isAbortError(error)) console.error("Anthropic fetch error:", error);
      await reembolsarCobro(
        isAbortError(error) ? "anthropic_timeout" : "anthropic_fetch_error",
      );
      return new Response(
        JSON.stringify({
          error: isAbortError(error)
            ? "El análisis completo tardó demasiado. Inténtalo de nuevo en unos minutos."
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
      const t = await response.text();
      console.error("Anthropic API error:", response.status, t);
      await reembolsarCobro(`anthropic_http_${response.status}`);
      const isOverloaded = response.status === 529 || response.status === 503;
      const isRateLimit = response.status === 429;
      return new Response(
        JSON.stringify({
          error: isRateLimit
            ? "Has alcanzado el límite de la API de IA. Inténtalo en unos minutos."
            : isOverloaded
            ? "El servicio de IA está sobrecargado ahora mismo. Inténtalo de nuevo en unos minutos."
            : `Error del servicio de IA (${response.status}). Inténtalo de nuevo.`,
        }),
        {
          status: isRateLimit ? 429 : isOverloaded ? 503 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let data: AnthropicResponse;
    try {
      data = (await response.json()) as AnthropicResponse;
    } catch (error) {
      console.error("Anthropic JSON inválido:", error);
      await reembolsarCobro("anthropic_malformed_json");
      return new Response(
        JSON.stringify({
          error: "La IA devolvió una respuesta malformada. Inténtalo de nuevo.",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (data.stop_reason === "max_tokens") {
      await reembolsarCobro("anthropic_max_tokens");
      return new Response(
        JSON.stringify({
          error:
            "El análisis completo quedó incompleto. Inténtalo de nuevo con un texto más corto.",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const toolUseBlock = data.content?.find((b) => b.type === "tool_use");
    if (!isRecord(toolUseBlock?.input)) {
      console.error("No tool_use block:", JSON.stringify(data));
      await reembolsarCobro("anthropic_missing_tool_use");
      return new Response(
        JSON.stringify({ error: "La IA no devolvió análisis válido." }),
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
      sugerencias_reescritura: Array.isArray(input.sugerencias_reescritura)
        ? input.sugerencias_reescritura
        : null,
    };

    if (
      !update.introduccion ||
      !update.parrafos ||
      !update.conclusion ||
      !update.lenguaje_analitico ||
      !update.sugerencias_reescritura ||
      (update.sugerencias_reescritura as unknown[]).length === 0
    ) {
      await reembolsarCobro("anthropic_incomplete_output");
      return new Response(
        JSON.stringify({ error: "La IA devolvió análisis incompleto." }),
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
      console.error("Error guardando análisis completo:", updateErr);
      await reembolsarCobro("supabase_update_error");
      return new Response(
        JSON.stringify({
          error: "El análisis se generó, pero no se pudo guardar.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (data.usage) {
      const { error: usoErr } = await adminClient.from("llm_uso").insert({
        user_id: userId,
        edge_function: "generate-analysis-extras",
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
    console.error("generate-analysis-extras error:", e);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
