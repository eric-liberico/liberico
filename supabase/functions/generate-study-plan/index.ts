import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLAN_TOOL = {
  type: "function",
  function: {
    name: "registrar_plan_estudio",
    description: "Registra el plan de estudio personalizado para un estudiante de IB Literatura.",
    parameters: {
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
  },
} as const;

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY no configurada");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
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

    const bandaA = tieneDiagnostico ? perfil.banda_inicial_a : perfil.confianza_a ?? 3;
    const bandaB = tieneDiagnostico ? perfil.banda_inicial_b : perfil.confianza_b ?? 3;
    const bandaC = tieneDiagnostico ? perfil.banda_inicial_c : perfil.confianza_c ?? 3;
    const bandaD = tieneDiagnostico ? perfil.banda_inicial_d : perfil.confianza_d ?? 3;

    const preliminar = !tieneDiagnostico;

    const systemPrompt = `Eres un tutor experto del IB de Español A: Literatura, Nivel Medio.

PERFIL DEL ESTUDIANTE:
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

Diseña un plan de estudio personalizado siguiendo estos principios:
1. Prioridad por debilidad: dedica más tiempo a los criterios con banda más baja respecto al objetivo.
2. Gradualidad: las primeras semanas son de fundamentos, las últimas de simulacros completos.
3. Realismo: respeta las horas semanales disponibles. No sobrecargues.
4. Variedad: alterna lectura, microejercicios, análisis prácticos y repaso teórico.
5. Géneros: si el estudiante no marca un género como cómodo, incluye al menos una semana centrada en ese género.

Distribuye las tareas para que cada semana sume aproximadamente las horas semanales disponibles del estudiante. Genera entre 3 y 6 tareas por semana. El total de semanas debe ser ${semanasHastaExamen}.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Genera el plan de estudio personalizado ahora." },
        ],
        tools: [PLAN_TOOL],
        tool_choice: { type: "function", function: { name: "registrar_plan_estudio" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de uso alcanzado. Inténtalo más tarde." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados en Lovable AI." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "Error del proveedor de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("Sin tool_call:", JSON.stringify(aiData));
      throw new Error("La IA no devolvió un plan estructurado");
    }

    const plan = JSON.parse(toolCall.function.arguments) as {
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
