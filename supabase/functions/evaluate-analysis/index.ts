import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { procesarGamificacion } from "../_shared/gamificacion.ts";
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
  stop_reason?: string;
  usage?: AnthropicUsage;
  content?: AnthropicContentBlock[];
};

const LIMITE_EVALUACIONES_DIARIO = 20;
const CREDITOS_EVALUACION = 1.5;
const MIN_FEEDBACK_CHARS = 40;
const DEFAULT_EVALUATION_MODEL = "claude-opus-4-7";
const ANTHROPIC_MAX_TOKENS = 3500;
const ANTHROPIC_TIMEOUT_MS = 90_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

const JUSTIFICACION_SCHEMA: Record<string, unknown> = {
  type: "string",
  minLength: MIN_FEEDBACK_CHARS,
  description:
    "Comentario específico de 2-3 frases que justifica la banda con rasgos concretos del análisis del estudiante.",
};

const FEEDBACK_GENERAL_SCHEMA: Record<string, unknown> = {
  type: "string",
  minLength: MIN_FEEDBACK_CHARS,
  description: "Feedback específico y accionable; no puede estar vacío.",
};

const EVAL_TOOL: Record<string, unknown> = {
  name: "registrar_evaluacion",
  description:
    "Registra la evaluación básica del análisis literario: bandas, justificaciones, comentario global, fortalezas y áreas de mejora.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "banda_a",
      "banda_b",
      "banda_c",
      "banda_d",
      "justificacion_a",
      "justificacion_b",
      "justificacion_c",
      "justificacion_d",
      "comentario_global",
      "fortalezas",
      "areas_mejora",
    ],
    properties: {
      banda_a: { type: "integer", minimum: 0, maximum: 5 },
      banda_b: { type: "integer", minimum: 0, maximum: 5 },
      banda_c: { type: "integer", minimum: 0, maximum: 5 },
      banda_d: { type: "integer", minimum: 0, maximum: 5 },
      justificacion_a: JUSTIFICACION_SCHEMA,
      justificacion_b: JUSTIFICACION_SCHEMA,
      justificacion_c: JUSTIFICACION_SCHEMA,
      justificacion_d: JUSTIFICACION_SCHEMA,
      comentario_global: FEEDBACK_GENERAL_SCHEMA,
      fortalezas: FEEDBACK_GENERAL_SCHEMA,
      areas_mejora: FEEDBACK_GENERAL_SCHEMA,
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

    if (perfilErr) {
      console.error("Error leyendo perfil:", perfilErr);
      return new Response(JSON.stringify({ error: "No se pudo verificar tu perfil." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let perfilActivo = perfil?.activo;
    if (!perfil) {
      const { data: perfilCreado, error: crearPerfilErr } = await supabase
        .from("perfiles")
        .insert({
          user_id: userId,
          rol: "alumno",
          email: userData.user.email ?? null,
          activo: true,
          paso_onboarding: 1,
        })
        .select("activo")
        .maybeSingle();

      if (crearPerfilErr || !perfilCreado) {
        console.error("Error creando perfil mínimo para Prueba 1:", crearPerfilErr);
        return new Response(
          JSON.stringify({
            error:
              "No se pudo preparar tu perfil para evaluar. Vuelve a entrar o completa el onboarding.",
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      perfilActivo = perfilCreado.activo;
    }

    if (perfilActivo === false) {
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

    const texto: unknown = body?.texto;
    const pregunta: unknown = body?.pregunta;
    const analisis: unknown = body?.analisis;
    const nivel: Nivel = parseNivel(body.nivel);
    const courseKey: CourseKey = parseCourseKey(body.course_key);
    const guardarHistorial = body.guardar_historial !== false;
    const textoId =
      typeof body.texto_id === "string" && UUID_RE.test(body.texto_id) ? body.texto_id : null;

    if (!texto || !pregunta || !analisis) {
      return new Response(JSON.stringify({ error: "Faltan campos: texto, pregunta o análisis." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof texto !== "string" || typeof pregunta !== "string" || typeof analisis !== "string") {
      return new Response(JSON.stringify({ error: "Campos inválidos." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (texto.length > 60000 || analisis.length > 40000 || pregunta.length > 2000) {
      return new Response(
        JSON.stringify({
          error: "El texto o el análisis superan el límite permitido.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const textoHtml = typeof body.texto_html === "string" ? body.texto_html.slice(0, 70000) : texto;
    const analisisHtml =
      typeof body.analisis_html === "string" ? body.analisis_html.slice(0, 50000) : analisis;

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY no configurada." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const EVALUATION_MODEL = Deno.env.get("ANTHROPIC_EVALUATION_MODEL") ?? DEFAULT_EVALUATION_MODEL;

    // Atomic quota check + slot reservation via pg_advisory_xact_lock inside the RPC.
    // Runs after all validation so malformed requests never consume quota.
    const { data: reserva, error: reservaErr } = await adminClient.rpc(
      "reservar_cuota_evaluacion",
      { p_user_id: userId, p_limite: LIMITE_EVALUACIONES_DIARIO },
    );
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
          error: "Has alcanzado el límite diario de evaluaciones. Vuelve mañana.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const usoId = reserva as string;

    const cancelarCuota = async () => {
      await adminClient.from("llm_uso").delete().eq("id", usoId);
    };

    // ── Deducir créditos ───────────────────────────────────────────────────
    const { data: nuevoSaldo, error: creditErr } = await adminClient.rpc("deducir_creditos", {
      p_user_id: userId,
      p_cantidad: CREDITOS_EVALUACION,
      p_concepto: "evaluate-analysis",
      p_metadata: { course_key: courseKey },
    });
    if (creditErr) {
      await cancelarCuota();
      console.error("Error deduciendo créditos:", creditErr);
      return new Response(JSON.stringify({ error: "No se pudo verificar tu saldo de créditos." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (nuevoSaldo === null) {
      await cancelarCuota();
      return new Response(JSON.stringify({ error: `Créditos insuficientes. Necesitas ${CREDITOS_EVALUACION} créditos para corregir esta prueba.` }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reembolsarCreditos = async () => {
      await adminClient.rpc("reembolsar_creditos", {
        p_user_id: userId,
        p_cantidad: CREDITOS_EVALUACION,
        p_concepto: "evaluate-analysis",
        p_metadata: { motivo: "error_anthropic" },
      });
    };

    const userPrompt = `TEXTO LITERARIO:\n${texto}\n\nPREGUNTA DE ORIENTACIÓN:\n${pregunta}\n\nANÁLISIS DEL ESTUDIANTE:\n${analisis}\n\nEvalúa este análisis según los criterios del IB en modo básico. Devuelve bandas A-D, justificaciones, comentario global, fortalezas y áreas de mejora. NO generes anotaciones, reescrituras, análisis estructural (introducción/párrafos/conclusión) ni lenguaje analítico — eso se solicita en otra llamada. Llama a la herramienta para registrar la evaluación básica.`;

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
              text: buildSystemPrompt({ courseKey, component: "paper1-basic", nivel }),
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: userPrompt }],
          tools: [EVAL_TOOL],
          tool_choice: { type: "tool", name: "registrar_evaluacion" },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      await cancelarCuota();
      await reembolsarCreditos();
      if (!isAbortError(error)) {
        console.error("Anthropic fetch error:", error);
      }
      return new Response(
        JSON.stringify({
          error: isAbortError(error)
            ? "La corrección tardó demasiado. Prueba con un texto más corto o inténtalo de nuevo en unos minutos."
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
      await reembolsarCreditos();
      return new Response(
        JSON.stringify({ error: "No se recibió respuesta del servicio de IA." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("evaluate-analysis Anthropic completed", {
      model: EVALUATION_MODEL,
      status: response.status,
      ms: Date.now() - startedAt,
    });

    if (!response.ok) {
      await cancelarCuota();
      await reembolsarCreditos();
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (response.status === 529) {
        return new Response(
          JSON.stringify({
            error: "El servicio de IA está sobrecargado. Inténtalo de nuevo.",
          }),
          {
            status: 529,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
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
      await reembolsarCreditos();
      console.error("Anthropic max_tokens en evaluate-analysis", {
        model: EVALUATION_MODEL,
        max_tokens: ANTHROPIC_MAX_TOKENS,
      });
      return new Response(
        JSON.stringify({
          error:
            "La corrección quedó incompleta. Prueba con un texto más corto o inténtalo de nuevo.",
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
      await reembolsarCreditos();
      console.error("No tool_use block:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "La IA no devolvió una evaluación válida." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ev = toolUseBlock.input;
    const clamp = (v: unknown): number =>
      typeof v === "number" && isFinite(v) ? Math.max(0, Math.min(5, Math.round(v))) : 0;
    const banda_a = clamp(ev.banda_a);
    const banda_b = clamp(ev.banda_b);
    const banda_c = clamp(ev.banda_c);
    const banda_d = clamp(ev.banda_d);
    const total = banda_a + banda_b + banda_c + banda_d;
    const nota_ib =
      total <= 2
        ? 1
        : total <= 5
          ? 2
          : total <= 8
            ? 3
            : total <= 10
              ? 4
              : total <= 13
                ? 5
                : total <= 15
                  ? 6
                  : 7;
    const feedbackText = {
      justificacion_a: typeof ev.justificacion_a === "string" ? ev.justificacion_a.trim() : "",
      justificacion_b: typeof ev.justificacion_b === "string" ? ev.justificacion_b.trim() : "",
      justificacion_c: typeof ev.justificacion_c === "string" ? ev.justificacion_c.trim() : "",
      justificacion_d: typeof ev.justificacion_d === "string" ? ev.justificacion_d.trim() : "",
      comentario_global:
        typeof ev.comentario_global === "string" ? ev.comentario_global.trim() : "",
      fortalezas: typeof ev.fortalezas === "string" ? ev.fortalezas.trim() : "",
      areas_mejora: typeof ev.areas_mejora === "string" ? ev.areas_mejora.trim() : "",
    };
    const feedbackFaltante = Object.entries(feedbackText)
      .filter(([, value]) => value.length < MIN_FEEDBACK_CHARS)
      .map(([key]) => key);

    if (feedbackFaltante.length > 0) {
      await cancelarCuota();
      await reembolsarCreditos();
      console.error("Evaluación Prueba 1 sin comentarios suficientes:", feedbackFaltante);
      return new Response(
        JSON.stringify({
          error: "La IA no devolvió comentarios completos para los criterios. Inténtalo de nuevo.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const evaluacion = {
      ...ev,
      ...feedbackText,
      banda_a,
      banda_b,
      banda_c,
      banda_d,
      introduccion: null,
      parrafos: null,
      conclusion: null,
      lenguaje_analitico: null,
      sugerencias_reescritura: null,
      feedback_completo_generado: false,
      puntuacion_total: total,
      nota_ib,
    };

    let evaluacionId: string | null = null;
    if (guardarHistorial) {
      const { data: insertada, error: insertErr } = await supabase
        .from("evaluaciones")
        .insert({
          user_id: userId,
          texto_literario: sanitizeEditorHtml(textoHtml),
          pregunta_orientacion: pregunta.trim(),
          analisis_estudiante: sanitizeEditorHtml(analisisHtml),
          banda_a,
          banda_b,
          banda_c,
          banda_d,
          justificacion_a: feedbackText.justificacion_a,
          justificacion_b: feedbackText.justificacion_b,
          justificacion_c: feedbackText.justificacion_c,
          justificacion_d: feedbackText.justificacion_d,
          nota_ib,
          fortalezas: feedbackText.fortalezas,
          areas_mejora: feedbackText.areas_mejora,
          comentario_global: feedbackText.comentario_global,
          nivel,
          course_key: courseKey,
          introduccion: null,
          parrafos: null,
          conclusion: null,
          lenguaje_analitico: null,
          sugerencias_reescritura: null,
        })
        .select("id")
        .single();

      if (insertErr || !insertada) {
        console.error("Error guardando evaluación:", insertErr);
        // Ya se cobraron créditos pero no hay resultado guardado: reembolsar.
        await adminClient.rpc("reembolsar_creditos", {
          p_user_id: userId,
          p_cantidad: CREDITOS_EVALUACION,
          p_concepto: "evaluate-analysis",
          p_metadata: { motivo: "error_persistencia" },
        });
        return new Response(
          JSON.stringify({
            error: "La evaluación se generó, pero no se pudo guardar. Se han reembolsado tus créditos.",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      evaluacionId = insertada.id;

      const gamificacion = await procesarGamificacion(
        adminClient,
        userId,
        {
          tipo: "p1",
          banda_a,
          banda_b,
          banda_c,
          banda_d,
          nota_ib,
        },
        courseKey,
      );
      Object.assign(evaluacion, { gamificacion });

      // textoId / textos_vistos: compatibilidad futura con Biblioteca (retirada del árbol activo).
      // No hay caller en src/ — este path es dead code hasta que se reconecte la feature.
      if (textoId) {
        const { error: vistoErr } = await supabase
          .from("textos_vistos")
          .upsert({ user_id: userId, texto_id: textoId }, { onConflict: "user_id,texto_id" });
        if (vistoErr) console.error("Error marcando texto visto:", vistoErr);
      }
    }

    return new Response(JSON.stringify({ ...evaluacion, evaluacion_id: evaluacionId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate-analysis error:", e);
    return new Response(JSON.stringify({ error: "Error interno del servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
