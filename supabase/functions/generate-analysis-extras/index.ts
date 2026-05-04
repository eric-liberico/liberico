import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { type Nivel, nivelContext, parseNivel } from "../_shared/nivel.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres un examinador experto de Español A: Literatura del Bachillerato Internacional (IB), Nivel Medio. Generas en un solo paso el análisis completo de Prueba 1 cuando el alumno lo solicita.

CONTEXTO
Ya existe una evaluación básica con bandas A-D, justificaciones, comentario global, fortalezas y áreas de mejora. NO cambies esas notas ni repitas fortalezas/áreas.

### TAREA 1 — ANÁLISIS ESTRUCTURAL Y LENGUAJE

Genera el feedback estructural y de lenguaje analítico del análisis del alumno.

- introduccion, parrafos y conclusion: diagnóstico estructural localizable en el análisis del alumno.
- lenguaje_analitico: patrones de verbos débiles, verbos fuertes, adverbios e interferencias del inglés.

REGLAS
- Usa fragmentos exactos o casi exactos del análisis del alumno para que la interfaz pueda resaltarlos.
- No inventes citas del texto literario ni atribuyas ideas que el alumno no escribió.
- Sé conciso: cada evaluación/sugerencia estructural debe ser breve y accionable.

INTRODUCCION: analiza contextualizacion, tesis, recursos_anunciados, enfoque_metodologico, pertinencia_pregunta y tono_academico_intro.
PARRAFOS: para cada párrafo relevante analiza idea_controladora, cita_textual, analisis_efecto, conector_transicion y nivel_sintesis. Si hay más de 5 párrafos, analiza solo los 5 más relevantes para el salto de banda.
CONCLUSION: analiza retoma_tesis, sintesis_argumentativa, cierre_literario, nueva_informacion y proporcion.
LENGUAJE: marca patrones pedagógicos, no errores aislados sin valor.

### TAREA 2 — MICRO-REESCRITURAS

Genera micro-reescrituras pedagógicas sobre fragmentos concretos del análisis del alumno, basadas en el análisis estructural de la Tarea 1.

REGLAS OBLIGATORIAS
- Genera entre 6 y 8 sugerencias, salvo que el análisis sea muy breve; en ese caso genera al menos 4.
- Cada fragmento_original debe ser una cita exacta o casi exacta del análisis del alumno, de 8 a 35 palabras, para que la interfaz pueda localizarlo.
- No concentres todas las sugerencias en el mismo párrafo. Distribúyelas entre introducción, desarrollo y conclusión cuando existan.
- Cubre capas distintas: al menos una sugerencia de tesis/foco, dos de análisis de efecto o interpretación, una de organización/transición/conclusión y una de precisión lingüística o registro si el texto lo permite.
- No devuelvas más de 2 sugerencias del mismo tipo salvo que el análisis sea muy breve o tenga un problema dominante.
- Conserva las ideas principales, la voz y el orden argumental del alumno. Mejora desde dentro: precisa, conecta, profundiza o formula con más rigor.
- No inventes una tesis completamente nueva ni añadas citas que no estén en el texto literario.
- La propuesta_reescritura debe sonar como una versión mejorada del propio alumno: más analítica, más académica y más clara.
- Si el feedback menciona interferencias del inglés, verbos débiles o falta de foco, incluye al menos una reescritura que modele cómo corregir ese patrón.

CRITERIOS IB
A: comprensión e interpretación. B: análisis y evaluación de recursos y efectos. C: focalización, organización y desarrollo. D: lenguaje académico, precisión y corrección.

### TAREA 3 — ENSAYO DE BANDA 5

Genera una versión completa del análisis del alumno elevada a banda 5, informada por el análisis estructural y las reescrituras de las Tareas 1 y 2.

FUNCIÓN PEDAGÓGICA
El texto muestra cómo se vería la mejor versión posible de la respuesta del estudiante. No es una "solución única" ni un texto para copiar mecánicamente.

REGLAS OBLIGATORIAS
- Mantén la estructura global del alumno: introducción, orden aproximado de los párrafos y conclusión. Si la estructura es débil, mejórala sin volver irreconocible su planteamiento.
- Conserva sus ideas principales y su enfoque siempre que sean rescatables. Desarrolla, precisa y conecta; no sustituyas por una interpretación completamente nueva.
- Mantén una voz reconocible del estudiante, pero con registro académico, sintaxis más clara y vocabulario analítico más preciso.
- Integra mejor las citas y explica efectos sobre significado/lector. No añadas citas que no estén en el texto literario.
- Divide el ensayo en párrafos con líneas en blanco entre párrafos.
- Mantén una extensión pedagógicamente útil: normalmente 700-1000 palabras, o una longitud proporcional si el análisis original es mucho más breve.
- En que_se_conservo enumera 2-4 decisiones del alumno que mantuviste.
- En que_se_transformo enumera 2-4 cambios de alto impacto.
- En criterios_mejorados incluye A, B, C y D con una frase concreta por criterio.
- En advertencia_uso recuerda que el alumno debe estudiarlo como modelo de transformación, no copiarlo mecánicamente.`;

function buildSystemPrompt(nivel: Nivel): string {
  return SYSTEM_PROMPT + nivelContext(nivel, "p1");
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
const LIMITE_DIARIO = 5;
const MODEL = "claude-opus-4-7";
const MAX_TOKENS = 16000;
const TIMEOUT_MS = 180_000;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
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

function extrasExisten(evaluacion: JsonRecord): boolean {
  return (
    isRecord(evaluacion.introduccion) &&
    Array.isArray(evaluacion.parrafos) &&
    (evaluacion.parrafos as unknown[]).length > 0 &&
    isRecord(evaluacion.conclusion) &&
    isRecord(evaluacion.lenguaje_analitico) &&
    Array.isArray(evaluacion.sugerencias_reescritura) &&
    (evaluacion.sugerencias_reescritura as unknown[]).length > 0 &&
    isRecord(evaluacion.ensayo_banda_5) &&
    typeof (evaluacion.ensayo_banda_5 as JsonRecord).texto === "string" &&
    ((evaluacion.ensayo_banda_5 as JsonRecord).texto as string).trim().length > 0
  );
}

function respuestaExtras(evaluacion: JsonRecord): JsonRecord {
  return {
    evaluacion_id: evaluacion.id ?? null,
    introduccion: evaluacion.introduccion,
    parrafos: evaluacion.parrafos,
    conclusion: evaluacion.conclusion,
    lenguaje_analitico: evaluacion.lenguaje_analitico,
    sugerencias_reescritura: evaluacion.sugerencias_reescritura,
    ensayo_banda_5: evaluacion.ensayo_banda_5,
    feedback_completo_generado: true,
  };
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
      message: "Has alcanzado el límite diario de análisis completo. Vuelve mañana.",
    };
  }

  return { ok: true };
}

const SHORT_FEEDBACK_SCHEMA: Record<string, unknown> = {
  type: "string",
  minLength: 8,
};

const ELEMENTO_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["tipo", "estado", "fragmento", "evaluacion", "sugerencia"],
  properties: {
    tipo: { type: "string" },
    estado: { type: "string", enum: ["presente", "parcial", "ausente"] },
    fragmento: { type: "string" },
    evaluacion: SHORT_FEEDBACK_SCHEMA,
    sugerencia: SHORT_FEEDBACK_SCHEMA,
  },
};

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

const MEJORA_CRITERIO_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["criterio", "mejora"],
  properties: {
    criterio: { type: "string", enum: ["A", "B", "C", "D"] },
    mejora: { type: "string" },
  },
};

const EXTRAS_TOOL: Record<string, unknown> = {
  name: "registrar_extras_p1",
  description:
    "Registra el análisis estructural, micro-reescrituras y ensayo de banda 5 de Prueba 1 en un solo paso.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "introduccion",
      "parrafos",
      "conclusion",
      "lenguaje_analitico",
      "sugerencias_reescritura",
      "ensayo_banda_5",
    ],
    properties: {
      introduccion: {
        type: "object",
        additionalProperties: false,
        required: ["elementos", "valoracion"],
        properties: {
          elementos: { type: "array", items: ELEMENTO_SCHEMA },
          valoracion: SHORT_FEEDBACK_SCHEMA,
        },
      },
      parrafos: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "numero",
            "extracto_inicio",
            "elementos",
            "nivel_analisis",
            "sugerencia_global",
          ],
          properties: {
            numero: { type: "integer" },
            extracto_inicio: { type: "string" },
            elementos: { type: "array", items: ELEMENTO_SCHEMA },
            nivel_analisis: {
              type: "string",
              enum: ["descripcion", "analisis", "interpretacion", "evaluacion"],
            },
            sugerencia_global: SHORT_FEEDBACK_SCHEMA,
          },
        },
      },
      conclusion: {
        type: "object",
        additionalProperties: false,
        required: ["elementos", "valoracion"],
        properties: {
          elementos: { type: "array", items: ELEMENTO_SCHEMA },
          valoracion: SHORT_FEEDBACK_SCHEMA,
        },
      },
      lenguaje_analitico: {
        type: "object",
        additionalProperties: false,
        required: [
          "verbos_debiles",
          "verbos_fuertes_usados",
          "adverbios_presentes",
          "adverbios_sugeridos",
          "interferencias_ingles",
          "valoracion",
        ],
        properties: {
          verbos_debiles: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["verbo", "frecuencia", "ejemplo_original", "alternativa_mejorada"],
              properties: {
                verbo: { type: "string" },
                frecuencia: { type: "integer" },
                ejemplo_original: { type: "string" },
                alternativa_mejorada: { type: "string" },
              },
            },
          },
          verbos_fuertes_usados: { type: "array", items: { type: "string" } },
          adverbios_presentes: { type: "array", items: { type: "string" } },
          adverbios_sugeridos: { type: "array", items: { type: "string" } },
          interferencias_ingles: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["tipo", "fragmento_original", "explicacion", "correccion"],
              properties: {
                tipo: {
                  type: "string",
                  enum: [
                    "gerundio",
                    "como_que",
                    "calco_sintactico",
                    "estructura_traducida",
                    "orden_palabras",
                    "otro",
                  ],
                },
                fragmento_original: { type: "string" },
                explicacion: SHORT_FEEDBACK_SCHEMA,
                correccion: SHORT_FEEDBACK_SCHEMA,
              },
            },
          },
          valoracion: SHORT_FEEDBACK_SCHEMA,
        },
      },
      sugerencias_reescritura: {
        type: "array",
        minItems: 4,
        maxItems: 8,
        items: SUGERENCIA_REESCRITURA_SCHEMA,
      },
      ensayo_banda_5: {
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
            minItems: 4,
            maxItems: 4,
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

    if (extrasExisten(evaluacion)) {
      return new Response(JSON.stringify(respuestaExtras(evaluacion)), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const limite = await verificarLimiteDiario(async () => {
      const resultado = await supabase
        .from("llm_uso")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("edge_function", "generate-analysis-extras")
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

    const nivel: Nivel = parseNivel(evaluacion.nivel);
    const textoLiterario = htmlATextoPlano(String(evaluacion.texto_literario ?? ""));
    const analisisEstudiante = htmlATextoPlano(String(evaluacion.analisis_estudiante ?? ""));
    const feedbackBasico = {
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
      comentario_global: evaluacion.comentario_global,
      fortalezas: evaluacion.fortalezas,
      areas_mejora: evaluacion.areas_mejora,
    };

    const userPrompt = `TEXTO LITERARIO:\n${textoLiterario}\n\nPREGUNTA DE ORIENTACIÓN:\n${evaluacion.pregunta_orientacion}\n\nANÁLISIS ORIGINAL DEL ESTUDIANTE:\n${analisisEstudiante}\n\nEVALUACIÓN BÁSICA YA MOSTRADA AL ALUMNO:\n${JSON.stringify(feedbackBasico)}\n\nGenera en un solo paso el análisis estructural completo (introducción, párrafos, conclusión, lenguaje analítico), las micro-reescrituras basadas en ese análisis y la versión del análisis elevada a banda 5. No cambies las bandas ni las justificaciones ya asignadas, y no repitas fortalezas ni áreas de mejora. Llama a la herramienta para registrar todo.`;

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
          tools: [EXTRAS_TOOL],
          tool_choice: { type: "tool", name: "registrar_extras_p1" },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (!isAbortError(error)) console.error("Anthropic fetch error:", error);
      return new Response(
        JSON.stringify({
          error: isAbortError(error)
            ? "El análisis completo tardó demasiado. Inténtalo de nuevo en unos minutos."
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
            "El análisis completo quedó incompleto. Inténtalo de nuevo con un texto más corto.",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const toolUseBlock = data.content?.find((b) => b.type === "tool_use");
    if (!isRecord(toolUseBlock?.input)) {
      console.error("No tool_use block:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "La IA no devolvió análisis válido." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const input = toolUseBlock.input;
    const update = {
      introduccion: isRecord(input.introduccion) ? input.introduccion : null,
      parrafos: Array.isArray(input.parrafos) ? input.parrafos : null,
      conclusion: isRecord(input.conclusion) ? input.conclusion : null,
      lenguaje_analitico: isRecord(input.lenguaje_analitico) ? input.lenguaje_analitico : null,
      sugerencias_reescritura: Array.isArray(input.sugerencias_reescritura)
        ? input.sugerencias_reescritura
        : null,
      ensayo_banda_5: isRecord(input.ensayo_banda_5) ? input.ensayo_banda_5 : null,
    };

    if (
      !update.introduccion ||
      !update.parrafos ||
      !update.conclusion ||
      !update.lenguaje_analitico ||
      !update.sugerencias_reescritura ||
      (update.sugerencias_reescritura as unknown[]).length === 0 ||
      !update.ensayo_banda_5
    ) {
      return new Response(JSON.stringify({ error: "La IA devolvió análisis incompleto." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateErr } = await supabase
      .from("evaluaciones")
      .update(update)
      .eq("id", evaluacionId);

    if (updateErr) {
      console.error("Error guardando análisis completo:", updateErr);
      return new Response(
        JSON.stringify({ error: "El análisis se generó, pero no se pudo guardar." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (SUPABASE_SERVICE_ROLE_KEY && data.usage) {
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { error: usoErr } = await adminClient.from("llm_uso").insert({
        user_id: userId,
        edge_function: "generate-analysis-extras",
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
    console.error("generate-analysis-extras error:", e);
    return new Response(JSON.stringify({ error: "Error interno del servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
