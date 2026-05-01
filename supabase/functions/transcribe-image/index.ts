import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LIMITE_DIARIO = 20;
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const MIME_IMAGEN = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MIME_PERMITIDOS = [...MIME_IMAGEN, "application/pdf"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "Servicio no configurado." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: perfil } = await adminClient
      .from("perfiles")
      .select("activo")
      .eq("user_id", user.id)
      .single();
    if (perfil?.activo === false) {
      return new Response(JSON.stringify({ error: "Usuario inactivo." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Límite diario
    const hoy = new Date().toISOString().slice(0, 10);
    const { count } = await adminClient
      .from("llm_uso")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("edge_function", "transcribe-image")
      .gte("created_at", `${hoy}T00:00:00Z`);

    if ((count ?? 0) >= LIMITE_DIARIO) {
      return new Response(
        JSON.stringify({
          error: `Has alcanzado el límite diario de ${LIMITE_DIARIO} transcripciones de imagen. Vuelve mañana.`,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Leer body
    const body: unknown = await req.json();
    if (!isRecord(body)) {
      return new Response(JSON.stringify({ error: "Cuerpo de petición inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imagen_base64, mime_type } = body;

    if (typeof imagen_base64 !== "string" || !imagen_base64) {
      return new Response(JSON.stringify({ error: "Falta imagen_base64." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mimeNormalizado = typeof mime_type === "string" ? mime_type.toLowerCase() : "image/jpeg";
    if (!MIME_PERMITIDOS.includes(mimeNormalizado)) {
      return new Response(
        JSON.stringify({ error: "Formato no soportado. Usa JPG, PNG, WebP o PDF." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verificar tamaño aproximado del base64 (4/3 del tamaño original)
    const bytesAprox = Math.floor(imagen_base64.length * 0.75);
    if (bytesAprox > MAX_BYTES) {
      return new Response(
        JSON.stringify({ error: "La imagen supera el límite de 8 MB. Reduce la resolución antes de subir." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Registrar uso antes de llamar a la API
    const { data: usoRow } = await adminClient
      .from("llm_uso")
      .insert({
        user_id: user.id,
        edge_function: "transcribe-image",
        modelo: "claude-haiku-4-5-20251001",
        tokens_entrada: 0,
        tokens_salida: 0,
      })
      .select("id")
      .single();

    const cancelarUso = async () => {
      if (usoRow?.id) await adminClient.from("llm_uso").delete().eq("id", usoRow.id);
    };

    const esPdf = mimeNormalizado === "application/pdf";

    // Bloque de contenido: document para PDF, image para imágenes
    const archivoBloque = esPdf
      ? {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: imagen_base64,
          },
        }
      : {
          type: "image",
          source: {
            type: "base64",
            media_type: mimeNormalizado,
            data: imagen_base64,
          },
        };

    // Llamar a Claude vision
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "pdfs-2024-09-25",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              archivoBloque,
              {
                type: "text",
                text: "Transcribe fielmente todo el texto manuscrito o impreso de este documento. Preserva los párrafos, saltos de línea y la puntuación original. Devuelve únicamente el texto transcrito, sin comentarios ni explicaciones adicionales.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      await cancelarUso();
      const texto = await response.text();
      console.error("Error Anthropic:", response.status, texto);
      return new Response(
        JSON.stringify({ error: "Error al procesar la imagen. Inténtalo de nuevo." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data: unknown = await response.json();
    if (!isRecord(data) || !Array.isArray(data.content)) {
      await cancelarUso();
      return new Response(
        JSON.stringify({ error: "Respuesta inesperada del servicio de transcripción." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const textoBloque = data.content.find(
      (b): b is { type: string; text: string } =>
        isRecord(b) && b.type === "text" && typeof b.text === "string",
    );

    if (!textoBloque) {
      await cancelarUso();
      return new Response(
        JSON.stringify({ error: "No se pudo extraer texto de la imagen." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Actualizar tokens reales
    if (isRecord(data.usage) && usoRow?.id) {
      const usage = data.usage;
      await adminClient.from("llm_uso").update({
        tokens_entrada: typeof usage.input_tokens === "number" ? usage.input_tokens : 0,
        tokens_salida: typeof usage.output_tokens === "number" ? usage.output_tokens : 0,
      }).eq("id", usoRow.id);
    }

    return new Response(
      JSON.stringify({ texto: textoBloque.text.trim() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Error inesperado:", err);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
