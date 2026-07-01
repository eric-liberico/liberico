import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { type CourseKey, parseCourseKey } from "../_shared/courses.ts";
import { buildSystemPrompt } from "../_shared/prompts/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Tope diario de sugerencias por usuario para acotar abuso de coste.
const LIMITE_SUGERENCIAS_DIARIO = 20;
const SUGGEST_MODEL = "claude-opus-4-7";

type JsonRecord = Record<string, unknown>;
type Sugerencia = {
  asunto_global: string;
  obra1: { titulo: string; autor: string };
  obra2: { titulo: string; autor: string };
  justificacion: string;
};
type ObraElegida = { titulo: string; autor: string };

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function fallbackSugerencias(
  courseKey: CourseKey,
  obra1: ObraElegida,
  obra2: ObraElegida,
): Sugerencia[] {
  if (courseKey === "english-a-literature") {
    return [
      {
        asunto_global:
          "The pressure to perform as a force that fractures personal identity",
        obra1,
        obra2,
        justificacion:
          "Use this option only if both chosen works contain characters whose identity is measured or judged externally through performance, expectation, reputation, or social pressure.",
      },
      {
        asunto_global:
          "The construction of identity under social surveillance and control",
        obra1,
        obra2,
        justificacion:
          "This option works if both works include reputation, family pressure, public judgement, or limits on freedom. Adapt the evidence to concrete moments from your selected works.",
      },
      {
        asunto_global:
          "The loss of belonging in communities shaped by exclusion",
        obra1,
        obra2,
        justificacion:
          "This option suits works centered on culture, community, family, and social judgement. It asks you to show how each selected work defines who belongs and who is excluded.",
      },
    ];
  }

  return [
    {
      asunto_global:
        "La presión social por rendir como fuerza que fragmenta la identidad personal",
      obra1,
      obra2,
      justificacion:
        "Esta opción funciona si las dos obras permiten probar la expectativa familiar, el control social o el valor personal medido desde fuera con momentos concretos.",
    },
    {
      asunto_global:
        "El cuerpo femenino como territorio de control social, moral y politico",
      obra1,
      obra2,
      justificacion:
        "Esta opcion funciona si las dos obras elegidas contienen cuerpos o identidades reguladas por normas de genero, reputacion, familia o libertad.",
    },
    {
      asunto_global:
        "La exclusion del individuo dentro de comunidades dominadas por codigos colectivos",
      obra1,
      obra2,
      justificacion:
        "Esta opcion conecta con pertenencia, juicio social o conflicto con el grupo. Debes probarla con escenas o pasajes de las dos obras seleccionadas.",
    },
  ];
}

function fallbackResponse(
  courseKey: CourseKey,
  obra1: ObraElegida,
  obra2: ObraElegida,
) {
  return new Response(
    JSON.stringify({
      sugerencias: fallbackSugerencias(courseKey, obra1, obra2),
      fallback: true,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
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
  description:
    "Registra exactamente 3 sugerencias de asunto global para las dos obras ya elegidas por el alumno.",
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
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    )!;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!ANTHROPIC_API_KEY) {
      console.error(
        "suggest-oral-topics missing ANTHROPIC_API_KEY; returning fallback",
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: perfil, error: perfilErr } = await adminClient
      .from("perfiles")
      .select("activo")
      .eq("user_id", user.id)
      .single();
    if (perfilErr || !perfil) {
      return new Response(
        JSON.stringify({ error: "No se pudo verificar tu perfil." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (perfil.activo === false) {
      return new Response(JSON.stringify({ error: "Usuario inactivo." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: unknown = await req.json();
    if (!isRecord(body)) {
      return new Response(JSON.stringify({ error: "Solicitud inválida." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const obra1: ObraElegida = {
      titulo: typeof body.obra_1_titulo === "string"
        ? body.obra_1_titulo.trim().slice(0, 300)
        : "",
      autor: typeof body.obra_1_autor === "string"
        ? body.obra_1_autor.trim().slice(0, 300)
        : "",
    };
    const obra2: ObraElegida = {
      titulo: typeof body.obra_2_titulo === "string"
        ? body.obra_2_titulo.trim().slice(0, 300)
        : "",
      autor: typeof body.obra_2_autor === "string"
        ? body.obra_2_autor.trim().slice(0, 300)
        : "",
    };
    if (!obra1.titulo || !obra2.titulo) {
      return new Response(
        JSON.stringify({
          error: "Elige las dos obras antes de pedir sugerencias.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const courseKey: CourseKey = parseCourseKey(body.course_key);
    if (courseKey === "spanish-b-language") {
      return new Response(
        JSON.stringify({
          error:
            "El Oral Individual todavía no está disponible para Spanish B.",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!ANTHROPIC_API_KEY) {
      return fallbackResponse(courseKey, obra1, obra2);
    }

    // Reserva atómica de cuota antes de la llamada a Anthropic. Inserta una fila
    // placeholder en llm_uso que luego se actualiza (éxito) o se borra (fallo).
    const { data: reserva, error: reservaErr } = await adminClient.rpc(
      "reservar_cuota_paper",
      {
        p_user_id: user.id,
        p_course_key: courseKey,
        p_paper: "oral-suggest",
        p_limite: LIMITE_SUGERENCIAS_DIARIO,
        p_edge_function: "lita-io-topics",
        p_modelo: SUGGEST_MODEL,
      },
    );
    if (reservaErr) {
      console.error("Error reservando cuota:", reservaErr);
      return new Response(
        JSON.stringify({ error: "No se pudo verificar el límite de uso." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (reserva === null) {
      return new Response(
        JSON.stringify({
          error:
            "Has alcanzado el límite diario de sugerencias. Vuelve mañana.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const usoId = reserva as string;
    const cancelarCuota = async () => {
      await adminClient.from("llm_uso").delete().eq("id", usoId);
    };

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
            text: buildSystemPrompt({
              courseKey,
              component: "suggest-topics",
              nivel: "SL",
            }),
          },
        ],
        messages: [
          {
            role: "user",
            content:
              `El alumno ya eligió estas obras para su Oral Individual:\n\nOBRA 1: ${obra1.titulo}${
                obra1.autor ? `, ${obra1.autor}` : ""
              }\nOBRA 2: ${obra2.titulo}${
                obra2.autor ? `, ${obra2.autor}` : ""
              }\n\nPropón exactamente 3 asuntos globales posibles solo para estas dos obras. No sugieras otras obras ni dependas de intereses personales del alumno. En cada sugerencia, devuelve obra1 y obra2 exactamente con los títulos elegidos. Cada asunto debe ser específico, debatible y suficientemente global; explica brevemente por qué importa y cómo podría sostenerse con ambas obras. Llama a la herramienta para registrarlas.`,
          },
        ],
        tools: [SUGGEST_TOOL],
        tool_choice: { type: "tool", name: "registrar_sugerencias_oral" },
      }),
    });

    if (!response.ok) {
      const texto = await response.text();
      console.error("Error Anthropic:", response.status, texto);
      await cancelarCuota();
      return fallbackResponse(courseKey, obra1, obra2);
    }

    const data: unknown = await response.json();
    if (!isRecord(data) || !Array.isArray(data.content)) {
      console.error(
        "Unexpected Anthropic response shape in suggest-oral-topics",
      );
      await cancelarCuota();
      return fallbackResponse(courseKey, obra1, obra2);
    }

    const toolBlock = data.content.find(
      (b): b is { type: string; input: unknown } =>
        isRecord(b) && b.type === "tool_use" && isRecord(b.input),
    );

    if (!toolBlock || !isRecord(toolBlock.input)) {
      console.error("Missing tool_use block in suggest-oral-topics");
      await cancelarCuota();
      return fallbackResponse(courseKey, obra1, obra2);
    }

    const input = toolBlock.input;
    if (!Array.isArray(input.sugerencias) || input.sugerencias.length !== 3) {
      console.error("Invalid suggestion count in suggest-oral-topics");
      await cancelarCuota();
      return fallbackResponse(courseKey, obra1, obra2);
    }

    // Actualiza la fila de cuota reservada con el uso real de tokens.
    const usage = isRecord(data.usage) ? data.usage : {};
    await adminClient
      .from("llm_uso")
      .update({
        modelo: SUGGEST_MODEL,
        tokens_entrada: typeof usage.input_tokens === "number"
          ? usage.input_tokens
          : 0,
        tokens_salida: typeof usage.output_tokens === "number"
          ? usage.output_tokens
          : 0,
      })
      .eq("id", usoId);

    return new Response(JSON.stringify({ sugerencias: input.sugerencias }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error inesperado:", err);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
