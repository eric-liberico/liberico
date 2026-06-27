import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ACCESS_DAYS_POST_SESSION = 7;

type CalendarSyncStatus = "not_attempted" | "synced" | "failed";

type BookingConfirmationResult = {
  ok: true;
  status: "confirmed";
  meet_link: string | null;
  calendar_sync_status: CalendarSyncStatus;
  calendar_sync_error: string | null;
  already?: true;
};

export class BookingConfirmationError extends Error {
  status: number;

  constructor(publicMessage: string, status: number) {
    super(publicMessage);
    this.name = "BookingConfirmationError";
    this.status = status;
  }
}

function b64url(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function getGoogleAccessToken(
  serviceAccountJson: string,
  subject?: string,
): Promise<string> {
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
    body:
      `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = (await resp.json()) as { access_token?: string; error?: string };
  if (!data.access_token) {
    throw new Error(`Google token error: ${data.error ?? "unknown"}`);
  }
  return data.access_token;
}

function focusLabelEs(focus: string | null): string | null {
  if (focus === "p1") return "Prueba 1";
  if (focus === "p2") return "Prueba 2";
  if (focus === "oral") return "Oral Individual";
  return null;
}

function buildEventDescription(opts: {
  sessionUrl: string | null;
  studentGoal: string | null;
  sessionFocus: string | null;
}): string {
  const lines = ["Sesión de calibración IB 1:1 con LIBerico."];
  const focus = focusLabelEs(opts.sessionFocus);
  if (focus) lines.push(`Enfoque: ${focus}.`);
  if (opts.studentGoal) lines.push(`Objetivo del alumno: ${opts.studentGoal}`);
  if (opts.sessionUrl) lines.push(`Sala de la clase: ${opts.sessionUrl}`);
  return lines.join("\n");
}

async function fetchParticipantEmails(
  adminClient: SupabaseClient,
  studentId: string,
  teacherId: string,
): Promise<{ studentEmail: string | null; teacherEmail: string | null }> {
  const [studentPerfil, teacherProfile, teacherPerfil] = await Promise.all([
    adminClient.from("perfiles").select("email").eq("user_id", studentId).maybeSingle(),
    adminClient.from("teacher_profiles").select("calendar_email").eq("user_id", teacherId).maybeSingle(),
    adminClient.from("perfiles").select("email").eq("user_id", teacherId).maybeSingle(),
  ]);
  return {
    studentEmail: (studentPerfil.data?.email as string | null) ?? null,
    teacherEmail:
      (teacherProfile.data?.calendar_email as string | null) ??
        (teacherPerfil.data?.email as string | null) ?? null,
  };
}

async function crearEventoCalendario(opts: {
  accessToken: string;
  bookingId: string;
  startsAt: string;
  endsAt: string;
  calendarId: string;
  description: string;
  attendeeEmails: string[];
  sendUpdates: "all" | "none";
}): Promise<{ meetLink: string; eventId: string }> {
  const {
    accessToken,
    bookingId,
    startsAt,
    endsAt,
    calendarId,
    description,
    attendeeEmails,
    sendUpdates,
  } = opts;

  const attendees = attendeeEmails
    .filter((e) => typeof e === "string" && e.includes("@"))
    .map((email) => ({ email }));

  const event = {
    summary: "Clase IB 1:1 — LIBerico",
    description,
    start: { dateTime: startsAt, timeZone: "UTC" },
    end: { dateTime: endsAt, timeZone: "UTC" },
    ...(attendees.length > 0 ? { attendees } : {}),
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
    `https://www.googleapis.com/calendar/v3/calendars/${
      encodeURIComponent(calendarId)
    }/events?conferenceDataVersion=1&sendUpdates=${sendUpdates}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
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
    data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")
      ?.uri ?? "";

  return { meetLink, eventId: data.id };
}

export async function eliminarEventoCalendario(opts: {
  accessToken: string;
  calendarId: string;
  eventId: string;
}): Promise<void> {
  const { accessToken, calendarId, eventId } = opts;
  const resp = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${
      encodeURIComponent(
        calendarId,
      )
    }/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!resp.ok && resp.status !== 404 && resp.status !== 410) {
    const err = await resp.text();
    throw new Error(`Google Calendar delete error: ${err}`);
  }
}

export async function confirmarBooking(
  adminClient: SupabaseClient,
  bookingId: string,
): Promise<BookingConfirmationResult> {
  const { data: booking, error: bookingErr } = await adminClient
    .from("bookings")
    .select(
      "id, student_id, teacher_id, slot_id, status, consent_history, meet_link, calendar_sync_status, calendar_sync_error, theory_focus_id, session_focus, student_goal",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingErr) throw bookingErr;
  if (!booking) {
    throw new BookingConfirmationError("Reserva no encontrada", 404);
  }
  if (booking.status === "cancelled") {
    throw new BookingConfirmationError(
      "No se puede confirmar una reserva cancelada",
      400,
    );
  }
  if (booking.status === "confirmed") {
    return {
      ok: true,
      status: "confirmed",
      meet_link: (booking.meet_link as string | null) ?? null,
      calendar_sync_status:
        (booking.calendar_sync_status as CalendarSyncStatus | null) ??
          "not_attempted",
      calendar_sync_error: (booking.calendar_sync_error as string | null) ??
        null,
      already: true,
    };
  }

  const { data: slot, error: slotErr } = await adminClient
    .from("booking_slots")
    .select("starts_at, ends_at")
    .eq("id", booking.slot_id)
    .maybeSingle();

  if (slotErr) throw slotErr;
  if (!slot) throw new BookingConfirmationError("Horario no encontrado", 404);

  const sessionEndsAt = new Date(slot.ends_at as string);
  const accessEndsAt = new Date(sessionEndsAt);
  accessEndsAt.setDate(accessEndsAt.getDate() + ACCESS_DAYS_POST_SESSION);

  const { error: confirmErr } = await adminClient
    .from("bookings")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (confirmErr) throw confirmErr;

  const { error: slotUpdateErr } = await adminClient
    .from("booking_slots")
    .update({ status: "booked" })
    .eq("id", booking.slot_id);
  if (slotUpdateErr) throw slotUpdateErr;

  if (booking.consent_history) {
    const { error: accessErr } = await adminClient.from(
      "booking_teacher_access",
    ).insert({
      booking_id: bookingId,
      teacher_id: booking.teacher_id,
      student_id: booking.student_id,
      access_starts_at: new Date().toISOString(),
      access_ends_at: accessEndsAt.toISOString(),
    });
    if (accessErr) throw accessErr;
  }

  if (booking.theory_focus_id) {
    const { error: theoryErr } = await adminClient.from("theory_access_grants")
      .upsert(
        {
          user_id: booking.student_id,
          section_id: booking.theory_focus_id,
          source_booking_id: bookingId,
        },
        { onConflict: "user_id,section_id", ignoreDuplicates: true },
      );
    if (theoryErr) throw theoryErr;
  }

  let meetLink: string | null = null;
  let calendarEventId: string | null = null;
  let calendarId: string | null = null;
  let calendarSyncStatus: CalendarSyncStatus = "not_attempted";
  let calendarSyncError: string | null = null;

  const googleSAJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  const libericoCalendarId = Deno.env.get("LIBERICO_CALENDAR_ID") ?? "";
  if (googleSAJson && libericoCalendarId) {
    try {
      calendarId = libericoCalendarId;
      const subject = Deno.env.get("GOOGLE_IMPERSONATED_SUBJECT") || undefined;
      const accessToken = await getGoogleAccessToken(googleSAJson, subject);

      const { studentEmail, teacherEmail } = await fetchParticipantEmails(
        adminClient,
        booking.student_id as string,
        booking.teacher_id as string,
      );
      const appUrl = Deno.env.get("APP_URL") ?? "https://liberico.app";
      const description = buildEventDescription({
        sessionUrl: `${appUrl}/clase/${bookingId}`,
        studentGoal: (booking.student_goal as string | null) ?? null,
        sessionFocus: (booking.session_focus as string | null) ?? null,
      });
      const attendeeEmails = [studentEmail, teacherEmail].filter(
        (e): e is string => !!e,
      );

      let resultado: { meetLink: string; eventId: string };
      try {
        // Intento principal: invitar a los participantes y enviarles el correo
        resultado = await crearEventoCalendario({
          accessToken,
          bookingId,
          startsAt: slot.starts_at as string,
          endsAt: slot.ends_at as string,
          calendarId: libericoCalendarId,
          description,
          attendeeEmails,
          sendUpdates: "all",
        });
      } catch (inviteErr) {
        // Fallback resiliente: crear el evento sin invitados (la app sigue mostrando meet_link)
        console.error(
          "Invitación con attendees falló; fallback sin invitados:",
          inviteErr,
        );
        resultado = await crearEventoCalendario({
          accessToken,
          bookingId,
          startsAt: slot.starts_at as string,
          endsAt: slot.ends_at as string,
          calendarId: libericoCalendarId,
          description,
          attendeeEmails: [],
          sendUpdates: "none",
        });
      }

      meetLink = resultado.meetLink || null;
      calendarEventId = resultado.eventId || null;
      calendarSyncStatus = "synced";

      const { error: calendarUpdateErr } = await adminClient
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
      if (calendarUpdateErr) throw calendarUpdateErr;
    } catch (calErr) {
      console.error(
        "Google Calendar error (no bloquea la confirmación):",
        calErr,
      );
      calendarSyncStatus = "failed";
      calendarSyncError = calErr instanceof Error
        ? calErr.message.slice(0, 1000)
        : "Error desconocido";
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
      : "LIBERICO_CALENDAR_ID no configurado";
    await adminClient
      .from("bookings")
      .update({
        calendar_sync_status: calendarSyncStatus,
        calendar_sync_error: calendarSyncError,
      })
      .eq("id", bookingId);
  }

  return {
    ok: true,
    status: "confirmed",
    meet_link: meetLink,
    calendar_sync_status: calendarSyncStatus,
    calendar_sync_error: calendarSyncError,
  };
}
