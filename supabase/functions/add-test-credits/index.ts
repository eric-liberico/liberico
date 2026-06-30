// Edge Function: add-test-credits
// SOLO PARA PRUEBAS — añade créditos sin pago real.
// Eliminar o deshabilitar antes de ir a producción pública.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CANTIDAD_TEST = 20; // créditos que se añaden por llamada
const MAX_SALDO = 200;
const DEV_PROJECT_REF = "vmlsyansyjgopqsrvyoe";

function esProyectoDev(supabaseUrl: string): boolean {
  try {
    return new URL(supabaseUrl).hostname.split(".")[0] === DEV_PROJECT_REF;
  } catch {
    return false;
  }
}

function parseCreditos(value: unknown): number {
  const creditos = Number(value ?? 0);
  return Number.isFinite(creditos) ? creditos : 0;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (Deno.env.get("ENABLE_TEST_CREDITS") !== "true") {
    return new Response(JSON.stringify({ error: "Créditos de prueba deshabilitados." }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.split(" ")[1];
  if (!token) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const enDev = esProyectoDev(SUPABASE_URL);

  if (!enDev) {
    // Defensa adicional al flag ENABLE_TEST_CREDITS: fuera de dev solo
    // administradores activos pueden auto-acreditarse créditos de prueba.
    const { data: perfil, error: perfilErr } = await adminClient
      .from("perfiles")
      .select("rol, activo")
      .eq("user_id", userData.user.id)
      .single();
    if (perfilErr || perfil?.rol !== "admin" || perfil?.activo !== true) {
      return new Response(JSON.stringify({ error: "No autorizado." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  let { data: perfilCreditos, error: perfilCreditosErr } = await adminClient
    .from("perfiles")
    .select("creditos, activo")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!perfilCreditos && !perfilCreditosErr && enDev) {
    const { error: insertPerfilErr } = await adminClient.from("perfiles").insert({
      user_id: userData.user.id,
      email: userData.user.email ?? null,
    });
    if (insertPerfilErr) {
      console.error("Error creando perfil para créditos de prueba:", insertPerfilErr);
      return new Response(JSON.stringify({ error: "Error interno." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recargaPerfil = await adminClient
      .from("perfiles")
      .select("creditos, activo")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    perfilCreditos = recargaPerfil.data;
    perfilCreditosErr = recargaPerfil.error;
  }

  if (perfilCreditosErr || !perfilCreditos) {
    return new Response(JSON.stringify({ error: "No se encontró el perfil del usuario." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (perfilCreditos.activo === false) {
    return new Response(JSON.stringify({ error: "Usuario inactivo." }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const saldoActual = parseCreditos(perfilCreditos.creditos);
  const cantidadAcreditar = Math.min(CANTIDAD_TEST, MAX_SALDO - saldoActual);
  if (cantidadAcreditar <= 0) {
    return new Response(
      JSON.stringify({ error: `Ya tienes el saldo máximo de ${MAX_SALDO} créditos.` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Añade créditos usando la misma RPC atómica que Stripe (idéntico flujo)
  const { data: nuevoSaldo, error: rpcErr } = await adminClient.rpc("acreditar_creditos", {
    p_user_id: userData.user.id,
    p_cantidad: cantidadAcreditar,
    p_stripe_session_id: `test_${userData.user.id}_${Date.now()}`,
  });

  if (rpcErr) {
    console.error("Error acreditando créditos de prueba:", rpcErr);
    return new Response(JSON.stringify({ error: "Error interno." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (nuevoSaldo === null) {
    return new Response(
      JSON.stringify({ error: `Ya tienes el saldo máximo de ${MAX_SALDO} créditos.` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      creditos: nuevoSaldo,
      mensaje: `Se añadieron ${cantidadAcreditar} créditos de prueba.`,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
