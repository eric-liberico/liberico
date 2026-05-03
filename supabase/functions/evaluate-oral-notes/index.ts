import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { type Nivel, nivelContext, parseNivel } from "../_shared/nivel.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── System prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT_BASE = `Eres un coach experto de Español A: Literatura del Bachillerato Internacional.
Evalúas apuntes de preparación del Trabajo Oral Individual, no un guion ni una transcripción.

DISTINCIÓN FUNDAMENTAL
Los apuntes de un oral bien preparado son herramientas, no producto final:
- Bullets breves con palabras clave, no frases completas.
- Referencias a evidencias concretas (cita, escena, imagen, recurso), no citas extensas.
- Señales de estructura (qué viene después) y conexiones con el asunto global.
- No más largos que lo que cabe en una tarjeta de índice.

Penaliza apuntes que parezcan guion completo o párrafos listos para recitar.
Premia apuntes que sirvan como cues claros, concisos y analíticamente precisos.

RESTRICCIONES DE INTEGRIDAD ACADÉMICA — OBLIGATORIAS
- No escribas un oral completo ni un guion para memorizar.
- No generes párrafos, frases completas ni prosa extensa.
- No transformes bullets en exposición.
- Tus mejoras deben ser bullets breves: nunca más largos que el original.
- Si un bullet es demasiado largo, acórtalo y hazlo más preciso.
- Si los apuntes ya parecen un guion, señálalo como riesgo crítico y no los expandes.

TAREA
Evalúa los apuntes como herramienta de preparación:
1. ¿Son demasiado extensos (parecen guion)?
2. ¿Cubren los cuatro elementos: extracto 1, obra 1, extracto 2, obra 2?
3. ¿El asunto global aparece como eje articulador o es solo una etiqueta inicial?
4. ¿Hay análisis formal (recursos, decisiones autorales, voz, estructura) o solo temática?
5. ¿Hay equilibrio entre las dos obras y sus extractos?

REGLA CONTRA INVENCIÓN
No inventes detalles de las obras. Evalúa lo que el alumno ha incluido en sus apuntes.

COMENTARIOS OBLIGATORIOS
Todos los campos de texto del tool son obligatorios y no pueden estar vacíos.`;

function buildSystemPrompt(nivel: Nivel): string {
  return SYSTEM_PROMPT_BASE + nivelContext(nivel, "oral");
}

// ── Types ─────────────────────────────────────────────────────────────────

type JsonRecord = Record<string, unknown>;

type AnthropicUsage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

type AnthropicContentBlock = { type?: unknown; input?: unknown };

type AnthropicResponse = {
  stop_reason?: string;
  usage?: AnthropicUsage;
  content?: AnthropicContentBlock[];
};

// ── Constants ─────────────────────────────────────────────────────────────

const LIMITE_DIARIO = 5;
const MODEL = "claude-opus-4-7";
const MAX_TOKENS = 4000;
const TIMEOUT_MS = 90_000;
const MIN_CHARS = 20;

function isRecord(v: unknown): v is JsonRecord {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

// ── Tool definition ────────────────────────────────────────────────────────

const TOOL = {
  name: "registrar_revision_apuntes",
  description: "Registra la revisión pedagógica de los apuntes del oral. No genera un guion.",
  input_schema: {
    type: "object",
    required: [
      "evaluacion_global",
      "cumple_formato",
      "diagnostico_asunto_global",
      "cobertura",
      "equilibrio",
      "analisis_formal",
      "riesgos",
      "mejoras_bullet_a_bullet",
      "preguntas_probables",
      "prioridades",
    ],
    properties: {
      evaluacion_global: {
        type: "object",
        required: ["resumen", "nivel_preparacion"],
        properties: {
          resumen: { type: "string", minLength: 30 },
          nivel_preparacion: { type: "string", enum: ["alto", "medio", "bajo"] },
        },
      },
      cumple_formato: {
        type: "object",
        required: ["estado", "comentario"],
        properties: {
          estado: {
            type: "string",
            enum: ["bien", "demasiado_extenso", "demasiado_vago", "parece_guion"],
          },
          comentario: { type: "string", minLength: 20 },
        },
      },
      diagnostico_asunto_global: {
        type: "object",
        required: ["estado", "comentario", "mejora"],
        properties: {
          estado: { type: "string", enum: ["presente", "parcial", "ausente"] },
          comentario: { type: "string", minLength: 20 },
          mejora: { type: "string" },
        },
      },
      cobertura: {
        type: "array",
        minItems: 4,
        maxItems: 4,
        items: {
          type: "object",
          required: ["id", "titulo", "estado", "comentario", "mejora"],
          properties: {
            id: {
              type: "string",
              enum: ["extracto_1", "obra_1", "extracto_2", "obra_2"],
            },
            titulo: { type: "string" },
            estado: { type: "string", enum: ["bien", "parcial", "ausente"] },
            comentario: { type: "string", minLength: 15 },
            mejora: { type: "string" },
          },
        },
      },
      equilibrio: {
        type: "object",
        required: ["comentario", "mejora"],
        properties: {
          comentario: { type: "string", minLength: 20 },
          mejora: { type: "string" },
        },
      },
      analisis_formal: {
        type: "object",
        required: ["comentario", "mejora"],
        properties: {
          comentario: { type: "string", minLength: 20 },
          mejora: { type: "string" },
        },
      },
      riesgos: {
        type: "array",
        minItems: 0,
        maxItems: 5,
        items: {
          type: "object",
          required: ["tipo", "problema", "solucion"],
          properties: {
            tipo: {
              type: "string",
              enum: [
                "memorizacion",
                "generalidad",
                "falta_evidencia",
                "desequilibrio",
                "falta_analisis_formal",
                "otro",
              ],
            },
            problema: { type: "string", minLength: 15 },
            solucion: { type: "string", minLength: 15 },
          },
        },
      },
      mejoras_bullet_a_bullet: {
        type: "array",
        minItems: 2,
        maxItems: 8,
        items: {
          type: "object",
          required: [
            "fragmento_original",
            "problema",
            "propuesta_bullet_mejorado",
            "criterio_relacionado",
          ],
          properties: {
            fragmento_original: { type: "string", minLength: 5 },
            problema: { type: "string", minLength: 10 },
            propuesta_bullet_mejorado: { type: "string", minLength: 5 },
            criterio_relacionado: { type: "string", enum: ["A", "B", "C", "D"] },
          },
        },
      },
      preguntas_probables: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object",
          required: ["pregunta", "por_que_te_la_harian", "como_prepararla"],
          properties: {
            pregunta: { type: "string", minLength: 10 },
            por_que_te_la_harian: { type: "string", minLength: 15 },
            como_prepararla: { type: "string", minLength: 15 },
          },
        },
      },
      prioridades: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: { type: "string", minLength: 10 },
      },
    },
  },
};

// ── Handler ────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = SUPABASE_SERVICE_ROLE_KEY
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : supabase;

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
      return json({ error: "No autorizado" }, 401);
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser(parts[1]);
    if (userErr || !userData.user) return json({ error: "No autorizado" }, 401);

    const userId = userData.user.id;

    // Verificar perfil activo
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("activo")
      .eq("user_id", userId)
      .maybeSingle();
    if (!perfil?.activo) return json({ error: "Cuenta inactiva" }, 403);

    // Cuota diaria simple
    const hoy = new Date().toISOString().slice(0, 10);
    const { count } = await supabase
      .from("evaluaciones_apuntes_oral")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", hoy + "T00:00:00Z");
    if ((count ?? 0) >= LIMITE_DIARIO) {
      return json(
        { error: `Límite diario de ${LIMITE_DIARIO} revisiones de apuntes alcanzado.` },
        429,
      );
    }

    // Parse body
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!isRecord(body)) return json({ error: "Cuerpo de petición inválido." }, 400);

    const nivel: Nivel = parseNivel(body.nivel);
    const tipoOral = body.tipo_oral === "self_taught" ? "self_taught" : "taught";
    const asuntoGlobal = typeof body.asunto_global === "string" ? body.asunto_global.trim() : "";
    const obra1Titulo = typeof body.obra_1_titulo === "string" ? body.obra_1_titulo.trim() : "";
    const obra1Autor = typeof body.obra_1_autor === "string" ? body.obra_1_autor.trim() : "";
    const obra1Tipo = typeof body.obra_1_tipo === "string" ? body.obra_1_tipo.trim() : "";
    const extracto1 = typeof body.extracto_1 === "string" ? body.extracto_1.trim() : "";
    const obra2Titulo = typeof body.obra_2_titulo === "string" ? body.obra_2_titulo.trim() : "";
    const obra2Autor = typeof body.obra_2_autor === "string" ? body.obra_2_autor.trim() : "";
    const obra2Tipo = typeof body.obra_2_tipo === "string" ? body.obra_2_tipo.trim() : "";
    const extracto2 = typeof body.extracto_2 === "string" ? body.extracto_2.trim() : "";
    const apuntesOral = typeof body.apuntes_oral === "string" ? body.apuntes_oral.trim() : "";

    if (!asuntoGlobal || !obra1Titulo || !obra2Titulo) {
      return json({ error: "Faltan campos obligatorios: asunto_global y títulos de obras." }, 400);
    }
    if (!apuntesOral || apuntesOral.length < 20) {
      return json({ error: "Los apuntes son demasiado cortos para evaluar." }, 400);
    }
    const palabrasApuntes = apuntesOral
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
    if (palabrasApuntes > 300) {
      return json(
        {
          error: `Los apuntes superan las 300 palabras (${palabrasApuntes}). Los apuntes deben ser un esquema conciso, no un guion. Recorta antes de enviar.`,
        },
        400,
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY no configurada." }, 500);

    // Build user prompt
    const extracto1Sec = extracto1 ? `\nEXTRACTO 1:\n${extracto1}` : "";
    const extracto2Sec = extracto2 ? `\nEXTRACTO 2:\n${extracto2}` : "";
    const userPrompt = `NIVEL: ${nivel}
MODALIDAD: ${tipoOral === "taught" ? "Con profesor (10+5 min)" : "Self-taught (15 min)"}

ASUNTO GLOBAL: ${asuntoGlobal}

OBRA 1: ${obra1Titulo}${obra1Autor ? ` — ${obra1Autor}` : ""}${obra1Tipo ? ` (${obra1Tipo})` : ""}${extracto1Sec}

OBRA 2: ${obra2Titulo}${obra2Autor ? ` — ${obra2Autor}` : ""}${obra2Tipo ? ` (${obra2Tipo})` : ""}${extracto2Sec}

APUNTES DEL ALUMNO:
${apuntesOral}

Evalúa estos apuntes como herramienta de preparación. No los conviertas en un guion ni en prosa. Llama a la herramienta para registrar tu revisión.`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let rawResponse: AnthropicResponse;
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
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
          tools: [TOOL],
          tool_choice: { type: "tool", name: "registrar_revision_apuntes" },
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!resp.ok) {
        const errText = await resp.text();
        console.error("Anthropic error:", resp.status, errText);
        return json({ error: "Error al conectar con la IA. Inténtalo de nuevo." }, 502);
      }
      rawResponse = (await resp.json()) as AnthropicResponse;
    } catch (fetchErr) {
      clearTimeout(timer);
      if (isAbortError(fetchErr)) {
        return json({ error: "La IA tardó demasiado. Inténtalo de nuevo." }, 504);
      }
      throw fetchErr;
    }

    // Extract tool input
    const toolBlock = (rawResponse.content ?? []).find(
      (b) => isRecord(b) && b.type === "tool_use" && isRecord(b.input),
    );
    if (!toolBlock || !isRecord(toolBlock.input)) {
      console.error("No tool block in response:", JSON.stringify(rawResponse).slice(0, 500));
      return json({ error: "La IA no devolvió el formato esperado. Inténtalo de nuevo." }, 500);
    }
    const resultado = toolBlock.input as JsonRecord;

    // Basic validation — variable intermedia para que Deno pueda estrechar el tipo
    const evalGlobal = resultado.evaluacion_global;
    const resumen = isRecord(evalGlobal) ? evalGlobal.resumen : undefined;
    if (typeof resumen !== "string" || resumen.length < MIN_CHARS) {
      return json({ error: "La IA no devolvió un resumen suficiente. Inténtalo de nuevo." }, 500);
    }

    // Register LLM usage — usa adminClient (service role) porque llm_uso no tiene policy INSERT para usuarios
    const usage = rawResponse.usage ?? {};
    void adminClient.from("llm_uso").insert({
      user_id: userId,
      edge_function: "evaluate-oral-notes",
      modelo: MODEL,
      tokens_entrada: usage.input_tokens ?? 0,
      tokens_salida: usage.output_tokens ?? 0,
      cache_creation_tokens: usage.cache_creation_input_tokens ?? 0,
      cache_read_tokens: usage.cache_read_input_tokens ?? 0,
    });

    // Save to DB
    const { data: insertada, error: insertErr } = await supabase
      .from("evaluaciones_apuntes_oral")
      .insert({
        user_id: userId,
        nivel,
        tipo_oral: tipoOral,
        asunto_global: asuntoGlobal,
        obra_1_titulo: obra1Titulo,
        obra_1_autor: obra1Autor || null,
        obra_1_tipo: obra1Tipo || null,
        extracto_1: extracto1 || null,
        obra_2_titulo: obra2Titulo,
        obra_2_autor: obra2Autor || null,
        obra_2_tipo: obra2Tipo || null,
        extracto_2: extracto2 || null,
        apuntes_oral: apuntesOral,
        resultado,
      })
      .select("id")
      .single();

    if (insertErr || !insertada) {
      console.error("Error guardando revisión de apuntes:", insertErr);
      // Devolvemos el resultado igualmente para no perder el trabajo
      return json({ ...resultado, guardado: false });
    }

    return json({ ...resultado, revision_id: insertada.id, guardado: true });
  } catch (e) {
    console.error("evaluate-oral-notes error:", e);
    return json({ error: "Error interno del servidor." }, 500);
  }
});
