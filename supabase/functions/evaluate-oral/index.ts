import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT: string = `Eres un examinador experto de Español A: Literatura del Bachillerato Internacional. Evalúas el Trabajo Oral Individual.

La tarea consiste en explorar cómo un asunto global elegido por el estudiante se presenta mediante contenido y forma en dos extractos y en las obras de las que proceden.

Para Language A: Literature, el alumno debe trabajar con una obra escrita originalmente en la lengua estudiada y una obra estudiada en traducción. No invalides automáticamente una respuesta si el alumno no especifica bien esta información, pero sí señala cómo afecta al cumplimiento de la tarea si procede.

MODALIDADES

Si tipo_oral = "taught":
Evalúa como oral individual estándar: 10 minutos de exposición preparada seguidos de 5 minutos de preguntas del profesor. Genera preguntas probables del profesor. Valora si la exposición está organizada para llegar a una conclusión natural cerca de los 10 minutos.

Si tipo_oral = "self_taught":
Evalúa como variante school-supported self-taught: 15 minutos de exposición continua del alumno, sin preguntas del profesor. No generes bloque de preguntas del profesor. En su lugar, identifica zonas que el alumno debería desarrollar dentro de la exposición, porque no tendrá 5 minutos posteriores de preguntas para aclarar o ampliar ideas.

NO CONFUNDIR CON OTRAS PRUEBAS

Este oral no es Prueba 2 hablada. No se trata de comparar dos obras en abstracto.
No es un comentario línea por línea.
No es una charla general sobre el asunto global.
No es un resumen de dos obras.
La clave es explicar cómo el asunto global se presenta mediante decisiones de contenido y forma en los extractos y en las obras completas.

CRITERIOS

Evalúa sobre 40 puntos:

Criterio A — Conocimiento, comprensión e interpretación, 0-10.
Valora si el alumno demuestra conocimiento de los extractos y de las obras completas, y si usa ese conocimiento para interpretar cómo se presenta el asunto global. Las referencias deben apoyar ideas sobre el asunto global. Para superar la mitad de la escala debe haber interpretación, no solo descripción o resumen.

Criterio B — Análisis y evaluación, 0-10.
Valora si el alumno analiza decisiones autorales que construyen significado: voz, estructura, forma, género, símbolos, motivos, tono, focalización, caracterización, diálogo, espacio, tiempo, imágenes, ritmo, escena u otros recursos pertinentes. Para superar la mitad de la escala debe haber evaluación de cómo esas decisiones presentan el asunto global.

Criterio C — Foco y organización, 0-10.
Valora estructura, equilibrio, foco y cohesión. El asunto global debe funcionar como columna vertebral. El oral debe equilibrar extracto 1, obra 1, extracto 2 y obra 2. En modalidad taught, valora si la exposición cabe en aproximadamente 10 minutos. En modalidad self_taught, valora si la exposición se sostiene durante 15 minutos sin depender de preguntas externas.

Criterio D — Lenguaje, 0-10.
Valora claridad, precisión, corrección, registro oral académico, variedad léxica y sintáctica, naturalidad y estilo. Penaliza lenguaje mecánico, memorizado, rígido o poco comunicativo cuando afecte a la eficacia oral.

DIAGNÓSTICOS

Devuelve diagnóstico del asunto global:
- definicion: si el asunto global está claramente formulado.
- especificidad: si no es demasiado amplio ni genérico.
- uso_como_lente: si organiza todo el oral como eje articulador.

Devuelve diagnóstico de equilibrio:
- extracto_1
- obra_1
- extracto_2
- obra_2

Devuelve diagnóstico de estructura:
- apertura
- progresion
- transiciones
- cierre

Para cada elemento usa:
- estado: "presente", "parcial" o "ausente".
- fragmento: cita breve del guion del alumno, máximo 20 palabras; si está ausente, "".
- evaluacion: frase breve y concreta.
- sugerencia: acción concreta para mejorar.

SI tipo_oral = "taught":
Devuelve 5-8 preguntas probables del profesor. Cada pregunta debe profundizar en una laguna del oral o ayudar a ampliar análisis, conocimiento de obra o asunto global. No deben ser genéricas.
Para cada pregunta devuelve:
- pregunta
- proposito
- como_responder

SI tipo_oral = "self_taught":
No devuelvas preguntas_profesor.
Devuelve 4-6 zonas_desarrollo_self_taught. Cada zona indica qué parte debe desarrollar el alumno dentro de sus 15 minutos.
Para cada zona devuelve:
- zona
- problema
- sugerencia

INTEGRIDAD ACADÉMICA

No escribas un oral completo listo para memorizar.
No transformes el guion entero en una versión final.
Puedes sugerir mejoras, reorganización y micro-reescrituras breves, pero el alumno debe seguir construyendo su propia respuesta.

REGLA CONTRA INVENCIÓN

No inventes detalles de las obras. Evalúa principalmente lo que el alumno demuestra en el guion, extractos y notas. Si falta evidencia, penaliza la falta de conocimiento demostrado en lugar de rellenar huecos.`;

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

const LIMITE_ORAL_DIARIO = 5;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const ESTADO_ELEMENTO_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["estado", "fragmento", "evaluacion", "sugerencia"],
  properties: {
    estado: { type: "string", enum: ["presente", "parcial", "ausente"] },
    fragmento: { type: "string" },
    evaluacion: { type: "string" },
    sugerencia: { type: "string" },
  },
};

const PREGUNTA_PROFESOR_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["pregunta", "proposito", "como_responder"],
  properties: {
    pregunta: { type: "string" },
    proposito: { type: "string" },
    como_responder: { type: "string" },
  },
};

const ZONA_DESARROLLO_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["zona", "problema", "sugerencia"],
  properties: {
    zona: { type: "string" },
    problema: { type: "string" },
    sugerencia: { type: "string" },
  },
};

const EVAL_TOOL_ORAL: Record<string, unknown> = {
  name: "registrar_evaluacion_oral",
  description:
    "Registra la evaluación completa del Trabajo Oral Individual según los criterios del IB.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "criterio_a",
      "criterio_b",
      "criterio_c",
      "criterio_d",
      "justificacion_a",
      "justificacion_b",
      "justificacion_c",
      "justificacion_d",
      "fortalezas",
      "areas_mejora",
      "comentario_global",
      "diagnostico_asunto_global",
      "diagnostico_equilibrio",
      "diagnostico_estructura",
    ],
    properties: {
      criterio_a: { type: "integer", minimum: 0, maximum: 10 },
      criterio_b: { type: "integer", minimum: 0, maximum: 10 },
      criterio_c: { type: "integer", minimum: 0, maximum: 10 },
      criterio_d: { type: "integer", minimum: 0, maximum: 10 },
      justificacion_a: { type: "string" },
      justificacion_b: { type: "string" },
      justificacion_c: { type: "string" },
      justificacion_d: { type: "string" },
      fortalezas: { type: "string" },
      areas_mejora: { type: "string" },
      comentario_global: { type: "string" },
      diagnostico_asunto_global: {
        type: "object",
        additionalProperties: false,
        required: ["definicion", "especificidad", "uso_como_lente"],
        properties: {
          definicion: ESTADO_ELEMENTO_SCHEMA,
          especificidad: ESTADO_ELEMENTO_SCHEMA,
          uso_como_lente: ESTADO_ELEMENTO_SCHEMA,
        },
      },
      diagnostico_equilibrio: {
        type: "object",
        additionalProperties: false,
        required: ["extracto_1", "obra_1", "extracto_2", "obra_2"],
        properties: {
          extracto_1: ESTADO_ELEMENTO_SCHEMA,
          obra_1: ESTADO_ELEMENTO_SCHEMA,
          extracto_2: ESTADO_ELEMENTO_SCHEMA,
          obra_2: ESTADO_ELEMENTO_SCHEMA,
        },
      },
      diagnostico_estructura: {
        type: "object",
        additionalProperties: false,
        required: ["apertura", "progresion", "transiciones", "cierre"],
        properties: {
          apertura: ESTADO_ELEMENTO_SCHEMA,
          progresion: ESTADO_ELEMENTO_SCHEMA,
          transiciones: ESTADO_ELEMENTO_SCHEMA,
          cierre: ESTADO_ELEMENTO_SCHEMA,
        },
      },
      preguntas_profesor: {
        type: "array",
        items: PREGUNTA_PROFESOR_SCHEMA,
        minItems: 5,
        maxItems: 8,
      },
      zonas_desarrollo_self_taught: {
        type: "array",
        items: ZONA_DESARROLLO_SCHEMA,
        minItems: 4,
        maxItems: 6,
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

    const tipoOral = body.tipo_oral;
    const asuntoGlobal = body.asunto_global;
    const obra1Titulo = body.obra_1_titulo;
    const obra1Autor = body.obra_1_autor;
    const obra1Tipo = body.obra_1_tipo;
    const extracto1 = body.extracto_1;
    const notasObra1 = body.notas_obra_1;
    const obra2Titulo = body.obra_2_titulo;
    const obra2Autor = body.obra_2_autor;
    const obra2Tipo = body.obra_2_tipo;
    const extracto2 = body.extracto_2;
    const notasObra2 = body.notas_obra_2;
    const guionOral = body.guion_oral;

    if (!tipoOral || !asuntoGlobal || !obra1Titulo || !obra2Titulo || !guionOral) {
      return new Response(
        JSON.stringify({
          error: "Faltan campos obligatorios: tipo_oral, asunto_global, obras y guion_oral.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (
      typeof tipoOral !== "string" ||
      typeof asuntoGlobal !== "string" ||
      typeof obra1Titulo !== "string" ||
      typeof obra2Titulo !== "string" ||
      typeof guionOral !== "string"
    ) {
      return new Response(JSON.stringify({ error: "Campos inválidos." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["taught", "self_taught"].includes(tipoOral)) {
      return new Response(
        JSON.stringify({ error: "tipo_oral debe ser 'taught' o 'self_taught'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (asuntoGlobal.length > 500) {
      return new Response(
        JSON.stringify({ error: "El asunto global supera los 500 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (obra1Titulo.length > 300 || obra2Titulo.length > 300) {
      return new Response(
        JSON.stringify({ error: "El título de obra supera los 300 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (typeof obra1Autor === "string" && obra1Autor.length > 300) {
      return new Response(
        JSON.stringify({ error: "El autor de la obra 1 supera los 300 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (typeof obra2Autor === "string" && obra2Autor.length > 300) {
      return new Response(
        JSON.stringify({ error: "El autor de la obra 2 supera los 300 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (typeof extracto1 === "string" && extracto1.length > 5000) {
      return new Response(
        JSON.stringify({ error: "El extracto 1 supera los 5000 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (typeof extracto2 === "string" && extracto2.length > 5000) {
      return new Response(
        JSON.stringify({ error: "El extracto 2 supera los 5000 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (typeof notasObra1 === "string" && notasObra1.length > 8000) {
      return new Response(
        JSON.stringify({ error: "Las notas de la obra 1 superan los 8000 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (typeof notasObra2 === "string" && notasObra2.length > 8000) {
      return new Response(
        JSON.stringify({ error: "Las notas de la obra 2 superan los 8000 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (guionOral.length > 30000) {
      return new Response(
        JSON.stringify({ error: "El guion supera los 30000 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY no configurada." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: reserva, error: reservaErr } = await adminClient.rpc("reservar_cuota_oral", {
      p_user_id: userId,
      p_limite: LIMITE_ORAL_DIARIO,
    });
    if (reservaErr) {
      console.error("Error reservando cuota oral:", reservaErr);
      return new Response(JSON.stringify({ error: "No se pudo verificar el límite de uso." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (reserva === null) {
      return new Response(
        JSON.stringify({
          error:
            "Has alcanzado el límite diario de evaluaciones del Oral Individual. Vuelve mañana.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const usoId = reserva as string;

    const cancelarCuota = async () => {
      await adminClient.from("llm_uso").delete().eq("id", usoId);
    };

    // Calcular duración estimada en servidor (135 palabras/minuto)
    const palabrasGuion = guionOral.trim().split(/\s+/).filter(Boolean).length;
    const duracionEstimadaMinutos = Math.round((palabrasGuion / 135) * 10) / 10;

    const obra1Label = `${obra1Titulo}${typeof obra1Autor === "string" && obra1Autor.trim() ? ` — ${obra1Autor.trim()}` : ""}`;
    const obra2Label = `${obra2Titulo}${typeof obra2Autor === "string" && obra2Autor.trim() ? ` — ${obra2Autor.trim()}` : ""}`;

    const tipoObraLabel = (tipo: unknown) => {
      if (tipo === "original_espanol") return "escrita originalmente en español";
      if (tipo === "traducida") return "estudiada en traducción";
      return "tipo de obra no especificado";
    };

    const extractosSeccion =
      (typeof extracto1 === "string" && extracto1.trim()
        ? `\nEXTRACTO 1:\n${extracto1.trim()}`
        : "") +
      (typeof extracto2 === "string" && extracto2.trim()
        ? `\nEXTRACTO 2:\n${extracto2.trim()}`
        : "");

    const notasSeccion =
      (typeof notasObra1 === "string" && notasObra1.trim()
        ? `\nNOTAS SOBRE OBRA 1:\n${notasObra1.trim()}`
        : "") +
      (typeof notasObra2 === "string" && notasObra2.trim()
        ? `\nNOTAS SOBRE OBRA 2:\n${notasObra2.trim()}`
        : "");

    const userPrompt = `MODALIDAD: ${tipoOral === "taught" ? "Alumno con profesor (10 min exposición + 5 min preguntas)" : "Self-taught / SSST (15 min exposición continua, sin preguntas del profesor)"}

ASUNTO GLOBAL: ${asuntoGlobal}

OBRA 1: ${obra1Label} (${tipoObraLabel(obra1Tipo)})
OBRA 2: ${obra2Label} (${tipoObraLabel(obra2Tipo)})

DURACIÓN ESTIMADA: ${duracionEstimadaMinutos} minutos (calculada a 135 palabras/minuto en español oral académico)
${extractosSeccion}${notasSeccion}

GUION / TRANSCRIPCIÓN DEL ORAL:
${guionOral}

Evalúa este Trabajo Oral Individual según los criterios del IB. Sé específico y concreto en cada justificación. Llama a la herramienta para registrar la evaluación completa.`;

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
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userPrompt }],
        tools: [EVAL_TOOL_ORAL],
        tool_choice: { type: "tool", name: "registrar_evaluacion_oral" },
      }),
    });

    if (!response.ok) {
      await cancelarCuota();
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 529) {
        return new Response(
          JSON.stringify({ error: "El servicio de IA está sobrecargado. Inténtalo de nuevo." }),
          { status: 529, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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

    if (data.usage) {
      const { error: usoErr } = await adminClient
        .from("llm_uso")
        .update({
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
      console.error("No tool_use block:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "La IA no devolvió una evaluación válida." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ev = toolUseBlock.input;
    const clampOral = (v: unknown): number =>
      typeof v === "number" && isFinite(v) ? Math.max(0, Math.min(10, Math.round(v))) : 0;

    const criterio_a = clampOral(ev.criterio_a);
    const criterio_b = clampOral(ev.criterio_b);
    const criterio_c = clampOral(ev.criterio_c);
    const criterio_d = clampOral(ev.criterio_d);
    const puntuacion_total = criterio_a + criterio_b + criterio_c + criterio_d;

    const str = (v: unknown) => (typeof v === "string" ? v : "");

    const { data: insertada, error: insertErr } = await supabase
      .from("evaluaciones_oral")
      .insert({
        user_id: userId,
        tipo_oral: tipoOral,
        asunto_global: asuntoGlobal.trim(),
        obra_1_titulo: obra1Titulo.trim(),
        obra_1_autor: typeof obra1Autor === "string" && obra1Autor.trim() ? obra1Autor.trim() : null,
        obra_1_tipo:
          typeof obra1Tipo === "string" &&
          ["original_espanol", "traducida", "no_especificado"].includes(obra1Tipo)
            ? obra1Tipo
            : "no_especificado",
        extracto_1: typeof extracto1 === "string" && extracto1.trim() ? extracto1.trim() : null,
        notas_obra_1:
          typeof notasObra1 === "string" && notasObra1.trim() ? notasObra1.trim() : null,
        obra_2_titulo: obra2Titulo.trim(),
        obra_2_autor: typeof obra2Autor === "string" && obra2Autor.trim() ? obra2Autor.trim() : null,
        obra_2_tipo:
          typeof obra2Tipo === "string" &&
          ["original_espanol", "traducida", "no_especificado"].includes(obra2Tipo)
            ? obra2Tipo
            : "no_especificado",
        extracto_2: typeof extracto2 === "string" && extracto2.trim() ? extracto2.trim() : null,
        notas_obra_2:
          typeof notasObra2 === "string" && notasObra2.trim() ? notasObra2.trim() : null,
        guion_oral: guionOral,
        criterio_a,
        criterio_b,
        criterio_c,
        criterio_d,
        duracion_estimada_minutos: duracionEstimadaMinutos,
        justificacion_a: str(ev.justificacion_a),
        justificacion_b: str(ev.justificacion_b),
        justificacion_c: str(ev.justificacion_c),
        justificacion_d: str(ev.justificacion_d),
        fortalezas: str(ev.fortalezas),
        areas_mejora: str(ev.areas_mejora),
        comentario_global: str(ev.comentario_global),
        diagnostico_asunto_global: isRecord(ev.diagnostico_asunto_global)
          ? ev.diagnostico_asunto_global
          : null,
        diagnostico_equilibrio: isRecord(ev.diagnostico_equilibrio)
          ? ev.diagnostico_equilibrio
          : null,
        diagnostico_estructura: isRecord(ev.diagnostico_estructura)
          ? ev.diagnostico_estructura
          : null,
        preguntas_profesor: Array.isArray(ev.preguntas_profesor) ? ev.preguntas_profesor : null,
        zonas_desarrollo_self_taught: Array.isArray(ev.zonas_desarrollo_self_taught)
          ? ev.zonas_desarrollo_self_taught
          : null,
      })
      .select("id")
      .single();

    if (insertErr || !insertada) {
      console.error("Error guardando evaluación oral:", insertErr);
      return new Response(
        JSON.stringify({ error: "La evaluación se generó, pero no se pudo guardar." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        evaluacion_id: insertada.id,
        tipo_oral: tipoOral,
        criterio_a,
        criterio_b,
        criterio_c,
        criterio_d,
        puntuacion_total,
        duracion_estimada_minutos: duracionEstimadaMinutos,
        justificacion_a: str(ev.justificacion_a),
        justificacion_b: str(ev.justificacion_b),
        justificacion_c: str(ev.justificacion_c),
        justificacion_d: str(ev.justificacion_d),
        fortalezas: str(ev.fortalezas),
        areas_mejora: str(ev.areas_mejora),
        comentario_global: str(ev.comentario_global),
        diagnostico_asunto_global: isRecord(ev.diagnostico_asunto_global)
          ? ev.diagnostico_asunto_global
          : null,
        diagnostico_equilibrio: isRecord(ev.diagnostico_equilibrio)
          ? ev.diagnostico_equilibrio
          : null,
        diagnostico_estructura: isRecord(ev.diagnostico_estructura)
          ? ev.diagnostico_estructura
          : null,
        preguntas_profesor: Array.isArray(ev.preguntas_profesor) ? ev.preguntas_profesor : [],
        zonas_desarrollo_self_taught: Array.isArray(ev.zonas_desarrollo_self_taught)
          ? ev.zonas_desarrollo_self_taught
          : [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("evaluate-oral error:", e);
    return new Response(JSON.stringify({ error: "Error interno del servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
