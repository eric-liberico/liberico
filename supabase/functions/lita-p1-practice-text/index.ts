import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { type CourseKey, parseCourseKey } from "../_shared/courses.ts";
import { buildSystemPrompt } from "../_shared/prompts/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const TEXT_TOOL: Record<string, unknown> = {
  name: "registrar_texto_practica",
  description: "Registra el texto literario generado y su pregunta de orientación.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["texto", "pregunta", "autor_ficticio"],
    properties: {
      texto: { type: "string" },
      pregunta: { type: "string" },
      autor_ficticio: { type: "string" },
    },
  },
};

const GENEROS_VALIDOS = ["poema", "prosa", "teatro"] as const;
type Genero = (typeof GENEROS_VALIDOS)[number];

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

    // Solo admins pueden generar textos
    const { data: perfil } = await adminClient
      .from("perfiles")
      .select("rol, activo")
      .eq("user_id", user.id)
      .single();

    if (perfil?.activo === false) {
      return new Response(JSON.stringify({ error: "Usuario inactivo." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (perfil?.rol !== "admin") {
      return new Response(
        JSON.stringify({ error: "Solo los administradores pueden generar textos de práctica." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body: unknown = await req.json();
    if (!isRecord(body)) {
      return new Response(JSON.stringify({ error: "Cuerpo de petición inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { genero, periodo, instrucciones } = body;
    const courseKey: CourseKey = parseCourseKey(body.course_key);

    if (typeof genero !== "string" || !(GENEROS_VALIDOS as readonly string[]).includes(genero)) {
      return new Response(
        JSON.stringify({ error: "El campo 'genero' debe ser 'poema', 'prosa' o 'teatro'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const generoValido = genero as Genero;
    const periodoStr = typeof periodo === "string" && periodo.trim() ? periodo.trim() : null;
    const instruccionesStr =
      typeof instrucciones === "string" && instrucciones.trim() ? instrucciones.trim() : null;

    const promptPartes = [
      `Genera un texto de práctica de tipo: ${generoValido}.`,
      periodoStr
        ? `Período literario: ${periodoStr}.`
        : "Período: libre (elige el más adecuado para el género).",
      instruccionesStr ? `Instrucciones adicionales: ${instruccionesStr}` : "",
      "Llama a la herramienta para registrar el texto generado.",
    ];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-7",
        max_tokens: 2000,
        system: [
          {
            type: "text",
            text: buildSystemPrompt({ courseKey, component: "practice-text", nivel: "SL" }),
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          {
            role: "user",
            content: promptPartes.filter(Boolean).join("\n"),
          },
        ],
        tools: [TEXT_TOOL],
        tool_choice: { type: "tool", name: "registrar_texto_practica" },
      }),
    });

    if (!response.ok) {
      const texto = await response.text();
      console.error("Error Anthropic:", response.status, texto);
      return new Response(
        JSON.stringify({ error: "Error al generar el texto. Inténtalo de nuevo." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data: unknown = await response.json();
    if (!isRecord(data) || !Array.isArray(data.content)) {
      return new Response(JSON.stringify({ error: "Respuesta inesperada del servidor." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toolBlock = data.content.find(
      (b): b is { type: string; input: unknown } =>
        isRecord(b) && b.type === "tool_use" && isRecord(b.input),
    );

    if (!toolBlock || !isRecord(toolBlock.input)) {
      return new Response(JSON.stringify({ error: "No se pudo generar el texto correctamente." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const input = toolBlock.input;
    if (typeof input.texto !== "string" || typeof input.pregunta !== "string") {
      return new Response(
        JSON.stringify({ error: "El texto generado no tiene el formato esperado." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Guardar en la base de datos
    const { data: registro, error: insertError } = await adminClient
      .from("textos_practica_p1")
      .insert({
        genero: generoValido,
        periodo: periodoStr,
        texto: input.texto.trim(),
        pregunta: input.pregunta.trim(),
        activo: true,
        course_key: courseKey,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error al guardar texto:", insertError);
      return new Response(JSON.stringify({ error: "No se pudo guardar el texto generado." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Registrar en llm_uso
    const usage = isRecord(data.usage) ? data.usage : {};
    await adminClient.from("llm_uso").insert({
      user_id: user.id,
      edge_function: "lita-p1-practice-text",
      modelo: "claude-opus-4-7",
      tokens_entrada: typeof usage.input_tokens === "number" ? usage.input_tokens : 0,
      tokens_salida: typeof usage.output_tokens === "number" ? usage.output_tokens : 0,
    });

    return new Response(JSON.stringify({ texto: registro }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error inesperado:", err);
    return new Response(JSON.stringify({ error: "Error interno del servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
