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
  course_key: string | null;
  paper: string | null;
};

// ── Conversión de divisas ────────────────────────────────────────────────────
// El coste LLM se calcula en USD; los ingresos por créditos están en EUR y las
// reservas 1:1 en SEK. 1 crédito = 1 EUR = 10 SEK (ver credits_system migration).
// Mostramos todo en SEK. USD→SEK es una estimación editable; margen orientativo.
const USD_TO_SEK = 9.2; // 1 USD ≈ 0.92 EUR ≈ 9.2 SEK
const EUR_TO_SEK = 10; // 1 EUR = 10 SEK
const CREDIT_TO_SEK = 10; // 1 crédito = 1 EUR = 10 SEK

// ── Agrupación lógica de features ────────────────────────────────────────────
// Una "venta" puede abarcar varias edge functions / modelos. Mapeamos coste
// (por edge_function) e ingreso (por concepto de creditos_transacciones) al mismo
// producto lógico para poder comparar coste vs ingreso por feature.
const FEATURE_BY_FUNCTION: Record<string, string> = {
  "evaluate-analysis": "p1-literature",
  "generate-analysis-feedback": "p1-literature",
  "generate-analysis-extras": "p1-literature",
  "generate-practice-text": "p1-literature",
  "evaluate-paper2": "p2-literature",
  "generate-paper2-feedback": "p2-literature",
  "generate-paper2-extras": "p2-literature",
  "evaluate-oral": "oral-literature",
  "generate-oral-feedback": "oral-literature",
  "generate-oral-annotations": "oral-literature",
  "evaluate-oral-notes": "oral-literature",
  "suggest-oral-topics": "oral-literature",
  "create-oral-simulation-session": "oral-simulador",
  "evaluate-paper1-b": "paper1-b",
  "generate-questions-paper2-b": "paper2-b",
  "evaluate-paper2-b": "paper2-b",
  "evaluate-oral-b": "oral-b-async",
  "create-oral-b-session": "oral-b-conversacional",
  "transcribe-oral": "transcripcion",
  "transcribe-image": "transcripcion",
  "tts-listening-b": "tts-listening",
  "teacher-chat": "teacher-chat",
  "generate-study-plan": "plan-estudio",
};
const FEATURE_BY_CONCEPTO: Record<string, string> = {
  "evaluate-paper1-b": "paper1-b",
  "evaluate-paper1-b-feedback": "paper1-b",
  "generate-questions-paper2-b": "paper2-b",
  "evaluate-paper2-b": "paper2-b",
  "evaluate-paper2-b-feedback": "paper2-b",
  "evaluate-oral-b": "oral-b-async",
  "evaluate-oral-b-feedback": "oral-b-async",
  "oral-b-session": "oral-b-conversacional",
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

    const { data: evalsRaw, error: evalErr } = await evalQuery
      .order("created_at", { ascending: true })
      .limit(10000);
    if (evalErr) throw evalErr;
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
      // Coste por token (Anthropic) + coste fijo por llamada (voz/avatar/transcripción
      // — filas con tokens=0 cuyo coste vive en coste_fijo_usd).
      return (
        (entrada * p.precio_entrada_por_millon) / 1_000_000 +
        (cacheCreation * p.precio_entrada_por_millon * 1.25) / 1_000_000 +
        (cacheRead * p.precio_entrada_por_millon * 0.1) / 1_000_000 +
        (salida * p.precio_salida_por_millon) / 1_000_000 +
        (p.coste_fijo_usd ?? 0)
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
    const porUsuario: Record<
      string,
      { tokens: number; coste: number; peticiones: number; ultima_actividad: string }
    > = {};
    for (const u of usos) {
      const uid = u.user_id ?? "desconocido";
      if (!porUsuario[uid])
        porUsuario[uid] = { tokens: 0, coste: 0, peticiones: 0, ultima_actividad: u.created_at };
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
      porUsuario[uid].ultima_actividad = u.created_at;
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

    // ── Feature events ─────────────────────────────────────────────────────────
    type FeEventRow = { feature: string; event_type: string };
    let feQuery = adminClient
      .from("feature_events")
      .select("feature, event_type");
    feQuery = feQuery.gte("created_at", desdeEfectivo);
    if (hasta) feQuery = feQuery.lte("created_at", hasta);

    const { data: feRaw } = await feQuery.limit(50000);
    const feRows = (feRaw ?? []) as FeEventRow[];

    const porFeature: Record<string, { started: number; completed: number; total: number }> = {};
    for (const row of feRows) {
      if (!porFeature[row.feature])
        porFeature[row.feature] = { started: 0, completed: 0, total: 0 };
      porFeature[row.feature].total += 1;
      if (row.event_type === "evaluation_started") porFeature[row.feature].started += 1;
      if (row.event_type === "evaluation_completed") porFeature[row.feature].completed += 1;
    }

    const featureStats = Object.entries(porFeature)
      .map(([feature, stats]) => ({
        feature,
        ...stats,
        tasa_completado:
          stats.started > 0 ? Math.round((stats.completed / stats.started) * 100) : null,
      }))
      .sort((a, b) => b.total - a.total);

    // ── Modelos sin precio (coste invisible) ────────────────────────────────────
    // Avisa si algún modelo registrado no tiene base de coste, para que features
    // nuevas no se lean como gratis (€0) silenciosamente.
    const estaPreciado = (modelo: string): boolean => {
      const p = preciosMap[modelo];
      if (!p) return false;
      return (
        (p.precio_entrada_por_millon ?? 0) > 0 ||
        (p.precio_salida_por_millon ?? 0) > 0 ||
        (p.coste_fijo_usd ?? null) !== null
      );
    };
    const modelosSinPrecio = [...new Set(usos.map((u) => u.modelo))].filter((m) => !estaPreciado(m));

    // ── Coste en SEK por feature lógica ──────────────────────────────────────────
    const costeSekPorFeature: Record<string, { coste_sek: number; peticiones: number }> = {};
    for (const u of usos) {
      const feature = FEATURE_BY_FUNCTION[u.edge_function] ?? u.edge_function;
      if (!costeSekPorFeature[feature]) costeSekPorFeature[feature] = { coste_sek: 0, peticiones: 0 };
      costeSekPorFeature[feature].coste_sek +=
        calcCoste(
          u.modelo,
          u.tokens_entrada,
          u.tokens_salida,
          u.cache_creation_tokens ?? 0,
          u.cache_read_tokens ?? 0,
        ) * USD_TO_SEK;
      costeSekPorFeature[feature].peticiones += 1;
    }

    // ── Por curso ────────────────────────────────────────────────────────────────
    const porCurso: Record<string, { tokens: number; coste_sek: number; peticiones: number }> = {};
    for (const u of usos) {
      const curso = u.course_key ?? "spanish-a-literature";
      if (!porCurso[curso]) porCurso[curso] = { tokens: 0, coste_sek: 0, peticiones: 0 };
      porCurso[curso].tokens +=
        u.tokens_entrada +
        u.tokens_salida +
        (u.cache_creation_tokens ?? 0) +
        (u.cache_read_tokens ?? 0);
      porCurso[curso].coste_sek +=
        calcCoste(
          u.modelo,
          u.tokens_entrada,
          u.tokens_salida,
          u.cache_creation_tokens ?? 0,
          u.cache_read_tokens ?? 0,
        ) * USD_TO_SEK;
      porCurso[curso].peticiones += 1;
    }

    // ── Ingresos: compras Stripe (EUR→SEK) + reservas 1:1 (ya en SEK) ────────────
    type CompraRow = { user_id: string | null; precio_eur: number; completado_at: string | null };
    let comprasQuery = adminClient
      .from("creditos_compras")
      .select("user_id, precio_eur, completado_at")
      .eq("estado", "completado")
      .gte("completado_at", desdeEfectivo);
    if (hasta) comprasQuery = comprasQuery.lte("completado_at", hasta);
    const { data: comprasRaw } = await comprasQuery.limit(10000);
    const compras = (comprasRaw ?? []) as CompraRow[];
    const ingresoCreditosSek = compras.reduce((s, c) => s + (c.precio_eur ?? 0) * EUR_TO_SEK, 0);
    const usuariosPagadores = new Set(
      compras.map((c) => c.user_id).filter((id): id is string => id !== null),
    ).size;

    type BookingRow = { total_sek: number | null; status: string };
    let bookingsQuery = adminClient
      .from("bookings")
      .select("total_sek, status, created_at")
      .in("status", ["confirmed", "completed"])
      .gte("created_at", desdeEfectivo);
    if (hasta) bookingsQuery = bookingsQuery.lte("created_at", hasta);
    const { data: bookingsRaw } = await bookingsQuery.limit(10000);
    const bookingsRows = (bookingsRaw ?? []) as BookingRow[];
    const ingresoBookingsSek = bookingsRows.reduce((s, b) => s + (b.total_sek ?? 0), 0);
    const ingresosTotalSek = ingresoCreditosSek + ingresoBookingsSek;

    // ── Créditos cobrados por feature (consumo) ──────────────────────────────────
    type TxRow = { concepto: string; cantidad: number; tipo: string };
    let txQuery = adminClient
      .from("creditos_transacciones")
      .select("concepto, cantidad, tipo, created_at")
      .in("tipo", ["uso_evaluacion", "reembolso"])
      .gte("created_at", desdeEfectivo);
    if (hasta) txQuery = txQuery.lte("created_at", hasta);
    const { data: txRaw } = await txQuery.limit(50000);
    const txRows = (txRaw ?? []) as TxRow[];
    const ingresoSekPorFeature: Record<string, number> = {};
    for (const t of txRows) {
      const feature = FEATURE_BY_CONCEPTO[t.concepto] ?? t.concepto;
      // cantidad: negativa = consumo, positiva = reembolso. -cantidad = crédito neto cobrado.
      ingresoSekPorFeature[feature] =
        (ingresoSekPorFeature[feature] ?? 0) + -t.cantidad * CREDIT_TO_SEK;
    }

    // ── Margen por feature (coste vs ingreso) ────────────────────────────────────
    const featuresUnion = new Set([
      ...Object.keys(costeSekPorFeature),
      ...Object.keys(ingresoSekPorFeature),
    ]);
    const margenPorFeature = [...featuresUnion]
      .map((feature) => {
        const coste = costeSekPorFeature[feature]?.coste_sek ?? 0;
        const ingreso = ingresoSekPorFeature[feature] ?? 0;
        const peticiones = costeSekPorFeature[feature]?.peticiones ?? 0;
        const margen = ingreso - coste;
        return {
          feature,
          coste_sek: Math.round(coste * 100) / 100,
          ingreso_sek: Math.round(ingreso * 100) / 100,
          margen_sek: Math.round(margen * 100) / 100,
          margen_pct: ingreso > 0 ? Math.round((margen / ingreso) * 100) : null,
          peticiones,
          coste_unitario: peticiones > 0 ? Math.round((coste / peticiones) * 100) / 100 : 0,
          ingreso_unitario: peticiones > 0 ? Math.round((ingreso / peticiones) * 100) / 100 : null,
        };
      })
      .sort((a, b) => b.coste_sek - a.coste_sek);

    // ── Margen global + ARPU ─────────────────────────────────────────────────────
    const costeTotalSek = totalCoste * USD_TO_SEK;
    const margenBrutoSek = ingresosTotalSek - costeTotalSek;
    const margen = {
      ingresos_sek: Math.round(ingresosTotalSek * 100) / 100,
      coste_sek: Math.round(costeTotalSek * 100) / 100,
      margen_bruto_sek: Math.round(margenBrutoSek * 100) / 100,
      margen_pct: ingresosTotalSek > 0 ? Math.round((margenBrutoSek / ingresosTotalSek) * 100) : null,
      arpu_sek: usuariosUnicos > 0 ? Math.round((ingresosTotalSek / usuariosUnicos) * 100) / 100 : 0,
      usuarios_pagadores: usuariosPagadores,
    };

    // ── Retención: DAU medio / WAU / MAU / stickiness ────────────────────────────
    const finVentana = hasta ? new Date(hasta) : new Date();
    const hace7d = new Date(finVentana.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const usuariosWau = new Set(
      usos.filter((u) => u.created_at >= hace7d && u.user_id).map((u) => u.user_id as string),
    ).size;
    const dauPromedio =
      evolucionDiaria.length > 0
        ? Math.round(
            evolucionDiaria.reduce((s, d) => s + d.dau, 0) / evolucionDiaria.length,
          )
        : 0;
    const retencion = {
      dau_promedio: dauPromedio,
      wau: usuariosWau,
      mau: usuariosUnicos, // distintos en toda la ventana (≈30 días por defecto)
      stickiness_pct: usuariosUnicos > 0 ? Math.round((dauPromedio / usuariosUnicos) * 100) : null,
    };

    // ── Embudo: alta → diagnóstico → 1ª actividad → 1er pago ─────────────────────
    type PerfilRow = { user_id: string; diagnostico_completado: boolean | null; created_at: string };
    let perfilesQuery = adminClient
      .from("perfiles")
      .select("user_id, diagnostico_completado, created_at")
      .gte("created_at", desdeEfectivo);
    if (hasta) perfilesQuery = perfilesQuery.lte("created_at", hasta);
    const { data: perfilesRaw } = await perfilesQuery.limit(50000);
    const perfilesCohorte = (perfilesRaw ?? []) as PerfilRow[];
    const altaIds = new Set(perfilesCohorte.map((p) => p.user_id));
    const activosIds = new Set(
      usos.map((u) => u.user_id).filter((id): id is string => id !== null),
    );
    const pagadoresIds = new Set(
      compras.map((c) => c.user_id).filter((id): id is string => id !== null),
    );
    const funnel = {
      altas: altaIds.size,
      diagnostico: perfilesCohorte.filter((p) => p.diagnostico_completado).length,
      primera_actividad: [...altaIds].filter((id) => activosIds.has(id)).length,
      primer_pago: [...altaIds].filter((id) => pagadoresIds.has(id)).length,
    };

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
        feature_events: {
          total: feRows.length,
          por_feature: featureStats,
        },
        ingresos_sek: {
          creditos: Math.round(ingresoCreditosSek * 100) / 100,
          bookings: Math.round(ingresoBookingsSek * 100) / 100,
          total: Math.round(ingresosTotalSek * 100) / 100,
        },
        margen,
        margen_por_feature: margenPorFeature,
        por_curso: porCurso,
        retencion,
        funnel,
        modelos_sin_precio: modelosSinPrecio,
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
