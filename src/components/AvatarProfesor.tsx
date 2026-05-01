import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

type Modo = "inactivo" | "escuchando" | "hablando";

interface Props {
  modo: Modo;
}

export function AvatarProfesor({ modo }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <div className="relative flex items-center justify-center">
        {/* Ondas externas al hablar */}
        {modo === "hablando" && (
          <>
            <span
              className="absolute h-44 w-44 rounded-full border-2 border-primary/20 animate-ping"
              style={{ animationDuration: "1.6s" }}
            />
            <span
              className="absolute h-52 w-52 rounded-full border border-primary/10 animate-ping"
              style={{ animationDuration: "2.2s", animationDelay: "0.4s" }}
            />
          </>
        )}

        {/* Pulso suave al escuchar */}
        {modo === "escuchando" && (
          <span className="absolute h-44 w-44 rounded-full border-2 border-sky-400/25 animate-pulse" />
        )}

        {/* Círculo principal */}
        <div
          className={cn(
            "relative h-36 w-36 rounded-full flex items-center justify-center",
            "bg-gradient-to-br from-slate-50 to-slate-100 shadow-lg",
            "border-4 transition-colors duration-500",
            modo === "hablando"
              ? "border-primary/60 shadow-primary/20 shadow-xl"
              : modo === "escuchando"
                ? "border-sky-400/50"
                : "border-slate-200",
          )}
        >
          <GraduationCap
            className={cn(
              "h-16 w-16 transition-colors duration-500",
              modo === "hablando" ? "text-primary/70" : "text-slate-500",
            )}
          />

          {/* Indicador de estado */}
          <span
            className={cn(
              "absolute bottom-2.5 right-2.5 h-4 w-4 rounded-full border-2 border-white shadow",
              "transition-colors duration-300",
              modo === "hablando"
                ? "bg-green-500 animate-pulse"
                : modo === "escuchando"
                  ? "bg-sky-400 animate-pulse"
                  : "bg-slate-300",
            )}
          />
        </div>
      </div>

      {/* Barras de onda al hablar */}
      <div className="h-8 flex items-end gap-1">
        {modo === "hablando" ? (
          [4, 7, 10, 7, 12, 7, 4, 9, 5].map((h, i) => (
            <span
              key={i}
              className="w-1.5 bg-primary/55 rounded-full animate-bounce"
              style={{
                height: `${h * 2}px`,
                animationDelay: `${i * 0.09}s`,
                animationDuration: "0.75s",
              }}
            />
          ))
        ) : (
          <span className="text-xs text-muted-foreground font-medium tracking-wide">
            {modo === "escuchando" ? "Escuchando…" : "En espera"}
          </span>
        )}
      </div>

      <p className="text-sm font-semibold text-foreground/80 -mt-1">Evaluador IB</p>
    </div>
  );
}
