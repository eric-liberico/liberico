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
const LIMITE_DIARIO = 5;
const MODEL = "claude-opus-4-7";
const MAX_TOKENS = 10000;
const IDLE_TIMEOUT_MS = 45_000; // Aborta si Anthropic no envía chunk (token o ping) en este margen.

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
    isRecord(evaluacion.diagnostico_comparativo) &&
    Array.isArray(evaluacion.anotaciones) &&
    (evaluacion.anotaciones as unknown[]).length > 0 &&
    Array.isArray(evaluacion.sugerencias_reescritura) &&
    (evaluacion.sugerencias_reescritura as unknown[]).length > 0
  );
}

function respuestaExtras(evaluacion: JsonRecord): JsonRecord {
  return {
    evaluacion_id: evaluacion.id ?? null,
    diagnostico_comparativo: evaluacion.diagnostico_comparativo,
    anotaciones: evaluacion.anotaciones,
    sugerencias_reescritura: evaluacion.sugerencias_reescritura,
    feedback_completo_generado: true,
  };
}

function systemPromptForModoIdeas(base: string, modoIdeas: "conservar" | "ideas_nuevas"): string {
  if (modoIdeas === "ideas_nuevas") {
    return `${base}

MODO DE MICRO-REESCRITURAS
El alumno ha activado ideas nuevas. En las micro-reescrituras puedes proponer ideas comparativas originales, profundas y persuasivas cuando eleven el argumento, siempre específicas de las obras. Evita ideas obvias. No inventes citas, escenas, actos, capítulos ni detalles; si propones una idea nueva, ancla su posible evidencia en actos, escenas, capítulos, partes o momentos de la obra cuando sea posible.`;
  }

  return `${base}

MODO DE MICRO-REESCRITURAS
El alumno ha pedido mantener su voz, ideas y estructura. Las micro-reescrituras deben desarrollar su propio argumento comparativo desde dentro, sin sustituirlo por ideas ajenas.`;
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
      message: "Has alcanzado el límite diario de análisis completo. Vuelve mañana.",
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

const SUGERENCIA_REESCRITURA_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "fragmento_original",
    "criterio",
    "problema",
    "propuesta_reescritura",
    "explicacion_pedagogica",
    "nivel_intervencion",
    "prioridad",
  ],
  properties: {
    fragmento_original: { type: "string" },
    criterio: { type: "string", enum: ["A", "B1", "B2", "C", "D"] },
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
  name: "registrar_extras_p2",
  description: "Registra el diagnóstico comparativo, anotaciones y micro-reescrituras de Prueba 2.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["diagnostico_comparativo", "anotaciones", "sugerencias_reescritura"],
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
    const modoIdeas = body.modo_ideas === "ideas_nuevas" ? "ideas_nuevas" : "conservar";
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

    if (extrasExisten(evaluacion)) {
      return new Response(JSON.stringify(respuestaExtras(evaluacion)), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gate de créditos: el "feedback completo" (P2) cuesta 2 (cobro IDEMPOTENTE al final, compartido con
    // generate-band5-essay-p2). Comprobamos saldo para no gastar LLM gratis (cierra el bypass directo).
    if (((perfil.creditos as number | null) ?? 0) < 2) {
      return new Response(
        JSON.stringify({ error: "Créditos insuficientes. Necesitas 2 créditos para el feedback completo." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const limite = await verificarLimiteDiario(async () => {
      const resultado = await supabase
        .from("llm_uso")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("edge_function", "generate-paper2-extras")
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

    const politicaIdeas =
      modoIdeas === "ideas_nuevas"
        ? "El alumno ha elegido recibir ideas nuevas: las sugerencias pueden introducir líneas interpretativas originales, profundas y persuasivas cuando el ensayo sea genérico. Evita ideas obvias. No inventes citas, escenas ni detalles; si propones una idea nueva, ancla su posible evidencia en actos, escenas, capítulos, partes o momentos de la obra cuando sea posible."
        : "El alumno ha elegido mantener su voz e ideas: desarrolla y precisa lo que ya está en el ensayo, sin sustituir el argumento por otro. Puedes añadir matices solo si nacen claramente de su planteamiento.";

    const userPrompt = `PREGUNTA DE PRUEBA 2:\n${evaluacion.pregunta}\n\nOBRA 1:\n${evaluacion.obra_1}\n\nOBRA 2:\n${evaluacion.obra_2}${notasSeccion}\n\nENSAYO ORIGINAL DEL ESTUDIANTE:\n${ensayoEstudiante}\n\nEVALUACIÓN BÁSICA YA MOSTRADA AL ALUMNO:\n${JSON.stringify(
      feedbackBasico,
    )}\n\nMODO DE IDEAS:\n${politicaIdeas}\n\nGenera el diagnóstico comparativo completo con sus anotaciones localizables y las micro-reescrituras basadas en ese diagnóstico. Mantén referencias a líneas, versos, actos, escenas, capítulos o partes citadas por el alumno. No cambies las notas ni las justificaciones ya asignadas, y no repitas fortalezas ni áreas de mejora. Llama a la herramienta para registrar.`;

    const controller = new AbortController();
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    const resetIdleTimer = () => {
      if (idleTimer !== undefined) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => controller.abort(), IDLE_TIMEOUT_MS);
    };
    const clearIdleTimer = () => {
      if (idleTimer !== undefined) {
        clearTimeout(idleTimer);
        idleTimer = undefined;
      }
    };
    resetIdleTimer();

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
          stream: true,
          system: [
            {
              type: "text",
              text: systemPromptForModoIdeas(
                buildSystemPrompt({
                  courseKey,
                  component: "paper2-extras",
                  nivel,
                }),
                modoIdeas,
              ),
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: userPrompt }],
          tools: [EXTRAS_TOOL],
          tool_choice: { type: "tool", name: "registrar_extras_p2" },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      clearIdleTimer();
      if (!isAbortError(error)) console.error("Anthropic fetch error:", error);
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
    }

    if (!response.ok) {
      clearIdleTimer();
      const t = await response.text();
      console.error("Anthropic API error:", response.status, t);
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

    if (!response.body) {
      clearIdleTimer();
      console.error("Anthropic stream sin body.");
      return new Response(
        JSON.stringify({
          error: "No se pudo leer la respuesta del servicio de IA.",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const usage: AnthropicUsage = {};
    let stopReason: string | undefined;
    let toolUseInputBuffer = "";
    let sseBuffer = "";
    let streamErrorMessage: string | undefined;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      let aborted = false;
      while (!aborted) {
        const { done, value } = await reader.read();
        if (done) break;
        resetIdleTimer();
        sseBuffer += decoder.decode(value, { stream: true });

        while (!aborted) {
          const sepIdx = sseBuffer.indexOf("\n\n");
          if (sepIdx === -1) break;
          const rawEvent = sseBuffer.slice(0, sepIdx);
          sseBuffer = sseBuffer.slice(sepIdx + 2);
          const dataLine = rawEvent.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          let parsed: unknown;
          try {
            parsed = JSON.parse(dataLine.slice(6));
          } catch {
            continue;
          }
          if (!isRecord(parsed)) continue;
          const eventType = parsed.type;

          if (eventType === "message_start" && isRecord(parsed.message)) {
            const u = parsed.message.usage;
            if (isRecord(u)) {
              if (typeof u.input_tokens === "number") {
                usage.input_tokens = u.input_tokens;
              }
              if (typeof u.cache_creation_input_tokens === "number") {
                usage.cache_creation_input_tokens = u.cache_creation_input_tokens;
              }
              if (typeof u.cache_read_input_tokens === "number") {
                usage.cache_read_input_tokens = u.cache_read_input_tokens;
              }
              if (typeof u.output_tokens === "number") {
                usage.output_tokens = u.output_tokens;
              }
            }
          } else if (eventType === "content_block_delta" && isRecord(parsed.delta)) {
            const delta = parsed.delta;
            if (delta.type === "input_json_delta" && typeof delta.partial_json === "string") {
              toolUseInputBuffer += delta.partial_json;
            }
          } else if (eventType === "message_delta") {
            if (isRecord(parsed.delta) && typeof parsed.delta.stop_reason === "string") {
              stopReason = parsed.delta.stop_reason;
            }
            if (isRecord(parsed.usage) && typeof parsed.usage.output_tokens === "number") {
              usage.output_tokens = parsed.usage.output_tokens;
            }
          } else if (eventType === "error" && isRecord(parsed.error)) {
            streamErrorMessage =
              typeof parsed.error.message === "string"
                ? parsed.error.message
                : "Error en el streaming.";
            aborted = true;
          }
        }
      }
    } catch (error) {
      clearIdleTimer();
      if (!isAbortError(error)) console.error("Anthropic stream error:", error);
      return new Response(
        JSON.stringify({
          error: isAbortError(error)
            ? "El análisis completo tardó demasiado. Inténtalo de nuevo en unos minutos."
            : "No se pudo leer la respuesta del servicio de IA. Inténtalo de nuevo.",
        }),
        {
          status: isAbortError(error) ? 504 : 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    clearIdleTimer();

    if (streamErrorMessage) {
      console.error("Stream error event:", streamErrorMessage);
      return new Response(
        JSON.stringify({
          error: `Error del servicio de IA: ${streamErrorMessage}`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let parsedInput: JsonRecord;
    try {
      parsedInput = JSON.parse(toolUseInputBuffer) as JsonRecord;
    } catch (e) {
      console.error("Tool_use JSON malformado:", e, toolUseInputBuffer.slice(0, 500));
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

    const data: AnthropicResponse = {
      stop_reason: stopReason,
      usage,
      content: [{ type: "tool_use", input: parsedInput }],
    };
    if (data.stop_reason === "max_tokens") {
      return new Response(
        JSON.stringify({
          error:
            "El análisis completo quedó incompleto. Inténtalo de nuevo con un ensayo más corto.",
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
      return new Response(JSON.stringify({ error: "La IA no devolvió análisis válido." }), {
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
      sugerencias_reescritura: Array.isArray(input.sugerencias_reescritura)
        ? input.sugerencias_reescritura
        : null,
    };

    if (
      !update.diagnostico_comparativo ||
      !update.anotaciones ||
      (update.anotaciones as unknown[]).length < 4 ||
      !update.sugerencias_reescritura ||
      (update.sugerencias_reescritura as unknown[]).length === 0
    ) {
      return new Response(JSON.stringify({ error: "La IA devolvió análisis incompleto." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateErr } = await supabase
      .from("evaluaciones_prueba2")
      .update(update)
      .eq("id", evaluacionId);

    if (updateErr) {
      console.error("Error guardando análisis completo Prueba 2:", updateErr);
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

    // Cobro IDEMPOTENTE tras generar+guardar: "feedback completo" (P2) cuesta 2 UNA vez por evaluación. Misma
    // clave que generate-band5-essay-p2 → si ya cobró (o cobra después), no-op.
    const SRK_COBRO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (SRK_COBRO) {
      const adminCobro = createClient(SUPABASE_URL, SRK_COBRO);
      const { error: cobroErr } = await adminCobro.rpc("deducir_creditos_idempotente", {
        p_user_id: userId,
        p_cantidad: 2.0,
        p_concepto: "feedback-completo-p2",
        p_clave: `fc-p2:${evaluacionId}`,
      });
      if (cobroErr) console.error("cobro idempotente (paper2-extras) falló:", cobroErr);
    }

    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (SUPABASE_SERVICE_ROLE_KEY && data.usage) {
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { error: usoErr } = await adminClient.from("llm_uso").insert({
        user_id: userId,
        edge_function: "generate-paper2-extras",
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
    console.error("generate-paper2-extras error:", e);
    return new Response(JSON.stringify({ error: "Error interno del servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
