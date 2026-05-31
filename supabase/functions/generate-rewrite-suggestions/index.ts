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
const LIMITE_DIARIO = 20;

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
      message: "Has alcanzado el límite diario de reescrituras anotadas. Vuelve mañana.",
    };
  }

  return { ok: true };
}

const SUGERENCIA_REESCRITURA_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "fragmento_original",
    "criterio",
    "tipo",
    "problema",
    "propuesta_reescritura",
    "explicacion_pedagogica",
    "nivel_intervencion",
    "prioridad",
  ],
  properties: {
    fragmento_original: { type: "string" },
    criterio: { type: "string", enum: ["A", "B", "C", "D"] },
    tipo: {
      type: "string",
      enum: [
        "tesis",
        "interpretacion",
        "analisis_efecto",
        "integracion_cita",
        "estructura_parrafo",
        "transicion",
        "conclusion",
        "precision_lenguaje",
        "registro",
        "otro",
      ],
    },
    problema: { type: "string" },
    propuesta_reescritura: { type: "string" },
    explicacion_pedagogica: { type: "string" },
    nivel_intervencion: { type: "string", enum: ["minima", "media", "profunda"] },
    prioridad: { type: "integer", minimum: 1, maximum: 5 },
  },
};

const REWRITE_TOOL: Record<string, unknown> = {
  name: "registrar_sugerencias_reescritura",
  description: "Registra micro-reescrituras localizables para la solución anotada del alumno.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["sugerencias_reescritura"],
    properties: {
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
      .from("evaluaciones")
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

    if (
      Array.isArray(evaluacion.sugerencias_reescritura) &&
      evaluacion.sugerencias_reescritura.length >= 5
    ) {
      return new Response(
        JSON.stringify({ sugerencias_reescritura: evaluacion.sugerencias_reescritura }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const limite = await verificarLimiteDiario(async () => {
      const resultado = await supabase
        .from("llm_uso")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("edge_function", "generate-rewrite-suggestions")
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

    const textoLiterario = htmlATextoPlano(String(evaluacion.texto_literario ?? ""));
    const analisisEstudiante = htmlATextoPlano(String(evaluacion.analisis_estudiante ?? ""));
    const feedback = {
      bandas: {
        A: evaluacion.banda_a,
        B: evaluacion.banda_b,
        C: evaluacion.banda_c,
        D: evaluacion.banda_d,
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
      introduccion: evaluacion.introduccion,
      parrafos: evaluacion.parrafos,
      conclusion: evaluacion.conclusion,
      lenguaje_analitico: evaluacion.lenguaje_analitico,
    };

    const userPrompt = `TEXTO LITERARIO:\n${textoLiterario}\n\nPREGUNTA DE ORIENTACIÓN:\n${evaluacion.pregunta_orientacion}\n\nANÁLISIS ORIGINAL DEL ESTUDIANTE:\n${analisisEstudiante}\n\nFEEDBACK YA GENERADO:\n${JSON.stringify(feedback)}\n\nGenera micro-reescrituras para la solución anotada. Deben respetar la voz, estructura e ideas del alumno, y cada fragmento_original debe poder localizarse en el análisis original. Llama a la herramienta para registrar las sugerencias.`;

    // ── Deducir créditos ───────────────────────────────────────────────────
    const SRK_RW = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (SRK_RW) {
      const adminRW = createClient(SUPABASE_URL, SRK_RW);
      const { data: nuevoSaldo, error: creditErr } = await adminRW.rpc("deducir_creditos", {
        p_user_id: userId, p_cantidad: 2.0, p_concepto: "generate-rewrite-suggestions", p_metadata: null,
      });
      if (creditErr) {
        return new Response(JSON.stringify({ error: "No se pudo verificar tu saldo de créditos." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (nuevoSaldo === null) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Necesitas 2 créditos para generar sugerencias de reescritura." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-7",
        max_tokens: 3600,
        system: [
          {
            type: "text",
            text: buildSystemPrompt({ courseKey, component: "rewrite-p1", nivel }),
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userPrompt }],
        tools: [REWRITE_TOOL],
        tool_choice: { type: "tool", name: "registrar_sugerencias_reescritura" },
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
      return new Response(JSON.stringify({ error: "La IA no devolvió sugerencias válidas." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sugerencias = Array.isArray(toolUseBlock.input.sugerencias_reescritura)
      ? toolUseBlock.input.sugerencias_reescritura
      : [];

    if (sugerencias.length === 0) {
      return new Response(
        JSON.stringify({ error: "La IA no devolvió sugerencias localizables." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { error: updateErr } = await supabase
      .from("evaluaciones")
      .update({ sugerencias_reescritura: sugerencias })
      .eq("id", evaluacionId);

    if (updateErr) {
      console.error("Error guardando sugerencias de reescritura:", updateErr);
      return new Response(
        JSON.stringify({
          error: "Las sugerencias se generaron, pero no se pudieron guardar.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (SUPABASE_SERVICE_ROLE_KEY && data.usage) {
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { error: usoErr } = await adminClient.from("llm_uso").insert({
        user_id: userId,
        edge_function: "generate-rewrite-suggestions",
        modelo: "claude-opus-4-7",
        tokens_entrada: data.usage.input_tokens ?? 0,
        tokens_salida: data.usage.output_tokens ?? 0,
        cache_creation_tokens: data.usage.cache_creation_input_tokens ?? 0,
        cache_read_tokens: data.usage.cache_read_input_tokens ?? 0,
      });
      if (usoErr) console.error("Error registrando uso LLM:", usoErr);
    }

    return new Response(JSON.stringify({ sugerencias_reescritura: sugerencias }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-rewrite-suggestions error:", e);
    return new Response(JSON.stringify({ error: "Error interno del servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
