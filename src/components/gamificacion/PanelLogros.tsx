import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogroCard } from "./LogroCard";
import { useAuth } from "@/hooks/useAuth";
import { CATEGORIAS_EN } from "@/lib/gamificacion-en";

type CatalogoLogro = {
  id: string;
  nombre: string;
  descripcion: string;
  xp_recompensa: number;
  icono: string;
  categoria: string;
};

type Props = {
  logrosDesbloqueados: Set<string>;
  fechas: Map<string, string>;
};

const CATEGORIAS_ES: { id: string; etiqueta: string }[] = [
  { id: "comienzo", etiqueta: "Primeros pasos" },
  { id: "constancia", etiqueta: "Constancia" },
  { id: "calidad", etiqueta: "Calidad" },
  { id: "cobertura", etiqueta: "Cobertura" },
];

export function PanelLogros({ logrosDesbloqueados, fechas }: Props) {
  const { courseKey } = useAuth();
  const isEN = courseKey === "english-a-literature";

  const [catalogo, setCatalogo] = useState<CatalogoLogro[]>([]);

  useEffect(() => {
    supabase
      .from("logros_catalogo")
      .select("*")
      .then(({ data }) => {
        if (data) setCatalogo(data as CatalogoLogro[]);
      });
  }, []);

  if (catalogo.length === 0) return null;

  const desbloqueadosCount = catalogo.filter((l) => logrosDesbloqueados.has(l.id)).length;

  const categorias = CATEGORIAS_ES.map((c) => ({
    id: c.id,
    etiqueta: isEN ? (CATEGORIAS_EN[c.id] ?? c.etiqueta) : c.etiqueta,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{isEN ? "Achievements" : "Logros"}</h2>
        <span className="text-sm text-muted-foreground">
          {desbloqueadosCount} / {catalogo.length}
        </span>
      </div>

      {categorias.map(({ id, etiqueta }) => {
        const logrosCategoria = catalogo.filter((l) => l.categoria === id);
        if (logrosCategoria.length === 0) return null;
        return (
          <div key={id} className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {etiqueta}
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {logrosCategoria.map((logro) => (
                <LogroCard
                  key={logro.id}
                  logro={logro}
                  desbloqueado={logrosDesbloqueados.has(logro.id)}
                  fecha={fechas.get(logro.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
