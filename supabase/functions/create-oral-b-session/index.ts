// Edge Function: create-oral-b-session
// Inicia/continúa una sesión de oral conversacional en vivo de Spanish B con un
// avatar examinador (ElevenLabs ConvAI). El oral tiene 3 partes:
//   fase 1 → presentación (escucha), fase 2 → discusión del estímulo (B1),
//   fase 3 → discusión general (B2). NM parte de un estímulo visual; NS de un pasaje literario.
//
// Flujo:
//  1. Auth → perfil activo.
//  2. fase 1: reservar cuota diaria + deducir créditos (con reembolso si falla ElevenLabs).
//     fase 2/3: reservar continuación (sin cobro), exige una fase anterior activa.
//  3. Construir prompt del examinador (siempre en español) + firstMessage según fase/nivel.
//  4. Firmar signed_url de ElevenLabs con conversation_config_override (language: "es").

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  buildOralBFirstMessage,
  buildOralBSessionPrompt,
  type OralBSessionCtx,
} from "../_shared/prompts/spanish-b-language.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LIMITE_SESIONES_DIARIO = 3;
const CREDITOS_SESION = 5.0;

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function truncar(texto: string, max = 1200): string {
  return texto.length > max ? texto.slice(0, max) + "…" : texto;
}

/** Construye el bloque de estímulo que describe la imagen (NM) o el pasaje (NS). */
function buildEstimuloBloque(nivel: "SL" | "HL", body: Record<string, unknown>): string {
  if (nivel === "HL") {
    const pasaje = truncar(asString(body.literary_passage));
    const obra = asString(body.obra);
    const autor = asString(body.autor);
    const ref = [obra, autor].filter(Boolean).join(" — ");
    return `Pasaje literario${ref ? ` (${ref})` : ""}:\n"""${pasaje}"""`;
  }
  const desc = truncar(asString(body.image_alt) || asString(body.stimulus_description));
  return `Imagen (descripción para el examinador): ${desc}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
  const ELEVENLABS_AGENT_ID = Deno.env.get("ELEVENLABS_AGENT_ID");

  if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
    return json({ error: "Simulador no configurado en el servidor. Contacta al administrador." }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "No autorizado." }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: "No autorizado." }, 401);

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: perfil, error: perfilErr } = await adminClient
    .from("perfiles")
    .select("activo")
    .eq("user_id", user.id)
    .single();
  if (perfilErr || !perfil || !perfil.activo) return json({ error: "Usuario inactivo." }, 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body inválido." }, 400);
  }
  if (!isRecord(body)) return json({ error: "Body inválido." }, 400);

  const fase = body.fase;
  if (fase !== 1 && fase !== 2 && fase !== 3) {
    return json({ error: "fase debe ser 1, 2 o 3." }, 400);
  }
  const nivel: "SL" | "HL" = body.nivel === "HL" ? "HL" : "SL";

  // ── Reserva de cuota / créditos ──────────────────────────────────────────
  let usoId: string | null = null;
  let creditosCobrados = false;

  if (fase === 1) {
    const { data: reserva, error: cuotaErr } = await adminClient.rpc("reservar_cuota_oral_b_sesion", {
      p_user_id: user.id,
      p_limite: LIMITE_SESIONES_DIARIO,
    });
    if (cuotaErr) return json({ error: "Error al verificar cuota." }, 500);
    if (!reserva) {
      return json(
        { error: `Has alcanzado el límite de ${LIMITE_SESIONES_DIARIO} sesiones por día. Vuelve mañana.` },
        429,
      );
    }
    usoId = reserva as string;

    const { data: nuevoSaldo, error: creditErr } = await adminClient.rpc("deducir_creditos", {
      p_user_id: user.id,
      p_cantidad: CREDITOS_SESION,
      p_concepto: "oral-b-session",
      p_metadata: { nivel },
    });
    if (creditErr) {
      await adminClient.from("llm_uso").delete().eq("id", usoId);
      return json({ error: "No se pudo verificar tu saldo de créditos." }, 500);
    }
    if (nuevoSaldo === null) {
      await adminClient.from("llm_uso").delete().eq("id", usoId);
      return json(
        { error: `Créditos insuficientes. Necesitas ${CREDITOS_SESION} créditos para esta sesión.` },
        402,
      );
    }
    creditosCobrados = true;
  } else {
    const { data: reserva, error: cuotaErr } = await adminClient.rpc("reservar_continuacion_oral_b", {
      p_user_id: user.id,
      p_fase: fase,
    });
    if (cuotaErr) return json({ error: "Error al verificar la sesión." }, 500);
    if (!reserva) return json({ error: "No hay una sesión activa para continuar." }, 429);
    usoId = reserva as string;
  }

  // Limpieza ante fallo de ElevenLabs: borra el placeholder y reembolsa si se cobró.
  const cancelar = async () => {
    if (usoId) await adminClient.from("llm_uso").delete().eq("id", usoId);
    if (creditosCobrados) {
      await adminClient.rpc("reembolsar_creditos", {
        p_user_id: user.id,
        p_cantidad: CREDITOS_SESION,
        p_concepto: "oral-b-session",
        p_metadata: { motivo: "error_elevenlabs" },
      });
    }
  };

  // ── Prompt del examinador ────────────────────────────────────────────────
  const ctx: OralBSessionCtx = {
    fase,
    nivel,
    estimuloBloque: buildEstimuloBloque(nivel, body),
    temaArea: asString(body.tema_area) || "(área temática no especificada)",
    culturaConexion: asString(body.cultura_conexion) || undefined,
    transcripcionPrevia: asString(body.transcripcion_previa) || undefined,
  };
  const systemPrompt = buildOralBSessionPrompt(ctx);
  const firstMessage = buildOralBFirstMessage(ctx);

  // ── Firmar signed URL de ElevenLabs ──────────────────────────────────────
  let elevenRes: Response;
  try {
    elevenRes = await fetch("https://api.elevenlabs.io/v1/convai/conversation/get_signed_url", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
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
    });
  } catch {
    await cancelar();
    return json({ error: "Error al conectar con el servicio de simulación." }, 502);
  }

  if (!elevenRes.ok) {
    const txt = await elevenRes.text().catch(() => "");
    await cancelar();
    return json({ error: `Error del servicio de simulación (${elevenRes.status}): ${txt.slice(0, 200)}` }, 502);
  }

  const elevenData = await elevenRes.json();
  if (!isRecord(elevenData) || typeof elevenData.signed_url !== "string") {
    await cancelar();
    return json({ error: "Respuesta inesperada del servicio de simulación." }, 502);
  }

  return json({ signed_url: elevenData.signed_url });
});
