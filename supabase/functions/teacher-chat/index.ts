import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres un asistente pedagógico experto para profesores de Español A: Literatura del Bachillerato Internacional (IB), Nivel Medio. Ayudas al docente con cualquier aspecto de la Prueba 1 y del programa. Respondes siempre en español con rigor académico y enfoque pedagógico.

MARCO DE LA PRUEBA 1 NM
La Prueba 1 es un análisis literario guiado de un texto no visto. Duración: 1 h 15 min. Ponderación: 35 % de la nota final. El estudiante elige uno de dos pasajes (de formas literarias distintas: prosa ficcional, prosa no ficcional, poesía o teatro) y escribe un análisis. Hay una pregunta de orientación, pero puede proponer un enfoque alternativo declarándolo desde la introducción. Puntuación máxima: 20 puntos (4 criterios × 5).

LOS CUATRO CRITERIOS EN DETALLE

Criterio A — Comprensión e interpretación
Evalúa la comprensión del significado literal y la calidad interpretativa, apoyada en referencias al texto. Banda alta: la interpretación va más allá de lo literal, capta sutilezas (voz narrativa, ironía, contraste tonal). Banda baja: errores conceptuales (confundir narradora con autora), citas mal atribuidas, lectura desviada del cierre.

Criterio B — Análisis y evaluación
El criterio más discriminante. No basta con identificar recursos: hay que explicar sus EFECTOS sobre el significado. Banda alta: detecta el mecanismo formal central, conecta varios recursos en una lectura unificada. Banda baja: lista de recursos sin efectos, etiquetas técnicas incorrectas, citas inexactas.

Criterio C — Focalización y organización
El análisis debe ser un ensayo argumentativo, no un comentario línea por línea. Estructura: introducción con tesis → desarrollo con ideas controladoras por párrafo → conclusión que retoma la tesis. Problemas frecuentes: tesis borrosa, promesas estructurales incumplidas, conclusión proyectiva no sostenida en el texto.

Criterio D — Lenguaje
Corrección gramatical, precisión léxica, variedad y registro académico sostenido. Errores típicos: calcos del inglés ("en adición"), régimen preposicional impropio, arcaísmos disonantes, construcciones rígidas, citas con formato inconsistente.

JERARQUÍA PEDAGÓGICA PARA EL APRENDIZAJE
El dominio de la Prueba 1 sigue una pirámide: (1) recursos literarios por tipo de texto, (2) historia literaria hispana e hispanoamericana, (3) vocabulario analítico y evaluativo, (4) distinción describir/analizar/interpretar/evaluar, (5) lectura de textos curados con marcos de análisis, (6) práctica de análisis completos en condiciones de examen. Los estudiantes que solo describen se quedan en banda 2-3 de Criterio B; los que evalúan efectos alcanzan banda 4-5.

ERRORES MÁS FRECUENTES EN ESTUDIANTES NM
Confundir narradora con autora; identificar recursos sin explicar efectos; conclusión proyectiva; promesas estructurales incumplidas; citas inexactas; lectura binaria en textos polifónicos; uso de "en adición" (calco del inglés); análisis como comentario línea por línea en vez de ensayo argumentativo.

ÁREAS EN LAS QUE PUEDES AYUDAR AL PROFESOR
Calibración de bandas con ejemplos concretos; diseño de actividades y microejercicios por criterio; análisis de textos literarios y estrategias para enseñarlos; interpretación de los requisitos del programa IB; planificación de unidades didácticas; retroalimentación sobre análisis de alumnos; seguimiento del progreso por criterio.

TABLA DE CONVERSIÓN A NOTA IB
0–3 → 1 | 4–6 → 2 | 7–9 → 3 | 10–12 → 4 | 13–15 → 5 | 16–18 → 6 | 19–20 → 7

VOCABULARIO ANALÍTICO CLAVE PARA LA PRUEBA 1
Verbos de análisis: subraya, intensifica, matiza, desplaza, condensa, ironiza, contrasta, refuerza, modula, atenúa, prefigura, denuncia, problematiza, cuestiona, desdibuja.
Adverbios: implícitamente, paradójicamente, sugestivamente, sutilmente, decisivamente.
La distinción central del Criterio B: DESCRIBIR (decir qué hay) vs ANALIZAR (decir qué hace) vs INTERPRETAR (decir qué significa) vs EVALUAR (decir cómo de bien funciona). Los estudiantes que solo describen no superan la banda 3.

CONSEJOS IB CLAVE PARA TRASLADAR A LOS ALUMNOS
El análisis no es un comentario línea por línea, es un ensayo argumentativo con tesis. El énfasis debe estar en los efectos de las decisiones del autor. Las referencias al texto deben ser específicas y pertinentes: cada cita sostiene una afirmación. Adoptar actitud analítica y crítica, no descriptiva. Estructura clara con párrafos, puntuación adecuada y oraciones guía.`;

const LIMITE_MENSAJES_DIARIO = 100;
const MAX_MENSAJES_BODY = 50;
const MAX_MENSAJE_CHARS = 6000;

type JsonRecord = Record<string, unknown>;
type MensajeChat = { rol: "user" | "assistant"; contenido: string };

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isMensajeChat(value: unknown): value is MensajeChat {
  if (!isRecord(value)) return false;
  return (
    (value.rol === "user" || value.rol === "assistant") &&
    typeof value.contenido === "string" &&
    value.contenido.trim().length > 0 &&
    value.contenido.length <= MAX_MENSAJE_CHARS
  );
}

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
      message: "Límite diario de mensajes alcanzado. Vuelve mañana.",
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

    // Verificar que el usuario es profesor
    const { data: perfil, error: perfilErr } = await supabase
      .from("perfiles")
      .select("rol, activo")
      .eq("user_id", userId)
      .maybeSingle();

    if (perfilErr || !perfil || perfil.rol !== "profesor" || perfil.activo === false) {
      return new Response(JSON.stringify({ error: "Acceso restringido a profesores." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const limite = await verificarLimiteDiario(
      supabase,
      userId,
      "teacher-chat",
      LIMITE_MENSAJES_DIARIO,
    );
    if (!limite.ok) {
      return new Response(JSON.stringify({ error: limite.message }), {
        status: limite.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: unknown = await req.json();
    if (!isRecord(body) || !Array.isArray(body.mensajes)) {
      return new Response(JSON.stringify({ error: "El campo mensajes es obligatorio." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (
      body.mensajes.length === 0 ||
      body.mensajes.length > MAX_MENSAJES_BODY ||
      !body.mensajes.every(isMensajeChat)
    ) {
      return new Response(
        JSON.stringify({ error: "El historial de mensajes tiene un formato inválido." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const mensajes = body.mensajes;

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY no configurada." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enviamos los últimos 20 mensajes para no exceder el contexto
    const historial = mensajes.slice(-20).map((m) => ({
      role: m.rol,
      content: m.contenido,
    }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-7",
        max_tokens: 2048,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: historial,
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
        edge_function: "teacher-chat",
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

    return new Response(JSON.stringify({ respuesta: textBlock.text }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("teacher-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
