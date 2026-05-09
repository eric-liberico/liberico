import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";

type Props = {
  racha: number;
  rachaMaxima: number;
  className?: string;
};

export function TarjetaRacha({ racha, rachaMaxima, className }: Props) {
  const { courseKey } = useAuth();
  const isEN = useUiLang() === "en";
  const activa = racha > 0;

  const label = isEN
    ? racha === 0
      ? "No streak"
      : racha === 1
        ? "1 day in a row"
        : `${racha} days in a row`
    : racha === 0
      ? "Sin racha"
      : racha === 1
        ? "1 día seguido"
        : `${racha} días seguidos`;

  const title =
    rachaMaxima > 0
      ? isEN
        ? `Best streak: ${rachaMaxima} days`
        : `Racha máxima: ${rachaMaxima} días`
      : undefined;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium",
        activa
          ? "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
          : "bg-muted text-muted-foreground",
        className,
      )}
      title={title}
    >
      <Flame
        className={cn(
          "h-4 w-4",
          activa ? "fill-orange-400 text-orange-500" : "text-muted-foreground",
        )}
      />
      <span>{label}</span>
    </div>
  );
}
