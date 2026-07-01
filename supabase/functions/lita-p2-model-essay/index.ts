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
const LIMITE_DIARIO = 10;
const MAX_TOKENS = 8000;
const IDLE_TIMEOUT_MS = 45_000;

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

function systemPromptForModoIdeas(
  base: string,
  modoIdeas: "conservar" | "ideas_nuevas",
): string {
  if (modoIdeas === "ideas_nuevas") {
    return `${base}

TOP-BAND REWRITE MODE
The student has enabled new ideas. You may introduce original, deep, persuasive interpretive ideas that are specific to the two works and that raise the comparative argument. Avoid generic additions. Do not invent quotations, scenes, acts, chapters, or details; when using high-band examples, identify the act, scene, chapter, part, or moment whenever possible.`;
  }

  return `${base}

TOP-BAND REWRITE MODE
The student has asked to keep their voice, ideas, and structure. Develop the essay from within: preserve the recognisable argument, order, and voice, and improve precision, depth, integration, and style without replacing the student's ideas with unrelated ones.`;
}

const MEJORA_CRITERIO_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["criterio", "mejora"],
  properties: {
    criterio: { type: "string", enum: ["A", "B1", "B2", "C", "D"] },
    mejora: { type: "string" },
  },
};

const ESSAY_TOOL: Record<string, unknown> = {
  name: "registrar_ensayo_banda5_p2",
  description:
    "Registra un ensayo comparativo completo (Prueba 2) elevado a banda alta basado en la respuesta del alumno.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "titulo",
      "texto",
      "criterios_mejorados",
      "que_se_conservo",
      "que_se_transformo",
      "advertencia_uso",
    ],
    properties: {
      titulo: { type: "string" },
      texto: { type: "string" },
      criterios_mejorados: {
        type: "array",
        minItems: 5,
        maxItems: 5,
        items: MEJORA_CRITERIO_SCHEMA,
      },
      que_se_conservo: {
        type: "array",
        minItems: 2,
        maxItems: 4,
        items: { type: "string" },
      },
      que_se_transformo: {
        type: "array",
        minItems: 2,
        maxItems: 4,
        items: { type: "string" },
      },
      advertencia_uso: { type: "string" },
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
      .from("evaluaciones_prueba2")
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

    const nivel: Nivel = parseNivel(evaluacion.nivel);
    const courseKey: CourseKey = parseCourseKey(evaluacion.course_key);

    // Reutiliza si ya existe
    if (
      isRecord(evaluacion.ensayo_banda_5) &&
      typeof evaluacion.ensayo_banda_5.texto === "string"
    ) {
      return new Response(
        JSON.stringify({ ensayo_banda_5: evaluacion.ensayo_banda_5 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: limitErr } = await supabase
      .from("llm_uso")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("edge_function", ["lita-p2-model-essay", "generate-band5-essay-p2"])
      .gte("created_at", hace24h);

    if (limitErr) {
      console.error("Error comprobando límite diario:", limitErr);
      return new Response(
        JSON.stringify({ error: "No se pudo verificar el límite de uso." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if ((count ?? 0) >= LIMITE_DIARIO) {
      return new Response(
        JSON.stringify({
          error:
            "Has alcanzado el límite diario de ensayos elevados. Vuelve mañana.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
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

    const ensayo = htmlATextoPlano(String(evaluacion.ensayo_estudiante ?? ""));
    const feedback = {
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
      fortalezas: evaluacion.fortalezas,
      areas_mejora: evaluacion.areas_mejora,
      sugerencias_reescritura: evaluacion.sugerencias_reescritura,
    };

    const politicaIdeas = modoIdeas === "ideas_nuevas"
      ? "El alumno ha pedido ideas nuevas: conserva lo aprovechable de su voz, pero puedes introducir ideas originales, profundas y persuasivas que eleven el argumento. Deben ser específicas de las obras y no genéricas. No inventes citas ni escenas; cuando uses ejemplos de banda alta, indica de qué acto, escena, capítulo, cuadro, parte o momento de la obra proceden siempre que sea posible."
      : "El alumno ha pedido mantener su voz e ideas: eleva el ensayo desarrollando su propio argumento comparativo y su estilo, sin reemplazarlo por ideas ajenas. Cuando uses ejemplos de banda alta, indica de qué acto, escena, capítulo, cuadro, parte o momento de la obra proceden siempre que sea posible.";

    const userPrompt =
      `PREGUNTA DE PRUEBA 2:\n${evaluacion.pregunta}\n\nOBRA 1:\n${evaluacion.obra_1}\n\nOBRA 2:\n${evaluacion.obra_2}\n\nENSAYO ORIGINAL DEL ESTUDIANTE:\n${ensayo}\n\nFEEDBACK YA GENERADO:\n${
        JSON.stringify(
          feedback,
        )
      }\n\nMODO DE IDEAS:\n${politicaIdeas}\n\nGenera una versión completa del ensayo comparativo elevada a banda alta. Mantén referencias a líneas, versos, actos, escenas, capítulos, cuadros o partes que el alumno haya citado cuando sea posible. Usa cursiva Markdown para títulos de obras completas y comillas para títulos de extractos, poemas, capítulos, cuentos o fragmentos. Llama a la herramienta para registrar el ensayo.`;

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

    // ── Deducir créditos ───────────────────────────────────────────────────
    // Cobro IDEMPOTENTE por evaluación (P2): "feedback completo" (paper2-extras + band5-p2) cuesta UNA vez.
    const SRK_B5P2 = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SRK_B5P2) {
      clearIdleTimer();
      return new Response(
        JSON.stringify({ error: "Configuración del servidor incompleta." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const adminB5P2 = createClient(SUPABASE_URL, SRK_B5P2);
    const CLAVE_FC = `fc-p2:${evaluacionId}`;
    let cobradoAqui = false;
    const { data: cobro, error: creditErr } = await adminB5P2.rpc(
      "deducir_creditos_idempotente",
      {
        p_user_id: userId,
        p_cantidad: 2.0,
        p_concepto: "feedback-completo-p2",
        p_clave: CLAVE_FC,
        p_metadata: { origen: "generate-band5-essay-p2" },
      },
    );
    if (creditErr) {
      clearIdleTimer();
      return new Response(
        JSON.stringify({ error: "No se pudo verificar tu saldo de créditos." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const estado = isRecord(cobro) && typeof cobro.estado === "string"
      ? cobro.estado
      : "";
    if (estado === "insuficiente") {
      clearIdleTimer();
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
    if (estado !== "cobrado" && estado !== "ya_cobrado") {
      clearIdleTimer();
      return new Response(
        JSON.stringify({ error: "No se pudo verificar tu saldo de créditos." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    cobradoAqui = estado === "cobrado";

    // Reembolsa SÓLO si el cobro lo hizo esta llamada (idempotente).
    const reembolsarB5P2 = async () => {
      if (!cobradoAqui) return;
      await adminB5P2.rpc("reembolsar_creditos", {
        p_user_id: userId,
        p_cantidad: 2.0,
        p_concepto: "feedback-completo-p2",
        p_metadata: { clave: CLAVE_FC, motivo: "error_generacion" },
      });
    };

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
          model: "claude-opus-4-7",
          max_tokens: MAX_TOKENS,
          stream: true,
          system: [
            {
              type: "text",
              text: systemPromptForModoIdeas(
                buildSystemPrompt({
                  courseKey,
                  component: "band5-p2",
                  nivel,
                }),
                modoIdeas,
              ),
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: userPrompt }],
          tools: [ESSAY_TOOL],
          tool_choice: { type: "tool", name: "registrar_ensayo_banda5_p2" },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      clearIdleTimer();
      if (!isAbortError(error)) console.error("Anthropic fetch error:", error);
      await reembolsarB5P2();
      return new Response(
        JSON.stringify({
          error: isAbortError(error)
            ? "El ensayo elevado tardó demasiado. Inténtalo de nuevo en unos minutos."
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
      await reembolsarB5P2();
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

    if (!response.body) {
      clearIdleTimer();
      console.error("Anthropic stream sin body.");
      await reembolsarB5P2();
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
          const dataLine = rawEvent.split("\n").find((l) =>
            l.startsWith("data: ")
          );
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
                usage.cache_creation_input_tokens =
                  u.cache_creation_input_tokens;
              }
              if (typeof u.cache_read_input_tokens === "number") {
                usage.cache_read_input_tokens = u.cache_read_input_tokens;
              }
              if (typeof u.output_tokens === "number") {
                usage.output_tokens = u.output_tokens;
              }
            }
          } else if (
            eventType === "content_block_delta" && isRecord(parsed.delta)
          ) {
            const delta = parsed.delta;
            if (
              delta.type === "input_json_delta" &&
              typeof delta.partial_json === "string"
            ) {
              toolUseInputBuffer += delta.partial_json;
            }
          } else if (eventType === "message_delta") {
            if (
              isRecord(parsed.delta) &&
              typeof parsed.delta.stop_reason === "string"
            ) {
              stopReason = parsed.delta.stop_reason;
            }
            if (
              isRecord(parsed.usage) &&
              typeof parsed.usage.output_tokens === "number"
            ) {
              usage.output_tokens = parsed.usage.output_tokens;
            }
          } else if (eventType === "error" && isRecord(parsed.error)) {
            streamErrorMessage = typeof parsed.error.message === "string"
              ? parsed.error.message
              : "Error en el streaming.";
            aborted = true;
          }
        }
      }
    } catch (error) {
      clearIdleTimer();
      if (!isAbortError(error)) console.error("Anthropic stream error:", error);
      await reembolsarB5P2();
      return new Response(
        JSON.stringify({
          error: isAbortError(error)
            ? "El ensayo elevado tardó demasiado. Inténtalo de nuevo en unos minutos."
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
      await reembolsarB5P2();
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

    if (stopReason === "max_tokens") {
      console.error("Ensayo banda 5 P2 truncado por max_tokens.");
      await reembolsarB5P2();
      return new Response(
        JSON.stringify({
          error:
            "El ensayo elevado quedó incompleto. Inténtalo de nuevo en unos minutos.",
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
      console.error(
        "Tool_use JSON malformado:",
        e,
        toolUseInputBuffer.slice(0, 500),
      );
      await reembolsarB5P2();
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

    const toolUseBlock = data.content?.find((b) => b.type === "tool_use");
    if (!isRecord(toolUseBlock?.input)) {
      console.error("No tool_use block:", JSON.stringify(data));
      await reembolsarB5P2();
      return new Response(
        JSON.stringify({ error: "La IA no devolvió un ensayo válido." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const ensayoBanda5 = toolUseBlock.input;
    if (typeof ensayoBanda5.texto !== "string" || !ensayoBanda5.texto.trim()) {
      console.error(
        "Ensayo banda 5 P2 sin texto:",
        JSON.stringify(ensayoBanda5).slice(0, 500),
      );
      await reembolsarB5P2();
      return new Response(
        JSON.stringify({
          error: "La IA no devolvió un ensayo válido. Inténtalo de nuevo.",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const { error: updateErr } = await supabase
      .from("evaluaciones_prueba2")
      .update({ ensayo_banda_5: ensayoBanda5 })
      .eq("id", evaluacionId);

    if (updateErr) {
      console.error("Error guardando ensayo banda alta P2:", updateErr);
      await reembolsarB5P2();
      return new Response(
        JSON.stringify({
          error:
            "El ensayo se generó, pero no se pudo guardar. Se han reembolsado tus créditos.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (data.usage) {
      const { error: usoErr } = await adminB5P2.from("llm_uso").insert({
        user_id: userId,
        edge_function: "lita-p2-model-essay",
        modelo: "claude-opus-4-7",
        tokens_entrada: data.usage.input_tokens ?? 0,
        tokens_salida: data.usage.output_tokens ?? 0,
        cache_creation_tokens: data.usage.cache_creation_input_tokens ?? 0,
        cache_read_tokens: data.usage.cache_read_input_tokens ?? 0,
      });
      if (usoErr) console.error("Error registrando uso LLM:", usoErr);
    }

    return new Response(JSON.stringify({ ensayo_banda_5: ensayoBanda5 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-band5-essay-p2 error:", e);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
