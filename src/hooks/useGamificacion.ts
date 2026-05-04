import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type LogroDesbloqueado = {
  logro_id: string;
  desbloqueado_at: string;
  notificado: boolean;
  logros_catalogo: {
    id: string;
    nombre: string;
    descripcion: string;
    xp_recompensa: number;
    icono: string;
    categoria: string;
  } | null;
};

export type GamificacionState = {
  xp: number;
  racha: number;
  rachaMaxima: number;
  notaMedia: number;
  logrosDesbloqueados: Set<string>;
  fechas: Map<string, string>;
  logrosDetalle: LogroDesbloqueado[];
  loading: boolean;
};

export function useGamificacion(): GamificacionState {
  const { courseKey } = useAuth();

  const [state, setState] = useState<GamificacionState>({
    xp: 0,
    racha: 0,
    rachaMaxima: 0,
    notaMedia: 0,
    logrosDesbloqueados: new Set(),
    fechas: new Map(),
    logrosDetalle: [],
    loading: true,
  });

  useEffect(() => {
    let activo = true;

    async function cargar() {
      const [cursoRes, logrosRes] = await Promise.all([
        // Progreso de XP/racha aislado por asignatura
        supabase
          .from("gamificacion_curso")
          .select("xp_total, racha_actual, racha_maxima, nota_media")
          .eq("course_key", courseKey)
          .maybeSingle(),

        // Logros desbloqueados aislados por asignatura
        supabase
          .from("logros_desbloqueados")
          .select(
            "logro_id, desbloqueado_at, notificado, logros_catalogo(id, nombre, descripcion, xp_recompensa, icono, categoria)",
          )
          .eq("course_key", courseKey)
          .order("desbloqueado_at", { ascending: false }),
      ]);

      if (!activo) return;

      const cursoData = cursoRes.data;
      const logros = logrosRes.data;

      const ids = new Set<string>();
      const fechas = new Map<string, string>();
      for (const l of logros ?? []) {
        ids.add(l.logro_id);
        fechas.set(l.logro_id, l.desbloqueado_at);
      }

      setState({
        xp: cursoData?.xp_total ?? 0,
        racha: cursoData?.racha_actual ?? 0,
        rachaMaxima: cursoData?.racha_maxima ?? 0,
        notaMedia: cursoData?.nota_media ?? 0,
        logrosDesbloqueados: ids,
        fechas,
        logrosDetalle: (logros ?? []) as LogroDesbloqueado[],
        loading: false,
      });
    }

    setState((s) => ({ ...s, loading: true }));
    cargar();
    return () => {
      activo = false;
    };
  }, [courseKey]);

  return state;
}
