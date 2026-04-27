import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    // Calcular semanas hasta examen
    const hoy = new Date();
    const examen = new Date(perfil.fecha_examen);
    const semanasHastaExamen = Math.max(
      2,
      Math.ceil((examen.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24 * 7)),
    );

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

    const systemPromptDynamic = `PERFIL DEL ESTUDIANTE:
- Fecha de examen: ${perfil.fecha_examen} (faltan ${semanasHastaExamen} semanas)
- Horas semanales disponibles: ${perfil.horas_semanales}
- Nota objetivo: ${perfil.nota_objetivo}
- Movimientos literarios que conoce: ${(perfil.movimientos_conocidos ?? []).join(", ") || "ninguno indicado"}
- Géneros cómodos: ${(perfil.generos_comodos ?? []).join(", ") || "ninguno indicado"}

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
          { type: "text", text: PLAN_SYSTEM_STATIC, cache_control: { type: "ephemeral" } },
          { type: "text", text: systemPromptDynamic },
        ],
        messages: [{ role: "user", content: "Genera el plan de estudio personalizado ahora." }],
        tools: [PLAN_TOOL],
        tool_choice: { type: "tool", name: "registrar_plan_estudio" },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de uso alcanzado. Inténtalo más tarde." }),
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

    const aiData = await aiResp.json();

    // Registrar uso LLM (fire and forget)
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (SUPABASE_SERVICE_ROLE_KEY && aiData.usage) {
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      adminClient
        .from("llm_uso")
        .insert({
          user_id: userId,
          edge_function: "generate-study-plan",
          modelo: "claude-opus-4-7",
          tokens_entrada: aiData.usage.input_tokens ?? 0,
          tokens_salida: aiData.usage.output_tokens ?? 0,
          cache_creation_tokens: aiData.usage.cache_creation_input_tokens ?? 0,
          cache_read_tokens: aiData.usage.cache_read_input_tokens ?? 0,
        })
        .then(() => {});
    }

    const toolUseBlock = aiData.content?.find((b: { type: string }) => b.type === "tool_use");
    if (!toolUseBlock?.input) {
      console.error("Sin tool_use block:", JSON.stringify(aiData));
      throw new Error("La IA no devolvió un plan estructurado");
    }

    const plan = toolUseBlock.input as {
      resumen_diagnostico: string;
      enfoque_principal: string;
      semanas_totales: number;
      tareas: Array<{
        semana: number;
        titulo: string;
        descripcion: string;
        tipo: string;
        criterio_objetivo: string;
        duracion_estimada_min: number;
      }>;
    };

    // Desactivar planes previos
    await supabase
      .from("planes_estudio")
      .update({ activo: false })
      .eq("user_id", userId)
      .eq("activo", true);

    // Insertar nuevo plan
    const { data: nuevoPlan, error: planErr } = await supabase
      .from("planes_estudio")
      .insert({
        user_id: userId,
        resumen_diagnostico: plan.resumen_diagnostico,
        enfoque_principal: plan.enfoque_principal,
        semanas_totales: plan.semanas_totales,
        preliminar,
        activo: true,
      })
      .select()
      .single();

    if (planErr || !nuevoPlan) {
      console.error("Error insertando plan:", planErr);
      throw new Error("No se pudo guardar el plan");
    }

    // Insertar tareas
    const tareasRows = plan.tareas.map((t) => ({
      plan_id: nuevoPlan.id,
      semana: t.semana,
      titulo: t.titulo,
      descripcion: t.descripcion,
      tipo: t.tipo,
      criterio_objetivo: t.criterio_objetivo,
      duracion_estimada_min: t.duracion_estimada_min,
    }));

    const { error: tareasErr } = await supabase.from("tareas_plan").insert(tareasRows);
    if (tareasErr) {
      console.error("Error insertando tareas:", tareasErr);
      throw new Error("No se pudieron guardar las tareas");
    }

    return new Response(
      JSON.stringify({ plan_id: nuevoPlan.id, preliminar, tareas_count: tareasRows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-study-plan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
