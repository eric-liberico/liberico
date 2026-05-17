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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.split(" ")[1];
  if (!token) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Añade créditos usando la misma RPC atómica que Stripe (idéntico flujo)
  const { data: nuevoSaldo, error: rpcErr } = await adminClient.rpc("acreditar_creditos", {
    p_user_id: userData.user.id,
    p_cantidad: CANTIDAD_TEST,
    p_stripe_session_id: `test_${userData.user.id}_${Date.now()}`,
  });

  if (rpcErr) {
    console.error("Error acreditando créditos de prueba:", rpcErr);
    return new Response(JSON.stringify({ error: "Error interno." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (nuevoSaldo === null) {
    return new Response(
      JSON.stringify({ error: `Ya tienes el saldo máximo de ${MAX_SALDO} créditos.` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ creditos: nuevoSaldo, mensaje: `Se añadieron ${CANTIDAD_TEST} créditos de prueba.` }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
