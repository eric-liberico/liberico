// Edge Function: billing-checkout
// Crea una sesión de Stripe Checkout para comprar créditos.
// Si Stripe todavía no está configurado, permite simular compras con
// ENABLE_SIMULATED_CREDIT_PURCHASES=true usando la misma tabla/RPC.
//
// Body: { cantidad_creditos: number }  (5–200, enteros)
// Returns: { url: string } o { simulated: true, session_id: string, nuevo_saldo: number }
//
// La sesión se registra en creditos_compras con estado "pendiente".
// El webhook stripe-webhook la confirma cuando el pago se completa.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MIN_CREDITOS = 5;
const MAX_CREDITOS = 200;
const PRECIO_EUR_POR_CREDITO = 1.0; // 1€ = 1 crédito
const PENDING_CHECKOUT_WINDOW_MS = 24 * 60 * 60 * 1000;

function parseCreditos(value: unknown): number {
  const creditos = Number(value ?? 0);
  return Number.isFinite(creditos) ? creditos : 0;
}

function jsonError(msg: string, status: number): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function envEnabled(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

async function expireStripeSession(
  stripeSecretKey: string,
  sessionId: string,
): Promise<void> {
  try {
    const expireRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${
        encodeURIComponent(sessionId)
      }/expire`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${stripeSecretKey}` },
      },
    );
    if (!expireRes.ok) {
      console.error(
        "No se pudo expirar la sesión Stripe tras error local:",
        await expireRes.text(),
      );
    }
  } catch (err) {
    console.error("Error expirando sesión Stripe tras error local:", err);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return jsonError("No autorizado", 401);
    }
    const token = parts[1];

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser(
      token,
    );
    if (userErr || !userData.user) {
      return jsonError("No autorizado", 401);
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email ?? "";

    const { data: perfil, error: perfilErr } = await supabase
      .from("perfiles")
      .select("activo, creditos")
      .eq("user_id", userId)
      .maybeSingle();
    if (perfilErr || !perfil) {
      return jsonError("No se pudo verificar tu perfil.", 403);
    }
    if (perfil.activo === false) {
      return jsonError("Usuario inactivo.", 403);
    }

    // ── Validar body ──────────────────────────────────────────────────────
    const body: unknown = await req.json();
    if (typeof body !== "object" || body === null) {
      return jsonError("Cuerpo de petición inválido.", 400);
    }
    const { cantidad_creditos } = body as Record<string, unknown>;

    if (
      typeof cantidad_creditos !== "number" ||
      !Number.isInteger(cantidad_creditos) ||
      cantidad_creditos < MIN_CREDITOS ||
      cantidad_creditos > MAX_CREDITOS
    ) {
      return jsonError(
        `cantidad_creditos debe ser un entero entre ${MIN_CREDITOS} y ${MAX_CREDITOS}.`,
        400,
      );
    }

    const saldoActual = parseCreditos(perfil.creditos);
    if (saldoActual + cantidad_creditos > MAX_CREDITOS) {
      return jsonError(
        `Tu saldo actual (${
          saldoActual.toFixed(2)
        }) más esta compra superaría el máximo de ${MAX_CREDITOS} créditos.`,
        400,
      );
    }

    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return jsonError("Configuración del servidor incompleta.", 500);
    }
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Stripe Checkout Session o simulación local ────────────────────────
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const precioEur = cantidad_creditos * PRECIO_EUR_POR_CREDITO;
    const precioSek = cantidad_creditos * 10; // 1 crédito = 10 SEK

    if (!STRIPE_SECRET_KEY) {
      const simulacionActiva = envEnabled(
        (Deno.env.get("ENABLE_SIMULATED_CREDIT_PURCHASES") ?? "").toLowerCase(),
      );
      if (!simulacionActiva) {
        return jsonError("Pagos no disponibles en este momento.", 500);
      }

      const sessionId = `sim_${crypto.randomUUID()}`;
      const { error: compraErr } = await adminClient.from("creditos_compras")
        .insert({
          user_id: userId,
          cantidad_creditos,
          precio_eur: precioEur,
          stripe_session_id: sessionId,
          estado: "pendiente",
        });
      if (compraErr) {
        console.error("Error registrando compra simulada:", compraErr);
        return jsonError("Error al registrar la compra simulada.", 500);
      }

      const { data: nuevoSaldo, error: acreditarErr } = await adminClient.rpc(
        "acreditar_creditos",
        {
          p_user_id: userId,
          p_cantidad: cantidad_creditos,
          p_stripe_session_id: sessionId,
        },
      );

      if (acreditarErr || nuevoSaldo === null) {
        console.error("Error acreditando compra simulada:", acreditarErr);
        return jsonError("No se pudo simular la compra.", 500);
      }

      return new Response(
        JSON.stringify({
          simulated: true,
          session_id: sessionId,
          nuevo_saldo: nuevoSaldo,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const APP_URL = Deno.env.get("APP_URL") ?? "https://liberico.app";
    const unitAmountCents = Math.round(precioEur * 100); // Stripe usa centavos

    const pendientesDesde = new Date(
      Date.now() - PENDING_CHECKOUT_WINDOW_MS,
    ).toISOString();
    const { data: comprasPendientes, error: pendientesErr } = await adminClient
      .from("creditos_compras")
      .select("cantidad_creditos")
      .eq("user_id", userId)
      .eq("estado", "pendiente")
      .gte("created_at", pendientesDesde);
    if (pendientesErr) {
      console.error("Error verificando compras pendientes:", pendientesErr);
      return jsonError("No se pudo verificar compras pendientes.", 500);
    }

    const creditosPendientes = (comprasPendientes ?? []).reduce(
      (total: number, row: { cantidad_creditos?: unknown }) =>
        total + parseCreditos(row.cantidad_creditos),
      0,
    );
    if (saldoActual + creditosPendientes + cantidad_creditos > MAX_CREDITOS) {
      return jsonError(
        `Tienes ${creditosPendientes.toFixed(2)} créditos en compras pendientes. Espera a que se completen o reduce la cantidad para no superar el máximo de ${MAX_CREDITOS} créditos.`,
        400,
      );
    }

    // Registrar primero la compra local. El id se envía en metadata para que el
    // webhook pueda recuperar el pago aunque falle el update posterior.
    const draftSessionId = `draft_${crypto.randomUUID()}`;
    const { data: compraPendiente, error: preCompraErr } = await adminClient
      .from("creditos_compras")
      .insert({
        user_id: userId,
        cantidad_creditos,
        precio_eur: precioEur,
        stripe_session_id: draftSessionId,
        estado: "pendiente",
      })
      .select("id")
      .single();
    if (preCompraErr || !compraPendiente?.id) {
      console.error("Error pre-registrando compra pendiente:", preCompraErr);
      return jsonError("Error al registrar la compra.", 500);
    }
    const compraId = compraPendiente.id as string;

    const stripeBody = new URLSearchParams({
      mode: "payment",
      "payment_method_types[0]": "card",
      "automatic_tax[enabled]": "true",
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][unit_amount]": String(unitAmountCents),
      "line_items[0][price_data][product_data][name]":
        `${cantidad_creditos} créditos LIBerico`,
      "line_items[0][price_data][product_data][description]":
        `${cantidad_creditos} créditos para evaluar ejercicios IB · ~${precioSek} SEK`,
      "line_items[0][quantity]": "1",
      success_url:
        `${APP_URL}/comprar-creditos?status=exito&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/comprar-creditos?status=cancelado`,
      client_reference_id: userId,
      customer_email: userEmail,
      "metadata[user_id]": userId,
      "metadata[compra_id]": compraId,
      "metadata[cantidad_creditos]": String(cantidad_creditos),
    });

    const stripeRes = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: stripeBody.toString(),
      },
    );

    if (!stripeRes.ok) {
      const stripeErr = await stripeRes.text();
      console.error("Stripe error:", stripeErr);
      await adminClient.from("creditos_compras")
        .update({ estado: "fallido" })
        .eq("id", compraId)
        .eq("estado", "pendiente");
      return jsonError("Error al crear sesión de pago.", 500);
    }

    const session = (await stripeRes.json()) as { id: string; url: string };

    const { data: compraActualizada, error: updateCompraErr } = await adminClient
      .from("creditos_compras")
      .update({ stripe_session_id: session.id })
      .eq("id", compraId)
      .eq("stripe_session_id", draftSessionId)
      .select("id")
      .maybeSingle();
    if (updateCompraErr || !compraActualizada?.id) {
      console.error("Error enlazando sesión Stripe a compra local:", {
        compra_id: compraId,
        stripe_session_id: session.id,
        error: updateCompraErr,
      });
      await expireStripeSession(STRIPE_SECRET_KEY, session.id);
      await adminClient.from("creditos_compras")
        .update({ estado: "fallido" })
        .eq("id", compraId)
        .eq("estado", "pendiente");
      return jsonError("Error al registrar la compra.", 500);
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("billing-checkout error:", err);
    return jsonError("Error interno del servidor.", 500);
  }
});
