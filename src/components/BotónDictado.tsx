import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  dictando: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
};

export function BotónDictado({ dictando, onToggle, disabled, className }: Props) {
  return (
    <Button
      type="button"
      size="sm"
      variant={dictando ? "destructive" : "outline"}
      onClick={onToggle}
      disabled={disabled}
      className={cn("gap-1.5 h-7 text-xs", dictando && "animate-pulse", className)}
      title={dictando ? "Detener dictado" : "Dictar por voz"}
    >
      {dictando ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
      {dictando ? "Dictando…" : "Dictar"}
    </Button>
  );
}
