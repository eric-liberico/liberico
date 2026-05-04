// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

type SupabaseAdminClient = ReturnType<typeof createClient<any, any, any>>;

export type DatosEvalGamif =
  | {
      tipo: "p1";
      banda_a: number;
      banda_b: number;
      banda_c: number;
      banda_d: number;
      nota_ib: number;
    }
  | { tipo: "p2"; puntuacion_total: number }
  | { tipo: "oral"; puntuacion_total: number };

export type LogroNuevo = {
  logro_id: string;
  nombre: string;
  xp_recompensa: number;
  icono: string;
};

export type GamificacionResultado = {
  xp_ganado: number;
  xp_total: number;
  racha_actual: number;
  logros_nuevos: LogroNuevo[];
};

type GamifCurso = {
  xp_total: number;
  racha_actual: number;
  racha_maxima: number;
  ultima_actividad_fecha: string | null;
  nota_media: number;
};

type LogroCatalogo = {
  id: string;
  nombre: string;
  xp_recompensa: number;
  icono: string;
};

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  const ms = new Date(a).getTime() - new Date(b).getTime();
  return Math.round(ms / 86_400_000);
}

function notaIBP2(total: number): number {
  if (total <= 2) return 1;
  if (total <= 6) return 2;
  if (total <= 9) return 3;
  if (total <= 13) return 4;
  if (total <= 17) return 5;
  if (total <= 21) return 6;
  return 7;
}

function notaIBOral(total: number): number {
  if (total <= 6) return 1;
  if (total <= 12) return 2;
  if (total <= 18) return 3;
  if (total <= 23) return 4;
  if (total <= 28) return 5;
  if (total <= 33) return 6;
  return 7;
}

export async function procesarGamificacion(
  adminClient: SupabaseAdminClient,
  userId: string,
  datos: DatosEvalGamif,
  courseKey = "spanish-a-literature",
): Promise<GamificacionResultado> {
  try {
    // 1. Leer progreso actual para este curso
    const { data: cursoRawData } = await adminClient
      .from("gamificacion_curso")
      .select("xp_total, racha_actual, racha_maxima, ultima_actividad_fecha, nota_media")
      .eq("user_id", userId)
      .eq("course_key", courseKey)
      .maybeSingle();

    const cursoRaw = cursoRawData as GamifCurso | null;
    const curso: GamifCurso = cursoRaw ?? {
      xp_total: 0,
      racha_actual: 0,
      racha_maxima: 0,
      ultima_actividad_fecha: null,
      nota_media: 0,
    };

    // 2. Calcular nueva racha
    const hoy = toDateString(new Date());
    let nuevaRacha: number;
    if (!curso.ultima_actividad_fecha) {
      nuevaRacha = 1;
    } else if (curso.ultima_actividad_fecha === hoy) {
      nuevaRacha = curso.racha_actual;
    } else if (diffDays(hoy, curso.ultima_actividad_fecha) === 1) {
      nuevaRacha = curso.racha_actual + 1;
    } else {
      nuevaRacha = 1;
    }
    const nuevaRachaMaxima = Math.max(curso.racha_maxima, nuevaRacha);

    // 3. Calcular XP ganado
    let notaIB: number;
    let xpBase: number;
    if (datos.tipo === "p1") {
      notaIB = datos.nota_ib;
      xpBase = 30;
    } else if (datos.tipo === "p2") {
      notaIB = notaIBP2(datos.puntuacion_total);
      xpBase = 40;
    } else {
      notaIB = notaIBOral(datos.puntuacion_total);
      xpBase = 50;
    }
    if (notaIB === 7) xpBase += 30;
    else if (notaIB >= 6) xpBase += 20;

    const xpNuevoTotal = curso.xp_total + xpBase;

    // 4. Conteos de evaluaciones de ESTE CURSO (para nota media y logros)
    type EvalP1Row = { nota_ib: number | null };
    type EvalPTRow = { puntuacion_total: number | null };
    const [p1Evals, p2Evals, oralEvals] = await Promise.all([
      adminClient
        .from("evaluaciones")
        .select("nota_ib", { count: "exact" })
        .eq("user_id", userId)
        .eq("course_key", courseKey),
      adminClient
        .from("evaluaciones_prueba2")
        .select("puntuacion_total", { count: "exact" })
        .eq("user_id", userId)
        .eq("course_key", courseKey),
      adminClient
        .from("evaluaciones_oral")
        .select("puntuacion_total", { count: "exact" })
        .eq("user_id", userId)
        .eq("course_key", courseKey),
    ]);
    const totalP1 = p1Evals.count ?? 0;
    const totalP2 = p2Evals.count ?? 0;
    const totalOral = oralEvals.count ?? 0;
    const totalEvals = totalP1 + totalP2 + totalOral;

    const notasP1 = ((p1Evals.data as EvalP1Row[] | null) ?? [])
      .map((r) => r.nota_ib ?? 0)
      .filter((n) => n > 0);
    const notasP2 = ((p2Evals.data as EvalPTRow[] | null) ?? [])
      .map((r) => notaIBP2(r.puntuacion_total ?? 0))
      .filter((n) => n > 0);
    const notasOral = ((oralEvals.data as EvalPTRow[] | null) ?? [])
      .map((r) => notaIBOral(r.puntuacion_total ?? 0))
      .filter((n) => n > 0);
    const todasNotas = [...notasP1, ...notasP2, ...notasOral];
    const notaMedia =
      todasNotas.length > 0 ? todasNotas.reduce((a, b) => a + b, 0) / todasNotas.length : 0;

    // 5. Actualizar gamificacion_curso (upsert)
    await adminClient
      .from("gamificacion_curso")
      .upsert({
        user_id: userId,
        course_key: courseKey,
        xp_total: xpNuevoTotal,
        racha_actual: nuevaRacha,
        racha_maxima: nuevaRachaMaxima,
        ultima_actividad_fecha: hoy,
        nota_media: notaMedia,
      })
      .eq("user_id", userId)
      .eq("course_key", courseKey);

    // También actualizar nota_media global en perfiles para BarraXP
    await adminClient
      .from("perfiles")
      .update({ nota_media: notaMedia })
      .eq("user_id", userId);

    // 6. Logros ya desbloqueados para ESTE CURSO
    const { data: desbloqueadosRawData } = await adminClient
      .from("logros_desbloqueados")
      .select("logro_id")
      .eq("user_id", userId)
      .eq("course_key", courseKey);
    const desbloqueadosRaw = desbloqueadosRawData as Array<{ logro_id: string }> | null;
    const yaDesbloqueados = new Set<string>((desbloqueadosRaw ?? []).map((r) => r.logro_id));

    type PrevPuntuacion = { puntuacion_total: number | null };

    // Evaluaciones previas para logros de mejora (filtradas por course_key)
    let prevTotal: number | null = null;
    let prevPrevTotal: number | null = null;
    let prevBandas: { banda_a: number; banda_b: number; banda_c: number; banda_d: number } | null =
      null;

    if (datos.tipo === "p1" && totalP1 >= 2) {
      type PrevP1 = {
        banda_a: number;
        banda_b: number;
        banda_c: number;
        banda_d: number;
        puntuacion_total: number | null;
      };
      const { data: prevEvalsRaw } = await adminClient
        .from("evaluaciones")
        .select("banda_a, banda_b, banda_c, banda_d, puntuacion_total")
        .eq("user_id", userId)
        .eq("course_key", courseKey)
        .order("created_at", { ascending: false })
        .limit(3);
      const prevEvals = prevEvalsRaw as PrevP1[] | null;
      if (prevEvals && prevEvals.length >= 2) {
        prevBandas = {
          banda_a: prevEvals[1].banda_a,
          banda_b: prevEvals[1].banda_b,
          banda_c: prevEvals[1].banda_c,
          banda_d: prevEvals[1].banda_d,
        };
        prevTotal = prevEvals[1].puntuacion_total;
      }
      if (prevEvals && prevEvals.length >= 3) {
        prevPrevTotal = prevEvals[2].puntuacion_total;
      }
    }

    if (datos.tipo === "p2" && totalP2 >= 2) {
      const { data: prevEvalsRaw } = await adminClient
        .from("evaluaciones_prueba2")
        .select("puntuacion_total")
        .eq("user_id", userId)
        .eq("course_key", courseKey)
        .order("created_at", { ascending: false })
        .limit(3);
      const prevEvals = prevEvalsRaw as PrevPuntuacion[] | null;
      if (prevEvals && prevEvals.length >= 2) prevTotal = prevEvals[1].puntuacion_total;
      if (prevEvals && prevEvals.length >= 3) prevPrevTotal = prevEvals[2].puntuacion_total;
    }

    if (datos.tipo === "oral" && totalOral >= 2) {
      const { data: prevEvalsRaw } = await adminClient
        .from("evaluaciones_oral")
        .select("puntuacion_total")
        .eq("user_id", userId)
        .eq("course_key", courseKey)
        .order("created_at", { ascending: false })
        .limit(3);
      const prevEvals = prevEvalsRaw as PrevPuntuacion[] | null;
      if (prevEvals && prevEvals.length >= 2) prevTotal = prevEvals[1].puntuacion_total;
      if (prevEvals && prevEvals.length >= 3) prevPrevTotal = prevEvals[2].puntuacion_total;
    }

    // 7. Evaluar condiciones de logros
    const logrosADesbloquear: string[] = [];
    const evalLogro = (id: string, condicion: boolean) => {
      if (condicion && !yaDesbloqueados.has(id)) logrosADesbloquear.push(id);
    };

    evalLogro("primera_evaluacion", totalEvals >= 1);
    evalLogro("tres_evaluaciones", totalEvals >= 3);
    evalLogro("primera_p2", totalP2 >= 1);
    evalLogro("primer_oral", totalOral >= 1);
    evalLogro("tres_pruebas", totalP1 >= 1 && totalP2 >= 1 && totalOral >= 1);
    evalLogro("racha_3", nuevaRacha >= 3);
    evalLogro("racha_7", nuevaRacha >= 7);
    evalLogro("diez_evaluaciones", totalEvals >= 10);
    evalLogro("veinte_evaluaciones", totalEvals >= 20);

    if (datos.tipo === "p1") {
      evalLogro(
        "banda_maxima_p1",
        datos.banda_a === 5 || datos.banda_b === 5 || datos.banda_c === 5 || datos.banda_d === 5,
      );
      evalLogro("nota_6_p1", notaIB >= 6);
      evalLogro("nota_7_p1", notaIB === 7);
      if (prevBandas) {
        evalLogro(
          "mejora_criterio",
          datos.banda_a > prevBandas.banda_a ||
            datos.banda_b > prevBandas.banda_b ||
            datos.banda_c > prevBandas.banda_c ||
            datos.banda_d > prevBandas.banda_d,
        );
      }
      if (prevTotal !== null && prevPrevTotal !== null) {
        const totalActual = datos.banda_a + datos.banda_b + datos.banda_c + datos.banda_d;
        evalLogro("mejora_consecutiva", totalActual > prevTotal && prevTotal > prevPrevTotal);
      }
    }

    if (datos.tipo === "p2") {
      evalLogro("nota_6_p2", notaIB >= 6);
      evalLogro("nota_7_p2", notaIB === 7);
      if (prevTotal !== null && prevPrevTotal !== null) {
        evalLogro(
          "mejora_consecutiva_p2",
          datos.puntuacion_total > prevTotal && prevTotal > prevPrevTotal,
        );
      }
    }

    if (datos.tipo === "oral") {
      evalLogro("oral_alta", datos.puntuacion_total >= 32);
      evalLogro("nota_6_oral", notaIB >= 6);
      evalLogro("nota_7_oral", notaIB === 7);
      if (prevTotal !== null && prevPrevTotal !== null) {
        evalLogro(
          "mejora_consecutiva_oral",
          datos.puntuacion_total > prevTotal && prevTotal > prevPrevTotal,
        );
      }
    }

    // 8. Insertar logros nuevos con course_key
    if (logrosADesbloquear.length > 0) {
      await adminClient
        .from("logros_desbloqueados")
        .insert(
          logrosADesbloquear.map((logro_id) => ({ user_id: userId, logro_id, course_key: courseKey })),
        );
    }

    // 9. Datos del catálogo para los logros nuevos
    let logrosNuevos: LogroNuevo[] = [];
    if (logrosADesbloquear.length > 0) {
      const { data: catalogoRawData } = await adminClient
        .from("logros_catalogo")
        .select("id, nombre, xp_recompensa, icono")
        .in("id", logrosADesbloquear);
      const catalogoData = catalogoRawData as LogroCatalogo[] | null;
      logrosNuevos = (catalogoData ?? []).map((l) => ({
        logro_id: l.id,
        nombre: l.nombre,
        xp_recompensa: l.xp_recompensa,
        icono: l.icono,
      }));
    }

    return {
      xp_ganado: xpBase,
      xp_total: xpNuevoTotal,
      racha_actual: nuevaRacha,
      logros_nuevos: logrosNuevos,
    };
  } catch (err) {
    console.error("procesarGamificacion error (non-fatal):", err);
    return { xp_ganado: 0, xp_total: 0, racha_actual: 0, logros_nuevos: [] };
  }
}
