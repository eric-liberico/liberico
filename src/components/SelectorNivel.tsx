import { cn } from "@/lib/utils";

export type Nivel = "NM" | "NS";

type Props = {
  value: Nivel;
  onChange: (nivel: Nivel) => void;
  disabled?: boolean;
  className?: string;
};

export function SelectorNivel({ value, onChange, disabled, className }: Props) {
  return (
    <div
      className={cn(
        "inline-flex rounded-md border border-input bg-background p-0.5 gap-0.5",
        className,
      )}
    >
      {(["NM", "NS"] as Nivel[]).map((n) => (
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
          {n}
        </button>
      ))}
    </div>
  );
}
