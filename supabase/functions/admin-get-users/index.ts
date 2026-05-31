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
    const desde24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [perfilesRes, r1, r2, r3, r4] = await Promise.all([
      adminClient
        .from("perfiles")
        .select("user_id, rol, activo, email, nombre, apellido, creditos")
        .in("user_id", userIds),
      adminClient
        .from("llm_uso")
        .select("user_id")
        .eq("edge_function", "evaluate-analysis")
        .gte("created_at", desde24h)
        .in("user_id", userIds),
      adminClient
        .from("llm_uso")
        .select("user_id")
        .eq("edge_function", "evaluate-paper2")
        .gte("created_at", desde24h)
        .in("user_id", userIds),
      adminClient
        .from("llm_uso")
        .select("user_id")
        .eq("edge_function", "evaluate-oral")
        .gte("created_at", desde24h)
        .in("user_id", userIds),
      adminClient
        .from("llm_uso")
        .select("user_id")
        .eq("edge_function", "create-oral-simulation-session")
        .eq("modelo", "elevenlabs-convai-fase1")
        .gte("created_at", desde24h)
        .in("user_id", userIds),
    ]);

    if (perfilesRes.error ?? r1.error ?? r2.error ?? r3.error ?? r4.error) {
      return new Response(JSON.stringify({ error: "Error al obtener datos de usuarios." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const perfilesMap = Object.fromEntries((perfilesRes.data ?? []).map((p) => [p.user_id, p]));

    const p1Hoy: Record<string, number> = {};
    const p2Hoy: Record<string, number> = {};
    const oralHoy: Record<string, number> = {};
    const simHoy: Record<string, number> = {};
    for (const row of r1.data ?? []) p1Hoy[row.user_id] = (p1Hoy[row.user_id] ?? 0) + 1;
    for (const row of r2.data ?? []) p2Hoy[row.user_id] = (p2Hoy[row.user_id] ?? 0) + 1;
    for (const row of r3.data ?? []) oralHoy[row.user_id] = (oralHoy[row.user_id] ?? 0) + 1;
    for (const row of r4.data ?? []) simHoy[row.user_id] = (simHoy[row.user_id] ?? 0) + 1;

    let usuarios = authData.users.map((u) => {
      const p = perfilesMap[u.id];
      const meta = (u.user_metadata ?? {}) as Record<string, string>;
      const creditosRaw = p?.creditos;
      const creditos = Number(creditosRaw ?? 0);
      return {
        id: u.id,
        email: u.email ?? "",
        nombre: p?.nombre ?? meta.nombre ?? "",
        apellido: p?.apellido ?? meta.apellido ?? "",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed: !!u.email_confirmed_at,
        rol: (p?.rol ?? "alumno") as string,
        activo: p?.activo ?? true,
        creditos: Number.isFinite(creditos) ? creditos : 0,
        p1_hoy: p1Hoy[u.id] ?? 0,
        p2_hoy: p2Hoy[u.id] ?? 0,
        oral_hoy: oralHoy[u.id] ?? 0,
        sim_hoy: simHoy[u.id] ?? 0,
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
