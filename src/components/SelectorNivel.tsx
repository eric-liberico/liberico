import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
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
      className={cn(
        "inline-flex rounded-md border border-input bg-background p-0.5 gap-0.5",
        className,
      )}
    >
      {(["SL", "HL"] as Nivel[]).map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded transition-colors",
            value === n
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          {labels[n]}
        </button>
      ))}
    </div>
  );
}
