import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres un examinador oficial del IB de Español A: Literatura, Nivel Medio.
Tu tarea es evaluar el análisis literario del estudiante según los 4 criterios oficiales.

DESCRIPTORES OFICIALES:

Criterio A — Comprensión e interpretación (0-5):
- 1: Poca comprensión del significado literal. Referencias al texto raras o poco adecuadas.
- 2: Cierta comprensión literal. Referencias a veces adecuadas.
- 3: Comprensión literal + interpretación satisfactoria de algunas implicaciones.
- 4: Comprensión profunda + interpretación convincente de muchas implicaciones.
- 5: Comprensión perspicaz + interpretación convincente de implicaciones mayores Y sutilezas.

Criterio B — Análisis y evaluación (0-5):
- 1: Respuesta descriptiva, poco análisis pertinente.
- 2: Análisis adecuado pero basado en descripción. Identifica recursos sin explicar efectos.
- 3: Análisis pertinente con cierta evaluación de cómo los recursos crean significado.
- 4: Análisis pertinente y perspicaz, con evaluación convincente de los efectos.
- 5: Análisis perspicaz y convincente de los recursos y su efecto en el significado.

Criterio C — Focalización y desarrollo (0-5):
- 1: Trabajo poco enfocado o desorganizado.
- 2: Cierto enfoque, organización limitada.
- 3: Enfocado, organización adecuada, ideas conectadas.
- 4: Bien enfocado y organizado, desarrollo convincente.
- 5: Muy bien enfocado, organización clara y eficaz, desarrollo perspicaz.

Criterio D — Lenguaje (0-5):
- 1: Lenguaje raramente claro, errores frecuentes que dificultan la comprensión.
- 2: Lenguaje a veces claro, errores que a veces dificultan la comprensión.
- 3: Lenguaje claro, registro generalmente apropiado, errores no impiden comprensión.
- 4: Lenguaje claro y preciso, registro y estilo apropiados, terminología eficaz.
- 5: Lenguaje muy claro, eficaz, preciso, registro y estilo cuidadosamente elegidos.

Sé riguroso, justo y constructivo, como un examinador oficial del IB.`;

const EVAL_TOOL = {
  name: "registrar_evaluacion",
  description:
    "Registra la evaluación del análisis literario según los 4 criterios oficiales del IB.",
  input_schema: {
    type: "object",
    properties: {
      banda_a: { type: "integer", minimum: 0, maximum: 5 },
      banda_b: { type: "integer", minimum: 0, maximum: 5 },
      banda_c: { type: "integer", minimum: 0, maximum: 5 },
      banda_d: { type: "integer", minimum: 0, maximum: 5 },
      justificacion_a: { type: "string", description: "2-3 frases" },
      justificacion_b: { type: "string", description: "2-3 frases" },
      justificacion_c: { type: "string", description: "2-3 frases" },
      justificacion_d: { type: "string", description: "2-3 frases" },
      fortalezas: {
        type: "string",
        description: "Lista en prosa de qué hace bien el análisis",
      },
      areas_mejora: {
        type: "string",
        description: "Lista en prosa de qué debe mejorar",
      },
      comentario_global: {
        type: "string",
        description: "4-6 frases tipo examinador IB",
      },
    },
    required: [
      "banda_a",
      "banda_b",
      "banda_c",
      "banda_d",
      "justificacion_a",
      "justificacion_b",
      "justificacion_c",
      "justificacion_d",
      "fortalezas",
      "areas_mejora",
      "comentario_global",
    ],
    additionalProperties: false,
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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { texto, pregunta, analisis } = await req.json();

    if (!texto || !pregunta || !analisis) {
      return new Response(
        JSON.stringify({ error: "Faltan campos: texto, pregunta o análisis." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY no configurada." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userPrompt = `TEXTO LITERARIO:\n${texto}\n\nPREGUNTA DE ORIENTACIÓN:\n${pregunta}\n\nANÁLISIS DEL ESTUDIANTE:\n${analisis}\n\nEvalúa este análisis según los 4 criterios oficiales del IB y registra la evaluación llamando a la herramienta.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-7",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
        tools: [EVAL_TOOL],
        tool_choice: { type: "tool", name: "registrar_evaluacion" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 529) {
        return new Response(
          JSON.stringify({ error: "El servicio de IA está sobrecargado. Inténtalo de nuevo en unos segundos." }),
          { status: 529, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("Anthropic API error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Error del servicio de IA." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const toolUseBlock = data.content?.find(
      (b: { type: string }) => b.type === "tool_use",
    );
    if (!toolUseBlock?.input) {
      console.error("No tool_use block:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "La IA no devolvió una evaluación válida." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const evaluation = toolUseBlock.input;
    const total =
      evaluation.banda_a + evaluation.banda_b + evaluation.banda_c + evaluation.banda_d;
    const nota_ib =
      total <= 3 ? 1 : total <= 6 ? 2 : total <= 9 ? 3 : total <= 12 ? 4 : total <= 15 ? 5 : total <= 18 ? 6 : 7;

    return new Response(
      JSON.stringify({ ...evaluation, puntuacion_total: total, nota_ib }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("evaluate-analysis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
