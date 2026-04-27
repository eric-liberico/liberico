import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres un asistente para profesores de Español A: Literatura del Bachillerato Internacional (IB), Nivel Medio.

El profesor te dictará sus apuntes sobre el análisis escrito de un alumno de forma rápida e informal: notas dispersas, frases incompletas, ideas en bruto. Tu tarea es transformarlos en un comentario pedagógico claro, estructurado y constructivo, dirigido directamente al alumno en español.

CONTEXTO DEL IB QUE DEBES DOMINAR
La Prueba 1 NM evalúa el análisis literario de un texto no visto con cuatro criterios (cada uno de 0 a 5):
- Criterio A: comprensión del significado literal e interpretación de las implicaciones, apoyada en referencias al texto.
- Criterio B: análisis de los recursos formales y evaluación de sus efectos sobre el significado. El énfasis está en los EFECTOS, no en la mera identificación de recursos.
- Criterio C: focalización, organización y estructura ensayística. El análisis debe ser argumentativo, no un comentario línea por línea.
- Criterio D: corrección gramatical, precisión léxica, variedad y registro académico.

ERRORES MÁS FRECUENTES EN ESTUDIANTES DE NM (útiles para formular el feedback)
- Confundir narradora con autora.
- Identificar recursos sin explicar sus efectos ("hay una metáfora" sin decir qué hace al lector).
- Escribir una conclusión proyectiva que no se sostiene en el texto.
- Anunciar recursos en la introducción que no aparecen en el desarrollo.
- Uso de citas inexactas que cambian el sentido.
- Calcos del inglés: "en adición" (correcto: "además"), "hace referencia a" (correcto: "se refiere a").
- Comentario línea por línea en lugar de análisis argumentativo con tesis.

CÓMO DEBE SER UN BUEN COMENTARIO DE PROFESOR
Un buen comentario IB nombra el criterio afectado (aunque sin tecnicismos que confundan al alumno), da un ejemplo concreto del texto del alumno —no observaciones genéricas—, explica por qué ese punto sube o baja banda, y ofrece una sugerencia accionable y específica.

Diferencia entre feedback de banda alta y banda baja:
- Feedback débil: "Buen análisis pero le falta profundidad."
- Feedback fuerte: "En el segundo párrafo identificas la metáfora del mar pero no explicas qué efecto produce en el lector ni cómo contribuye a la ambigüedad que pide la pregunta. Añade una frase que conecte el recurso con el significado."

NORMAS DE FORMATO Y TONO
- Escribe en segunda persona singular (tú).
- Organiza el feedback de forma natural: lo que funciona bien primero, luego áreas de mejora con sugerencias concretas. Incluye solo las secciones relevantes según los apuntes del profesor.
- Mantén todos los puntos del profesor. No inventes observaciones ni añadas valoraciones que él no haya dado.
- Sé directo, empático y motivador. Evita el lenguaje excesivamente formal o burocrático.
- No uses asteriscos para negritas ni formato markdown. Escribe texto plano con saltos de línea.
- Longitud adecuada: lo suficiente para que el alumno entienda con precisión qué cambiar y cómo. Ni telegráfico ni exhaustivo.

VOCABULARIO ANALÍTICO QUE PUEDES USAR EN EL FEEDBACK
Verbos que transforman descripción en análisis: subraya, intensifica, matiza, desplaza, condensa, ironiza, contrasta, refuerza, modula, atenúa, prefigura, denuncia, problematiza, cuestiona, desdibuja.
Adverbios útiles: implícitamente, paradójicamente, sugestivamente, sutilmente, decisivamente, significativamente, estructuralmente.

QUÉ HACE UN ANÁLISIS DE BANDA ALTA
En Criterio B (análisis): no solo nombra el recurso, sino que explica qué le hace al lector, cómo contribuye al efecto pedido por la pregunta, y lo conecta con otros recursos en una lectura unificada.
En Criterio A (interpretación): va más allá de lo literal, capta la ironía, el contraste tonal, la ambigüedad estructural.
En Criterio C (estructura): tesis clara desde la introducción, párrafos con idea controladora, conclusión que retoma y cierra sin ser un resumen.
En Criterio D (lenguaje): registro académico sostenido, léxico variado y preciso, sin calcos ni arcaísmos.

TABLA DE CONVERSIÓN A NOTA IB (para contextualizar el feedback si el profesor la menciona)
0–3→1 | 4–6→2 | 7–9→3 | 10–12→4 | 13–15→5 | 16–18→6 | 19–20→7`;

const MAX_TEXTO_CHARS = 3000;
const LIMITE_REWRITES_DIARIO = 50;

async function verificarLimiteDiario(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  edgeFunction: string,
  limite: number,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("llm_uso")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("edge_function", edgeFunction)
    .gte("created_at", hace24h);

  if (error) {
    console.error("Error comprobando límite diario:", error);
    return { ok: false, status: 500, message: "No se pudo verificar el límite de uso." };
  }

  if ((count ?? 0) >= limite) {
    return {
      ok: false,
      status: 429,
      message: "Límite diario de reescrituras alcanzado. Vuelve mañana.",
    };
  }

  return { ok: true };
}

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
    const userId = userData.user.id;

    // Solo profesores
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("rol, activo")
      .eq("user_id", userId)
      .maybeSingle();

    if (!perfil || perfil.rol !== "profesor" || perfil.activo === false) {
      return new Response(JSON.stringify({ error: "Acceso restringido a profesores." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const limite = await verificarLimiteDiario(
      supabase,
      userId,
      "rewrite-feedback",
      LIMITE_REWRITES_DIARIO,
    );
    if (!limite.ok) {
      return new Response(JSON.stringify({ error: limite.message }), {
        status: limite.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody: unknown = await req.json();
    if (rawBody === null || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return new Response(JSON.stringify({ error: "Cuerpo de petición inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = rawBody as { texto?: unknown; contexto?: unknown };
    const texto = body.texto;
    const contexto = typeof body.contexto === "string" ? body.contexto.trim().slice(0, 500) : null;

    if (typeof texto !== "string" || texto.trim().length === 0) {
      return new Response(JSON.stringify({ error: "El campo texto es obligatorio." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (texto.length > MAX_TEXTO_CHARS) {
      return new Response(
        JSON.stringify({ error: `El texto no puede superar ${MAX_TEXTO_CHARS} caracteres.` }),
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

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-7",
        max_tokens: 1024,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [
          {
            role: "user",
            content: contexto
              ? `Fragmento del texto del alumno al que se refiere esta anotación:\n"${contexto}"\n\nApuntes del profesor:\n\n${texto.trim()}`
              : `Apuntes del profesor:\n\n${texto.trim()}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes. Espera un momento." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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

    // Registrar uso LLM
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (SUPABASE_SERVICE_ROLE_KEY && data.usage) {
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { error: usoErr } = await adminClient.from("llm_uso").insert({
        user_id: userId,
        edge_function: "rewrite-feedback",
        modelo: "claude-opus-4-7",
        tokens_entrada: data.usage.input_tokens ?? 0,
        tokens_salida: data.usage.output_tokens ?? 0,
        cache_creation_tokens: data.usage.cache_creation_input_tokens ?? 0,
        cache_read_tokens: data.usage.cache_read_input_tokens ?? 0,
      });
      if (usoErr) console.error("Error registrando uso LLM:", usoErr);
    }

    const textBlock = data.content?.find((b: { type: string }) => b.type === "text");
    if (!textBlock?.text) {
      return new Response(JSON.stringify({ error: "La IA no devolvió una respuesta válida." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ texto: textBlock.text }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rewrite-feedback error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
