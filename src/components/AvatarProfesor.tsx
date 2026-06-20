import { cn } from "@/lib/utils";
import { LANDING as L, landingFontMono as fontMono } from "@/lib/landing-theme";
import avatarProfesora from "@/assets/avatar-profesora.jpg";

type Modo = "inactivo" | "escuchando" | "hablando";

interface Props {
  modo: Modo;
}

export function AvatarProfesor({ modo }: Props) {
  return (
    <div className="flex select-none flex-col items-center gap-4">
      <div className="relative flex items-center justify-center">
        {/* Ondas externas al hablar */}
        {modo === "hablando" && (
          <>
            <span
              className="absolute h-44 w-44 animate-ping rounded-full border-2"
              style={{ borderColor: L.primary + "33", animationDuration: "1.6s" }}
            />
            <span
              className="absolute h-52 w-52 animate-ping rounded-full border"
              style={{
                borderColor: L.primary + "1A",
                animationDuration: "2.2s",
                animationDelay: "0.4s",
              }}
            />
          </>
        )}

        {/* Pulso suave al escuchar */}
        {modo === "escuchando" && (
          <span
            className="absolute h-44 w-44 animate-pulse rounded-full border-2"
            style={{ borderColor: CRIT_LISTEN }}
          />
        )}

        {/* Retrato principal */}
        <div
          className={cn(
            "relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-full shadow-lg",
            "border-4 transition-colors duration-500",
            modo === "hablando" ? "shadow-xl" : "",
          )}
          style={{
            background: "linear-gradient(135deg, #FFFFFF 0%, #EFEDE7 100%)",
            borderColor:
              modo === "hablando"
                ? L.primary + "99"
                : modo === "escuchando"
                  ? CRIT_LISTEN_STRONG
                  : L.line,
            boxShadow:
              modo === "hablando"
                ? "0 18px 36px -22px rgba(79,70,229,0.65)"
                : "0 18px 32px -24px rgba(15,23,42,0.35)",
          }}
        >
          <img
            src={avatarProfesora}
            alt="Profesora IA"
            draggable={false}
            className="h-full w-full object-cover"
            style={{ objectPosition: "50% 42%" }}
          />

          {/* Indicador de estado */}
          <span
            className={cn(
              "absolute bottom-2.5 right-2.5 h-4 w-4 rounded-full border-2 border-white shadow",
              "transition-colors duration-300",
              modo === "hablando" ? "animate-pulse" : modo === "escuchando" ? "animate-pulse" : "",
            )}
            style={{
              backgroundColor:
                modo === "hablando" ? L.ok : modo === "escuchando" ? CRIT_LISTEN_SOLID : L.line,
            }}
          />
        </div>
      </div>

      {/* Barras de onda al hablar */}
      <div className="flex h-8 items-end gap-1">
        {modo === "hablando" ? (
          [4, 7, 10, 7, 12, 7, 4, 9, 5].map((h, i) => (
            <span
              key={i}
              className="w-1.5 animate-bounce rounded-full"
              style={{
                height: `${h * 2}px`,
                backgroundColor: L.primary + "8C",
                animationDelay: `${i * 0.09}s`,
                animationDuration: "0.75s",
              }}
            />
          ))
        ) : (
          <span
            className="text-xs font-medium tracking-wide"
            style={{ ...fontMono, color: L.muted }}
          >
            {modo === "escuchando" ? "Escuchando…" : "En espera"}
          </span>
        )}
      </div>

      <p className="-mt-1 text-sm font-semibold" style={{ color: L.ink }}>
        Evaluador IB
      </p>
    </div>
  );
}

const CRIT_LISTEN = "#38BDF840";
const CRIT_LISTEN_STRONG = "#38BDF880";
const CRIT_LISTEN_SOLID = "#38BDF8";
