import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { parseCourseKey, parseObraTipo } from "../_shared/courses.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sin límite diario práctico: la evaluación final ya queda controlada por créditos en evaluate-oral.
const LIMITE_SIMULACIONES_DIARIO = Number(Deno.env.get("ORAL_SIM_LIMITE_DIARIO")) || 1_000_000;

// ── Helpers ──────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function labelTipoObra(tipo: string): string {
  const parsed = parseObraTipo(tipo);
  if (parsed === "original_language") return "escrita originalmente en la lengua del curso";
  if (parsed === "in_translation") return "estudiada en traducción";
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
  return `Eres un evaluador del IB en un examen de Trabajo Oral Individual de Español A: Literatura.

MISIÓN EXCLUSIVA EN ESTA FASE: escuchar en silencio la presentación del alumno.

REGLA ABSOLUTA: Solo puedes responder con afirmaciones brevísimas de máximo 4 palabras: "Adelante.", "Continúa.", "Entendido.", "Sí, sigue.", "De acuerdo." NUNCA hagas preguntas, NUNCA des feedback, NUNCA elabores, NUNCA interrumpas.

Si el alumno indica que ha terminado (dice "listo", "terminé", "he acabado", "eso es todo", "fin", o hace una pausa larga), responde únicamente: "Perfecto, gracias." y detente.

CONTEXTO DE ESTA SESIÓN:
- Modalidad: ${ctx.tipoOral === "taught" ? "evaluado por el profesor" : "aprendizaje autodidacta con apoyo del colegio"}
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
  return `Eres un evaluador del IB en un examen de Trabajo Oral Individual de Español A: Literatura. Acabas de escuchar la presentación oral del alumno y ahora debes hacerle entre 4 y 5 preguntas de una en una, esperando siempre la respuesta completa antes de continuar.

CONTEXTO DEL ORAL:
- Modalidad: ${ctx.tipoOral === "taught" ? "evaluado por el profesor" : "aprendizaje autodidacta con apoyo del colegio"}
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

// ── English A prompts ──────────────────────────────────────────────────────────

function buildSystemPromptFase1EN(ctx: {
  tipoOral: string;
  asuntoGlobal: string;
  obra1Titulo: string;
  obra1Autor: string;
  extracto1: string;
  obra2Titulo: string;
  obra2Autor: string;
  extracto2: string;
}): string {
  return `You are an IB examiner in an English A: Literature Individual Oral examination.

YOUR ONLY ROLE IN THIS PHASE: listen silently to the student's presentation.

ABSOLUTE RULE: You may only respond with very brief affirmations of no more than 4 words: "Go ahead.", "Continue.", "Understood.", "Yes, please go on.", "Alright." NEVER ask questions, NEVER give feedback, NEVER elaborate, NEVER interrupt.

If the student indicates they have finished (says "done", "that's all", "I've finished", "end", or makes a long pause), respond only: "Thank you very much." and stop.

SESSION CONTEXT:
- Modality: ${ctx.tipoOral === "taught" ? "teacher-assessed" : "school-supported self-taught"}
- Global issue: «${ctx.asuntoGlobal}»
- Work 1: ${ctx.obra1Titulo} by ${ctx.obra1Autor}
- Extract 1: ${truncar(ctx.extracto1, 400)}
- Work 2: ${ctx.obra2Titulo} by ${ctx.obra2Autor}
- Extract 2: ${truncar(ctx.extracto2, 400)}

Remember: your only role right now is to listen. Do not greet at length. Once the student starts speaking, limit yourself to brief affirmations.`;
}

function buildSystemPromptFase2EN(ctx: {
  tipoOral: string;
  asuntoGlobal: string;
  obra1Titulo: string;
  obra1Autor: string;
  extracto1: string;
  obra2Titulo: string;
  obra2Autor: string;
  extracto2: string;
  transcripcionFase1: string;
}): string {
  return `You are an IB examiner for English A: Literature. You have just listened to the student's Individual Oral presentation and must now ask them between 4 and 5 questions, one at a time, always waiting for the student's full response before continuing.

ORAL CONTEXT:
- Modality: ${ctx.tipoOral === "taught" ? "teacher-assessed" : "school-supported self-taught"}
- Global issue: «${ctx.asuntoGlobal}»
- Work 1: ${ctx.obra1Titulo} by ${ctx.obra1Autor}
- Extract 1: ${truncar(ctx.extracto1, 500)}
- Work 2: ${ctx.obra2Titulo} by ${ctx.obra2Autor}
- Extract 2: ${truncar(ctx.extracto2, 500)}

STUDENT'S PRESENTATION TRANSCRIPT:
---
${ctx.transcripcionFase1 || "(Student presented orally; transcript not available)"}
---

IB ASSESSMENT CRITERIA (guide your questions):
A. Knowledge and interpretation — Does the student understand the literary text and interpret it with evidence?
B. Analysis and evaluation — Does the student analyse literary devices precisely and evaluate their effect?
C. Focus and organisation — Was the presentation coherent and well-structured?
D. Language — Was the analytical vocabulary precise and varied?

INSTRUCTIONS:
1. Ask questions ONE AT A TIME. Wait for the response before the next one.
2. Base each question on something specific the student said, or on something that needs deeper development.
3. Recommended question types:
   - Global issue specificity: "Could you elaborate on how this global issue functions as an interpretive lens for both works?"
   - Textual evidence: "Can you quote a specific passage from the extract that supports that interpretation?"
   - Device analysis: "What effect does that literary device have on the reader, and how does it connect to your global issue?"
   - Comparative: "How do the two works differ in their treatment of this global issue?"
   - Critical evaluation: "Are there other possible readings of the text? How would you justify yours against alternative interpretations?"
4. Maintain an academic but accessible tone. Always respond in English.
5. After the student's final response, close with: "Thank you very much. The individual oral assessment is now complete."`;
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
      JSON.stringify({
        error: "Simulador no configurado en el servidor. Contacta al administrador.",
      }),
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
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "No autorizado." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verificar perfil activo
  const { data: perfil, error: perfilErr } = await adminClient
    .from("perfiles")
    .select("activo")
    .eq("user_id", user.id)
    .single();
  if (perfilErr || !perfil || !perfil.activo) {
    return new Response(JSON.stringify({ error: "Usuario inactivo." }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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

  // Reservar cuota de forma atómica según la fase.
  // El RPC devuelve el uuid de la fila reservada, o null si cuota agotada / sin fase1 activa.
  // Si ElevenLabs falla, cancelamos la reserva borrando esa fila.
  let usoId: string | null = null;

  if (fase === 1) {
    const { data, error: cuotaErr } = await adminClient.rpc("reservar_cuota_simulador", {
      p_user_id: user.id,
      p_limite: LIMITE_SIMULACIONES_DIARIO,
    });
    if (cuotaErr) {
      return new Response(JSON.stringify({ error: "Error al verificar cuota." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!data) {
      return new Response(
        JSON.stringify({
          error: `Has alcanzado el límite de ${LIMITE_SIMULACIONES_DIARIO} simulaciones por día. Vuelve mañana.`,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    usoId = data as string;
  } else {
    const { data, error: cuotaErr } = await adminClient.rpc("reservar_fase2_simulador", {
      p_user_id: user.id,
    });
    if (cuotaErr) {
      return new Response(JSON.stringify({ error: "Error al verificar cuota." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!data) {
      return new Response(
        JSON.stringify({ error: "No hay una sesión de fase 1 activa para continuar." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    usoId = data as string;
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

  const courseKey = parseCourseKey((body as Record<string, unknown>).course_key);
  const isEN = courseKey === "english-a-literature";
  const isSelfTaught = ctx.tipoOral === "self_taught";
  const systemPrompt = isEN
    ? fase === 1
      ? buildSystemPromptFase1EN(ctx)
      : buildSystemPromptFase2EN(ctx)
    : fase === 1
      ? buildSystemPromptFase1(ctx)
      : buildSystemPromptFase2(ctx);

  const firstMessage =
    fase === 1
      ? isEN
        ? isSelfTaught
          ? `Good morning. I am your examiner today. Whenever you are ready, you may begin your continuous oral on the global issue: «${ctx.asuntoGlobal}». You have approximately fifteen minutes.`
          : `Good morning. I am your examiner today. Whenever you are ready, you may begin your presentation on the global issue: «${ctx.asuntoGlobal}». You have approximately ten minutes.`
        : isSelfTaught
          ? `Buenos días. Soy tu evaluador de hoy. Cuando estés listo, puedes comenzar tu oral continuo sobre el asunto global: «${ctx.asuntoGlobal}». Tienes aproximadamente quince minutos.`
          : `Buenos días. Soy tu evaluador de hoy. Cuando estés listo, puedes comenzar tu presentación sobre el asunto global: «${ctx.asuntoGlobal}». Tienes aproximadamente diez minutos.`
      : isEN
        ? `Thank you for your presentation. We now move to the second part: I will ask you between four and five questions about what you have just presented. Take as much time as you need to answer in detail. Ready?`
        : `Gracias por tu presentación. Ahora pasamos a la segunda parte: te haré entre cuatro y cinco preguntas sobre lo que has expuesto. Tómate el tiempo que necesites para responder con detalle. ¿Listo?`;

  // Obtener signed URL de ElevenLabs con config override
  let elevenRes: Response;
  try {
    elevenRes = await fetch("https://api.elevenlabs.io/v1/convai/conversation/get_signed_url", {
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
            language: isEN ? "en" : "es",
          },
        },
      }),
    });
  } catch {
    if (usoId) await adminClient.from("llm_uso").delete().eq("id", usoId);
    return new Response(
      JSON.stringify({ error: "Error al conectar con el servicio de simulación." }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!elevenRes.ok) {
    const txt = await elevenRes.text().catch(() => "");
    if (usoId) await adminClient.from("llm_uso").delete().eq("id", usoId);
    return new Response(
      JSON.stringify({
        error: `Error del servicio de simulación (${elevenRes.status}): ${txt.slice(0, 200)}`,
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const elevenData = await elevenRes.json();
  if (!isRecord(elevenData) || typeof elevenData.signed_url !== "string") {
    if (usoId) await adminClient.from("llm_uso").delete().eq("id", usoId);
    return new Response(
      JSON.stringify({ error: "Respuesta inesperada del servicio de simulación." }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ signed_url: elevenData.signed_url }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
