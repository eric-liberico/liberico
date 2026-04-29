import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

type UsoRow = {
  created_at: string;
  tokens_entrada: number;
  tokens_salida: number;
  cache_creation_tokens: number | null;
  cache_read_tokens: number | null;
  modelo: string;
  edge_function: string;
  user_id: string | null;
};

type EvalRow = {
  created_at: string;
  banda_a: number | null;
  banda_b: number | null;
  banda_c: number | null;
  banda_d: number | null;
  nota_ib: number | null;
};

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
    const hasta = hastaRaw ? `${hastaRaw}T23:59:59.999Z` : null;
    const userId = typeof body.user_id === "string" ? body.user_id : null;

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const desdeEfectivo =
      desde ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // ── llm_uso ────────────────────────────────────────────────────────────────
    let query = adminClient.from("llm_uso").select("*");
    query = query.gte("created_at", desdeEfectivo);
    if (hasta) query = query.lte("created_at", hasta);
    if (userId) query = query.eq("user_id", userId);

    const { data: usosRaw, error: usoErr } = await query
      .order("created_at", { ascending: true })
      .limit(10000);
    if (usoErr) throw usoErr;
    const usos = (usosRaw ?? []) as UsoRow[];

    // ── evaluaciones ───────────────────────────────────────────────────────────
    let evalQuery = adminClient
      .from("evaluaciones")
      .select("banda_a, banda_b, banda_c, banda_d, nota_ib, created_at");
    evalQuery = evalQuery.gte("created_at", desdeEfectivo);
    if (hasta) evalQuery = evalQuery.lte("created_at", hasta);
    if (userId) evalQuery = evalQuery.eq("user_id", userId);

    const { data: evalsRaw } = await evalQuery
      .order("created_at", { ascending: true })
      .limit(10000);
    const evals = (evalsRaw ?? []) as EvalRow[];

    // ── Precios ────────────────────────────────────────────────────────────────
    const { data: precios } = await adminClient.from("llm_precios").select("*");
    const preciosMap = Object.fromEntries((precios ?? []).map((p) => [p.modelo, p]));

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

    // ── Totales globales ───────────────────────────────────────────────────────
    const totalTokensEntrada = usos.reduce((s, u) => s + u.tokens_entrada, 0);
    const totalTokensSalida = usos.reduce((s, u) => s + u.tokens_salida, 0);
    const totalCacheCreation = usos.reduce((s, u) => s + (u.cache_creation_tokens ?? 0), 0);
    const totalCacheRead = usos.reduce((s, u) => s + (u.cache_read_tokens ?? 0), 0);
    const totalPeticiones = usos.length;
    const totalCoste = usos.reduce(
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
    );
    const totalCosteSinCache = usos.reduce(
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
    );

    // Usuarios únicos y llamadas fallidas
    const usuariosUnicosSet = new Set(
      usos.map((u) => u.user_id).filter((id): id is string => id !== null),
    );
    const usuariosUnicos = usuariosUnicosSet.size;
    const llamadasFallidas = usos.filter((u) => u.tokens_salida === 0).length;

    // ── Por modelo ─────────────────────────────────────────────────────────────
    const porModelo: Record<string, { tokens: number; coste: number; peticiones: number }> = {};
    for (const u of usos) {
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

    // ── Por función ────────────────────────────────────────────────────────────
    const porFuncion: Record<string, { tokens: number; coste: number; peticiones: number }> = {};
    for (const u of usos) {
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

    // ── Por usuario (top 20) ───────────────────────────────────────────────────
    const porUsuario: Record<string, { tokens: number; coste: number; peticiones: number }> = {};
    for (const u of usos) {
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

    // ── Evolución diaria (llm_uso) + DAU ──────────────────────────────────────
    const porDia: Record<string, { tokens: number; coste: number; peticiones: number }> = {};
    const dauPorDia: Record<string, Set<string>> = {};
    for (const u of usos) {
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
      if (u.user_id) {
        if (!dauPorDia[dia]) dauPorDia[dia] = new Set();
        dauPorDia[dia].add(u.user_id);
      }
    }

    const evolucionDiaria = Object.entries(porDia)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, stats]) => ({
        dia,
        ...stats,
        dau: dauPorDia[dia]?.size ?? 0,
      }));

    // ── Proyección coste mensual ───────────────────────────────────────────────
    const diasConDatos = evolucionDiaria.length;
    const proyeccionMensualUsd =
      diasConDatos > 0 ? Math.round((totalCoste / diasConDatos) * 30 * 100000) / 100000 : 0;

    // ── Evaluaciones diarias ───────────────────────────────────────────────────
    const evalsPorDia: Record<string, number> = {};
    for (const e of evals) {
      const dia = e.created_at.slice(0, 10);
      evalsPorDia[dia] = (evalsPorDia[dia] ?? 0) + 1;
    }
    const evaluacionesDiarias = Object.entries(evalsPorDia)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, total]) => ({ dia, total }));

    // Medias por criterio
    const totalEvals = evals.length;
    const mediasBandas =
      totalEvals > 0
        ? {
            banda_a:
              Math.round(
                (evals.reduce((s: number, e: EvalRow) => s + (e.banda_a ?? 0), 0) / totalEvals) *
                  10,
              ) / 10,
            banda_b:
              Math.round(
                (evals.reduce((s: number, e: EvalRow) => s + (e.banda_b ?? 0), 0) / totalEvals) *
                  10,
              ) / 10,
            banda_c:
              Math.round(
                (evals.reduce((s: number, e: EvalRow) => s + (e.banda_c ?? 0), 0) / totalEvals) *
                  10,
              ) / 10,
            banda_d:
              Math.round(
                (evals.reduce((s: number, e: EvalRow) => s + (e.banda_d ?? 0), 0) / totalEvals) *
                  10,
              ) / 10,
            nota_ib: Math.round(
              evals.reduce((s: number, e: EvalRow) => s + (e.nota_ib ?? 0), 0) / totalEvals,
            ),
          }
        : null;

    // Histograma nota IB (1–7)
    const histogramaNota: Record<string, number> = {};
    for (let n = 1; n <= 7; n++) histogramaNota[String(n)] = 0;
    for (const e of evals) {
      const nota = String(e.nota_ib ?? 0);
      if (nota in histogramaNota) histogramaNota[nota] += 1;
    }

    // ── Emails top usuarios ────────────────────────────────────────────────────
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
          usuarios_unicos: usuariosUnicos,
          llamadas_fallidas: llamadasFallidas,
        },
        proyeccion_mensual_usd: proyeccionMensualUsd,
        por_modelo: porModelo,
        por_funcion: porFuncion,
        top_usuarios: topUsuariosConEmail,
        evolucion_diaria: evolucionDiaria,
        evaluaciones: {
          total: totalEvals,
          diarias: evaluacionesDiarias,
          medias_bandas: mediasBandas,
          histograma_nota: histogramaNota,
        },
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
