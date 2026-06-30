// Edge Function: create-oral-b-session
// Inicia/continúa una sesión de oral conversacional en vivo de Spanish B con un
// avatar examinador (worker GPU propio: SoulX + Kokoro + Claude, vía LiveKit). 3 partes:
//   fase 1 → presentación (escucha), fase 2 → discusión del estímulo (B1),
//   fase 3 → discusión general (B2). NM parte de un estímulo visual; NS de un pasaje literario.
//
// Flujo:
//  1. Auth → perfil activo.
//  2. fase 1: reservar cuota diaria + deducir créditos (con reembolso si falla el arranque).
//     fase 2/3: reservar continuación (sin cobro), exige una fase anterior activa.
//  3. Construir prompt del examinador (siempre en español) + firstMessage según fase/nivel.
//  4. Crear una room de LiveKit, acuñar el token de acceso del alumno y (TODO) despachar el worker GPU.
//  5. Devolver { livekit_url, token, room } al cliente, que se conecta como participante.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  buildOralBFirstMessage,
  buildOralBFullPrompt,
  type OralBSessionCtx,
} from "../_shared/prompts/spanish-b-language.ts";

/** Acuña un access token (JWT HS256) de LiveKit con Web Crypto (sin dependencias). */
async function mintLiveKitToken(
  apiKey: string,
  apiSecret: string,
  identity: string,
  room: string,
  ttlSec = 3600,
): Promise<string> {
  const enc = new TextEncoder();
  const b64url = (bytes: Uint8Array) =>
    btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_")
      .replace(/=+$/, "");
  const b64urlStr = (s: string) =>
    btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const now = Math.floor(Date.now() / 1000);
  const header = b64urlStr(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64urlStr(
    JSON.stringify({
      iss: apiKey,
      sub: identity,
      name: identity,
      nbf: now,
      exp: now + ttlSec,
      video: {
        room,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      },
    }),
  );
  const data = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, enc.encode(data)),
  );
  return `${data}.${b64url(sig)}`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Sin límite diario de orales (el coste lo controlan los créditos). Configurable por si se quisiera un tope.
const LIMITE_SESIONES_DIARIO = Number(Deno.env.get("ORAL_B_LIMITE_DIARIO")) ||
  1_000_000;
const CREDITOS_SESION = 5.0;
// Tope global de sesiones en paralelo. Debe coincidir con `max_containers`
// (AVATAR_MAX_PARALLEL) del worker GPU en avatar-service/modal_app.py: 1 alumno = 1 GPU.
const MAX_SESIONES_PARALELO = Number(Deno.env.get("AVATAR_MAX_PARALLEL")) || 3;

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
function buildEstimuloBloque(
  nivel: "SL" | "HL",
  body: Record<string, unknown>,
): string {
  if (nivel === "HL") {
    const pasaje = truncar(asString(body.literary_passage));
    const obra = asString(body.obra);
    const autor = asString(body.autor);
    const ref = [obra, autor].filter(Boolean).join(" — ");
    return `Pasaje literario${ref ? ` (${ref})` : ""}:\n"""${pasaje}"""`;
  }
  const desc = truncar(
    asString(body.image_alt) || asString(body.stimulus_description),
  );
  return `Imagen (descripción para el examinador): ${desc}`;
}

// Modelo de análisis del estímulo: Opus (razonamiento + visión). Configurable.
const ANALYSIS_MODEL = Deno.env.get("ANTHROPIC_ANALYSIS_MODEL") ??
  "claude-opus-4-8";

/**
 * Análisis experto del estímulo con Opus (con VISIÓN si hay imagen accesible por URL), UNA vez al inicio.
 * Produce un dossier (análisis + ángulos de pregunta) que nutre las preguntas del examinador en vivo (Haiku).
 * No bloqueante: si falla, devuelve null y el oral sigue sin dossier.
 */
async function analizarEstimuloConOpus(opts: {
  apiKey: string;
  nivel: "SL" | "HL";
  estimuloBloque: string;
  temaArea: string;
  imageUrl?: string;
}): Promise<string | null> {
  const sys =
    "Eres un examinador experto de IB Spanish B (Adquisición de lenguas) preparando el oral individual. " +
    "Analizas el estímulo del alumno para conducir después una discusión rica y bien fundamentada. " +
    "Escribe SOLO en español, en texto plano (sin markdown).";
  const instruccion =
    `Nivel: ${
      opts.nivel === "HL"
        ? "Nivel Superior (pasaje literario)"
        : "Nivel Medio (estímulo visual)"
    }. ` +
    `Área temática: ${opts.temaArea}.\n${opts.estimuloBloque}\n\n` +
    "Devuelve, conciso:\n" +
    "1) ANÁLISIS: temas e ideas clave, detalles concretos observables, tensiones o matices, y conexiones con la(s) cultura(s) hispanohablantes.\n" +
    "2) PREGUNTAS: 6 preguntas abiertas, específicas a ESTE estímulo y graduadas de menor a mayor exigencia, que inviten a interpretar, opinar y comparar culturas.";

  const content: Array<Record<string, unknown>> = [];
  if (opts.imageUrl && /^https?:\/\//i.test(opts.imageUrl)) {
    content.push({
      type: "image",
      source: { type: "url", url: opts.imageUrl },
    });
  }
  content.push({ type: "text", text: instruccion });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": opts.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANALYSIS_MODEL,
        max_tokens: 1200,
        system: sys,
        messages: [{ role: "user", content }],
      }),
    });
    if (!r.ok) {
      console.error("analizarEstimuloConOpus: HTTP", r.status, await r.text());
      return null;
    }
    const data = await r.json();
    const text = Array.isArray(data?.content)
      ? data.content.filter((b: { type?: string }) => b?.type === "text").map((
        b: { text?: string },
      ) => b.text ?? "").join("\n").trim()
      : "";
    return text || null;
  } catch (e) {
    console.error("analizarEstimuloConOpus: error", e);
    return null;
  }
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
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const LIVEKIT_URL = Deno.env.get("LIVEKIT_URL");
  const LIVEKIT_API_KEY = Deno.env.get("LIVEKIT_API_KEY");
  const LIVEKIT_API_SECRET = Deno.env.get("LIVEKIT_API_SECRET");

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Configuración del servidor incompleta." }, 500);
  }
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    return json({
      error:
        "Simulador no configurado en el servidor. Contacta al administrador.",
    }, 500);
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
  if (perfilErr || !perfil || !perfil.activo) {
    return json({ error: "Usuario inactivo." }, 403);
  }

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

  // ── Kill-switch operativo ────────────────────────────────────────────────
  // Si el worker GPU (Modal) está parado o en mantenimiento, ponemos
  // ORAL_B_CONVERSATION_ENABLED="false" para rechazar ANTES de tocar
  // cuota/créditos, con un mensaje limpio. (Aunque no se ponga, el edge ya
  // reembolsa si el dispatch falla; esto solo evita el churn y el error confuso.)
  // Por defecto (variable sin definir) el oral está habilitado.
  const habilitado = (Deno.env.get("ORAL_B_CONVERSATION_ENABLED") ?? "true")
    .toLowerCase();
  if (habilitado === "false" || habilitado === "0") {
    return json(
      {
        error:
          "El oral conversacional está temporalmente en mantenimiento. Vuelve a intentarlo más tarde (no se te ha cobrado ningún crédito).",
      },
      503,
    );
  }

  // ── Confirmación idempotente ─────────────────────────────────────────────
  // El warmup de fase 1 ya reserva cuota y cobra antes de gastar Opus/GPU. Si el
  // cliente conserva la llamada {confirm:true}, respondemos sin volver a cobrar.
  if (fase === 1 && body.confirm === true) {
    const hace2h = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: sesionYaCobrada, error: sesionErr } = await adminClient
      .from("llm_uso")
      .select("id")
      .eq("user_id", user.id)
      .in("edge_function", ["spab-oral-session", "create-oral-b-session"])
      .eq("modelo", "elevenlabs-convai-oral-b-fase1")
      .gte("created_at", hace2h)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sesionErr) return json({ error: "Error al verificar la sesión." }, 500);
    if (sesionYaCobrada?.id) {
      return json({
        ok: true,
        charged: false,
        already_charged: true,
        fase,
        nivel,
      });
    }

    // Fallback para clientes antiguos que llamen directamente con confirm:true.
    const { data: reserva, error: cuotaErr } = await adminClient.rpc(
      "reservar_cuota_oral_b_sesion",
      {
        p_user_id: user.id,
        p_limite: LIMITE_SESIONES_DIARIO,
      },
    );
    if (cuotaErr) return json({ error: "Error al verificar cuota." }, 500);
    if (!reserva) {
      return json(
        {
          error:
            `Has alcanzado el límite de ${LIMITE_SESIONES_DIARIO} sesiones por día. Vuelve mañana.`,
        },
        429,
      );
    }
    const confirmUsoId = reserva as string;
    const { data: nuevoSaldo, error: creditErr } = await adminClient.rpc(
      "deducir_creditos",
      {
        p_user_id: user.id,
        p_cantidad: CREDITOS_SESION,
        p_concepto: "oral-b-session",
        p_metadata: { nivel, fase: "confirm_fallback", uso_id: confirmUsoId },
      },
    );
    if (creditErr) {
      await adminClient.from("llm_uso").delete().eq("id", confirmUsoId);
      return json({ error: "No se pudo verificar tu saldo de créditos." }, 500);
    }
    if (nuevoSaldo === null) {
      await adminClient.from("llm_uso").delete().eq("id", confirmUsoId);
      return json(
        {
          error:
            `Créditos insuficientes. Necesitas ${CREDITOS_SESION} créditos para esta sesión.`,
        },
        402,
      );
    }
    return json({ ok: true, charged: true, fase, nivel });
  }

  // ── Reserva (warmup fase 1 con cobro · continuación fase 2/3) ─────────────
  let usoId: string | null = null;
  let creditosCobrados = false;

  if (fase === 1) {
    // WARMUP: reserva cuota y cobra antes de gastar Opus/GPU. Si el dispatch falla,
    // cancelar() borra el placeholder y reembolsa.
    const { data: haySlot, error: slotErr } = await adminClient.rpc(
      "hay_slot_oral_b_global",
      {
        p_user_id: user.id,
        p_max: MAX_SESIONES_PARALELO,
      },
    );
    if (!slotErr && haySlot === false) {
      return json(
        {
          error:
            "Ahora mismo no hay un examinador libre. Inténtalo de nuevo en unos minutos (no se te ha cobrado ningún crédito).",
        },
        503,
      );
    }

    const { data: reserva, error: cuotaErr } = await adminClient.rpc(
      "reservar_cuota_oral_b_sesion",
      {
        p_user_id: user.id,
        p_limite: LIMITE_SESIONES_DIARIO,
      },
    );
    if (cuotaErr) return json({ error: "Error al verificar cuota." }, 500);
    if (!reserva) {
      return json(
        {
          error:
            `Has alcanzado el límite de ${LIMITE_SESIONES_DIARIO} sesiones por día. Vuelve mañana.`,
        },
        429,
      );
    }
    usoId = reserva as string;

    const { data: nuevoSaldo, error: creditErr } = await adminClient.rpc(
      "deducir_creditos",
      {
        p_user_id: user.id,
        p_cantidad: CREDITOS_SESION,
        p_concepto: "oral-b-session",
        p_metadata: { nivel, fase: "warmup", uso_id: usoId },
      },
    );
    if (creditErr) {
      await adminClient.from("llm_uso").delete().eq("id", usoId);
      return json({ error: "No se pudo verificar tu saldo de créditos." }, 500);
    }
    if (nuevoSaldo === null) {
      await adminClient.from("llm_uso").delete().eq("id", usoId);
      return json(
        {
          error:
            `Créditos insuficientes. Necesitas ${CREDITOS_SESION} créditos para esta sesión.`,
        },
        402,
      );
    }
    creditosCobrados = true;
  } else {
    const { data: reserva, error: cuotaErr } = await adminClient.rpc(
      "reservar_continuacion_oral_b",
      {
        p_user_id: user.id,
        p_fase: fase,
      },
    );
    if (cuotaErr) return json({ error: "Error al verificar la sesión." }, 500);
    if (!reserva) {
      return json({ error: "No hay una sesión activa para continuar." }, 429);
    }
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

  // ── Dossier del estímulo (Opus, con visión) ──────────────────────────────
  // Se computa UNA vez (en fase 1, durante la preparación) y el cliente lo reenvía en fase 2/3 para no
  // recomputarlo. Nutre las preguntas del examinador en vivo (Haiku) en la discusión. No bloqueante.
  const estimuloBloque = buildEstimuloBloque(nivel, body);
  const temaArea = asString(body.tema_area) ||
    "(área temática no especificada)";
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  let analisisEstimulo = asString(body.analisis_estimulo) || undefined;
  if (!analisisEstimulo && ANTHROPIC_API_KEY && (fase === 1 || fase === 2)) {
    analisisEstimulo = (await analizarEstimuloConOpus({
      apiKey: ANTHROPIC_API_KEY,
      nivel,
      estimuloBloque,
      temaArea,
      imageUrl: asString(body.image_url) || undefined,
    })) ?? undefined;
  }

  // ── Prompts del examinador para LAS 3 PARTES ─────────────────────────────
  // Un solo bot vive todo el oral (misma sala, memoria continua); el cambio de parte llega por datachannel.
  // Por eso construimos aquí los prompts de las 3 fases (sin transcripcionPrevia: el bot ya tiene el contexto
  // de la conversación en vivo) y se los pasamos todos al despachar.
  const ctxBase = {
    nivel,
    estimuloBloque,
    temaArea,
    culturaConexion: asString(body.cultura_conexion) || undefined,
    analisisEstimulo,
  };
  const ctxDe = (f: 1 | 2 | 3): OralBSessionCtx => ({ ...ctxBase, fase: f });
  // Un solo prompt para todo el oral (el bot cambia de parte por instrucción de control, no swap de system).
  const systemPrompt = buildOralBFullPrompt(ctxDe(1));
  const firstMessage = buildOralBFirstMessage(ctxDe(1)); // saludo de apertura (Parte 1)

  // ── Room de LiveKit + token del alumno + dispatch del worker GPU (Modal) ──
  // Room nueva por cada parte (cada fase lanza su propio bot con el prompt de esa fase; el contexto de
  // partes anteriores ya va en el prompt vía `transcripcion_previa`).
  const room = `oral-b-${user.id.slice(0, 8)}-${fase}-${Date.now()}`;
  const identity = `alumno-${user.id.slice(0, 8)}`;

  let token: string;
  try {
    token = await mintLiveKitToken(
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      identity,
      room,
    );
  } catch {
    await cancelar();
    return json({ error: "No se pudo preparar la sesión de vídeo." }, 502);
  }

  // Dispatch del worker GPU: el endpoint de Modal lanza el bot del avatar en esta room (scale-to-zero;
  // ver avatar-service/modal_app.py). Si MODAL_DISPATCH_URL no está configurado (dev), se omite y el
  // alumno entra a la room sin avatar (útil para probar el frontend sin GPU).
  const MODAL_DISPATCH_URL = Deno.env.get("MODAL_DISPATCH_URL");
  const MODAL_CONTROL_TOKEN = Deno.env.get("MODAL_CONTROL_TOKEN");
  let workerDispatched = false;
  if (MODAL_DISPATCH_URL) {
    if (!MODAL_CONTROL_TOKEN) {
      await cancelar();
      return json({ error: "Configuración del examinador incompleta." }, 500);
    }
    try {
      const r = await fetch(MODAL_DISPATCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          control_token: MODAL_CONTROL_TOKEN ?? "",
          room,
          system_prompt: systemPrompt, // prompt único de todo el oral
          first_message: firstMessage,
          nivel,
        }),
      });
      workerDispatched = r.ok;
      if (!r.ok) {
        await cancelar();
        return json({
          error:
            "No se pudo iniciar el examinador. Inténtalo de nuevo en unos minutos.",
        }, 502);
      }
    } catch {
      await cancelar();
      return json({
        error:
          "No se pudo iniciar el examinador. Inténtalo de nuevo en unos minutos.",
      }, 502);
    }
  }

  return json({
    livekit_url: LIVEKIT_URL,
    token,
    room,
    identity,
    fase,
    nivel,
    worker_dispatched: workerDispatched,
    analisis_estimulo: analisisEstimulo ?? null, // el cliente lo reenvía en fase 2/3 (no recomputar)
  });
});
