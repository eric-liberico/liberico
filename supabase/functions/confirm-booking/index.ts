import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  BookingConfirmationError,
  confirmarBooking,
  eliminarEventoCalendario,
  getGoogleAccessToken,
} from "../_shared/booking-confirmation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
            const accessToken = await getGoogleAccessToken(
              googleSAJson,
              Deno.env.get("GOOGLE_IMPERSONATED_SUBJECT") || undefined,
            );
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
            const accessToken = await getGoogleAccessToken(
              googleSAJson,
              Deno.env.get("GOOGLE_IMPERSONATED_SUBJECT") || undefined,
            );
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

    return json(await confirmarBooking(adminClient, bookingId));
  } catch (e) {
    if (e instanceof BookingConfirmationError) {
      return json({ error: e.message }, e.status);
    }
    console.error("confirm-booking error:", e);
    return json({ error: "Error interno del servidor" }, 500);
  }
});
