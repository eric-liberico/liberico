import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
      const { data: perfil } = await supabase
        .from("perfiles")
        .select("xp_total, racha_actual, racha_maxima, nota_media")
        .maybeSingle();

      const { data: logros } = await supabase
        .from("logros_desbloqueados")
        .select(
          "logro_id, desbloqueado_at, notificado, logros_catalogo(id, nombre, descripcion, xp_recompensa, icono, categoria)",
        )
        .order("desbloqueado_at", { ascending: false });

      if (!activo) return;

      const ids = new Set<string>();
      const fechas = new Map<string, string>();
      for (const l of logros ?? []) {
        ids.add(l.logro_id);
        fechas.set(l.logro_id, l.desbloqueado_at);
      }

      setState({
        xp: perfil?.xp_total ?? 0,
        racha: perfil?.racha_actual ?? 0,
        rachaMaxima: perfil?.racha_maxima ?? 0,
        notaMedia: perfil?.nota_media ?? 0,
        logrosDesbloqueados: ids,
        fechas,
        logrosDetalle: (logros ?? []) as LogroDesbloqueado[],
        loading: false,
      });
    }

    cargar();
    return () => {
      activo = false;
    };
  }, []);

  return state;
}
