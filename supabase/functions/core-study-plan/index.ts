import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { parseCourseKey } from "../_shared/courses.ts";

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

type TareaPlanGenerada = {
  semana: number;
  titulo: string;
  descripcion: string;
  tipo: "lectura" | "ejercicio" | "analisis_practica" | "repaso_teoria";
  criterio_objetivo: "A" | "B" | "C" | "D" | "global";
  duracion_estimada_min: number;
};

type PlanGenerado = {
  resumen_diagnostico: string;
  enfoque_principal: string;
  semanas_totales: number;
  tareas: TareaPlanGenerada[];
};

const LIMITE_PLANES_DIARIO = 5;
const TIPOS_TAREA = new Set(["lectura", "ejercicio", "analisis_practica", "repaso_teoria"]);
const CRITERIOS_OBJETIVO = new Set(["A", "B", "C", "D", "global"]);

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPositiveInteger(value: unknown, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= max;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function validarPlanGenerado(input: unknown): PlanGenerado | null {
  if (!isRecord(input)) return null;
  const tareasInput = input.tareas;

  if (
    typeof input.resumen_diagnostico !== "string" ||
    input.resumen_diagnostico.trim().length === 0 ||
    typeof input.enfoque_principal !== "string" ||
    input.enfoque_principal.trim().length === 0 ||
    !isPositiveInteger(input.semanas_totales, 104) ||
    !Array.isArray(tareasInput) ||
    tareasInput.length === 0 ||
    tareasInput.length > 400
  ) {
    return null;
  }

  const tareas: TareaPlanGenerada[] = [];
  for (const tarea of tareasInput) {
    if (!isRecord(tarea)) return null;
    if (
      !isPositiveInteger(tarea.semana, input.semanas_totales) ||
      typeof tarea.titulo !== "string" ||
      tarea.titulo.trim().length === 0 ||
      typeof tarea.descripcion !== "string" ||
      tarea.descripcion.trim().length === 0 ||
      typeof tarea.tipo !== "string" ||
      !TIPOS_TAREA.has(tarea.tipo) ||
      typeof tarea.criterio_objetivo !== "string" ||
      !CRITERIOS_OBJETIVO.has(tarea.criterio_objetivo) ||
      !isPositiveInteger(tarea.duracion_estimada_min, 600)
    ) {
      return null;
    }

    tareas.push({
      semana: tarea.semana,
      titulo: tarea.titulo.trim(),
      descripcion: tarea.descripcion.trim(),
      tipo: tarea.tipo as TareaPlanGenerada["tipo"],
      criterio_objetivo: tarea.criterio_objetivo as TareaPlanGenerada["criterio_objetivo"],
      duracion_estimada_min: tarea.duracion_estimada_min,
    });
  }

  return {
    resumen_diagnostico: input.resumen_diagnostico.trim(),
    enfoque_principal: input.enfoque_principal.trim(),
    semanas_totales: input.semanas_totales,
    tareas,
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
      message: "Has alcanzado el límite diario de generación de planes. Vuelve mañana.",
    };
  }

  return { ok: true };
}

const PLAN_TOOL = {
  name: "registrar_plan_estudio",
  description: "Registra el plan de estudio personalizado para un estudiante de IB Literatura.",
  input_schema: {
    type: "object",
    properties: {
      resumen_diagnostico: {
        type: "string",
        description: "3-4 frases describiendo el punto de partida del estudiante.",
      },
      enfoque_principal: {
        type: "string",
        description: "Una frase: el criterio o aspecto donde más se va a incidir.",
      },
      semanas_totales: { type: "integer" },
      tareas: {
        type: "array",
        items: {
          type: "object",
          properties: {
            semana: { type: "integer" },
            titulo: { type: "string" },
            descripcion: { type: "string" },
            tipo: {
              type: "string",
              enum: ["lectura", "ejercicio", "analisis_practica", "repaso_teoria"],
            },
            criterio_objetivo: {
              type: "string",
              enum: ["A", "B", "C", "D", "global"],
            },
            duracion_estimada_min: { type: "integer" },
          },
          required: [
            "semana",
            "titulo",
            "descripcion",
            "tipo",
            "criterio_objetivo",
            "duracion_estimada_min",
          ],
          additionalProperties: false,
        },
      },
    },
    required: ["resumen_diagnostico", "enfoque_principal", "semanas_totales", "tareas"],
    additionalProperties: false,
  },
} as const;

const PLAN_SYSTEM_STATIC_EN = `You are an expert IB tutor for English A: Literature, Standard Level. You design personalised study plans for Paper 1 SL (guided literary analysis of an unseen text, 35% of the final grade, first assessment 2026).

THIS IS LANGUAGE A: LITERATURE — NOT LANGUAGE A: LANGUAGE AND LITERATURE. Only literary texts are assessed.

PAPER 1 SL CONTEXT
The student selects one of two unseen literary passages (prose fiction, prose non-fiction, poetry or drama) and writes an analysis in 1 h 15 min. Assessed on 4 criteria, 0–5 each (total 0–20):
- Criterion A: Understanding and interpretation of the text and its implications.
- Criterion B: Analysis and evaluation of formal literary devices and their effects on meaning.
- Criterion C: Focus, organisation and development of the essay.
- Criterion D: Accuracy, precision and register of language.

SIX SEQUENTIAL LEARNING BLOCKS
1. Literary devices by text type — poetry, prose fiction, prose non-fiction, drama. Focus on identifying devices AND evaluating their effect on meaning.
2. Literary history (British, World Literature in English, global) — place texts in period and movement context.
3. Analytical and evaluative vocabulary — strong verbs (reveals, subverts, juxtaposes, reinforces, implies, evokes, foreshadows) and adverbs that move prose from descriptive to analytical.
4. Describe / analyse / interpret / evaluate — the most important distinction in IB marking. Describing = band 2–3 on Criterion B; evaluating = band 4–5.
5. Reading practice — unseen literary texts across genres; short annotations; speed and fluency.
6. Paper 1 practice under timed conditions — complete analyses (1000–1200 words, 75 min), marked by criteria.

OUTPUT REQUIREMENTS
- Generate tasks in English only.
- Use types: "lectura", "ejercicio", "analisis_practica", "repaso_teoria" (these are internal codes; descriptions must be in English).
- criterio_objetivo must be "A", "B", "C", "D", or "global".
- Distribute tasks so each week totals approximately the student's available hours.
- 3–6 tasks per week. Total weeks = weeks until exam.`;

const PLAN_SYSTEM_STATIC = `Eres un tutor experto del IB de Español A: Literatura, Nivel Medio. Diseñas planes de estudio personalizados para la Prueba 1 NM (análisis literario guiado de texto no visto, 35 % de la nota final, primera evaluación 2026).

CONTEXTO DE LA PRUEBA 1 NM
El estudiante elige uno de dos pasajes literarios no vistos (prosa ficcional, prosa no ficcional, poesía o teatro) y escribe un análisis en 1 h 15 min. Se evalúa con 4 criterios de 0-5 cada uno (total 0-20):
- Criterio A: Comprensión e interpretación del texto y sus implicaciones.
- Criterio B: Análisis y evaluación de los recursos formales y sus efectos sobre el significado.
- Criterio C: Focalización, organización y estructura del ensayo.
- Criterio D: Corrección, precisión y registro del lenguaje.

LA JERARQUÍA PEDAGÓGICA: SEIS BLOQUES SECUENCIALES
El aprendizaje sigue una pirámide de prerrequisitos. Sin recursos literarios no se puede analizar; sin vocabulario analítico no se sale de la descripción; sin lectura no hay fluidez interpretativa; sin práctica no se consolida. Los bloques son:

Bloque 1 — Recursos literarios por tipo de texto
Fundamento esencial. Por cada forma literaria (prosa ficcional, prosa no ficcional, poesía, teatro): recursos específicos, definiciones y efectos típicos. Los microejercicios clave son "identificar recurso en fragmento" y sobre todo "emparejar recurso ↔ efecto", que es lo que distingue la banda 2-3 de la banda 4-5 en Criterio B.

Bloque 2 — Historia de la literatura hispana e hispanoamericana
Contexto cultural para situar textos y reconocer convenciones de época o movimiento. Cubre desde el medievalismo hasta la narrativa hispanoamericana contemporánea.

Bloque 3 — Vocabulario evaluativo y analítico
La bisagra entre ver un recurso y decir algo sobre él. Verbos (subraya, intensifica, matiza, desplaza, condensa, ironiza, contrasta, refuerza, modula, prefigura) y adverbios (implícitamente, paradójicamente, sugestivamente, sutilmente) que transforman la prosa descriptiva en analítica.

Bloque 4 — Describir / analizar / interpretar / evaluar
La distinción más importante y la que más discrimina en la corrección real. Describir es decir qué hay; analizar es decir qué hace y cómo; interpretar es decir qué significa; evaluar es decir cómo de bien funciona al servicio del propósito del texto. El estudiante que solo describe obtiene banda 2-3 en Criterio B; el que evalúa alcanza banda 4-5.

Bloque 5 — Biblioteca de lectura
Sin volumen de lectura no hay fluidez interpretativa. Textos curados con ficha de contexto, preguntas de lectura y marcos de análisis anotados. El estudiante lee y analiza textos completos, no solo fragmentos.

Bloque 6 — Práctica de la Prueba 1
Análisis completos en condiciones de examen (1000-1200 palabras, 75 min) con corrección por criterios. También microejercicios estructurales: escribir solo la introducción, solo un párrafo de desarrollo, solo la conclusión.

ESTRUCTURA DEL ENSAYO QUE EL ESTUDIANTE DEBE PRODUCIR
Introducción: presenta el texto, declara el enfoque (pregunta de orientación o alternativa justificada), propone tesis articulada, anuncia movimientos del análisis.
Desarrollo: avanza idea por idea (no línea por línea), cada párrafo con idea controladora, citas breves y pertinentes, cierre de párrafo que conecta con la tesis.
Conclusión: no es un resumen; retoma la tesis respondiendo la pregunta; cierra con un gancho (pregunta abierta, proyección) sin perder rigor.

DIAGNÓSTICO → BLOQUE
- Flojea en identificar recursos → priorizar Bloque 1.
- Identifica recursos pero no analiza efectos → priorizar Bloques 3 y 4.
- Domina análisis pero estructura débil → priorizar Bloque 6 con énfasis en estructura.
- Errores de lenguaje recurrentes → trabajo transversal sobre Criterio D en todos los bloques.
- Interpretación superficial → más Bloque 5 con análisis modelo comentados.

PRINCIPIOS DEL PLAN
1. Prioridad por debilidad: más semanas a los criterios con banda más baja respecto al objetivo.
2. Gradualidad: semanas iniciales de fundamentos, finales de simulacros completos.
3. Realismo: respetar estrictamente las horas semanales disponibles. No sobrecargar.
4. Variedad: alternar lectura, microejercicio, análisis práctico y repaso teórico.
5. Géneros: si el estudiante no domina un género, incluir al menos una semana centrada en él.
6. Semana final siempre de simulacro completo en condiciones de examen.`;

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
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY no configurada");

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
    const userId = userData.user.id;

    // Cargar perfil
    const { data: perfil, error: perfilErr } = await supabase
      .from("perfiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (perfilErr || !perfil) {
      return new Response(JSON.stringify({ error: "Perfil no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (perfil.activo === false) {
      return new Response(JSON.stringify({ error: "Usuario inactivo." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!perfil.fecha_examen || !perfil.horas_semanales || !perfil.nota_objetivo) {
      return new Response(
        JSON.stringify({
          error: "Completa el onboarding antes de generar el plan.",
        }),
        {
          status: 400,
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
        .in("edge_function", ["core-study-plan", "generate-study-plan"])
        .gte("created_at", hace24h);

      return resultado;
    }, LIMITE_PLANES_DIARIO);
    if (!limite.ok) {
      return new Response(JSON.stringify({ error: limite.message }), {
        status: limite.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calcular semanas hasta examen
    const hoy = new Date();
    const examen = new Date(`${perfil.fecha_examen}T00:00:00Z`);
    if (Number.isNaN(examen.getTime())) {
      return new Response(JSON.stringify({ error: "Fecha de examen inválida." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const semanasHastaExamen = Math.max(
      2,
      Math.ceil((examen.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24 * 7)),
    );

    const courseKey = parseCourseKey(perfil.course_key);
    const isEN = courseKey === "english-a-literature";
    const planSystemStatic = isEN ? PLAN_SYSTEM_STATIC_EN : PLAN_SYSTEM_STATIC;

    // Determinar bandas (diagnóstico real o autoconfianza como fallback)
    const tieneDiagnostico =
      perfil.banda_inicial_a !== null &&
      perfil.banda_inicial_b !== null &&
      perfil.banda_inicial_c !== null &&
      perfil.banda_inicial_d !== null;

    const bandaA = tieneDiagnostico ? perfil.banda_inicial_a : (perfil.confianza_a ?? 3);
    const bandaB = tieneDiagnostico ? perfil.banda_inicial_b : (perfil.confianza_b ?? 3);
    const bandaC = tieneDiagnostico ? perfil.banda_inicial_c : (perfil.confianza_c ?? 3);
    const bandaD = tieneDiagnostico ? perfil.banda_inicial_d : (perfil.confianza_d ?? 3);

    const preliminar = !tieneDiagnostico;

    const systemPromptDynamic = isEN
      ? `STUDENT PROFILE:
- Exam date: ${perfil.fecha_examen} (${semanasHastaExamen} weeks remaining)
- Weekly hours available: ${perfil.horas_semanales}
- Target grade: ${perfil.nota_objetivo}
- Literary periods known: ${stringArray(perfil.movimientos_conocidos).join(", ") || "none indicated"}
- Comfortable genres: ${stringArray(perfil.generos_comodos).join(", ") || "none indicated"}

DIAGNOSTIC BY CRITERION (IB bands 0–5):
- Criterion A (Understanding and interpretation): ${bandaA}
- Criterion B (Analysis and evaluation): ${bandaB}
- Criterion C (Focus and organisation): ${bandaC}
- Criterion D (Language): ${bandaD}
${preliminar ? "\n(Student skipped the diagnostic analysis; values are based on self-reported confidence. Mark the plan implicitly as preliminary.)" : ""}

Distribute tasks so each week totals approximately the student's available hours. Generate 3–6 tasks per week. Total weeks: ${semanasHastaExamen}.`
      : `PERFIL DEL ESTUDIANTE:
- Fecha de examen: ${perfil.fecha_examen} (faltan ${semanasHastaExamen} semanas)
- Horas semanales disponibles: ${perfil.horas_semanales}
- Nota objetivo: ${perfil.nota_objetivo}
- Movimientos literarios que conoce: ${
          stringArray(perfil.movimientos_conocidos).join(", ") || "ninguno indicado"
        }
- Géneros cómodos: ${stringArray(perfil.generos_comodos).join(", ") || "ninguno indicado"}

DIAGNÓSTICO POR CRITERIOS (bandas IB 0-5):
- Criterio A (Comprensión e interpretación): ${bandaA}
- Criterio B (Análisis y evaluación): ${bandaB}
- Criterio C (Focalización y desarrollo): ${bandaC}
- Criterio D (Lenguaje): ${bandaD}
${preliminar ? "\n(El estudiante saltó el análisis diagnóstico; estos valores provienen de su autoconfianza. Marca implícitamente el plan como preliminar.)" : ""}

Distribuye las tareas para que cada semana sume aproximadamente las horas semanales disponibles del estudiante. Genera entre 3 y 6 tareas por semana. El total de semanas debe ser ${semanasHastaExamen}.`;

    const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-7",
        max_tokens: 16384,
        system: [
          {
            type: "text",
            text: planSystemStatic,
            cache_control: { type: "ephemeral" },
          },
          { type: "text", text: systemPromptDynamic },
        ],
        messages: [
          {
            role: "user",
            content: "Genera el plan de estudio personalizado ahora.",
          },
        ],
        tools: [PLAN_TOOL],
        tool_choice: { type: "tool", name: "registrar_plan_estudio" },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Límite de uso alcanzado. Inténtalo más tarde.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (aiResp.status === 529) {
        return new Response(
          JSON.stringify({
            error: "El servicio de IA está sobrecargado. Inténtalo de nuevo en unos segundos.",
          }),
          {
            status: 529,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const t = await aiResp.text();
      console.error("Anthropic API error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "Error del proveedor de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = (await aiResp.json()) as AnthropicResponse;

    // Registrar uso LLM
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (SUPABASE_SERVICE_ROLE_KEY && aiData.usage) {
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { error: usoErr } = await adminClient.from("llm_uso").insert({
        user_id: userId,
        edge_function: "core-study-plan",
        modelo: "claude-opus-4-7",
        tokens_entrada: aiData.usage.input_tokens ?? 0,
        tokens_salida: aiData.usage.output_tokens ?? 0,
        cache_creation_tokens: aiData.usage.cache_creation_input_tokens ?? 0,
        cache_read_tokens: aiData.usage.cache_read_input_tokens ?? 0,
      });
      if (usoErr) console.error("Error registrando uso LLM:", usoErr);
    }

    const toolUseBlock = aiData.content?.find((b) => b.type === "tool_use");
    const plan = validarPlanGenerado(toolUseBlock?.input);
    if (!plan) {
      console.error("Sin tool_use block:", JSON.stringify(aiData));
      throw new Error("La IA no devolvió un plan estructurado");
    }

    const { data: planId, error: planErr } = await supabase.rpc("replace_study_plan", {
      p_resumen_diagnostico: plan.resumen_diagnostico,
      p_enfoque_principal: plan.enfoque_principal,
      p_semanas_totales: plan.semanas_totales,
      p_preliminar: preliminar,
      p_tareas: plan.tareas,
    });

    if (planErr || !planId) {
      console.error("Error reemplazando plan:", planErr);
      throw new Error("No se pudo guardar el plan");
    }

    return new Response(
      JSON.stringify({
        plan_id: planId,
        preliminar,
        tareas_count: plan.tareas.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-study-plan error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Error desconocido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
