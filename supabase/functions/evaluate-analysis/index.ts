import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres un examinador experto de Español A: Literatura del Bachillerato Internacional (IB), Nivel Medio. Evalúas la Prueba 1: análisis literario guiado de un texto no visto. Puntuación máxima 20 puntos (4 criterios × 5).

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
Señales de banda alta en B: detectar el mecanismo central del texto; análisis de cambios gramaticales sutiles (paso de artículo indefinido a definido, cambio de tiempo verbal) ligados a efecto; lectura que unifica en vez de acumular.

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

Errores típicos de lenguaje a marcar en D: "en adición" (calco de in addition; correcto: "además"); régimen preposicional impropio ("condensa la existencia a sufrimiento" → "en"); "remachar" como sinónimo de "reforzar" (uso impropio); arcaísmos disonantes como "empero" o "asaz"; construcciones rígidas ("una empatía que es superficial" → "una empatía superficial"); inconsistencias en formato de citas.

CONSEJOS IB PARA DETECTAR PROBLEMAS
El análisis no debe ser un comentario línea por línea, sino un ensayo argumentativo con tesis. El énfasis debe estar en los EFECTOS de las decisiones del autor, no en la identificación de recursos. Las referencias al texto deben ser específicas y pertinentes. El registro debe ser académico y el lenguaje preciso. El estudiante no debe resumir ni parafrasear el texto: debe analizarlo.

CONVERSIÓN A NOTA IB
0-3→1, 4-6→2, 7-9→3, 10-12→4, 13-15→5, 16-18→6, 19-20→7.

INSTRUCCIÓN FINAL
Sé riguroso, justo y constructivo. La justificación de cada banda debe ser concreta y específica al análisis del estudiante, no genérica. El comentario global debe ayudar al estudiante a entender exactamente qué debe cambiar para subir de banda.`;

const EVAL_TOOL = {
  name: "registrar_evaluacion",
  description:
    "Registra la evaluación del análisis literario según los 4 criterios oficiales del IB.",
  input_schema: {
    type: "object",
    properties: {
      banda_a: { type: "integer", minimum: 0, maximum: 5 },
      banda_b: { type: "integer", minimum: 0, maximum: 5 },
      banda_c: { type: "integer", minimum: 0, maximum: 5 },
      banda_d: { type: "integer", minimum: 0, maximum: 5 },
      justificacion_a: { type: "string", description: "2-3 frases" },
      justificacion_b: { type: "string", description: "2-3 frases" },
      justificacion_c: { type: "string", description: "2-3 frases" },
      justificacion_d: { type: "string", description: "2-3 frases" },
      fortalezas: {
        type: "string",
        description: "Lista en prosa de qué hace bien el análisis",
      },
      areas_mejora: {
        type: "string",
        description: "Lista en prosa de qué debe mejorar",
      },
      comentario_global: {
        type: "string",
        description: "4-6 frases tipo examinador IB",
      },
    },
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
    ],
    additionalProperties: false,
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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
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

    const { texto, pregunta, analisis } = await req.json();

    if (!texto || !pregunta || !analisis) {
      return new Response(JSON.stringify({ error: "Faltan campos: texto, pregunta o análisis." }), {
        status: 400,
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

    const userPrompt = `TEXTO LITERARIO:\n${texto}\n\nPREGUNTA DE ORIENTACIÓN:\n${pregunta}\n\nANÁLISIS DEL ESTUDIANTE:\n${analisis}\n\nEvalúa este análisis según los 4 criterios oficiales del IB y registra la evaluación llamando a la herramienta.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-7",
        max_tokens: 4096,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userPrompt }],
        tools: [EVAL_TOOL],
        tool_choice: { type: "tool", name: "registrar_evaluacion" },
      }),
    });

    if (!response.ok) {
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
          JSON.stringify({
            error: "El servicio de IA está sobrecargado. Inténtalo de nuevo en unos segundos.",
          }),
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

    const data = await response.json();

    // Registrar uso LLM (fire and forget)
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (SUPABASE_SERVICE_ROLE_KEY && data.usage) {
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      adminClient
        .from("llm_uso")
        .insert({
          user_id: userData.user.id,
          edge_function: "evaluate-analysis",
          modelo: "claude-opus-4-7",
          tokens_entrada: data.usage.input_tokens ?? 0,
          tokens_salida: data.usage.output_tokens ?? 0,
          cache_creation_tokens: data.usage.cache_creation_input_tokens ?? 0,
          cache_read_tokens: data.usage.cache_read_input_tokens ?? 0,
        })
        .then(() => {});
    }

    const toolUseBlock = data.content?.find((b: { type: string }) => b.type === "tool_use");
    if (!toolUseBlock?.input) {
      console.error("No tool_use block:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "La IA no devolvió una evaluación válida." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const evaluation = toolUseBlock.input;
    const total = evaluation.banda_a + evaluation.banda_b + evaluation.banda_c + evaluation.banda_d;
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

    return new Response(JSON.stringify({ ...evaluation, puntuacion_total: total, nota_ib }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate-analysis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
