import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Google Calendar helpers ────────────────────────────────────────────────────

function b64url(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson) as {
    client_email: string;
    private_key: string;
  };

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimSet: Record<string, string | number> = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const body = b64url(JSON.stringify(claimSet));
  const signingInput = `${header}.${body}`;

  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\n/g, "")
    .trim();
  const keyDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );
  const sigB64 = b64url(String.fromCharCode(...new Uint8Array(sig)));
  const jwt = `${signingInput}.${sigB64}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = (await resp.json()) as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(`Google token error: ${data.error ?? "unknown"}`);
  return data.access_token;
}

async function crearEventoCalendario(opts: {
  accessToken: string;
  bookingId: string;
  startsAt: string;
  endsAt: string;
  calendarId: string;
}): Promise<{ meetLink: string; eventId: string }> {
  const { accessToken, bookingId, startsAt, endsAt, calendarId } = opts;

  const event = {
    summary: "Sesión IB 1:1 — LIBerico",
    description: "Sesión de calibración IB con LIBerico.",
    start: { dateTime: startsAt, timeZone: "Europe/Stockholm" },
    end: { dateTime: endsAt, timeZone: "Europe/Stockholm" },
    conferenceData: {
      createRequest: {
        requestId: bookingId,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 24 * 60 },
        { method: "popup", minutes: 30 },
      ],
    },
  };

  const resp = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=none`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
    },
  );
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Google Calendar API error: ${err}`);
  }

  const data = (await resp.json()) as {
    id: string;
    conferenceData?: {
      entryPoints?: Array<{ entryPointType: string; uri: string }>;
    };
  };

  const meetLink =
    data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ?? "";

  return { meetLink, eventId: data.id };
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_SERVICE_ROLE_KEY) return json({ error: "Configuración incompleta" }, 500);

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
      return json({ error: "No autorizado" }, 401);
    }
    const { data: userData, error: userErr } = await anonClient.auth.getUser(parts[1]);
    if (userErr || !userData.user) return json({ error: "No autorizado" }, 401);

    const studentId = userData.user.id;

    // Solo alumnos pueden reservar
    const { data: perfil } = await anonClient
      .from("perfiles")
      .select("rol, activo, email")
      .eq("user_id", studentId)
      .maybeSingle();
    if (!perfil?.activo || perfil.rol !== "alumno") {
      return json({ error: "Solo alumnos pueden reservar sesiones" }, 403);
    }
    const body = (await req.json().catch(() => ({}))) as {
      slot_id?: unknown;
      student_goal?: unknown;
      student_timezone?: unknown;
      consent_history?: unknown;
      consent_payment?: unknown;
    };

    const slotId = typeof body.slot_id === "string" ? body.slot_id : null;
    const goal = typeof body.student_goal === "string" ? body.student_goal.slice(0, 1000) : "";
    const timezone =
      typeof body.student_timezone === "string"
        ? body.student_timezone.slice(0, 80)
        : "Europe/Stockholm";
    const consentHistory = body.consent_history === true;
    const consentPayment = body.consent_payment === true;

    if (!slotId) return json({ error: "slot_id requerido" }, 400);
    if (!consentHistory || !consentPayment) {
      return json({ error: "Debes aceptar ambos consentimientos para continuar" }, 400);
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verificar slot disponible
    const { data: slot, error: slotErr } = await adminClient
      .from("booking_slots")
      .select("id, teacher_id, status, price_sek, starts_at, ends_at")
      .eq("id", slotId)
      .eq("status", "available")
      .maybeSingle();

    if (slotErr) throw slotErr;
    if (!slot) return json({ error: "El slot no está disponible" }, 409);

    // Calcular precio con moms (25%)
    const priceSek = slot.price_sek as number;
    const vatSek = Math.round(priceSek * 0.25);
    const totalSek = priceSek + vatSek;

    // Crear reserva auto-confirmada
    const { data: booking, error: bookingErr } = await adminClient
      .from("bookings")
      .insert({
        student_id: studentId,
        teacher_id: slot.teacher_id,
        slot_id: slotId,
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        price_sek: priceSek,
        vat_sek: vatSek,
        total_sek: totalSek,
        student_goal: goal,
        student_timezone: timezone,
        consent_history: consentHistory,
        consent_payment: consentPayment,
      })
      .select("id")
      .single();

    if (bookingErr) throw bookingErr;

    // Marcar slot como reservado — .eq("status","available") actúa como guard contra race condition
    const { data: slotUpdated, error: bookErr } = await adminClient
      .from("booking_slots")
      .update({ status: "booked" })
      .eq("id", slotId)
      .eq("status", "available")
      .select("id");

    if (bookErr) throw bookErr;
    if (!slotUpdated || slotUpdated.length === 0) {
      await adminClient.from("bookings").delete().eq("id", booking.id);
      return json({ error: "El slot ya no está disponible" }, 409);
    }

    // Crear acceso del profesor al historial del alumno (7 días post-sesión)
    if (consentHistory) {
      const sessionEnd = new Date(slot.ends_at as string);
      const accessEnd = new Date(sessionEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
      await adminClient.from("booking_teacher_access").insert({
        booking_id: booking.id,
        teacher_id: slot.teacher_id,
        student_id: studentId,
        access_starts_at: new Date().toISOString(),
        access_ends_at: accessEnd.toISOString(),
      });
    }

    // Crear evento Google Calendar (opcional; la reserva queda registrada aunque falle la sync).
    let meetLink: string | null = null;
    let calendarEventId: string | null = null;
    let calendarId: string | null = null;
    let calendarSyncStatus: "not_attempted" | "synced" | "failed" = "not_attempted";
    let calendarSyncError: string | null = null;
    const googleSAJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    const libericoCalendarId = Deno.env.get("LIBERICO_CALENDAR_ID") ?? "";
    if (googleSAJson && libericoCalendarId) {
      try {
        calendarId = libericoCalendarId;
        const accessToken = await getGoogleAccessToken(googleSAJson);
        const resultado = await crearEventoCalendario({
          accessToken,
          bookingId: booking.id,
          startsAt: slot.starts_at as string,
          endsAt: slot.ends_at as string,
          calendarId: libericoCalendarId,
        });
        meetLink = resultado.meetLink || null;
        calendarEventId = resultado.eventId || null;
        calendarSyncStatus = "synced";

        await adminClient
          .from("bookings")
          .update({
            meet_link: meetLink,
            calendar_event_id: calendarEventId,
            calendar_id: calendarId,
            calendar_sync_status: calendarSyncStatus,
            calendar_sync_error: null,
            calendar_synced_at: new Date().toISOString(),
          })
          .eq("id", booking.id);
      } catch (calErr) {
        console.error("Google Calendar error (no bloquea la reserva):", calErr);
        calendarSyncStatus = "failed";
        calendarSyncError =
          calErr instanceof Error ? calErr.message.slice(0, 1000) : "Error desconocido";
        await adminClient
          .from("bookings")
          .update({
            calendar_id: calendarId,
            calendar_sync_status: calendarSyncStatus,
            calendar_sync_error: calendarSyncError,
          })
          .eq("id", booking.id);
      }
    } else {
      calendarSyncStatus = "failed";
      calendarSyncError = !googleSAJson
        ? "GOOGLE_SERVICE_ACCOUNT_JSON no configurado"
        : "LIBERICO_CALENDAR_ID no configurado";
      await adminClient
        .from("bookings")
        .update({
          calendar_sync_status: calendarSyncStatus,
          calendar_sync_error: calendarSyncError,
        })
        .eq("id", booking.id);
    }

    return json({
      booking_id: booking.id,
      total_sek: totalSek,
      meet_link: meetLink,
      calendar_sync_status: calendarSyncStatus,
      calendar_sync_error: calendarSyncError,
    });
  } catch (e) {
    console.error("create-booking error:", e);
    return json({ error: "Error interno del servidor" }, 500);
  }
});
