import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { type Nivel, nivelContext, parseNivel } from "../_shared/nivel.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres un examinador experto de Español A: Literatura del Bachillerato Internacional. Generas feedback completo del Trabajo Oral Individual solo después de que el alumno lo solicita.

CONTEXTO
Ya existe una evaluación básica con criterios A, B, C y D, justificaciones, comentario global, fortalezas y áreas de mejora. NO cambies esas notas ni repitas fortalezas/áreas. Tu tarea es ampliar el feedback con diagnósticos detallados, preguntas/zonas y anotaciones localizables que la interfaz mostrará detrás del botón "Dame feedback completo".

DEBES DEVOLVER

1. diagnostico_asunto_global con tres elementos:
- definicion: si el asunto global está claramente formulado.
- especificidad: si no es demasiado amplio ni genérico.
- uso_como_lente: si organiza todo el oral como eje articulador.

2. diagnostico_equilibrio con cuatro elementos:
- extracto_1, obra_1, extracto_2, obra_2.

3. diagnostico_estructura con cuatro elementos:
- apertura, progresion, transiciones, cierre.

Para cada elemento de los diagnósticos devuelve:
- estado: "presente", "parcial" o "ausente".
- fragmento: cita breve del guion del alumno, máximo 20 palabras; si está ausente, "".
- evaluacion: frase breve y concreta.
- sugerencia: acción concreta para mejorar.

4. Si tipo_oral = "taught":
Devuelve preguntas_profesor con 5-8 preguntas probables del profesor. Cada pregunta debe profundizar en una laguna del oral o ayudar a ampliar análisis, conocimiento de obra o asunto global. No deben ser genéricas.
Para cada pregunta devuelve:
- pregunta
- proposito
- como_responder

5. Si tipo_oral = "self_taught":
No devuelvas preguntas_profesor.
Devuelve zonas_desarrollo_self_taught con 4-6 zonas. Cada zona indica qué parte debe desarrollar el alumno dentro de sus 15 minutos.
Para cada zona devuelve:
- zona
- problema
- sugerencia

6. anotaciones: 4-8 anotaciones localizables sobre el guion. Cada anotación debe tener:
- fragmento_original: cita exacta o casi exacta del guion del alumno, 8-35 palabras, para que la interfaz pueda localizarla.
- criterio: A, B, C o D.
- problema: descripción concreta del problema.
- sugerencia: consejo accionable.
- prioridad: entero del 1 al 5.

REGLAS
- Usa fragmentos exactos o casi exactos del guion del alumno para que la interfaz pueda resaltarlos.
- No inventes detalles de las obras ni rellenes huecos que el alumno no ha demostrado.
- No generes oral completo ni guion listo para memorizar; esas acciones tienen sus propias funciones.
- Sé conciso, concreto y útil.

INTEGRIDAD ACADÉMICA
No escribas un oral completo listo para memorizar.
No transformes el guion entero en una versión final.`;

function buildSystemPrompt(nivel: Nivel): string {
  return SYSTEM_PROMPT + nivelContext(nivel, "oral");
}

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
const LIMITE_DIARIO = 10;
const MODEL = "claude-opus-4-7";
const MAX_TOKENS = 8000;
const TIMEOUT_MS = 150_000;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function feedbackCompletoExiste(evaluacion: JsonRecord): boolean {
  return (
    isRecord(evaluacion.diagnostico_asunto_global) &&
    isRecord(evaluacion.diagnostico_equilibrio) &&
    isRecord(evaluacion.diagnostico_estructura)
  );
}

function respuestaFeedback(evaluacion: JsonRecord): JsonRecord {
  return {
    evaluacion_id: evaluacion.id ?? null,
    diagnostico_asunto_global: isRecord(evaluacion.diagnostico_asunto_global)
      ? evaluacion.diagnostico_asunto_global
      : null,
    diagnostico_equilibrio: isRecord(evaluacion.diagnostico_equilibrio)
      ? evaluacion.diagnostico_equilibrio
      : null,
    diagnostico_estructura: isRecord(evaluacion.diagnostico_estructura)
      ? evaluacion.diagnostico_estructura
      : null,
    preguntas_profesor: Array.isArray(evaluacion.preguntas_profesor)
      ? evaluacion.preguntas_profesor
      : null,
    zonas_desarrollo_self_taught: Array.isArray(evaluacion.zonas_desarrollo_self_taught)
      ? evaluacion.zonas_desarrollo_self_taught
      : null,
    anotaciones: Array.isArray(evaluacion.anotaciones) ? evaluacion.anotaciones : [],
    feedback_completo_generado: true,
  };
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

const PREGUNTA_PROFESOR_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["pregunta", "proposito", "como_responder"],
  properties: {
    pregunta: SHORT_FEEDBACK_SCHEMA,
    proposito: SHORT_FEEDBACK_SCHEMA,
    como_responder: SHORT_FEEDBACK_SCHEMA,
  },
};

const ZONA_DESARROLLO_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["zona", "problema", "sugerencia"],
  properties: {
    zona: SHORT_FEEDBACK_SCHEMA,
    problema: SHORT_FEEDBACK_SCHEMA,
    sugerencia: SHORT_FEEDBACK_SCHEMA,
  },
};

const ANOTACION_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["fragmento_original", "criterio", "problema", "sugerencia", "prioridad"],
  properties: {
    fragmento_original: { type: "string", minLength: 5 },
    criterio: { type: "string", enum: ["A", "B", "C", "D"] },
    problema: SHORT_FEEDBACK_SCHEMA,
    sugerencia: SHORT_FEEDBACK_SCHEMA,
    prioridad: { type: "integer", minimum: 1, maximum: 5 },
  },
};

const FEEDBACK_TOOL: Record<string, unknown> = {
  name: "registrar_feedback_oral",
  description:
    "Registra los diagnósticos, preguntas/zonas y anotaciones localizables del Trabajo Oral Individual.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "diagnostico_asunto_global",
      "diagnostico_equilibrio",
      "diagnostico_estructura",
      "anotaciones",
    ],
    properties: {
      diagnostico_asunto_global: {
        type: "object",
        additionalProperties: false,
        required: ["definicion", "especificidad", "uso_como_lente"],
        properties: {
          definicion: ESTADO_ELEMENTO_SCHEMA,
          especificidad: ESTADO_ELEMENTO_SCHEMA,
          uso_como_lente: ESTADO_ELEMENTO_SCHEMA,
        },
      },
      diagnostico_equilibrio: {
        type: "object",
        additionalProperties: false,
        required: ["extracto_1", "obra_1", "extracto_2", "obra_2"],
        properties: {
          extracto_1: ESTADO_ELEMENTO_SCHEMA,
          obra_1: ESTADO_ELEMENTO_SCHEMA,
          extracto_2: ESTADO_ELEMENTO_SCHEMA,
          obra_2: ESTADO_ELEMENTO_SCHEMA,
        },
      },
      diagnostico_estructura: {
        type: "object",
        additionalProperties: false,
        required: ["apertura", "progresion", "transiciones", "cierre"],
        properties: {
          apertura: ESTADO_ELEMENTO_SCHEMA,
          progresion: ESTADO_ELEMENTO_SCHEMA,
          transiciones: ESTADO_ELEMENTO_SCHEMA,
          cierre: ESTADO_ELEMENTO_SCHEMA,
        },
      },
      preguntas_profesor: {
        type: "array",
        items: PREGUNTA_PROFESOR_SCHEMA,
        minItems: 5,
        maxItems: 8,
      },
      zonas_desarrollo_self_taught: {
        type: "array",
        items: ZONA_DESARROLLO_SCHEMA,
        minItems: 4,
        maxItems: 6,
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
      .from("evaluaciones_oral")
      .select("*")
      .eq("id", evaluacionId)
      .maybeSingle();

    if (evalErr || !evaluacion) {
      return new Response(JSON.stringify({ error: "Evaluación no encontrada." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reutiliza si ya existe el feedback completo
    if (feedbackCompletoExiste(evaluacion)) {
      return new Response(JSON.stringify(respuestaFeedback(evaluacion)), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 10/día
    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: limitErr } = await supabase
      .from("llm_uso")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("edge_function", "generate-oral-feedback")
      .gte("created_at", hace24h);

    if (limitErr) {
      console.error("Error comprobando límite diario:", limitErr);
      return new Response(JSON.stringify({ error: "No se pudo verificar el límite de uso." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((count ?? 0) >= LIMITE_DIARIO) {
      return new Response(
        JSON.stringify({
          error: "Has alcanzado el límite diario de feedback completo del oral. Vuelve mañana.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY no configurada." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nivel: Nivel = parseNivel(evaluacion.nivel);
    const tipoOral = String(evaluacion.tipo_oral ?? "taught");
    const feedbackBasico = {
      criterios: {
        A: evaluacion.criterio_a,
        B: evaluacion.criterio_b,
        C: evaluacion.criterio_c,
        D: evaluacion.criterio_d,
      },
      justificaciones: {
        A: evaluacion.justificacion_a,
        B: evaluacion.justificacion_b,
        C: evaluacion.justificacion_c,
        D: evaluacion.justificacion_d,
      },
      fortalezas: evaluacion.fortalezas,
      areas_mejora: evaluacion.areas_mejora,
      comentario_global: evaluacion.comentario_global,
    };

    const obra1Label = `${evaluacion.obra_1_titulo ?? ""}${evaluacion.obra_1_autor ? ` — ${evaluacion.obra_1_autor}` : ""}`;
    const obra2Label = `${evaluacion.obra_2_titulo ?? ""}${evaluacion.obra_2_autor ? ` — ${evaluacion.obra_2_autor}` : ""}`;

    const modalidadLabel =
      tipoOral === "taught"
        ? "Alumno con profesor (10 min exposición + 5 min preguntas)"
        : "Self-taught / SSST (15 min exposición continua, sin preguntas del profesor)";

    const userPrompt = `MODALIDAD: ${modalidadLabel}

ASUNTO GLOBAL: ${evaluacion.asunto_global ?? ""}

OBRA 1: ${obra1Label}
OBRA 2: ${obra2Label}

GUION DEL ALUMNO:
${evaluacion.guion_oral ?? ""}

EVALUACIÓN BÁSICA YA MOSTRADA AL ALUMNO:
${JSON.stringify(feedbackBasico)}

Genera ahora el feedback completo: diagnósticos (asunto global, equilibrio, estructura), ${tipoOral === "taught" ? "preguntas probables del profesor (5-8)" : "zonas de desarrollo self-taught (4-6)"} y anotaciones localizables (4-8). No cambies las notas ni las justificaciones ya asignadas, y no repitas fortalezas ni áreas de mejora. Llama a la herramienta para registrar el feedback completo del oral.`;

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
              text: buildSystemPrompt(nivel),
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: userPrompt }],
          tools: [FEEDBACK_TOOL],
          tool_choice: { type: "tool", name: "registrar_feedback_oral" },
        }),
        signal: controller.signal,
      });
    } catch (error) {
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
      const t = await response.text();
      console.error("Anthropic API error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del servicio de IA." }), {
        status: response.status === 429 ? 429 : response.status === 529 ? 529 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = (await response.json()) as AnthropicResponse;
    if (data.stop_reason === "max_tokens") {
      return new Response(
        JSON.stringify({
          error:
            "El feedback completo quedó incompleto. Inténtalo de nuevo con un guion más corto.",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const toolUseBlock = data.content?.find((b) => b.type === "tool_use");
    if (!isRecord(toolUseBlock?.input)) {
      console.error("No tool_use block:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "La IA no devolvió feedback válido." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const input = toolUseBlock.input;
    const update: JsonRecord = {
      diagnostico_asunto_global: isRecord(input.diagnostico_asunto_global)
        ? input.diagnostico_asunto_global
        : null,
      diagnostico_equilibrio: isRecord(input.diagnostico_equilibrio)
        ? input.diagnostico_equilibrio
        : null,
      diagnostico_estructura: isRecord(input.diagnostico_estructura)
        ? input.diagnostico_estructura
        : null,
      preguntas_profesor: Array.isArray(input.preguntas_profesor) ? input.preguntas_profesor : null,
      zonas_desarrollo_self_taught: Array.isArray(input.zonas_desarrollo_self_taught)
        ? input.zonas_desarrollo_self_taught
        : null,
      anotaciones: Array.isArray(input.anotaciones) ? input.anotaciones : null,
    };

    if (
      !update.diagnostico_asunto_global ||
      !update.diagnostico_equilibrio ||
      !update.diagnostico_estructura ||
      !update.anotaciones ||
      (update.anotaciones as unknown[]).length < 4
    ) {
      return new Response(JSON.stringify({ error: "La IA devolvió feedback incompleto." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateErr } = await supabase
      .from("evaluaciones_oral")
      .update(update)
      .eq("id", evaluacionId);

    if (updateErr) {
      console.error("Error guardando feedback completo oral:", updateErr);
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
        edge_function: "generate-oral-feedback",
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
    console.error("generate-oral-feedback error:", e);
    return new Response(JSON.stringify({ error: "Error interno del servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
