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
  usage?: AnthropicUsage;
  content?: AnthropicContentBlock[];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIMITE_DIARIO = 10;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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

    const nivel: Nivel = parseNivel(evaluacion.nivel);
    const courseKey: CourseKey = parseCourseKey(evaluacion.course_key);

    // Reutiliza si ya existe
    if (
      isRecord(evaluacion.ensayo_banda_5) &&
      typeof evaluacion.ensayo_banda_5.texto === "string"
    ) {
      return new Response(JSON.stringify({ ensayo_banda_5: evaluacion.ensayo_banda_5 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: limitErr } = await supabase
      .from("llm_uso")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("edge_function", "generate-band5-essay-p2")
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
          error: "Has alcanzado el límite diario de ensayos elevados. Vuelve mañana.",
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

    const userPrompt = `PREGUNTA DE PRUEBA 2:\n${evaluacion.pregunta}\n\nOBRA 1:\n${evaluacion.obra_1}\n\nOBRA 2:\n${evaluacion.obra_2}\n\nENSAYO ORIGINAL DEL ESTUDIANTE:\n${ensayo}\n\nFEEDBACK YA GENERADO:\n${JSON.stringify(feedback)}\n\nGenera una versión completa del ensayo comparativo elevada a banda alta, basada en la respuesta del alumno y respetando sus ideas, voz y argumento comparativo siempre que sea posible. Llama a la herramienta para registrar el ensayo.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-7",
        max_tokens: 4500,
        system: [{ type: "text", text: buildSystemPrompt({ courseKey, component: "band5-p2", nivel }), cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userPrompt }],
        tools: [ESSAY_TOOL],
        tool_choice: { type: "tool", name: "registrar_ensayo_banda5_p2" },
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
      return new Response(JSON.stringify({ error: "La IA no devolvió un ensayo válido." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ensayoBanda5 = toolUseBlock.input;
    const { error: updateErr } = await supabase
      .from("evaluaciones_prueba2")
      .update({ ensayo_banda_5: ensayoBanda5 })
      .eq("id", evaluacionId);

    if (updateErr) {
      console.error("Error guardando ensayo banda alta P2:", updateErr);
      return new Response(
        JSON.stringify({ error: "El ensayo se generó, pero no se pudo guardar." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (SUPABASE_SERVICE_ROLE_KEY && data.usage) {
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { error: usoErr } = await adminClient.from("llm_uso").insert({
        user_id: userId,
        edge_function: "generate-band5-essay-p2",
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
    return new Response(JSON.stringify({ error: "Error interno del servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
