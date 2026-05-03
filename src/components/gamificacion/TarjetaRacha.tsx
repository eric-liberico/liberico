import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  racha: number;
  rachaMaxima: number;
  className?: string;
};

export function TarjetaRacha({ racha, rachaMaxima, className }: Props) {
  const activa = racha > 0;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium",
        activa
          ? "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
          : "bg-muted text-muted-foreground",
        className,
      )}
      title={rachaMaxima > 0 ? `Racha máxima: ${rachaMaxima} días` : undefined}
    >
      <Flame
        className={cn(
          "h-4 w-4",
          activa ? "fill-orange-400 text-orange-500" : "text-muted-foreground",
        )}
      />
      <span>
        {racha === 0 ? "Sin racha" : racha === 1 ? "1 día seguido" : `${racha} días seguidos`}
      </span>
    </div>
  );
}
