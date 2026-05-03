import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres un examinador experto de Español A: Literatura del Bachillerato Internacional. Tu tarea es generar anotaciones localizables sobre fragmentos concretos del guion oral del alumno.

OBJETIVO
Identifica fragmentos específicos del guion que el alumno puede mejorar para subir de banda. Cada anotación señala un problema concreto y ofrece una sugerencia pedagógica clara. No generes versiones reescritas del texto.

REGLAS OBLIGATORIAS
- Genera entre 5 y 8 anotaciones.
- Cada fragmento_original debe ser una cita exacta o casi exacta del guion, de 8 a 40 palabras, para que la interfaz pueda localizarlo con precisión.
- Distribuye las anotaciones entre los cuatro criterios (A, B, C, D).
- No concentres más de 2 anotaciones en el mismo párrafo del guion.
- El campo problema describe qué falla en ese fragmento concreto (no una etiqueta genérica).
- El campo sugerencia explica qué debería hacer el alumno para mejorar ese fragmento.
- No generes reescrituras ni versiones alternativas del texto del alumno.

CRITERIOS IB ORAL INDIVIDUAL
A: Conocimiento, comprensión e interpretación — dominio de las obras, asunto global como lente, relación entre extractos y obras completas.
B: Análisis y evaluación — análisis de recursos formales y su efecto, evaluación de las decisiones del autor.
C: Foco y organización — estructura clara, progresión argumental, transiciones, introducción y cierre efectivos.
D: Lengua — precisión léxica, registro académico, variedad sintáctica, corrección gramatical.`;

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
  usage?: AnthropicUsage;
  content?: AnthropicContentBlock[];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIMITE_DIARIO = 20;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const ANOTACION_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["fragmento_original", "criterio", "problema", "sugerencia", "prioridad"],
  properties: {
    fragmento_original: { type: "string" },
    criterio: { type: "string", enum: ["A", "B", "C", "D"] },
    problema: { type: "string" },
    sugerencia: { type: "string" },
    prioridad: { type: "integer", minimum: 1, maximum: 5 },
  },
};

const ANNOTATION_TOOL: Record<string, unknown> = {
  name: "registrar_anotaciones_oral",
  description: "Registra anotaciones localizables para el guion anotado del oral del alumno.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["anotaciones"],
    properties: {
      anotaciones: {
        type: "array",
        minItems: 4,
        maxItems: 8,
        items: ANOTACION_SCHEMA,
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
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = SUPABASE_SERVICE_ROLE_KEY
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : supabase;

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

    // Reutiliza si ya hay anotaciones guardadas
    if (Array.isArray(evaluacion.anotaciones) && evaluacion.anotaciones.length >= 4) {
      return new Response(JSON.stringify({ anotaciones: evaluacion.anotaciones }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: limitErr } = await adminClient
      .from("llm_uso")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("edge_function", "generate-oral-annotations")
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
          error: "Has alcanzado el límite diario de anotaciones. Vuelve mañana.",
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

    const feedback = {
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
      diagnostico_asunto_global: evaluacion.diagnostico_asunto_global,
      diagnostico_equilibrio: evaluacion.diagnostico_equilibrio,
      diagnostico_estructura: evaluacion.diagnostico_estructura,
    };

    const userPrompt = `TIPO DE ORAL: ${evaluacion.tipo_oral === "taught" ? "Alumno con profesor" : "Self-taught / SSST"}
ASUNTO GLOBAL: ${evaluacion.asunto_global}
OBRA 1: ${evaluacion.obra_1_titulo}${evaluacion.obra_1_autor ? ` (${evaluacion.obra_1_autor})` : ""}
OBRA 2: ${evaluacion.obra_2_titulo}${evaluacion.obra_2_autor ? ` (${evaluacion.obra_2_autor})` : ""}

GUION ORAL DEL ALUMNO:
${evaluacion.guion_oral}

FEEDBACK YA GENERADO:
${JSON.stringify(feedback)}

Genera anotaciones localizables para el guion oral. Cada fragmento_original debe poder encontrarse en el guion. Llama a la herramienta para registrar las anotaciones.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-7",
        max_tokens: 3000,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userPrompt }],
        tools: [ANNOTATION_TOOL],
        tool_choice: { type: "tool", name: "registrar_anotaciones_oral" },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Anthropic API error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del servicio de IA." }), {
        status: response.status === 429 ? 429 : response.status === 529 ? 529 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = (await response.json()) as AnthropicResponse;
    const toolUseBlock = data.content?.find((b) => b.type === "tool_use");
    if (!isRecord(toolUseBlock?.input)) {
      console.error("No tool_use block:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "La IA no devolvió anotaciones válidas." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anotaciones = Array.isArray(toolUseBlock.input.anotaciones)
      ? toolUseBlock.input.anotaciones
      : [];

    if (anotaciones.length === 0) {
      return new Response(
        JSON.stringify({ error: "La IA no devolvió anotaciones localizables." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: updateErr } = await adminClient
      .from("evaluaciones_oral")
      .update({ anotaciones })
      .eq("id", evaluacionId);

    if (updateErr) {
      console.error("Error guardando anotaciones del oral:", updateErr);
      return new Response(
        JSON.stringify({ error: "Las anotaciones se generaron, pero no se pudieron guardar." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (SUPABASE_SERVICE_ROLE_KEY && data.usage) {
      const { error: usoErr } = await adminClient.from("llm_uso").insert({
        user_id: userId,
        edge_function: "generate-oral-annotations",
        modelo: "claude-opus-4-7",
        tokens_entrada: data.usage.input_tokens ?? 0,
        tokens_salida: data.usage.output_tokens ?? 0,
        cache_creation_tokens: data.usage.cache_creation_input_tokens ?? 0,
        cache_read_tokens: data.usage.cache_read_input_tokens ?? 0,
      });
      if (usoErr) console.error("Error registrando uso LLM:", usoErr);
    }

    return new Response(JSON.stringify({ anotaciones }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-oral-annotations error:", e);
    return new Response(JSON.stringify({ error: "Error interno del servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
