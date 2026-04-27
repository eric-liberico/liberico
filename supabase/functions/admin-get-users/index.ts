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

    // Verificar rol admin
    const { data: perfil } = await anonClient
      .from("perfiles")
      .select("rol, activo")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!perfil || perfil.rol !== "admin" || !perfil.activo) {
      return new Response(JSON.stringify({ error: "Acceso denegado." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as {
      page?: unknown;
      per_page?: unknown;
      q?: unknown;
      rol?: unknown;
    };
    const page = typeof body.page === "number" ? body.page : 1;
    const perPage = Math.min(typeof body.per_page === "number" ? body.per_page : 50, 100);
    const q = typeof body.q === "string" ? body.q.toLowerCase() : "";
    const rolFiltro = typeof body.rol === "string" ? body.rol : "";

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Obtener usuarios de auth
    const { data: authData, error: authErr } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });
    if (authErr) throw authErr;

    // Obtener perfiles de todos los usuarios
    const userIds = authData.users.map((u) => u.id);
    const { data: perfiles } = await adminClient
      .from("perfiles")
      .select("user_id, rol, activo, email")
      .in("user_id", userIds);

    const perfilesMap = Object.fromEntries((perfiles ?? []).map((p) => [p.user_id, p]));

    let usuarios = authData.users.map((u) => {
      const p = perfilesMap[u.id];
      return {
        id: u.id,
        email: u.email ?? "",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed: !!u.email_confirmed_at,
        rol: (p?.rol ?? "alumno") as string,
        activo: p?.activo ?? true,
      };
    });

    // Filtros client-side (auth.admin no soporta búsqueda directa)
    if (q) {
      usuarios = usuarios.filter((u) => u.email.toLowerCase().includes(q));
    }
    if (rolFiltro) {
      usuarios = usuarios.filter((u) => u.rol === rolFiltro);
    }

    return new Response(JSON.stringify({ usuarios, total: authData.total ?? usuarios.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-get-users error:", e);
    return new Response(JSON.stringify({ error: "Error interno del servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
