import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiLang } from "@/hooks/useUiLang";

type Props = {
  racha: number;
  rachaMaxima: number;
  className?: string;
};

export function TarjetaRacha({ racha, rachaMaxima, className }: Props) {
  const isEN = useUiLang() === "en";
  const activa = racha > 0;
  if (!activa) return null;

  const label = isEN
    ? racha === 1
      ? "1 day in a row"
      : `${racha} days in a row`
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
        "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400",
        className,
      )}
      title={title}
    >
      <Flame className="h-4 w-4 fill-orange-400 text-orange-500" />
      <span>{label}</span>
    </div>
  );
}
