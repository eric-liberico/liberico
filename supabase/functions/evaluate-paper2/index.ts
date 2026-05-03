import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { procesarGamificacion } from "../_shared/gamificacion.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT: string = `Eres un examinador experto de Español A: Literatura del Bachillerato Internacional. Evalúas la Prueba 2: ensayo literario comparativo sobre dos obras estudiadas.

CONTEXTO DE LA TAREA
La Prueba 2 no es un análisis de texto no visto. El estudiante responde una pregunta general y escribe un ensayo comparativo sobre dos obras literarias estudiadas. Debe comparar y/o contrastar contenido y forma, responder a la pregunta elegida y demostrar conocimiento de ambas obras.

El ensayo se escribe bajo condiciones de examen y sin acceso a las obras. Por eso no exijas citas extensas ni referencias perfectas, pero sí referencias detalladas, precisas y pertinentes a momentos, personajes, escenas, motivos, decisiones estructurales, voz, forma, símbolos, tono, perspectiva, género literario o recursos relevantes.

REGLA CONTRA INVENCIÓN
No inventes detalles de las obras. Evalúa principalmente lo que el estudiante demuestra en su ensayo y en las notas opcionales proporcionadas. Si una obra te resulta conocida, puedes usar ese conocimiento solo para detectar errores claros, pero no rellenes huecos que el alumno no ha demostrado. Si faltan ejemplos, penaliza la falta de conocimiento demostrado.

CRITERIOS
Evalúa sobre 25 puntos:

Criterio A — Conocimiento, comprensión e interpretación, 0-5.
Evalúa cuánto conocimiento de las dos obras demuestra el estudiante en relación con la pregunta, y si interpreta sus implicaciones con precisión. Penaliza resumen argumental general, errores sobre las obras, conocimiento desequilibrado o respuesta que ignora la pregunta.

Criterio B1 — Análisis y evaluación de decisiones autorales, 0-5.
Evalúa si analiza cómo las decisiones formales y literarias producen significado: estructura, voz, narrador, focalización, símbolos, motivos, tono, género, diálogo, espacio, tiempo, caracterización, ritmo, imágenes, ironía, etc. Penaliza comentarios puramente temáticos sin análisis de forma.

Criterio B2 — Comparación y contraste, 0-5.
Evalúa si compara de forma sostenida e integrada las dos obras. La comparación alta no son dos miniensayos consecutivos: debe articular semejanzas y diferencias en relación con la pregunta. Penaliza desequilibrio, yuxtaposición mecánica y conectores comparativos vacíos.

Criterio C — Foco, desarrollo y organización, 0-5.
Evalúa la claridad de la tesis comparativa, progresión argumentativa, estructura de párrafos, transiciones, respuesta sostenida a la pregunta y conclusión. Penaliza desviaciones hacia ensayo preparado, organización por obra sin síntesis o repetición.

Criterio D — Lenguaje, 0-5.
Evalúa precisión, registro académico, claridad sintáctica, vocabulario literario y corrección. Penaliza calcos del inglés, conectores imprecisos, vaguedad, errores recurrentes y registro informal.

DIAGNÓSTICO COMPARATIVO
Analiza estos cinco elementos:
1. tesis_comparativa: si hay una tesis que compare las dos obras y responda a la pregunta.
2. equilibrio_obras: si ambas obras reciben atención suficiente y pertinente.
3. respuesta_pregunta: si el ensayo responde a la pregunta concreta y no a un tema genérico.
4. uso_evidencia: si las referencias a las obras son precisas, relevantes y analizadas.
5. comparacion_integrada: si la comparación está integrada dentro de cada argumento, no añadida al final.

Para cada elemento devuelve:
- estado: presente, parcial o ausente.
- fragmento: cita breve del ensayo del estudiante, máximo 20 palabras; si está ausente, "".
- evaluacion: frase corta sobre la calidad.
- sugerencia: consejo accionable.

ANOTACIONES
Devuelve 4-8 anotaciones localizables sobre el ensayo. Cada anotación debe tener:
- fragmento_original: fragmento exacto o casi exacto del ensayo, 5-25 palabras.
- criterio: A, B1, B2, C o D.
- problema: qué limita la banda.
- sugerencia: cómo mejorarlo.
- prioridad: número 1-5, donde 5 es lo más urgente.

Prioriza:
- tesis no comparativa;
- párrafos que tratan una obra y olvidan la otra;
- comparación superficial;
- análisis formal ausente;
- ejemplos demasiado generales;
- respuesta débil a la pregunta;
- lenguaje impreciso.

INTEGRIDAD ACADÉMICA
No escribas un ensayo completo modelo. No des una respuesta lista para entregar. Puedes sugerir microreescrituras o mejoras de enfoque, pero deben conservar la voz, ideas y estructura del alumno.

ESTILO
Sé riguroso, concreto y útil. No des feedback genérico. Cada justificación debe mencionar rasgos específicos del ensayo.

COMENTARIOS OBLIGATORIOS
Los campos justificacion_a, justificacion_b1, justificacion_b2, justificacion_c y justificacion_d son obligatorios y no pueden estar vacíos. Cada uno debe contener 2-3 frases específicas que expliquen la puntuación asignada con referencias concretas al ensayo. También debes completar fortalezas, areas_mejora y comentario_global con feedback útil; no devuelvas cadenas vacías.`;

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

const LIMITE_PRUEBA2_DIARIO = 8;
const MIN_FEEDBACK_CHARS = 40;
const MIN_SHORT_FEEDBACK_CHARS = 8;
const DEFAULT_EVALUATION_MODEL = "claude-opus-4-7";
const ANTHROPIC_MAX_TOKENS = 6000;
const ANTHROPIC_TIMEOUT_MS = 120_000;
const ALLOWED_HTML_TAGS = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li"]);

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeEditorHtml(value: string): string {
  const tagRe = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  let output = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(value)) !== null) {
    output += escapeHtml(value.slice(lastIndex, match.index));
    const tag = match[1].toLowerCase();
    if (ALLOWED_HTML_TAGS.has(tag)) {
      const isClosing = match[0].startsWith("</");
      output += tag === "br" ? "<br>" : isClosing ? `</${tag}>` : `<${tag}>`;
    }
    lastIndex = tagRe.lastIndex;
  }

  output += escapeHtml(value.slice(lastIndex));
  return output;
}

const SHORT_FEEDBACK_SCHEMA: Record<string, unknown> = {
  type: "string",
  minLength: MIN_SHORT_FEEDBACK_CHARS,
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

const JUSTIFICACION_SCHEMA: Record<string, unknown> = {
  type: "string",
  minLength: MIN_FEEDBACK_CHARS,
  description:
    "Comentario específico de 2-3 frases que justifica la puntuación del criterio con rasgos concretos del ensayo.",
};

const FEEDBACK_GENERAL_SCHEMA: Record<string, unknown> = {
  type: "string",
  minLength: MIN_FEEDBACK_CHARS,
  description: "Feedback específico y accionable; no puede estar vacío.",
};

const EVAL_TOOL_PAPER2: Record<string, unknown> = {
  name: "registrar_evaluacion_prueba2",
  description:
    "Registra la evaluación completa del ensayo comparativo de Prueba 2 según los criterios del IB.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "criterio_a",
      "criterio_b1",
      "criterio_b2",
      "criterio_c",
      "criterio_d",
      "justificacion_a",
      "justificacion_b1",
      "justificacion_b2",
      "justificacion_c",
      "justificacion_d",
      "fortalezas",
      "areas_mejora",
      "comentario_global",
      "diagnostico_comparativo",
      "anotaciones",
    ],
    properties: {
      criterio_a: { type: "integer", minimum: 0, maximum: 5 },
      criterio_b1: { type: "integer", minimum: 0, maximum: 5 },
      criterio_b2: { type: "integer", minimum: 0, maximum: 5 },
      criterio_c: { type: "integer", minimum: 0, maximum: 5 },
      criterio_d: { type: "integer", minimum: 0, maximum: 5 },
      justificacion_a: JUSTIFICACION_SCHEMA,
      justificacion_b1: JUSTIFICACION_SCHEMA,
      justificacion_b2: JUSTIFICACION_SCHEMA,
      justificacion_c: JUSTIFICACION_SCHEMA,
      justificacion_d: JUSTIFICACION_SCHEMA,
      fortalezas: FEEDBACK_GENERAL_SCHEMA,
      areas_mejora: FEEDBACK_GENERAL_SCHEMA,
      comentario_global: FEEDBACK_GENERAL_SCHEMA,
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

    const pregunta = body.pregunta;
    const obra1 = body.obra_1;
    const obra2 = body.obra_2;
    const notasObra1 = body.notas_obra_1;
    const notasObra2 = body.notas_obra_2;
    const ensayo = body.ensayo;

    if (!pregunta || !obra1 || !obra2 || !ensayo) {
      return new Response(
        JSON.stringify({ error: "Faltan campos obligatorios: pregunta, obra_1, obra_2, ensayo." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (
      typeof pregunta !== "string" ||
      typeof obra1 !== "string" ||
      typeof obra2 !== "string" ||
      typeof ensayo !== "string"
    ) {
      return new Response(JSON.stringify({ error: "Campos inválidos." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (pregunta.length > 2000) {
      return new Response(
        JSON.stringify({ error: "La pregunta supera el límite de 2000 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (obra1.length > 300 || obra2.length > 300) {
      return new Response(
        JSON.stringify({ error: "El título de obra supera el límite de 300 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (typeof notasObra1 === "string" && notasObra1.length > 8000) {
      return new Response(
        JSON.stringify({ error: "Las notas de la obra 1 superan el límite de 8000 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (typeof notasObra2 === "string" && notasObra2.length > 8000) {
      return new Response(
        JSON.stringify({ error: "Las notas de la obra 2 superan el límite de 8000 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (ensayo.length > 50000) {
      return new Response(
        JSON.stringify({ error: "El ensayo supera el límite de 50000 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ensayoHtml =
      typeof body.ensayo_html === "string" ? body.ensayo_html.slice(0, 60000) : ensayo;

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY no configurada." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const EVALUATION_MODEL = Deno.env.get("ANTHROPIC_EVALUATION_MODEL") ?? DEFAULT_EVALUATION_MODEL;

    // Reserva atómica de cuota con pg_advisory_xact_lock dentro de la RPC
    const { data: reserva, error: reservaErr } = await adminClient.rpc("reservar_cuota_prueba2", {
      p_user_id: userId,
      p_limite: LIMITE_PRUEBA2_DIARIO,
    });
    if (reservaErr) {
      console.error("Error reservando cuota:", reservaErr);
      return new Response(JSON.stringify({ error: "No se pudo verificar el límite de uso." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (reserva === null) {
      return new Response(
        JSON.stringify({
          error: "Has alcanzado el límite diario de evaluaciones de Prueba 2. Vuelve mañana.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const usoId = reserva as string;

    const cancelarCuota = async () => {
      await adminClient.from("llm_uso").delete().eq("id", usoId);
    };

    const notasSeccion =
      (typeof notasObra1 === "string" && notasObra1.trim()
        ? `\nNOTAS SOBRE OBRA 1:\n${notasObra1.trim()}`
        : "") +
      (typeof notasObra2 === "string" && notasObra2.trim()
        ? `\nNOTAS SOBRE OBRA 2:\n${notasObra2.trim()}`
        : "");

    const userPrompt = `PREGUNTA DE PRUEBA 2:\n${pregunta}\n\nOBRA 1:\n${obra1}\n\nOBRA 2:\n${obra2}${notasSeccion}\n\nENSAYO DEL ESTUDIANTE:\n${ensayo}\n\nEvalúa este ensayo comparativo según los criterios de la Prueba 2 del IB. Sé específico y concreto en cada justificación. Llama a la herramienta para registrar la evaluación completa.`;

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
              text: SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: userPrompt }],
          tools: [EVAL_TOOL_PAPER2],
          tool_choice: { type: "tool", name: "registrar_evaluacion_prueba2" },
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
            ? "La corrección tardó demasiado. Prueba con un ensayo más corto o inténtalo de nuevo en unos minutos."
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

    console.log("evaluate-paper2 Anthropic completed", {
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
      console.error("Anthropic max_tokens en evaluate-paper2", {
        model: EVALUATION_MODEL,
        max_tokens: ANTHROPIC_MAX_TOKENS,
      });
      return new Response(
        JSON.stringify({
          error:
            "La corrección quedó incompleta. Prueba con un ensayo más corto o inténtalo de nuevo.",
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
    const clamp = (v: unknown): number =>
      typeof v === "number" && isFinite(v) ? Math.max(0, Math.min(5, Math.round(v))) : 0;

    const criterio_a = clamp(ev.criterio_a);
    const criterio_b1 = clamp(ev.criterio_b1);
    const criterio_b2 = clamp(ev.criterio_b2);
    const criterio_c = clamp(ev.criterio_c);
    const criterio_d = clamp(ev.criterio_d);
    const puntuacion_total = criterio_a + criterio_b1 + criterio_b2 + criterio_c + criterio_d;
    const feedbackText = {
      justificacion_a: typeof ev.justificacion_a === "string" ? ev.justificacion_a.trim() : "",
      justificacion_b1: typeof ev.justificacion_b1 === "string" ? ev.justificacion_b1.trim() : "",
      justificacion_b2: typeof ev.justificacion_b2 === "string" ? ev.justificacion_b2.trim() : "",
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
      console.error("Evaluación Prueba 2 sin comentarios suficientes:", feedbackFaltante);
      return new Response(
        JSON.stringify({
          error: "La IA no devolvió comentarios completos para los criterios. Inténtalo de nuevo.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: insertada, error: insertErr } = await supabase
      .from("evaluaciones_prueba2")
      .insert({
        user_id: userId,
        pregunta: pregunta.trim(),
        obra_1: obra1.trim(),
        obra_2: obra2.trim(),
        notas_obra_1:
          typeof notasObra1 === "string" && notasObra1.trim() ? notasObra1.trim() : null,
        notas_obra_2:
          typeof notasObra2 === "string" && notasObra2.trim() ? notasObra2.trim() : null,
        ensayo_estudiante: sanitizeEditorHtml(ensayoHtml),
        criterio_a,
        criterio_b1,
        criterio_b2,
        criterio_c,
        criterio_d,
        justificacion_a: feedbackText.justificacion_a,
        justificacion_b1: feedbackText.justificacion_b1,
        justificacion_b2: feedbackText.justificacion_b2,
        justificacion_c: feedbackText.justificacion_c,
        justificacion_d: feedbackText.justificacion_d,
        fortalezas: feedbackText.fortalezas,
        areas_mejora: feedbackText.areas_mejora,
        comentario_global: feedbackText.comentario_global,
        diagnostico_comparativo: isRecord(ev.diagnostico_comparativo)
          ? ev.diagnostico_comparativo
          : null,
        anotaciones: Array.isArray(ev.anotaciones) ? ev.anotaciones : null,
      })
      .select("id")
      .single();

    if (insertErr || !insertada) {
      console.error("Error guardando evaluación Prueba 2:", insertErr);
      return new Response(
        JSON.stringify({ error: "La evaluación se generó, pero no se pudo guardar." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const gamificacion = await procesarGamificacion(adminClient, userId, {
      tipo: "p2",
      puntuacion_total,
    });

    return new Response(
      JSON.stringify({
        evaluacion_id: insertada.id,
        criterio_a,
        criterio_b1,
        criterio_b2,
        criterio_c,
        criterio_d,
        puntuacion_total,
        justificacion_a: feedbackText.justificacion_a,
        justificacion_b1: feedbackText.justificacion_b1,
        justificacion_b2: feedbackText.justificacion_b2,
        justificacion_c: feedbackText.justificacion_c,
        justificacion_d: feedbackText.justificacion_d,
        fortalezas: feedbackText.fortalezas,
        areas_mejora: feedbackText.areas_mejora,
        comentario_global: feedbackText.comentario_global,
        diagnostico_comparativo: isRecord(ev.diagnostico_comparativo)
          ? ev.diagnostico_comparativo
          : null,
        anotaciones: Array.isArray(ev.anotaciones) ? ev.anotaciones : [],
        gamificacion,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("evaluate-paper2 error:", e);
    return new Response(JSON.stringify({ error: "Error interno del servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
