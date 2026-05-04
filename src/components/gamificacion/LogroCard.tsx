import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { LOGROS_EN } from "@/lib/gamificacion-en";

type CatalogoLogro = {
  id: string;
  nombre: string;
  descripcion: string;
  xp_recompensa: number;
  icono: string;
  categoria: string;
};

type Props = {
  logro: CatalogoLogro;
  desbloqueado: boolean;
  fecha?: string;
};

function IconoDinamico({ nombre, className }: { nombre: string; className?: string }) {
  const mapa = Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const Icono = mapa[nombre];
  if (!Icono) return <Icons.Award className={className} />;
  return <Icono className={className} />;
}

const COLORES_CATEGORIA: Record<string, string> = {
  comienzo: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  constancia: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  calidad: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
  cobertura: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
};

export function LogroCard({ logro, desbloqueado, fecha }: Props) {
  const { courseKey } = useAuth();
  const isEN = courseKey === "english-a-literature";

  const enTranslation = LOGROS_EN[logro.id];
  const nombre = isEN && enTranslation ? enTranslation.nombre : logro.nombre;
  const descripcion = isEN && enTranslation ? enTranslation.descripcion : logro.descripcion;
  const locale = isEN ? "en-GB" : "es-ES";

  const colorClase = desbloqueado
    ? (COLORES_CATEGORIA[logro.categoria] ?? "bg-muted text-muted-foreground")
    : "bg-muted/50 text-muted-foreground";

  const fechaFormateada = fecha
    ? new Date(fecha).toLocaleDateString(locale, { day: "numeric", month: "short" })
    : null;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-2 rounded-xl p-3 text-center transition-opacity",
        desbloqueado ? "opacity-100" : "opacity-40",
      )}
    >
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", colorClase)}>
        <IconoDinamico nombre={logro.icono} className="h-6 w-6" />
      </div>
      <div className="space-y-0.5">
        <p className="text-xs font-semibold leading-tight">{nombre}</p>
        <p className="text-[11px] leading-snug text-muted-foreground line-clamp-2">{descripcion}</p>
      </div>
      {desbloqueado ? (
        <span className="text-[10px] font-medium text-yellow-600 dark:text-yellow-400">
          +{logro.xp_recompensa} XP{fechaFormateada ? ` · ${fechaFormateada}` : ""}
        </span>
      ) : (
        <span className="text-[10px] text-muted-foreground">{logro.xp_recompensa} XP</span>
      )}
    </div>
  );
}
