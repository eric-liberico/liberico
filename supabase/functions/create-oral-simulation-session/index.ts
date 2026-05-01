import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LIMITE_SIMULACIONES_DIARIO = 2;

// ── Helpers ──────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function labelTipoObra(tipo: string): string {
  if (tipo === "original_espanol") return "original en español";
  if (tipo === "traducida") return "estudiada en traducción";
  return "";
}

function truncar(texto: string, max = 500): string {
  return texto.length > max ? texto.slice(0, max) + "…" : texto;
}

// ── Prompts ───────────────────────────────────────────────────────────────────

function buildSystemPromptFase1(ctx: {
  tipoOral: string;
  asuntoGlobal: string;
  obra1Titulo: string;
  obra1Autor: string;
  obra1Tipo: string;
  extracto1: string;
  obra2Titulo: string;
  obra2Autor: string;
  obra2Tipo: string;
  extracto2: string;
}): string {
  return `Eres un evaluador del IB en un examen de Trabajo Oral Individual de Español A: Literatura NM.

MISIÓN EXCLUSIVA EN ESTA FASE: escuchar en silencio la presentación del alumno.

REGLA ABSOLUTA: Solo puedes responder con afirmaciones brevísimas de máximo 4 palabras: "Adelante.", "Continúa.", "Entendido.", "Sí, sigue.", "De acuerdo." NUNCA hagas preguntas, NUNCA des feedback, NUNCA elabores, NUNCA interrumpas.

Si el alumno indica que ha terminado (dice "listo", "terminé", "he acabado", "eso es todo", "fin", o hace una pausa larga), responde únicamente: "Perfecto, gracias." y detente.

CONTEXTO DE ESTA SESIÓN:
- Modalidad: ${ctx.tipoOral === "taught" ? "evaluado por el profesor" : "autoenseñado (self-taught)"}
- Asunto global: «${ctx.asuntoGlobal}»
- Obra 1: ${ctx.obra1Titulo} de ${ctx.obra1Autor}${ctx.obra1Tipo ? ` (${labelTipoObra(ctx.obra1Tipo)})` : ""}
- Extracto 1: ${truncar(ctx.extracto1, 400)}
- Obra 2: ${ctx.obra2Titulo} de ${ctx.obra2Autor}${ctx.obra2Tipo ? ` (${labelTipoObra(ctx.obra2Tipo)})` : ""}
- Extracto 2: ${truncar(ctx.extracto2, 400)}

Recuerda: tu único rol ahora es escuchar. No saludes extensamente. Cuando el alumno comience a hablar, limítate a afirmaciones breves.`;
}

function buildSystemPromptFase2(ctx: {
  tipoOral: string;
  asuntoGlobal: string;
  obra1Titulo: string;
  obra1Autor: string;
  obra1Tipo: string;
  extracto1: string;
  obra2Titulo: string;
  obra2Autor: string;
  obra2Tipo: string;
  extracto2: string;
  transcripcionFase1: string;
}): string {
  return `Eres un evaluador del IB en un examen de Trabajo Oral Individual de Español A: Literatura NM. Acabas de escuchar la presentación oral del alumno y ahora debes hacerle entre 4 y 5 preguntas de una en una, esperando siempre la respuesta completa antes de continuar.

CONTEXTO DEL ORAL:
- Modalidad: ${ctx.tipoOral === "taught" ? "evaluado por el profesor" : "autoenseñado (self-taught)"}
- Asunto global: «${ctx.asuntoGlobal}»
- Obra 1: ${ctx.obra1Titulo} de ${ctx.obra1Autor}${ctx.obra1Tipo ? ` (${labelTipoObra(ctx.obra1Tipo)})` : ""}
- Extracto 1: ${truncar(ctx.extracto1, 500)}
- Obra 2: ${ctx.obra2Titulo} de ${ctx.obra2Autor}${ctx.obra2Tipo ? ` (${labelTipoObra(ctx.obra2Tipo)})` : ""}
- Extracto 2: ${truncar(ctx.extracto2, 500)}

TRANSCRIPCIÓN DE LA PRESENTACIÓN DEL ALUMNO:
---
${ctx.transcripcionFase1 || "(El alumno presentó oralmente; transcripción no disponible)"}
---

CRITERIOS DE EVALUACIÓN IB (guían tus preguntas):
A. Conocimiento e interpretación — ¿Comprende el texto literario y lo interpreta con evidencia?
B. Análisis y evaluación — ¿Analiza recursos literarios con precisión y evalúa su efecto?
C. Foco y organización — ¿La presentación fue coherente y bien estructurada?
D. Lenguaje — ¿El vocabulario analítico fue preciso y variado?

INSTRUCCIONES:
1. Haz las preguntas DE UNA EN UNA. Espera la respuesta antes de la siguiente.
2. Basa cada pregunta en algo específico que el alumno haya dicho o en algo que le falte profundizar.
3. Tipos de preguntas recomendadas:
   - Especificidad del asunto global: "¿Podrías elaborar cómo este asunto actúa como lente interpretativa para las dos obras?"
   - Evidencia textual: "¿Puedes citar un pasaje concreto del extracto que apoye esa interpretación?"
   - Análisis de recursos: "¿Qué efecto tiene ese recurso en el lector y cómo lo relacionas con el asunto global?"
   - Comparación entre obras: "¿Cómo difieren las dos obras en su tratamiento de este asunto?"
   - Evaluación crítica: "¿Hay otras lecturas posibles del texto? ¿Cómo justificarías la tuya frente a otras interpretaciones?"
4. Mantén tono académico pero accesible. Habla siempre en español.
5. Tras la última respuesta del alumno, cierra con: "Muchas gracias. Ha concluido la evaluación oral."`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
  const ELEVENLABS_AGENT_ID = Deno.env.get("ELEVENLABS_AGENT_ID");

  if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
    return new Response(
      JSON.stringify({ error: "Simulador no configurado en el servidor. Contacta al administrador." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "No autorizado." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "No autorizado." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verificar perfil activo
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

  // Límite diario de simulaciones
  const hoy = new Date().toISOString().slice(0, 10);
  const { count } = await adminClient
    .from("llm_uso")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("edge_function", "create-oral-simulation-session")
    .gte("created_at", `${hoy}T00:00:00Z`);

  if ((count ?? 0) >= LIMITE_SIMULACIONES_DIARIO) {
    return new Response(
      JSON.stringify({
        error: `Has alcanzado el límite de ${LIMITE_SIMULACIONES_DIARIO} simulaciones por día. Vuelve mañana.`,
      }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Parsear body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body inválido." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!isRecord(body)) {
    return new Response(JSON.stringify({ error: "Body inválido." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const fase = body.fase as number;
  if (fase !== 1 && fase !== 2) {
    return new Response(JSON.stringify({ error: "fase debe ser 1 o 2." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ctx = {
    tipoOral: typeof body.tipo_oral === "string" ? body.tipo_oral : "taught",
    asuntoGlobal: typeof body.asunto_global === "string" ? body.asunto_global : "",
    obra1Titulo: typeof body.obra1_titulo === "string" ? body.obra1_titulo : "",
    obra1Autor: typeof body.obra1_autor === "string" ? body.obra1_autor : "",
    obra1Tipo: typeof body.obra1_tipo === "string" ? body.obra1_tipo : "",
    extracto1: typeof body.extracto_1 === "string" ? body.extracto_1 : "",
    obra2Titulo: typeof body.obra2_titulo === "string" ? body.obra2_titulo : "",
    obra2Autor: typeof body.obra2_autor === "string" ? body.obra2_autor : "",
    obra2Tipo: typeof body.obra2_tipo === "string" ? body.obra2_tipo : "",
    extracto2: typeof body.extracto_2 === "string" ? body.extracto_2 : "",
    transcripcionFase1:
      typeof body.transcripcion_fase1 === "string" ? body.transcripcion_fase1 : "",
  };

  const systemPrompt =
    fase === 1 ? buildSystemPromptFase1(ctx) : buildSystemPromptFase2(ctx);

  const firstMessage =
    fase === 1
      ? `Buenos días. Soy tu evaluador de hoy. Cuando estés listo, puedes comenzar tu presentación sobre el asunto global: «${ctx.asuntoGlobal}». Tienes aproximadamente diez minutos.`
      : `Gracias por tu presentación. Ahora pasamos a la segunda parte: te haré entre cuatro y cinco preguntas sobre lo que has expuesto. Tómate el tiempo que necesites para responder con detalle. ¿Listo?`;

  // Registrar uso antes de llamar a ElevenLabs
  await adminClient.from("llm_uso").insert({
    user_id: user.id,
    edge_function: "create-oral-simulation-session",
    modelo: `elevenlabs-convai-fase${fase}`,
    tokens_entrada: 0,
    tokens_salida: 0,
  });

  // Obtener signed URL de ElevenLabs con config override
  let elevenRes: Response;
  try {
    elevenRes = await fetch(
      "https://api.elevenlabs.io/v1/convai/conversation/get_signed_url",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: ELEVENLABS_AGENT_ID,
          conversation_config_override: {
            agent: {
              prompt: { prompt: systemPrompt },
              first_message: firstMessage,
              language: "es",
            },
          },
        }),
      },
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Error al conectar con el servicio de simulación." }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!elevenRes.ok) {
    const txt = await elevenRes.text().catch(() => "");
    return new Response(
      JSON.stringify({
        error: `Error del servicio de simulación (${elevenRes.status}): ${txt.slice(0, 200)}`,
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const elevenData = await elevenRes.json();
  if (!isRecord(elevenData) || typeof elevenData.signed_url !== "string") {
    return new Response(
      JSON.stringify({ error: "Respuesta inesperada del servicio de simulación." }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ signed_url: elevenData.signed_url }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
