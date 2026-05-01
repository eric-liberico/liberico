import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  xp: number;
  className?: string;
};

// Umbrales de nivel (XP acumulado)
const NIVELES = [0, 100, 300, 600, 1000, 1500, 2200, 3000];
const NOMBRES = ["Principiante", "Lector", "Analista", "Crítico", "Experto", "Maestro", "Examinador"];

function calcularNivel(xp: number): { nivel: number; nombre: string; progreso: number; xpNivel: number; xpSiguiente: number } {
  let nivel = 0;
  for (let i = NIVELES.length - 1; i >= 0; i--) {
    if (xp >= NIVELES[i]) {
      nivel = i;
      break;
    }
  }
  const esFinal = nivel >= NIVELES.length - 1;
  const xpNivel = NIVELES[nivel];
  const xpSiguiente = esFinal ? NIVELES[NIVELES.length - 1] : NIVELES[nivel + 1];
  const progreso = esFinal ? 100 : Math.round(((xp - xpNivel) / (xpSiguiente - xpNivel)) * 100);
  return { nivel, nombre: NOMBRES[nivel] ?? "Maestro", progreso, xpNivel, xpSiguiente };
}

export function BarraXP({ xp, className }: Props) {
  const { nombre, progreso, xpSiguiente } = calcularNivel(xp);
  const esFinal = xp >= NIVELES[NIVELES.length - 1];

  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      <Zap className="h-4 w-4 shrink-0 text-yellow-500 fill-yellow-400" />
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-medium text-foreground truncate">{nombre}</span>
          <span className="shrink-0 text-muted-foreground">
            {xp.toLocaleString()} XP{!esFinal && ` / ${xpSiguiente.toLocaleString()}`}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-yellow-400 transition-all duration-500"
            style={{ width: `${progreso}%` }}
          />
        </div>
      </div>
    </div>
  );
}
