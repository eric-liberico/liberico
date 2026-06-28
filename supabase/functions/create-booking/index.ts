import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  BookingConfirmationError,
  confirmarBooking,
} from "../_shared/booking-confirmation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VALID_THEORY_FOCUS = new Set([
  "poesia",
  "narratologia",
  "teatro",
  "recursos",
  "vocabulario",
  "movimientos",
  "teoria-literaria",
  "topicos",
]);

const VALID_SESSION_FOCUS = new Set(["p1", "p2", "oral"]);

function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

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
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "Configuración incompleta" }, 500);
    }

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
      return json({ error: "No autorizado" }, 401);
    }
    const { data: userData, error: userErr } = await anonClient.auth.getUser(
      parts[1],
    );
    if (userErr || !userData.user) return json({ error: "No autorizado" }, 401);

    const studentId = userData.user.id;

    // Solo alumnos activos pueden reservar
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
      theory_focus_id?: unknown;
      session_focus?: unknown;
      usar_vale?: unknown;
    };

    const slotId = typeof body.slot_id === "string" ? body.slot_id : null;
    const goal = typeof body.student_goal === "string"
      ? body.student_goal.slice(0, 1000)
      : "";
    const timezoneCandidate = typeof body.student_timezone === "string"
      ? body.student_timezone.slice(0, 80)
      : null;
    const timezone = timezoneCandidate && isValidTimeZone(timezoneCandidate)
      ? timezoneCandidate
      : "Europe/Stockholm";
    const consentHistory = body.consent_history === true;
    const consentPayment = body.consent_payment === true;
    const theoryFocusId = typeof body.theory_focus_id === "string" &&
        VALID_THEORY_FOCUS.has(body.theory_focus_id)
      ? body.theory_focus_id
      : null;
    const sessionFocus = typeof body.session_focus === "string" &&
        VALID_SESSION_FOCUS.has(body.session_focus)
      ? body.session_focus
      : null;

    if (!slotId) return json({ error: "slot_id requerido" }, 400);
    if (!consentHistory || !consentPayment) {
      return json(
        {
          error: "Debes aceptar ambos consentimientos para continuar",
        },
        400,
      );
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validar vale de sesión si el alumno quiere canjear uno
    const usarVale = body.usar_vale === true;
    let valeId: string | null = null;
    if (usarVale) {
      const { data: vale, error: valeErr } = await adminClient
        .from("session_vouchers")
        .select("id")
        .eq("student_id", studentId)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (valeErr) return json({ error: "No tienes un vale disponible." }, 400);
      if (!vale) return json({ error: "No tienes un vale disponible." }, 400);
      valeId = vale.id as string;
    }

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

    // Crear la reserva como pendiente solo durante esta transacción lógica.
    // En este flujo manual, aceptar el horario confirma la sesión inmediatamente.
    const { data: booking, error: bookingErr } = await adminClient
      .from("bookings")
      .insert({
        student_id: studentId,
        teacher_id: slot.teacher_id,
        slot_id: slotId,
        status: "pending_payment",
        price_sek: priceSek,
        vat_sek: vatSek,
        total_sek: totalSek,
        student_goal: goal,
        student_timezone: timezone,
        consent_history: consentHistory,
        consent_payment: consentPayment,
        theory_focus_id: theoryFocusId,
        session_focus: sessionFocus,
      })
      .select("id")
      .single();

    if (bookingErr) {
      if ((bookingErr as { code?: string }).code === "23505") {
        return json({ error: "El slot ya no está disponible" }, 409);
      }
      throw bookingErr;
    }

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

    const confirmation = await confirmarBooking(
      adminClient,
      booking.id as string,
    );

    // Canjear el vale DESPUÉS de confirmar la reserva.
    // Si falla, no lanzamos error: la reserva ya existe y el vale stuck-active
    // es recuperable por admin. Lanzar aquí provocaría un 500 sobre una reserva
    // que ya está creada y confirmada.
    if (valeId) {
      const { error: redeemErr } = await adminClient
        .from("session_vouchers")
        .update({ status: "redeemed", redeemed_booking_id: booking.id })
        .eq("id", valeId)
        .eq("status", "active");
      if (redeemErr) console.error("create-booking: error al canjear vale:", redeemErr);
    }

    return json({
      booking_id: booking.id,
      total_sek: totalSek,
      status: confirmation.status,
      meet_link: confirmation.meet_link,
      calendar_sync_status: confirmation.calendar_sync_status,
      calendar_sync_error: confirmation.calendar_sync_error,
    });
  } catch (e) {
    if (e instanceof BookingConfirmationError) {
      return json({ error: e.message }, e.status);
    }
    console.error("create-booking error:", e);
    return json({ error: "Error interno del servidor" }, 500);
  }
});
