import { Lock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { NOMBRES_EN } from "@/lib/gamificacion-en";

type Props = {
  xp: number;
  notaMedia?: number;
  className?: string;
};

// Umbrales de nivel (XP acumulado) y nota media mínima
const NIVELES_XP = [0, 100, 300, 600, 1000, 1500, 2200, 3000];
const NIVELES_NOTA = [0, 1, 2, 3, 4, 5, 6, 7];
const NOMBRES_ES = [
  "Lazarillo",
  "Juglar",
  "Galán",
  "Hidalgo",
  "Gongorino",
  "Quevedesco",
  "El Fénix",
  "Cervantes",
];

function calcularNivel(xp: number, notaMedia: number) {
  let nivelPorXP = 0;
  for (let i = NIVELES_XP.length - 1; i >= 0; i--) {
    if (xp >= NIVELES_XP[i]) {
      nivelPorXP = i;
      break;
    }
  }
  const nivelPorNota = Math.min(7, Math.floor(notaMedia));
  const nivel = Math.min(nivelPorXP, nivelPorNota);

  const esFinal = nivel >= NIVELES_XP.length - 1;
  const xpNivel = NIVELES_XP[nivel];
  const xpSiguiente = esFinal ? NIVELES_XP[NIVELES_XP.length - 1] : NIVELES_XP[nivel + 1];

  let progreso: number;
  if (esFinal) {
    progreso = 100;
  } else if (nivelPorXP > nivel) {
    progreso = 100;
  } else {
    progreso = Math.round(((xp - xpNivel) / (xpSiguiente - xpNivel)) * 100);
  }

  const notaBloqueando = !esFinal && nivelPorNota <= nivelPorXP;
  const notaNecesaria = esFinal ? null : NIVELES_NOTA[nivel + 1];

  return { nivel, progreso, xp, xpSiguiente, esFinal, notaBloqueando, notaMedia, notaNecesaria };
}

export function BarraXP({ xp, notaMedia = 0, className }: Props) {
  const { courseKey } = useAuth();
  const isEN = useUiLang() === "en";
  const NOMBRES = isEN ? NOMBRES_EN : NOMBRES_ES;

  const { nivel, progreso, xpSiguiente, esFinal, notaBloqueando, notaNecesaria } = calcularNivel(
    xp,
    notaMedia,
  );

  const nombre = NOMBRES[nivel] ?? NOMBRES[NOMBRES.length - 1];

  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      <Zap className="h-4 w-4 shrink-0 text-yellow-500 fill-yellow-400" />
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-medium text-foreground truncate">{nombre}</span>
          <span className="shrink-0 text-muted-foreground">
            {xp.toLocaleString()} XP
            {!esFinal && !notaBloqueando && ` / ${xpSiguiente.toLocaleString()}`}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              notaBloqueando ? "bg-muted-foreground/40" : "bg-yellow-400",
            )}
            style={{ width: `${progreso}%` }}
          />
        </div>
        {notaBloqueando && notaNecesaria !== null && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Lock className="h-2.5 w-2.5 shrink-0" />
            <span>
              {isEN
                ? `Avg grade: ${notaMedia.toFixed(1)} → need ${notaNecesaria}.0`
                : `Nota media: ${notaMedia.toFixed(1)} → necesitas ${notaNecesaria}.0`}
            </span>
          </div>
        )}
        {!notaBloqueando && !esFinal && notaMedia > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {isEN ? `Avg grade: ${notaMedia.toFixed(1)}` : `Nota media: ${notaMedia.toFixed(1)}`}
          </span>
        )}
      </div>
    </div>
  );
}
