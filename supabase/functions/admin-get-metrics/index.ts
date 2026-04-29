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
      desde?: unknown;
      hasta?: unknown;
      user_id?: unknown;
    };
    const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
    const desde = typeof body.desde === "string" && ISO_DATE.test(body.desde) ? body.desde : null;
    const hastaRaw =
      typeof body.hasta === "string" && ISO_DATE.test(body.hasta) ? body.hasta : null;
    // Extender "hasta" al final del día para incluir todos los registros de ese día
    const hasta = hastaRaw ? `${hastaRaw}T23:59:59.999Z` : null;
    const userId = typeof body.user_id === "string" ? body.user_id : null;

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Default to the last 30 days when no range is provided to prevent loading
    // unbounded data into memory as the llm_uso table grows.
    const desdeEfectivo =
      desde ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    let query = adminClient.from("llm_uso").select("*");
    query = query.gte("created_at", desdeEfectivo);
    if (hasta) query = query.lte("created_at", hasta);
    if (userId) query = query.eq("user_id", userId);

    const { data: usos, error: usoErr } = await query
      .order("created_at", { ascending: true })
      .limit(10000);
    if (usoErr) throw usoErr;

    // Obtener precios
    const { data: precios } = await adminClient.from("llm_precios").select("*");
    const preciosMap = Object.fromEntries((precios ?? []).map((p) => [p.modelo, p]));

    // cache_creation se factura al 125% del precio de entrada; cache_read al 10%
    const calcCoste = (
      modelo: string,
      entrada: number,
      salida: number,
      cacheCreation: number,
      cacheRead: number,
    ): number => {
      const p = preciosMap[modelo];
      if (!p) return 0;
      return (
        (entrada * p.precio_entrada_por_millon) / 1_000_000 +
        (cacheCreation * p.precio_entrada_por_millon * 1.25) / 1_000_000 +
        (cacheRead * p.precio_entrada_por_millon * 0.1) / 1_000_000 +
        (salida * p.precio_salida_por_millon) / 1_000_000
      );
    };

    // Totales globales
    const totalTokensEntrada = usos?.reduce((s, u) => s + u.tokens_entrada, 0) ?? 0;
    const totalTokensSalida = usos?.reduce((s, u) => s + u.tokens_salida, 0) ?? 0;
    const totalCacheCreation = usos?.reduce((s, u) => s + (u.cache_creation_tokens ?? 0), 0) ?? 0;
    const totalCacheRead = usos?.reduce((s, u) => s + (u.cache_read_tokens ?? 0), 0) ?? 0;
    const totalPeticiones = usos?.length ?? 0;
    const totalCoste =
      usos?.reduce(
        (s, u) =>
          s +
          calcCoste(
            u.modelo,
            u.tokens_entrada,
            u.tokens_salida,
            u.cache_creation_tokens ?? 0,
            u.cache_read_tokens ?? 0,
          ),
        0,
      ) ?? 0;
    // Coste sin descuento de caché (para calcular el ahorro real)
    const totalCosteSinCache =
      usos?.reduce(
        (s, u) =>
          s +
          calcCoste(
            u.modelo,
            u.tokens_entrada + (u.cache_creation_tokens ?? 0) + (u.cache_read_tokens ?? 0),
            u.tokens_salida,
            0,
            0,
          ),
        0,
      ) ?? 0;

    // Por modelo
    const porModelo: Record<string, { tokens: number; coste: number; peticiones: number }> = {};
    for (const u of usos ?? []) {
      if (!porModelo[u.modelo]) porModelo[u.modelo] = { tokens: 0, coste: 0, peticiones: 0 };
      porModelo[u.modelo].tokens +=
        u.tokens_entrada +
        u.tokens_salida +
        (u.cache_creation_tokens ?? 0) +
        (u.cache_read_tokens ?? 0);
      porModelo[u.modelo].coste += calcCoste(
        u.modelo,
        u.tokens_entrada,
        u.tokens_salida,
        u.cache_creation_tokens ?? 0,
        u.cache_read_tokens ?? 0,
      );
      porModelo[u.modelo].peticiones += 1;
    }

    // Por función
    const porFuncion: Record<string, { tokens: number; coste: number; peticiones: number }> = {};
    for (const u of usos ?? []) {
      if (!porFuncion[u.edge_function])
        porFuncion[u.edge_function] = { tokens: 0, coste: 0, peticiones: 0 };
      porFuncion[u.edge_function].tokens +=
        u.tokens_entrada +
        u.tokens_salida +
        (u.cache_creation_tokens ?? 0) +
        (u.cache_read_tokens ?? 0);
      porFuncion[u.edge_function].coste += calcCoste(
        u.modelo,
        u.tokens_entrada,
        u.tokens_salida,
        u.cache_creation_tokens ?? 0,
        u.cache_read_tokens ?? 0,
      );
      porFuncion[u.edge_function].peticiones += 1;
    }

    // Por usuario (top 20)
    const porUsuario: Record<string, { tokens: number; coste: number; peticiones: number }> = {};
    for (const u of usos ?? []) {
      const uid = u.user_id ?? "desconocido";
      if (!porUsuario[uid]) porUsuario[uid] = { tokens: 0, coste: 0, peticiones: 0 };
      porUsuario[uid].tokens +=
        u.tokens_entrada +
        u.tokens_salida +
        (u.cache_creation_tokens ?? 0) +
        (u.cache_read_tokens ?? 0);
      porUsuario[uid].coste += calcCoste(
        u.modelo,
        u.tokens_entrada,
        u.tokens_salida,
        u.cache_creation_tokens ?? 0,
        u.cache_read_tokens ?? 0,
      );
      porUsuario[uid].peticiones += 1;
    }

    const topUsuarios = Object.entries(porUsuario)
      .sort(([, a], [, b]) => b.tokens - a.tokens)
      .slice(0, 20)
      .map(([uid, stats]) => ({ user_id: uid, ...stats }));

    // Evolución diaria
    const porDia: Record<string, { tokens: number; coste: number; peticiones: number }> = {};
    for (const u of usos ?? []) {
      const dia = u.created_at.slice(0, 10);
      if (!porDia[dia]) porDia[dia] = { tokens: 0, coste: 0, peticiones: 0 };
      porDia[dia].tokens +=
        u.tokens_entrada +
        u.tokens_salida +
        (u.cache_creation_tokens ?? 0) +
        (u.cache_read_tokens ?? 0);
      porDia[dia].coste += calcCoste(
        u.modelo,
        u.tokens_entrada,
        u.tokens_salida,
        u.cache_creation_tokens ?? 0,
        u.cache_read_tokens ?? 0,
      );
      porDia[dia].peticiones += 1;
    }

    const evolucionDiaria = Object.entries(porDia)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, stats]) => ({ dia, ...stats }));

    // Obtener emails de los top usuarios para mostrar en frontend
    const topUserIds = topUsuarios.map((u) => u.user_id).filter((id) => id !== "desconocido");
    const { data: perfilesTop } = topUserIds.length
      ? await adminClient.from("perfiles").select("user_id, email").in("user_id", topUserIds)
      : { data: [] };
    const emailsMap = Object.fromEntries((perfilesTop ?? []).map((p) => [p.user_id, p.email]));
    const topUsuariosConEmail = topUsuarios.map((u) => ({
      ...u,
      email: emailsMap[u.user_id] ?? u.user_id,
    }));

    return new Response(
      JSON.stringify({
        totales: {
          tokens_entrada: totalTokensEntrada,
          tokens_salida: totalTokensSalida,
          tokens_total:
            totalTokensEntrada + totalTokensSalida + totalCacheCreation + totalCacheRead,
          cache_creation_tokens: totalCacheCreation,
          cache_read_tokens: totalCacheRead,
          peticiones: totalPeticiones,
          coste_usd: Math.round(totalCoste * 100000) / 100000,
          ahorro_cache_usd: Math.round((totalCosteSinCache - totalCoste) * 100000) / 100000,
        },
        por_modelo: porModelo,
        por_funcion: porFuncion,
        top_usuarios: topUsuariosConEmail,
        evolucion_diaria: evolucionDiaria,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("admin-get-metrics error:", e);
    return new Response(JSON.stringify({ error: "Error interno del servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
