import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer" || !parts[1]) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = parts[1];
    const { data: userData, error: userErr } = await anonClient.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const adminId = userData.user.id;

    const { data: perfil } = await anonClient
      .from("perfiles")
      .select("rol, activo")
      .eq("user_id", adminId)
      .maybeSingle();

    if (!perfil || perfil.rol !== "admin" || !perfil.activo) {
      return new Response(JSON.stringify({ error: "Acceso denegado." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as {
      user_id?: unknown;
      activo?: unknown;
      rol?: unknown;
    };

    if (typeof body.user_id !== "string") {
      return new Response(JSON.stringify({ error: "user_id requerido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const targetId = body.user_id;

    // Un admin no puede modificarse a sí mismo desde aquí
    if (targetId === adminId) {
      return new Response(
        JSON.stringify({ error: "No puedes modificar tu propio usuario desde el panel." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const updates: Record<string, unknown> = {};

    if (typeof body.activo === "boolean") updates.activo = body.activo;
    if (typeof body.rol === "string" && ["alumno", "profesor", "admin"].includes(body.rol)) {
      updates.rol = body.rol;
    }

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ error: "Sin cambios que aplicar." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateErr } = await adminClient
      .from("perfiles")
      .update(updates)
      .eq("user_id", targetId);

    if (updateErr) throw updateErr;

    // Log de auditoría
    await adminClient.from("admin_logs").insert({
      admin_id: adminId,
      accion: "actualizar_usuario",
      target_user_id: targetId,
      detalles: updates,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-update-user error:", e);
    return new Response(JSON.stringify({ error: "Error interno del servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
