// Edge Function: spab-p2-evaluate
// Corrige la Prueba 2 de Spanish B (destrezas receptivas): comprensión auditiva
// y/o de lectura, ítem a ítem contra la fuente, evaluando SOLO la comprensión
// (no la lengua de las respuestas).
//
// Flujo:
//  1. Auth → perfil → cuota (reservar_cuota_paper) → créditos.
//  2. Para la sección auditiva, recupera la transcripción del audio server-side
//     (audios_paper2_b) — el alumno nunca la ve.
//  3. Claude marca cada ítem (acierto/parcial/fallo + puntos) vía tool use.
//  4. Calcula subtotales /25 (auditiva) y /40 (lectura), total y nota IB por %.
//  5. INSERT en evaluaciones_paper2_b (RLS por user_id).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { procesarGamificacion } from "../_shared/gamificacion.ts";
import { type CourseKey, parseCourseKey } from "../_shared/courses.ts";
import { buildSystemPrompt, type UiLang } from "../_shared/prompts/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

const LIMITE_DIARIO = 10;
const CREDITOS_EVALUACION = 2.0;
const MIN_FEEDBACK_CHARS = 40;
const DEFAULT_EVALUATION_MODEL = "claude-opus-4-7";
const ANTHROPIC_MAX_TOKENS = 3500;
const ANTHROPIC_TIMEOUT_MS = 90_000;
const SECTION_MAX = { auditiva: 25, lectura: 40 } as const;

const THEMES = new Set([
  "identidades",
  "experiencias",
  "ingenio_humano",
  "organizacion_social",
  "planeta_compartido",
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(v: unknown): v is JsonRecord {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

// Nota IB (1-7) formativa a partir del porcentaje de aciertos (mismo criterio
// que src/lib/criteria/spanish-b-language.ts::notaIBP2FromPorcentaje).
function notaIBFromPorcentaje(pct: number): number {
  if (pct < 20) return 1;
  if (pct < 35) return 2;
  if (pct < 50) return 3;
  if (pct < 63) return 4;
  if (pct < 75) return 5;
  if (pct < 87) return 6;
  return 7;
}

type ItemIn = {
  id: string;
  seccion: "auditiva" | "lectura";
  formato: string;
  enunciado: string;
  opciones?: string[];
  puntos: number;
};

const FORMATOS_VALIDOS = new Set([
  "opcion_multiple",
  "vf_justificacion",
  "respuesta_corta",
  "completar_espacios",
  "completar_oracion",
  "vocabulario_contexto",
  "referencia_pronominal",
]);

const MAX_ENUNCIADO_CHARS = 600;
const MAX_OPCION_CHARS = 240;
const MAX_OPCIONES = 8;
const PROMPT_INJECTION_RE =
  /\b(transcripci[oó]n|transcript|revela|muestra|copia|literal|verbatim|prompt|system|developer|ignore|ignora|instrucciones|instructions|texto completo|audio completo)\b/i;

function sanitizeItemText(value: unknown, maxChars: number): string {
  if (typeof value !== "string") return "";
  const texto = value.replace(/\s+/g, " ").trim();
  if (!texto || texto.length > maxChars || PROMPT_INJECTION_RE.test(texto)) {
    return "";
  }
  return texto;
}

function parseItems(raw: unknown, seccion: "auditiva" | "lectura"): ItemIn[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecord).map((it) => {
    const opciones = Array.isArray(it.opciones)
      ? (it.opciones as unknown[])
        .slice(0, MAX_OPCIONES)
        .map((o) => sanitizeItemText(o, MAX_OPCION_CHARS))
        .filter(Boolean)
      : undefined;

    return {
      id: typeof it.id === "string" ? it.id.slice(0, 80) : "",
      seccion,
      formato:
        typeof it.formato === "string" && FORMATOS_VALIDOS.has(it.formato)
          ? it.formato
          : "respuesta_corta",
      enunciado: sanitizeItemText(it.enunciado, MAX_ENUNCIADO_CHARS),
      opciones,
      puntos: typeof it.puntos === "number" && Number.isFinite(it.puntos)
        ? Math.max(1, Math.min(2, Math.round(it.puntos)))
        : 1,
    };
  }).filter((it) => it.id && it.enunciado);
}

function parseRespuestas(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (isRecord(raw)) {
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === "string") out[k] = v;
    }
  }
  return out;
}

const ITEM_MARK_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["id", "marca", "puntos_obtenidos", "comentario"],
  properties: {
    id: { type: "string" },
    marca: { type: "string", enum: ["acierto", "parcial", "fallo"] },
    puntos_obtenidos: { type: "integer", minimum: 0, maximum: 2 },
    comentario: { type: "string", minLength: 1 },
  },
};

const FEEDBACK_GENERAL_SCHEMA: Record<string, unknown> = {
  type: "string",
  minLength: MIN_FEEDBACK_CHARS,
  description: "Feedback específico y accionable.",
};

const EVAL_TOOL: Record<string, unknown> = {
  name: "registrar_correccion_paper2_b",
  description:
    "Registra la corrección de la Prueba 2 Spanish B: marca por ítem (solo comprensión) y feedback global.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["items", "comentario_global", "fortalezas", "areas_mejora"],
    properties: {
      items: { type: "array", items: ITEM_MARK_SCHEMA },
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
    if (!authHeader) return jsonError("No autorizado", 401);
    const parts = authHeader.split(" ");
    if (
      parts.length !== 2 || parts[0].toLowerCase() !== "bearer" || !parts[1]
    ) {
      return jsonError("No autorizado", 401);
    }
    const token = parts[1];

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser(
      token,
    );
    if (userErr || !userData.user) return jsonError("No autorizado", 401);
    const userId = userData.user.id;

    const { data: perfil, error: perfilErr } = await supabase
      .from("perfiles").select("activo").eq("user_id", userId).maybeSingle();
    if (perfilErr || !perfil) {
      return jsonError("No se pudo verificar tu perfil.", 403);
    }
    if (perfil.activo === false) return jsonError("Usuario inactivo.", 403);

    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return jsonError("Configuración del servidor incompleta.", 500);
    }
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body: unknown = await req.json();
    if (!isRecord(body)) return jsonError("Cuerpo de petición inválido.", 400);

    const courseKey: CourseKey = parseCourseKey(body.course_key);
    if (courseKey !== "spanish-b-language") {
      return jsonError("Este endpoint solo evalúa Spanish B Paper 2.", 400);
    }

    const theme = typeof body.theme === "string" ? body.theme : "";
    if (!THEMES.has(theme)) return jsonError("Tema inválido.", 400);

    const uiLang: UiLang = body.ui_lang === "es" ? "es" : "en";
    const nivel: "SL" | "HL" = body.nivel === "HL" ? "HL" : "SL";

    // ── Secciones ────────────────────────────────────────────────────────────
    const lecturaIn = isRecord(body.lectura) ? body.lectura : null;
    const auditivaIn = isRecord(body.auditiva) ? body.auditiva : null;

    const textoContent =
      lecturaIn && typeof lecturaIn.texto_content === "string"
        ? lecturaIn.texto_content.trim()
        : "";
    const itemsLectura = lecturaIn
      ? parseItems(lecturaIn.items, "lectura")
      : [];
    const respLectura = lecturaIn ? parseRespuestas(lecturaIn.respuestas) : {};

    const itemsAuditiva = auditivaIn
      ? parseItems(auditivaIn.items, "auditiva")
      : [];
    const respAuditiva = auditivaIn
      ? parseRespuestas(auditivaIn.respuestas)
      : {};

    const audioId =
      typeof body.audio_id === "string" && UUID_RE.test(body.audio_id)
        ? body.audio_id
        : null;
    const textoId =
      typeof body.texto_id === "string" && UUID_RE.test(body.texto_id)
        ? body.texto_id
        : null;

    if (itemsLectura.length === 0 && itemsAuditiva.length === 0) {
      return jsonError("No hay ítems que corregir.", 400);
    }
    if (itemsLectura.length > 0 && textoContent.length < 50) {
      return jsonError("Falta el texto de lectura.", 400);
    }
    if (itemsAuditiva.length > 0 && !audioId) {
      return jsonError("Falta el audio de la sección auditiva.", 400);
    }

    // Transcripción del audio (server-side; nunca se expone al alumno).
    let transcript = "";
    if (itemsAuditiva.length > 0 && audioId) {
      const { data: audioRow, error: audioErr } = await adminClient
        .from("audios_paper2_b")
        .select("transcript_es, activo")
        .eq("id", audioId)
        .maybeSingle();
      if (audioErr || !audioRow?.transcript_es || audioRow.activo === false) {
        return jsonError("No se encontró la transcripción del audio.", 400);
      }
      transcript = String(audioRow.transcript_es);
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return jsonError("ANTHROPIC_API_KEY no configurada.", 500);
    }
    const EVALUATION_MODEL = Deno.env.get("ANTHROPIC_EVALUATION_MODEL") ??
      DEFAULT_EVALUATION_MODEL;

    const { data: reserva, error: reservaErr } = await adminClient.rpc(
      "reservar_cuota_paper",
      {
        p_user_id: userId,
        p_course_key: courseKey,
        p_paper: "p2",
        p_limite: LIMITE_DIARIO,
        p_edge_function: "spab-p2-evaluate",
        p_modelo: EVALUATION_MODEL,
      },
    );
    if (reservaErr) {
      return jsonError("No se pudo verificar el límite de uso.", 500);
    }
    if (reserva === null) {
      return jsonError(
        "Has alcanzado el límite diario de correcciones de la Prueba 2. Vuelve mañana.",
        429,
      );
    }
    const usoId = reserva as string;

    const cancelarCuota = async () => {
      await adminClient.from("llm_uso").delete().eq("id", usoId);
    };

    const { data: nuevoSaldo, error: creditErr } = await adminClient.rpc(
      "deducir_creditos",
      {
        p_user_id: userId,
        p_cantidad: CREDITOS_EVALUACION,
        p_concepto: "evaluate-paper2-b",
        p_metadata: { course_key: courseKey },
      },
    );
    if (creditErr) {
      await cancelarCuota();
      console.error("Error deduciendo créditos:", creditErr);
      return jsonError("No se pudo verificar tu saldo de créditos.", 500);
    }
    if (nuevoSaldo === null) {
      await cancelarCuota();
      return jsonError(
        `Créditos insuficientes. Necesitas ${CREDITOS_EVALUACION} créditos para corregir esta prueba.`,
        402,
      );
    }

    const reembolsarCreditos = async () => {
      await adminClient.rpc("reembolsar_creditos", {
        p_user_id: userId,
        p_cantidad: CREDITOS_EVALUACION,
        p_concepto: "evaluate-paper2-b",
        p_metadata: { motivo: "error_anthropic" },
      });
    };

    const renderItems = (items: ItemIn[], resp: Record<string, string>) =>
      items.map((it) => {
        const opc = it.opciones && it.opciones.length
          ? `\n   Opciones: ${
            it.opciones.map((o, i) => `(${String.fromCharCode(97 + i)}) ${o}`)
              .join("  ")
          }`
          : "";
        return `[${it.id}] (${it.formato}, ${it.puntos} pt) ${it.enunciado}${opc}\n   Respuesta del alumno: ${
          resp[it.id]?.trim() || "(sin respuesta)"
        }`;
      }).join("\n\n");

    const secciones: string[] = [];
    if (itemsAuditiva.length > 0) {
      secciones.push(
        `=== SECCIÓN AUDITIVA (/25) ===\n` +
          `TRANSCRIPCIÓN DEL AUDIO (referencia para corregir; el alumno solo escuchó el audio):\n${transcript}\n\n` +
          `ÍTEMS Y RESPUESTAS:\n${renderItems(itemsAuditiva, respAuditiva)}`,
      );
    }
    if (itemsLectura.length > 0) {
      secciones.push(
        `=== SECCIÓN DE LECTURA (/40) ===\n` +
          `TEXTO:\n${textoContent}\n\n` +
          `ÍTEMS Y RESPUESTAS:\n${renderItems(itemsLectura, respLectura)}`,
      );
    }

    const userPrompt = `NIVEL: ${nivel}\n` +
      `TEMA: ${theme}\n\n` +
      `${secciones.join("\n\n")}\n\n` +
      `Corrige cada ítem por comprensión (no por la lengua de la respuesta) usando su id exacto. ` +
      `Nunca reveles ni cites la transcripción oculta; úsala solo como referencia interna. ` +
      `Llama a la herramienta para registrar la corrección.`;

    const startedAt = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      ANTHROPIC_TIMEOUT_MS,
    );
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
              text: buildSystemPrompt({
                courseKey,
                component: "paper2-b-basic",
                nivel,
                uiLang,
              }),
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: userPrompt }],
          tools: [EVAL_TOOL],
          tool_choice: { type: "tool", name: "registrar_correccion_paper2_b" },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      await cancelarCuota();
      await reembolsarCreditos();
      if (!isAbortError(error)) console.error("Anthropic fetch error:", error);
      return jsonError(
        isAbortError(error)
          ? "La corrección tardó demasiado."
          : "No se pudo conectar con el servicio de IA.",
        isAbortError(error) ? 504 : 502,
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response) {
      await cancelarCuota();
      await reembolsarCreditos();
      return jsonError("Sin respuesta del servicio de IA.", 502);
    }

    console.log("evaluate-paper2-b completed", {
      model: EVALUATION_MODEL,
      status: response.status,
      ms: Date.now() - startedAt,
    });

    if (!response.ok) {
      await cancelarCuota();
      await reembolsarCreditos();
      if (response.status === 429) {
        return jsonError("Demasiadas solicitudes. Espera un momento.", 429);
      }
      if (response.status === 529) {
        return jsonError("Servicio de IA sobrecargado.", 529);
      }
      console.error(
        "Anthropic API error:",
        response.status,
        await response.text(),
      );
      return jsonError("Error del servicio de IA.", 500);
    }

    const data = (await response.json()) as AnthropicResponse;

    if (data.stop_reason === "max_tokens") {
      await cancelarCuota();
      await reembolsarCreditos();
      return jsonError(
        "La corrección quedó incompleta. Inténtalo de nuevo.",
        502,
      );
    }

    if (data.usage) {
      await adminClient.from("llm_uso").update({
        modelo: EVALUATION_MODEL,
        tokens_entrada: data.usage.input_tokens ?? 0,
        tokens_salida: data.usage.output_tokens ?? 0,
        cache_creation_tokens: data.usage.cache_creation_input_tokens ?? 0,
        cache_read_tokens: data.usage.cache_read_input_tokens ?? 0,
      }).eq("id", usoId);
    }

    const toolUseBlock = data.content?.find((b) => b.type === "tool_use");
    if (!isRecord(toolUseBlock?.input)) {
      await cancelarCuota();
      await reembolsarCreditos();
      return jsonError("La IA no devolvió una corrección válida.", 500);
    }

    const ev = toolUseBlock.input;
    const marks = Array.isArray(ev.items) ? ev.items.filter(isRecord) : [];
    const markById = new Map<
      string,
      { marca: string; puntos_obtenidos: number; comentario: string }
    >();
    for (const m of marks) {
      const id = typeof m.id === "string" ? m.id : "";
      if (!id) continue;
      const marca =
        m.marca === "acierto" || m.marca === "parcial" || m.marca === "fallo"
          ? m.marca
          : "fallo";
      const pts = typeof m.puntos_obtenidos === "number" &&
          Number.isFinite(m.puntos_obtenidos)
        ? Math.max(0, Math.round(m.puntos_obtenidos))
        : 0;
      markById.set(id, {
        marca,
        puntos_obtenidos: pts,
        comentario: typeof m.comentario === "string" ? m.comentario.trim() : "",
      });
    }

    const buildSectionResult = (
      items: ItemIn[],
      resp: Record<string, string>,
    ) => {
      let obtained = 0;
      let max = 0;
      const detail = items.map((it) => {
        max += it.puntos;
        const mk = markById.get(it.id);
        const marca = mk?.marca ?? "fallo";
        const pts = Math.max(0, Math.min(it.puntos, mk?.puntos_obtenidos ?? 0));
        obtained += pts;
        return {
          id: it.id,
          formato: it.formato,
          enunciado: it.enunciado,
          ...(it.opciones ? { opciones: it.opciones } : {}),
          puntos: it.puntos,
          respuesta: resp[it.id]?.trim() ?? "",
          marca,
          puntos_obtenidos: pts,
          comentario: mk?.comentario ?? "",
        };
      });
      return { obtained, max, detail };
    };

    const aud = buildSectionResult(itemsAuditiva, respAuditiva);
    const lec = buildSectionResult(itemsLectura, respLectura);

    const subtotal_auditiva = aud.max > 0
      ? Math.round((aud.obtained / aud.max) * SECTION_MAX.auditiva)
      : null;
    const subtotal_lectura = lec.max > 0
      ? Math.round((lec.obtained / lec.max) * SECTION_MAX.lectura)
      : null;
    const puntuacion_max = (aud.max > 0 ? SECTION_MAX.auditiva : 0) +
      (lec.max > 0 ? SECTION_MAX.lectura : 0);
    const total = (subtotal_auditiva ?? 0) + (subtotal_lectura ?? 0);
    const pct = puntuacion_max > 0 ? (total / puntuacion_max) * 100 : 0;
    const nota_ib = notaIBFromPorcentaje(pct);

    const feedbackText = {
      comentario_global: typeof ev.comentario_global === "string"
        ? ev.comentario_global.trim()
        : "",
      fortalezas: typeof ev.fortalezas === "string" ? ev.fortalezas.trim() : "",
      areas_mejora: typeof ev.areas_mejora === "string"
        ? ev.areas_mejora.trim()
        : "",
    };

    const feedbackFaltante = Object.entries(feedbackText)
      .filter(([, v]) => v.length < MIN_FEEDBACK_CHARS).map(([k]) => k);
    if (feedbackFaltante.length > 0) {
      await cancelarCuota();
      await reembolsarCreditos();
      return jsonError(
        "La IA no devolvió comentarios completos. Inténtalo de nuevo.",
        500,
      );
    }

    const evaluacion = {
      ...feedbackText,
      subtotal_auditiva,
      subtotal_lectura,
      puntuacion_total: total,
      puntuacion_max,
      nota_ib,
      items_auditiva: aud.detail,
      items_lectura: lec.detail,
    };

    let evaluacionId: string | null = null;
    const { data: insertada, error: insertErr } = await supabase
      .from("evaluaciones_paper2_b")
      .insert({
        user_id: userId,
        course_key: courseKey,
        nivel,
        texto_id: textoId,
        audio_id: audioId,
        texto_content: textoContent,
        theme,
        subtotal_auditiva,
        subtotal_lectura,
        puntuacion_max,
        items_auditiva: aud.detail,
        items_lectura: lec.detail,
        nota_ib,
        comentario_global: feedbackText.comentario_global,
        fortalezas: feedbackText.fortalezas,
        areas_mejora: feedbackText.areas_mejora,
        feedback_lang: uiLang,
      })
      .select("id").single();

    if (insertErr || !insertada) {
      console.error("Error guardando evaluación paper2 B:", insertErr);
      // Ya se cobraron créditos pero no hay resultado guardado: reembolsar.
      await adminClient.rpc("reembolsar_creditos", {
        p_user_id: userId,
        p_cantidad: CREDITOS_EVALUACION,
        p_concepto: "evaluate-paper2-b",
        p_metadata: { motivo: "error_persistencia" },
      });
      return jsonError(
        "La evaluación se generó, pero no se pudo guardar. Se han reembolsado tus créditos.",
        500,
      );
    }
    evaluacionId = insertada.id;

    const gamificacion = await procesarGamificacion(
      adminClient,
      userId,
      { tipo: "p2", puntuacion_total: total },
      courseKey,
    );
    Object.assign(evaluacion, { gamificacion });

    return new Response(
      JSON.stringify({ ...evaluacion, evaluacion_id: evaluacionId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("evaluate-paper2-b error:", e);
    return jsonError("Error interno del servidor.", 500);
  }
});

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
