import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { LANDING as L, landingFontMono as fontMono } from "@/lib/landing-theme";
import type { Nivel } from "@/lib/ib-courses";

export type { Nivel };

type Props = {
  value: Nivel;
  onChange: (nivel: Nivel) => void;
  disabled?: boolean;
  className?: string;
  /** Override display labels. Defaults to course-aware labels from auth context. */
  nivelLabels?: Record<Nivel, string>;
};

export function SelectorNivel({ value, onChange, disabled, className, nivelLabels }: Props) {
  const { courseKey } = useAuth();

  // Default: NM/NS para Spanish A, SL/HL para English A (y todos los demás cursos)
  const defaultLabels: Record<Nivel, string> =
    courseKey === "spanish-a-literature" ? { SL: "NM", HL: "NS" } : { SL: "SL", HL: "HL" };

  const labels = nivelLabels ?? defaultLabels;

  return (
    <div
      className={cn("inline-flex rounded-lg border p-0.5 gap-0.5", className)}
      style={{ borderColor: L.line, backgroundColor: L.bg2 }}
    >
      {(["SL", "HL"] as Nivel[]).map((n) => {
        const active = value === n;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            className={cn(
              "px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] tabular-nums rounded-md transition-all",
              disabled && "opacity-50 cursor-not-allowed",
            )}
            style={{
              ...fontMono,
              ...(active
                ? {
                    backgroundColor: L.primary,
                    color: "#fff",
                    boxShadow: "0 6px 14px -8px rgba(79,70,229,0.55)",
                  }
                : { color: L.muted }),
            }}
          >
            {labels[n]}
          </button>
        );
      })}
    </div>
  );
}
