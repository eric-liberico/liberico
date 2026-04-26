import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres un asistente pedagógico especializado para profesores de Español A: Literatura del Bachillerato Internacional (IB), Nivel Medio. Tu objetivo es ayudar al docente en cualquier aspecto de su práctica, incluyendo:

- Los cuatro criterios de evaluación de la Prueba 1 (A: comprensión e interpretación, B: análisis y evaluación, C: focalización y desarrollo, D: lenguaje) y sus descriptores oficiales.
- Diseño y calibración de actividades, ejercicios y evaluaciones para la Prueba 1.
- Análisis detallado de textos literarios y estrategias pedagógicas para enseñarlos.
- Recursos literarios, movimientos histórico-literarios y contextos del programa.
- Interpretación de los requisitos del programa del IB.
- Revisión de evaluaciones y criterios de corrección.
- Planificación de unidades didácticas y secuenciación de contenidos.
- Seguimiento del progreso de los alumnos.

Responde siempre en español, con rigor académico y enfoque pedagógico. Cuando sea relevante, ancla tus respuestas en el marco oficial del IB.`;

const LIMITE_MENSAJES_DIARIO = 100;

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
      .select("rol")
      .eq("user_id", userId)
      .maybeSingle();

    if (perfilErr || !perfil || perfil.rol !== "profesor") {
      return new Response(
        JSON.stringify({ error: "Acceso restringido a profesores." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Rate limiting: máximo LIMITE_MENSAJES_DIARIO mensajes de usuario al día
    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("mensajes_chat_profesor")
      .select("id", { count: "exact", head: true })
      .eq("profesor_id", userId)
      .eq("rol", "user")
      .gte("created_at", hace24h);

    if ((count ?? 0) >= LIMITE_MENSAJES_DIARIO) {
      return new Response(
        JSON.stringify({ error: "Límite diario de mensajes alcanzado. Vuelve mañana." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { mensajes } = await req.json() as {
      mensajes: { rol: "user" | "assistant"; contenido: string }[];
    };

    if (!Array.isArray(mensajes) || mensajes.length === 0) {
      return new Response(
        JSON.stringify({ error: "El campo mensajes es obligatorio." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY no configurada." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
        system: [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        ],
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
      return new Response(
        JSON.stringify({ error: "Error del servicio de IA." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const textBlock = data.content?.find(
      (b: { type: string }) => b.type === "text",
    );
    if (!textBlock?.text) {
      return new Response(
        JSON.stringify({ error: "La IA no devolvió una respuesta válida." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ respuesta: textBlock.text }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("teacher-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
