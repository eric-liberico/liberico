// Edge Function: create-checkout-session
// Crea una sesión de Stripe Checkout para comprar créditos.
//
// Body: { cantidad_creditos: number }  (5–200, enteros)
// Returns: { url: string }  — URL de Stripe Checkout para redirect
//
// La sesión se registra en creditos_compras con estado "pendiente".
// El webhook stripe-webhook la confirma cuando el pago se completa.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_CREDITOS = 5;
const MAX_CREDITOS = 200;
const PRECIO_EUR_POR_CREDITO = 1.0; // 1€ = 1 crédito

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

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
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
        `Tu saldo actual (${saldoActual.toFixed(2)}) más esta compra superaría el máximo de ${MAX_CREDITOS} créditos.`,
        400,
      );
    }

    // ── Stripe Checkout Session ───────────────────────────────────────────
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
      return jsonError("Pagos no disponibles en este momento.", 500);
    }

    const APP_URL = Deno.env.get("APP_URL") ?? "https://liberico.app";
    const precioEur = cantidad_creditos * PRECIO_EUR_POR_CREDITO;
    const precioSek = cantidad_creditos * 10; // 1 crédito = 10 SEK
    const unitAmountCents = Math.round(precioEur * 100); // Stripe usa centavos

    const stripeBody = new URLSearchParams({
      mode: "payment",
      "payment_method_types[0]": "card",
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][unit_amount]": String(unitAmountCents),
      "line_items[0][price_data][product_data][name]": `${cantidad_creditos} créditos LIBerico`,
      "line_items[0][price_data][product_data][description]": `${cantidad_creditos} créditos para evaluar ejercicios IB · ~${precioSek} SEK`,
      "line_items[0][quantity]": "1",
      success_url: `${APP_URL}/comprar-creditos?status=exito&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/comprar-creditos?status=cancelado`,
      client_reference_id: userId,
      customer_email: userEmail,
      "metadata[user_id]": userId,
      "metadata[cantidad_creditos]": String(cantidad_creditos),
    });

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: stripeBody.toString(),
    });

    if (!stripeRes.ok) {
      const stripeErr = await stripeRes.text();
      console.error("Stripe error:", stripeErr);
      return jsonError("Error al crear sesión de pago.", 500);
    }

    const session = (await stripeRes.json()) as { id: string; url: string };

    // ── Registrar compra pendiente ────────────────────────────────────────
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: compraErr } = await adminClient.from("creditos_compras").insert({
      user_id: userId,
      cantidad_creditos,
      precio_eur: precioEur,
      stripe_session_id: session.id,
      estado: "pendiente",
    });
    if (compraErr) {
      console.error("Error registrando compra pendiente:", compraErr);
      return jsonError("Error al registrar la compra.", 500);
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return jsonError("Error interno del servidor.", 500);
  }
});
