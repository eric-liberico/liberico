// Edge Function: stripe-webhook
// Recibe eventos de Stripe y procesa checkout.session.completed
// para acreditar créditos al usuario.
//
// Seguridad: verifica la firma HMAC de Stripe con STRIPE_WEBHOOK_SECRET.
// Idempotencia: acreditar_creditos() ignora sesiones ya procesadas.
//
// Configuración en Stripe Dashboard:
//   - Endpoint URL: https://<project>.supabase.co/functions/v1/stripe-webhook
//   - Eventos: checkout.session.completed

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { encode as encodeHex } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;

type StripeEvent = {
  type: string;
  data: {
    object: {
      id: string;
      client_reference_id?: string;
      metadata?: Record<string, string>;
      payment_intent?: string;
      payment_status?: string;
    };
  };
};

async function verifyStripeSignature(
  body: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    // Stripe signature format: t=timestamp,v1=hash,...
    const parts = signature.split(",");
    const tPart = parts.find((p) => p.startsWith("t="));
    const v1Part = parts.find((p) => p.startsWith("v1="));
    if (!tPart || !v1Part) return false;

    const timestamp = tPart.slice(2);
    const expectedSig = v1Part.slice(3);
    const timestampMs = Number(timestamp) * 1000;
    if (
      !Number.isFinite(timestampMs) ||
      Math.abs(Date.now() - timestampMs) > SIGNATURE_TOLERANCE_MS
    ) {
      return false;
    }

    const payload = `${timestamp}.${body}`;

    const keyData = new TextEncoder().encode(secret);
    const messageData = new TextEncoder().encode(payload);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sigBuffer = await crypto.subtle.sign("HMAC", key, messageData);
    const computedSig = new TextDecoder().decode(
      encodeHex(new Uint8Array(sigBuffer)),
    );

    return timingSafeEqualHex(computedSig, expectedSig);
  } catch {
    return false;
  }
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length % 2 !== 0 || b.length % 2 !== 0) return false;
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b)) return false;
  const aBytes = hexToBytes(a);
  const bBytes = hexToBytes(b);
  if (aBytes.length !== bBytes.length) return false;

  let diff = 0;
  for (let i = 0; i < aBytes.length; i += 1) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

serve(async (req: Request) => {
  // Stripe solo envía POST; no necesitamos CORS aquí
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET no configurado");
    return new Response("Configuración incompleta", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature") ?? "";
  const body = await req.text();

  const valid = await verifyStripeSignature(
    body,
    signature,
    STRIPE_WEBHOOK_SECRET,
  );
  if (!valid) {
    console.warn("Firma Stripe inválida");
    return new Response("Firma inválida", { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(body) as StripeEvent;
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }

  // Solo procesamos checkout.session.completed
  if (event.type !== "checkout.session.completed") {
    return new Response("OK", { status: 200 });
  }

  const session = event.data.object;
  if (session.payment_status !== "paid") {
    console.warn(
      "checkout.session.completed sin pago confirmado:",
      session.id,
      session.payment_status,
    );
    return new Response("OK", { status: 200 });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: compra, error: compraErr } = await adminClient
    .from("creditos_compras")
    .select("user_id, cantidad_creditos, estado")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (compraErr || !compra) {
    console.error("Webhook sin compra pendiente local:", session.id, compraErr);
    return new Response("OK", { status: 200 });
  }

  const userIdFromStripe = session.client_reference_id ??
    session.metadata?.user_id;
  if (userIdFromStripe && userIdFromStripe !== compra.user_id) {
    console.error("Webhook con user_id que no coincide con compra local:", {
      session_id: session.id,
      stripe_user_id: userIdFromStripe,
      compra_user_id: compra.user_id,
    });
    return new Response("OK", { status: 200 });
  }

  if (compra.estado !== "pendiente" && compra.estado !== "completado") {
    console.warn(
      "Webhook para compra no acreditable:",
      session.id,
      compra.estado,
    );
    return new Response("OK", { status: 200 });
  }

  if (session.payment_intent) {
    const { error: paymentIntentErr } = await adminClient
      .from("creditos_compras")
      .update({ stripe_payment_intent: session.payment_intent })
      .eq("stripe_session_id", session.id);
    if (paymentIntentErr) {
      console.error("No se pudo guardar payment_intent:", paymentIntentErr);
    }
  }

  const cantidad = Number(compra.cantidad_creditos);
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    console.error(
      "cantidad_creditos local inválida:",
      session.id,
      compra.cantidad_creditos,
    );
    return new Response("OK", { status: 200 });
  }

  // Acreditar créditos atómicamente (idempotente)
  const { data: nuevoSaldo, error: rpcErr } = await adminClient.rpc(
    "acreditar_creditos",
    {
      p_user_id: compra.user_id,
      p_cantidad: cantidad,
      p_stripe_session_id: session.id,
    },
  );

  if (rpcErr) {
    console.error("Error acreditando créditos:", rpcErr);
    // Retornamos 200 para que Stripe no reintente; el error queda en logs.
    return new Response("Error interno", { status: 200 });
  }

  if (nuevoSaldo === null) {
    // Puede ser idempotencia (ya procesado) o saldo máximo superado.
    console.warn("acreditar_creditos devolvió NULL para sesión:", session.id);
  }

  console.log(
    `Créditos acreditados: user=${compra.user_id}, cantidad=${cantidad}, nuevo_saldo=${nuevoSaldo}`,
  );
  return new Response("OK", { status: 200 });
});
