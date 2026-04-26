import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres un asistente para profesores de Español A: Literatura del Bachillerato Internacional (IB), Nivel Medio.

El profesor te dictará sus apuntes sobre el análisis escrito de un alumno de forma rápida e informal — pueden ser notas dispersas, frases incompletas o ideas en bruto. Tu tarea es transformarlos en un comentario pedagógico claro, estructurado y constructivo, dirigido directamente al alumno, en español.

Normas:
- Escribe en segunda persona singular (tú).
- Organiza el feedback de forma natural: lo que funciona bien, áreas de mejora y sugerencias concretas. Incluye solo las secciones que sean relevantes según lo que diga el profesor.
- Mantén todos los puntos mencionados por el profesor. No inventes información ni añadas valoraciones que el profesor no haya dado.
- Sé directo, empático y motivador. Evita el lenguaje excesivamente formal o burocrático.
- No uses asteriscos para negritas ni formato markdown. Escribe texto plano con saltos de línea.
- Longitud apropiada: ni demasiado breve ni exhaustiva. Lo que necesita el alumno para entender y mejorar.`;

const MAX_TEXTO_CHARS = 3000;
const LIMITE_REWRITES_DIARIO = 50;

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
      .select("rol")
      .eq("user_id", userId)
      .maybeSingle();

    if (!perfil || perfil.rol !== "profesor") {
      return new Response(
        JSON.stringify({ error: "Acceso restringido a profesores." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Rate limiting: máximo LIMITE_REWRITES_DIARIO llamadas al día por profesor
    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("comentarios_profesor")
      .select("id", { count: "exact", head: true })
      .eq("profesor_id", userId)
      .gte("updated_at", hace24h);

    if ((count ?? 0) >= LIMITE_REWRITES_DIARIO) {
      return new Response(
        JSON.stringify({ error: "Límite diario de reescrituras alcanzado. Vuelve mañana." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json() as { texto?: unknown };
    const texto = body.texto;

    if (typeof texto !== "string" || texto.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "El campo texto es obligatorio." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (texto.length > MAX_TEXTO_CHARS) {
      return new Response(
        JSON.stringify({ error: `El texto no puede superar ${MAX_TEXTO_CHARS} caracteres.` }),
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
        system: [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        ],
        messages: [
          {
            role: "user",
            content: `Apuntes del profesor:\n\n${texto.trim()}`,
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
      return new Response(
        JSON.stringify({ error: "Error del servicio de IA." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const textBlock = data.content?.find((b: { type: string }) => b.type === "text");
    if (!textBlock?.text) {
      return new Response(
        JSON.stringify({ error: "La IA no devolvió una respuesta válida." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ texto: textBlock.text }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("rewrite-feedback error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
