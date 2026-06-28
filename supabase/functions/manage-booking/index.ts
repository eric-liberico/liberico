import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  eliminarEventoCalendario,
  getGoogleAccessToken,
} from "../_shared/booking-confirmation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VOUCHER_MONTHS = 6;

function valeExpiry(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + VOUCHER_MONTHS);
  return d.toISOString();
}

// deno-lint-ignore no-explicit-any
async function borrarEventoSiExiste(_adminClient: any, booking: any) {
  if (!booking.calendar_event_id || !booking.calendar_id) return;
  try {
    const googleSAJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!googleSAJson) return;
    const accessToken = await getGoogleAccessToken(
      googleSAJson,
      Deno.env.get("GOOGLE_IMPERSONATED_SUBJECT") || undefined,
    );
    await eliminarEventoCalendario({
      accessToken,
      calendarId: booking.calendar_id,
      eventId: booking.calendar_event_id,
    });
  } catch (calErr) {
    console.error("Calendar delete (no bloquea):", calErr);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
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
    const userId = userData.user.id;

    const body = (await req.json().catch(() => ({}))) as {
      booking_id?: unknown;
      action?: unknown;
      refund?: unknown;
      new_slot_id?: unknown;
      force_voucher_no_slot?: unknown;
    };
    const bookingId = typeof body.booking_id === "string" ? body.booking_id : null;
    const action = body.action === "cancel" || body.action === "reschedule" ? body.action : null;
    if (!bookingId) return json({ error: "booking_id requerido" }, 400);
    if (!action) return json({ error: "action inválida" }, 400);

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: booking, error: bErr } = await adminClient
      .from("bookings")
      .select(
        "id, student_id, teacher_id, slot_id, status, total_sek, calendar_event_id, calendar_id, slot:booking_slots(starts_at, ends_at)",
      )
      .eq("id", bookingId)
      .maybeSingle();
    if (bErr) throw bErr;
    if (!booking) return json({ error: "Reserva no encontrada" }, 404);

    const isStudent = userId === booking.student_id;
    const isTeacher = userId === booking.teacher_id;
    if (!isStudent && !isTeacher) return json({ error: "Acceso denegado" }, 403);
    if (booking.status === "cancelled" || booking.status === "completed") {
      return json({ error: "La sesión ya no se puede modificar" }, 400);
    }

    const slot = Array.isArray(booking.slot) ? booking.slot[0] : booking.slot;
    const startsAt = slot?.starts_at as string | undefined;
    if (!startsAt) return json({ error: "Horario no encontrado" }, 400);
    const horasAntes = (new Date(startsAt).getTime() - Date.now()) / 3_600_000;

    if (action === "cancel") {
      // Política: alumno requiere >=48h; profe sin restricción
      if (isStudent && horasAntes < 48) {
        return json({ error: "Solo puedes cancelar con al menos 48 h de antelación." }, 400);
      }
      const refund = body.refund === "money" ? "money" : "voucher";

      // 1) Marcar cancelada + liberar slot + revocar acceso
      const { error: cancelErr } = await adminClient
        .from("bookings")
        .update({
          status: "cancelled",
          cancelled_by: isTeacher ? "teacher" : "student",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
      if (cancelErr) throw cancelErr;
      const { error: slotErr } = await adminClient
        .from("booking_slots")
        .update({ status: "available" })
        .eq("id", booking.slot_id);
      if (slotErr) throw slotErr;
      const { error: accessErr } = await adminClient
        .from("booking_teacher_access")
        .update({ revoked_at: new Date().toISOString() })
        .eq("booking_id", bookingId)
        .is("revoked_at", null);
      if (accessErr) throw accessErr;

      // 2) Reembolso: profe → vale; alumno → según elección
      let emitido: "voucher" | "money" = "voucher";
      if (isTeacher) {
        const { error: voucherErr } = await adminClient.from("session_vouchers").insert({
          student_id: booking.student_id,
          motivo: "profesor_cancelo",
          origin_booking_id: bookingId,
          expires_at: valeExpiry(),
        });
        if (voucherErr) throw voucherErr;
        emitido = "voucher";
      } else if (refund === "money") {
        const { error: refundErr } = await adminClient.from("refund_requests").insert({
          booking_id: bookingId,
          student_id: booking.student_id,
          amount_sek: (booking.total_sek as number | null) ?? 0,
        });
        if (refundErr) throw refundErr;
        emitido = "money";
      } else {
        const { error: voucherErr } = await adminClient.from("session_vouchers").insert({
          student_id: booking.student_id,
          motivo: "cancelacion",
          origin_booking_id: bookingId,
          expires_at: valeExpiry(),
        });
        if (voucherErr) throw voucherErr;
        emitido = "voucher";
      }

      // 3) Calendar (best-effort)
      await borrarEventoSiExiste(adminClient, booking);

      return json({ ok: true, status: "cancelled", refund: emitido });
    }

    // action === "reschedule" se implementa en Task 4
    return json({ error: "Acción no soportada todavía" }, 400);
  } catch (e) {
    console.error("manage-booking error:", e);
    return json({ error: "Error interno del servidor" }, 500);
  }
});
