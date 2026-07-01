import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método no permitido" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return jsonResponse({ error: "No autorizado" }, 401);
    }
    const token = parts[1];

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verificar JWT con cliente anon
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await anonClient.auth.getUser(token);
    if (userErr || !userData.user) {
      return jsonResponse({ error: "No autorizado" }, 401);
    }
    const userId = userData.user.id;

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Auditoría mínima sin PII. Si la auditoría falla, no borramos la cuenta:
    // evita eliminar identidad/contenido sin dejar rastro operativo del borrado.
    const { data: audit, error: auditErr } = await adminClient
      .from("gdpr_borrados")
      .insert({ user_id: userId, estado: "solicitado" })
      .select("id")
      .single();
    if (auditErr) {
      console.error("Error registrando auditoría GDPR:", auditErr.message);
      return jsonResponse({ error: "No se pudo eliminar la cuenta." }, 500);
    }

    // Borra la identidad. Las tablas de contenido se eliminan por CASCADE; las
    // tablas financieras quedan desvinculadas por ON DELETE SET NULL.
    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteErr) {
      console.error("Error eliminando usuario:", deleteErr.message);
      await adminClient
        .from("gdpr_borrados")
        .update({ estado: "fallido", error: deleteErr.message })
        .eq("id", audit.id);
      return jsonResponse({ error: "No se pudo eliminar la cuenta." }, 500);
    }

    await adminClient
      .from("gdpr_borrados")
      .update({ estado: "completado", borrado_at: new Date().toISOString() })
      .eq("id", audit.id);

    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    console.error("account-delete error:", e);
    return jsonResponse({ error: "Error desconocido" }, 500);
  }
});
