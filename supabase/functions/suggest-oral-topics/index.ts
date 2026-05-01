import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres un orientador experto en el Trabajo Oral Individual del Bachillerato Internacional (IB), asignatura Español A: Literatura, Nivel Medio.

Tu función es proponer asuntos globales pedagógicamente sólidos para el oral, junto con un par de obras literarias adecuadas, a partir de los intereses del alumno.

CRITERIOS PARA EL ASUNTO GLOBAL
- Debe ser específico y funcionar como lente de análisis literario, no como tema genérico.
- Formulación de 10-18 palabras que exprese una tensión, paradoja o fenómeno social concreto.
- Ejemplos buenos: "La pérdida de identidad cultural en contextos de migración forzada" / "El cuerpo femenino como territorio de control político e ideológico".
- Ejemplos malos: "El amor", "La guerra", "La identidad".

CRITERIOS PARA LAS OBRAS
- Una de las dos obras debe poder ser de un autor de habla hispana original en español (ideal para NM).
- La otra puede ser una obra en traducción reconocida al español.
- Obras canónicas preferibles: Quijote, García Lorca, Rulfo, Neruda, Borges, Isabel Allende, Vargas Llosa, Cervantes, Lope de Vega, Sor Juana, Pablo Neruda, Rosario Castellanos, García Márquez, Octavio Paz; Camus, Kafka, Dostoievski, Ibsen, Woolf, Beckett, Shakespeare en traducción.
- NO propongas obras que el alumno difícilmente conozca (ej. autores muy oscuros).

ESTRUCTURA DE CADA SUGERENCIA
Devuelve exactamente 3 sugerencias con este schema: asunto_global (string), obra1 (objeto con titulo y autor), obra2 (objeto con titulo y autor), justificacion (string 30-50 palabras explicando cómo los intereses del alumno conectan con este asunto y las obras).`;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const SUGERENCIA_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["asunto_global", "obra1", "obra2", "justificacion"],
  properties: {
    asunto_global: { type: "string" },
    obra1: {
      type: "object",
      additionalProperties: false,
      required: ["titulo", "autor"],
      properties: {
        titulo: { type: "string" },
        autor: { type: "string" },
      },
    },
    obra2: {
      type: "object",
      additionalProperties: false,
      required: ["titulo", "autor"],
      properties: {
        titulo: { type: "string" },
        autor: { type: "string" },
      },
    },
    justificacion: { type: "string" },
  },
};

const SUGGEST_TOOL: Record<string, unknown> = {
  name: "registrar_sugerencias_oral",
  description: "Registra exactamente 3 sugerencias de asunto global y obras para el oral del alumno.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["sugerencias"],
    properties: {
      sugerencias: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: SUGERENCIA_SCHEMA,
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
      return new Response(JSON.stringify({ error: "No autorizado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "Servicio no configurado." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: perfil } = await adminClient
      .from("perfiles")
      .select("activo")
      .eq("user_id", user.id)
      .single();
    if (perfil?.activo === false) {
      return new Response(JSON.stringify({ error: "Usuario inactivo." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: unknown = await req.json();
    if (!isRecord(body) || typeof body.intereses !== "string" || !body.intereses.trim()) {
      return new Response(JSON.stringify({ error: "Falta el campo 'intereses'." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const intereses = (body.intereses as string).slice(0, 1000);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-7",
        max_tokens: 1500,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          {
            role: "user",
            content: `El alumno describe sus intereses así:\n\n"${intereses}"\n\nPropón 3 asuntos globales con sus obras correspondientes. Llama a la herramienta para registrarlas.`,
          },
        ],
        tools: [SUGGEST_TOOL],
        tool_choice: { type: "tool", name: "registrar_sugerencias_oral" },
      }),
    });

    if (!response.ok) {
      const texto = await response.text();
      console.error("Error Anthropic:", response.status, texto);
      return new Response(
        JSON.stringify({ error: "Error al generar sugerencias. Inténtalo de nuevo." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data: unknown = await response.json();
    if (!isRecord(data) || !Array.isArray(data.content)) {
      return new Response(
        JSON.stringify({ error: "Respuesta inesperada del servidor." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const toolBlock = data.content.find(
      (b): b is { type: string; input: unknown } =>
        isRecord(b) && b.type === "tool_use" && isRecord(b.input),
    );

    if (!toolBlock || !isRecord(toolBlock.input)) {
      return new Response(
        JSON.stringify({ error: "No se pudieron generar sugerencias válidas." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const input = toolBlock.input;
    if (!Array.isArray(input.sugerencias) || input.sugerencias.length !== 3) {
      return new Response(
        JSON.stringify({ error: "No se pudieron generar 3 sugerencias válidas." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Registrar en llm_uso
    const usage = isRecord(data.usage) ? data.usage : {};
    await adminClient.from("llm_uso").insert({
      user_id: user.id,
      edge_function: "suggest-oral-topics",
      modelo: "claude-opus-4-7",
      tokens_entrada: typeof usage.input_tokens === "number" ? usage.input_tokens : 0,
      tokens_salida: typeof usage.output_tokens === "number" ? usage.output_tokens : 0,
    });

    return new Response(
      JSON.stringify({ sugerencias: input.sugerencias }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Error inesperado:", err);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
