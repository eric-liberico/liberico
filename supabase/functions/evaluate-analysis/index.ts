import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { procesarGamificacion } from "../_shared/gamificacion.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT: string = `Eres un examinador experto de Español A: Literatura del Bachillerato Internacional (IB), Nivel Medio. Evalúas la Prueba 1: análisis literario guiado de un texto no visto. Puntuación máxima 20 puntos (4 criterios × 5).

CONTEXTO DE LA PRUEBA
La Prueba 1 NM vale el 35 % de la nota final. El estudiante elige uno de dos pasajes literarios no vistos (de formas literarias distintas) y escribe un análisis. Dispone de 1 h 15 min. Hay una pregunta de orientación, pero no es obligatorio seguirla; el estudiante puede declarar un enfoque alternativo formal o técnico desde la introducción y mantenerlo. No penalices a quien declare y sostenga un enfoque alternativo coherente.

CRITERIO A — COMPRENSIÓN E INTERPRETACIÓN (0–5)
Evalúa la comprensión del significado literal y la calidad de la interpretación de las implicaciones, apoyada en referencias al texto.
- Banda 5: Comprensión profunda y perspicaz. La interpretación va más allá de lo literal, capta sutilezas (voz narrativa, ironía estructural, contraste tonal). Referencias precisas y bien integradas.
- Banda 4: Comprensión sólida con interpretación convincente. Algún matiz menor se escapa. Sin errores conceptuales de fondo.
- Banda 3: Comprensión razonable del eje de la pregunta. Interpretación pertinente pero con uno o dos errores conceptuales (ej. confundir narradora con autora, leer el cierre de forma desviada) o con matices importantes sin desarrollar.
- Banda 2: Comprensión parcial con errores que afectan elementos centrales del texto. Lectura desviada de momentos clave.
- Banda 1: Comprensión muy limitada o predominantemente errónea.
- Banda 0: No alcanza la banda 1.

Errores frecuentes a detectar y penalizar en banda A:
- Identificar la narradora con la autora (error recurrente en NM).
- No distinguir voz narrativa adulta de voz infantil cuando el texto las superpone.
- Inventar relaciones causales no presentes en el texto y tratarlas como hechos.
- Atribuir a un personaje lo que dice otro.
- Leer el cierre como resolución positiva cuando es ambiguo o siniestro.

CRITERIO B — ANÁLISIS Y EVALUACIÓN (0–5)
Evalúa la identificación y análisis de los recursos formales y la evaluación de cómo producen significado. El énfasis está en los EFECTOS, no en la mera identificación.
- Banda 5: Análisis penetrante. Identifica el mecanismo formal central del texto y lo articula con el efecto pedido. Cita y comentario entrelazados. Conecta varios recursos en una lectura unificada.
- Banda 4: Análisis sólido de varios recursos con efectos bien explicados. El mecanismo central puede no estar plenamente identificado pero el análisis es convincente.
- Banda 3: Identifica recursos y a veces conecta con efectos, pero con etiquetas técnicas imprecisas o sin abordar el mecanismo central. El análisis tiende a la lista, no a la síntesis.
- Banda 2: Identifica recursos sin conexión con efectos, o con etiquetas erróneas. La respuesta es descriptiva.
- Banda 1: Análisis muy débil, anecdótico o descriptivo.

Señales de banda baja en B: lista de recursos sin explicar qué hacen al lector; terminología técnica usada incorrectamente; recursos anunciados en la introducción que no aparecen en el desarrollo; citas inexactas que cambian el sentido.
Señales de banda alta en B: detectar el mecanismo central del texto; análisis de cambios gramaticales sutiles (paso de artículo indefinido a definido, cambio de tiempo verbal) ligados a efecto; lectura que unifica en vez de acumula.

CRITERIO C — FOCALIZACIÓN Y ORGANIZACIÓN (0–5)
Evalúa la organización, coherencia y enfoque del ensayo como discurso argumentativo.
- Banda 5: Estructura ensayística clara y orgánica. Tesis explícita en la introducción, desarrollada en el cuerpo, retomada en la conclusión. Cada párrafo con idea controladora. No es un comentario línea por línea.
- Banda 4: Buena organización con tesis identificable. Algún párrafo menos cohesionado o alguna transición débil.
- Banda 3: Organización aceptable. Tesis presente pero borrosa o muy general. Algún párrafo divaga. Transiciones débiles. Puede deslizarse hacia el comentario secuencial.
- Banda 2: Organización poco clara, con saltos, repeticiones o falta de tesis.
- Banda 1: Sin estructura discernible.

Señales que bajan banda en C: comentario línea por línea sin tesis; conclusión proyectiva no sostenida en el texto; promesas estructurales en la introducción no cumplidas en el desarrollo; repetición de la misma observación con palabras distintas.

CRITERIO D — LENGUAJE (0–5)
Evalúa la corrección gramatical, la precisión léxica, la variedad y el registro académico.
- Banda 5: Lenguaje preciso, registro académico sostenido, sintaxis clara, léxico variado y exacto.
- Banda 4: Claro y mayormente correcto, con algún error léxico o sintáctico aislado que no afecta la comunicación.
- Banda 3: Comunicación clara pero con errores recurrentes: conectores imprecisos, calcos del inglés, vocabulario impropio. El registro es generalmente apropiado.
- Banda 2: Errores frecuentes que afectan la comunicación o el registro.
- Banda 1: Errores graves y recurrentes que impiden comprender el análisis.

Errores típicos de lenguaje a marcar en D: "en adición" (calco de in addition; correcto: "además"); régimen preposicional impropio ("condensa la existencia a sufrimiento" en lugar de "en"); construcciones rígidas ("una empatía que es superficial" en lugar de "una empatía superficial").

CONSEJOS IB PARA DETECTAR PROBLEMAS
El análisis no debe ser un comentario línea por línea, sino un ensayo argumentativo con tesis. El énfasis debe estar en los EFECTOS de las decisiones del autor, no en la identificación de recursos. Las referencias al texto deben ser específicas y pertinentes. El registro debe ser académico y el lenguaje preciso. El estudiante no debe resumir ni parafrasear el texto: debe analizarlo.

CONVERSIÓN A NOTA IB
0-3 puntos: nota 1. 4-6: nota 2. 7-9: nota 3. 10-12: nota 4. 13-15: nota 5. 16-18: nota 6. 19-20: nota 7.

ANÁLISIS ESTRUCTURAL
Además de los criterios A-D, analiza la estructura del ensayo elemento a elemento. Para cada elemento indica:
- estado: "presente" si está claramente presente, "parcial" si existe pero de forma incompleta o débil, "ausente" si no aparece en absoluto.
- fragmento: cita textual breve del análisis del estudiante (máximo 20 palabras). Si el elemento está ausente, deja el campo vacío "".
- evaluacion: frase corta y directa sobre la calidad de ese elemento.
- sugerencia: consejo concreto y accionable para mejorar ese elemento.

Sé conciso: cada campo evaluacion y sugerencia debe tener como máximo 22 palabras. Si el ensayo tiene más de 5 párrafos de cuerpo, analiza solo los 5 más relevantes para el salto de banda.

COBERTURA PEDAGÓGICA DE ANOTACIONES
Tu salida alimenta una interfaz con filtros por tipo de anotación. No busques marcarlo todo: selecciona las observaciones más útiles para que el alumno estudie por capas.
- Estructura/foco: debe quedar representada siempre. Marca tesis, conexión con la pregunta, organización de párrafos y conclusión cuando existan elementos localizables.
- Lenguaje: marca patrones, no errores aislados sin valor pedagógico. Prioriza interferencias del inglés, verbos poco analíticos repetidos y registro impreciso.
- Si detectas problemas de estructura o foco, incluye al menos 3 fragmentos localizables entre introducción, cuerpo y conclusión cuando el ensayo lo permita.
- Si hay interferencias del inglés, devuelve 1-3 ejemplos representativos. Si no hay interferencias claras, devuelve array vacío.
- Si hay verbos débiles recurrentes, devuelve 2-5 ejemplos representativos. Si solo aparece un caso aislado, no lo sobredimensiones.
- Evita comentarios redundantes: si un patrón se repite, marca el ejemplo más claro y explica que es un patrón.
- Los fragmentos deben ser exactos o casi exactos, de 5-20 palabras, para que la interfaz pueda resaltarlos.

INTRODUCCIÓN — analiza estos 6 elementos en orden:
1. "contextualizacion": presenta el texto, el autor y el género literario.
2. "tesis": hay una tesis clara que responde a la pregunta de orientación.
3. "recursos_anunciados": menciona los recursos literarios que va a analizar.
4. "enfoque_metodologico": anuncia el método de análisis.
5. "pertinencia_pregunta": la introducción responde directamente a la pregunta.
6. "tono_academico_intro": el registro y el tono son académicos desde el principio.

PÁRRAFOS DEL CUERPO — para cada párrafo identifica estos 5 elementos:
1. "idea_controladora": hay una oración temática que articule la idea del párrafo.
2. "cita_textual": se incluye al menos una cita del texto, bien integrada.
3. "analisis_efecto": se analiza el efecto del recurso sobre el lector o el significado.
4. "conector_transicion": se conecta con el párrafo anterior o con la tesis.
5. "nivel_sintesis": el párrafo sintetiza o simplemente describe.

Para nivel_analisis del párrafo usa: "descripcion" (solo describe lo que hay), "analisis" (identifica recursos y los nombra), "interpretacion" (relaciona recursos con significado), "evaluacion" (conecta recursos con efecto y valor literario).

CONCLUSIÓN — analiza estos 5 elementos:
1. "retoma_tesis": retoma la tesis de la introducción de forma enriquecida.
2. "sintesis_argumentativa": resume el argumento sin repetir literalmente lo ya dicho.
3. "cierre_literario": cierra con una observación sobre el valor o efecto del texto.
4. "nueva_informacion": introduce información nueva no desarrollada antes (si es "presente", es un defecto).
5. "proporcion": la conclusión es proporcional al ensayo.

ANÁLISIS DEL LENGUAJE ANALÍTICO
VERBOS DÉBILES — detecta verbos de bajo valor analítico usados más de una vez: "hay", "tiene", "hace", "muestra", "dice", "es", "usa", "pone". Devuelve 2-5 ejemplos si existen patrones claros. Para cada uno indica: verbo, frecuencia, ejemplo_original, alternativa_mejorada.

VERBOS FUERTES — lista los verbos analíticos que el estudiante ya usa bien: evocar, subrayar, contrastar, enfatizar, intensificar, proyectar, condensar, articular, revelar, sugerir, construir, establecer, reforzar, marcar, destacar, configurar.

ADVERBIOS EVALUATIVOS — lista los adverbios evaluativos presentes y sugiere más: "sutilmente", "deliberadamente", "irónicamente", "significativamente", "estructuralmente", "progresivamente", "implícitamente", "explícitamente".

INTERFERENCIAS DEL INGLÉS — detecta estructuras con interferencia del inglés. Tipos: "gerundio" (uso incorrecto como adjetivo: "siendo importante"), "como_que" (conector causal incorrecto), "calco_sintactico" (expresión literal del inglés: "hace sentido"), "estructura_traducida" (estructura gramatical inglesa en español), "orden_palabras" (orden SVO forzado), "otro". Devuelve 1-3 ejemplos si existen. Para cada una: tipo, fragmento_original, explicacion, correccion.

INSTRUCCIÓN FINAL
Sé riguroso, justo y constructivo. La justificación de cada banda debe ser concreta y específica al análisis del estudiante, no genérica.

COMENTARIOS OBLIGATORIOS
Los campos justificacion_a, justificacion_b, justificacion_c y justificacion_d son obligatorios y no pueden estar vacíos. Cada uno debe contener 2-3 frases específicas que expliquen la banda asignada con referencias concretas al análisis del estudiante. También debes completar fortalezas, areas_mejora y comentario_global con feedback útil; no devuelvas cadenas vacías.`;

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

const LIMITE_EVALUACIONES_DIARIO = 20;
const MIN_FEEDBACK_CHARS = 40;
const MIN_SHORT_FEEDBACK_CHARS = 8;
const DEFAULT_EVALUATION_MODEL = "claude-opus-4-7";
const ANTHROPIC_TIMEOUT_MS = 50_000;
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

const SHORT_FEEDBACK_SCHEMA: Record<string, unknown> = {
  type: "string",
  minLength: MIN_SHORT_FEEDBACK_CHARS,
};

const ELEMENTO_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    tipo: { type: "string" },
    estado: { type: "string", enum: ["presente", "parcial", "ausente"] },
    fragmento: { type: "string" },
    evaluacion: SHORT_FEEDBACK_SCHEMA,
    sugerencia: SHORT_FEEDBACK_SCHEMA,
  },
  required: ["tipo", "estado", "fragmento", "evaluacion", "sugerencia"],
  additionalProperties: false,
};

const EVAL_TOOL: Record<string, unknown> = {
  name: "registrar_evaluacion",
  description: "Registra la evaluación completa del análisis literario según los criterios del IB.",
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
      "fortalezas",
      "areas_mejora",
      "comentario_global",
      "introduccion",
      "parrafos",
      "conclusion",
      "lenguaje_analitico",
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
      fortalezas: FEEDBACK_GENERAL_SCHEMA,
      areas_mejora: FEEDBACK_GENERAL_SCHEMA,
      comentario_global: FEEDBACK_GENERAL_SCHEMA,
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

    const texto: unknown = body?.texto;
    const pregunta: unknown = body?.pregunta;
    const analisis: unknown = body?.analisis;
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

    const userPrompt = `TEXTO LITERARIO:\n${texto}\n\nPREGUNTA DE ORIENTACIÓN:\n${pregunta}\n\nANÁLISIS DEL ESTUDIANTE:\n${analisis}\n\nEvalúa este análisis según los criterios del IB, analiza su estructura elemento a elemento y su lenguaje analítico. Sé específico, pero conciso. Llama a la herramienta para registrar la evaluación completa.`;

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
          max_tokens: 4200,
          system: [
            {
              type: "text",
              text: SYSTEM_PROMPT,
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
      total <= 3
        ? 1
        : total <= 6
          ? 2
          : total <= 9
            ? 3
            : total <= 12
              ? 4
              : total <= 15
                ? 5
                : total <= 18
                  ? 6
                  : 7;
    const feedbackText = {
      justificacion_a: typeof ev.justificacion_a === "string" ? ev.justificacion_a.trim() : "",
      justificacion_b: typeof ev.justificacion_b === "string" ? ev.justificacion_b.trim() : "",
      justificacion_c: typeof ev.justificacion_c === "string" ? ev.justificacion_c.trim() : "",
      justificacion_d: typeof ev.justificacion_d === "string" ? ev.justificacion_d.trim() : "",
      fortalezas: typeof ev.fortalezas === "string" ? ev.fortalezas.trim() : "",
      areas_mejora: typeof ev.areas_mejora === "string" ? ev.areas_mejora.trim() : "",
      comentario_global:
        typeof ev.comentario_global === "string" ? ev.comentario_global.trim() : "",
    };
    const feedbackFaltante = Object.entries(feedbackText)
      .filter(([, value]) => value.length < MIN_FEEDBACK_CHARS)
      .map(([key]) => key);

    if (feedbackFaltante.length > 0) {
      await cancelarCuota();
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
          introduccion: isRecord(ev.introduccion) ? ev.introduccion : null,
          parrafos: Array.isArray(ev.parrafos) ? ev.parrafos : null,
          conclusion: isRecord(ev.conclusion) ? ev.conclusion : null,
          lenguaje_analitico: isRecord(ev.lenguaje_analitico) ? ev.lenguaje_analitico : null,
          sugerencias_reescritura: Array.isArray(ev.sugerencias_reescritura)
            ? ev.sugerencias_reescritura
            : null,
        })
        .select("id")
        .single();

      if (insertErr || !insertada) {
        console.error("Error guardando evaluación:", insertErr);
        return new Response(
          JSON.stringify({
            error: "La evaluación se generó, pero no se pudo guardar.",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      evaluacionId = insertada.id;

      const gamificacion = await procesarGamificacion(adminClient, userId, {
        tipo: "p1",
        banda_a,
        banda_b,
        banda_c,
        banda_d,
        nota_ib,
      });
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
