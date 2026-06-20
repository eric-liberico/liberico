import { Link } from "@tanstack/react-router";
import { Coins } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { cn } from "@/lib/utils";
import { LANDING as L } from "@/lib/landing-theme";

interface CreditsBalanceProps {
  className?: string;
}

export function CreditsBalance({ className }: CreditsBalanceProps) {
  const { creditos, user } = useAuth();
  const isEN = useUiLang() === "en";
  if (!user) return null;

  const low = creditos < 2;
  const display = creditos % 1 === 0 ? creditos.toFixed(0) : creditos.toFixed(1);
  const label = isEN
    ? `Balance: ${display} credits. Buy credits`
    : `Saldo: ${display} créditos. Comprar créditos`;

  return (
    <Link
      to="/comprar-creditos"
      search={{}}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium tabular-nums transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.98]",
        low
          ? "border-amber-300/80 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
          : "border-border bg-muted/70 text-foreground hover:bg-muted",
        className,
      )}
      title={isEN ? "Buy credits" : "Comprar créditos"}
      aria-label={label}
    >
      <Coins className="h-3.5 w-3.5" style={{ color: low ? L.amberDeep : L.amber }} />
      <span>{display}</span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] opacity-65">cr</span>
    </Link>
  );
}
