import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACCESS_DAYS_POST_SESSION = 7;

// ── Google Calendar helpers ───────────────────────────────────────────────────

function b64url(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function getGoogleAccessToken(serviceAccountJson: string, subject?: string): Promise<string> {
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
  if (subject) claimSet.sub = subject;
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

async function eliminarEventoCalendario(opts: {
  accessToken: string;
  calendarId: string;
  eventId: string;
}): Promise<void> {
  const { accessToken, calendarId, eventId } = opts;
  const resp = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!resp.ok && resp.status !== 404 && resp.status !== 410) {
    const err = await resp.text();
    throw new Error(`Google Calendar delete error: ${err}`);
  }
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

    // Solo admin puede confirmar, cancelar o eliminar
    const { data: perfil } = await anonClient
      .from("perfiles")
      .select("rol, activo")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!perfil || perfil.rol !== "admin" || !perfil.activo) {
      return json({ error: "Acceso denegado" }, 403);
    }

    const body = (await req.json().catch(() => ({}))) as {
      booking_id?: unknown;
      action?: unknown;
    };

    const bookingId = typeof body.booking_id === "string" ? body.booking_id : null;
    // action: "confirm" | "cancel" | "delete"
    const action =
      body.action === "cancel" ? "cancel" : body.action === "delete" ? "delete" : "confirm";

    if (!bookingId) return json({ error: "booking_id requerido" }, 400);

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Cargar reserva
    const { data: booking, error: bookingErr } = await adminClient
      .from("bookings")
      .select(
        "id, student_id, teacher_id, slot_id, status, consent_history, calendar_event_id, calendar_id, theory_focus_id",
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingErr) throw bookingErr;
    if (!booking) return json({ error: "Reserva no encontrada" }, 404);
    if (booking.status === "confirmed" && action === "confirm") {
      return json({ ok: true, already: true });
    }

    // ── CANCELAR ────────────────────────────────────────────────────────────
    if (action === "cancel") {
      await adminClient.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
      await adminClient
        .from("booking_slots")
        .update({ status: "available" })
        .eq("id", booking.slot_id);

      // Revocar acceso del profesor al historial del alumno
      await adminClient
        .from("booking_teacher_access")
        .update({ revoked_at: new Date().toISOString() })
        .eq("booking_id", bookingId)
        .is("revoked_at", null);

      // Los theory_access_grants se conservan aunque se cancele la reserva
      // (el alumno ya pagó / fue confirmado antes de la cancelación).

      if (booking.calendar_event_id && booking.calendar_id) {
        try {
          const googleSAJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
          if (googleSAJson) {
            const accessToken = await getGoogleAccessToken(googleSAJson);
            await eliminarEventoCalendario({
              accessToken,
              calendarId: booking.calendar_id as string,
              eventId: booking.calendar_event_id as string,
            });
            await adminClient
              .from("bookings")
              .update({
                calendar_sync_status: "cancelled",
                calendar_sync_error: null,
                calendar_synced_at: new Date().toISOString(),
              })
              .eq("id", bookingId);
          }
        } catch (calErr) {
          console.error("Google Calendar delete error (no bloquea la cancelación):", calErr);
          await adminClient
            .from("bookings")
            .update({
              calendar_sync_status: "failed",
              calendar_sync_error:
                calErr instanceof Error ? calErr.message.slice(0, 1000) : "Error desconocido",
            })
            .eq("id", bookingId);
        }
      }
      return json({ ok: true, status: "cancelled" });
    }

    // ── ELIMINAR ─────────────────────────────────────────────────────────────
    if (action === "delete") {
      if (booking.status !== "cancelled") {
        return json({ error: "Solo se pueden eliminar reservas canceladas" }, 400);
      }
      if (booking.calendar_event_id && booking.calendar_id) {
        try {
          const googleSAJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
          if (googleSAJson) {
            const accessToken = await getGoogleAccessToken(googleSAJson);
            await eliminarEventoCalendario({
              accessToken,
              calendarId: booking.calendar_id as string,
              eventId: booking.calendar_event_id as string,
            });
          }
        } catch (calErr) {
          console.error("Calendar cleanup en delete (no bloquea):", calErr);
        }
      }
      await adminClient.from("booking_teacher_access").delete().eq("booking_id", bookingId);
      await adminClient.from("booking_notes").delete().eq("booking_id", bookingId);
      await adminClient.from("bookings").delete().eq("id", bookingId);
      return json({ ok: true, status: "deleted" });
    }

    // ── CONFIRMAR ────────────────────────────────────────────────────────────

    // Obtener fecha de sesión para calcular access_ends_at
    const { data: slot } = await adminClient
      .from("booking_slots")
      .select("starts_at, ends_at")
      .eq("id", booking.slot_id)
      .maybeSingle();

    const sessionEndsAt = slot?.ends_at ? new Date(slot.ends_at as string) : new Date();
    const accessEndsAt = new Date(sessionEndsAt);
    accessEndsAt.setDate(accessEndsAt.getDate() + ACCESS_DAYS_POST_SESSION);

    // Confirmar reserva
    await adminClient
      .from("bookings")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", bookingId);

    // Marcar slot como booked
    await adminClient.from("booking_slots").update({ status: "booked" }).eq("id", booking.slot_id);

    // Crear acceso temporal del profesor al historial si el alumno consintió
    if (booking.consent_history) {
      await adminClient.from("booking_teacher_access").insert({
        booking_id: bookingId,
        teacher_id: booking.teacher_id,
        student_id: booking.student_id,
        access_starts_at: new Date().toISOString(),
        access_ends_at: accessEndsAt.toISOString(),
      });
    }

    // Crear grant de Teoría si el alumno eligió un foco.
    // ignoreDuplicates evita error si la sección ya estaba desbloqueada por una reserva anterior.
    if (booking.theory_focus_id) {
      await adminClient.from("theory_access_grants").upsert(
        {
          user_id: booking.student_id,
          section_id: booking.theory_focus_id,
          source_booking_id: bookingId,
        },
        { onConflict: "user_id,section_id", ignoreDuplicates: true },
      );
    }

    // Crear evento Google Calendar (no bloquea la confirmación si falla)
    let meetLink: string | null = null;
    let calendarEventId: string | null = null;
    let calendarId: string | null = null;
    let calendarSyncStatus: "not_attempted" | "synced" | "failed" = "not_attempted";
    let calendarSyncError: string | null = null;

    const googleSAJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    const libericoCalendarId = Deno.env.get("LIBERICO_CALENDAR_ID") ?? "";
    if (googleSAJson && libericoCalendarId && slot) {
      try {
        calendarId = libericoCalendarId;
        const accessToken = await getGoogleAccessToken(googleSAJson);
        const resultado = await crearEventoCalendario({
          accessToken,
          bookingId,
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
          .eq("id", bookingId);
      } catch (calErr) {
        console.error("Google Calendar error (no bloquea la confirmación):", calErr);
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
          .eq("id", bookingId);
      }
    } else {
      calendarSyncStatus = "failed";
      calendarSyncError = !googleSAJson
        ? "GOOGLE_SERVICE_ACCOUNT_JSON no configurado"
        : !libericoCalendarId
          ? "LIBERICO_CALENDAR_ID no configurado"
          : "Datos del slot no disponibles";
      await adminClient
        .from("bookings")
        .update({
          calendar_sync_status: calendarSyncStatus,
          calendar_sync_error: calendarSyncError,
        })
        .eq("id", bookingId);
    }

    return json({
      ok: true,
      status: "confirmed",
      meet_link: meetLink,
      calendar_sync_status: calendarSyncStatus,
      calendar_sync_error: calendarSyncError,
    });
  } catch (e) {
    console.error("confirm-booking error:", e);
    return json({ error: "Error interno del servidor" }, 500);
  }
});
