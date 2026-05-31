import { Link } from "@tanstack/react-router";
import { Coins } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface CreditsBalanceProps {
  className?: string;
}

export function CreditsBalance({ className }: CreditsBalanceProps) {
  const { creditos, user } = useAuth();
  if (!user) return null;

  const low = creditos < 2;

  return (
    <Link
      to="/comprar-creditos"
      search={{}}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
        low
          ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300"
          : "border-border bg-muted text-foreground hover:bg-muted/80",
        className,
      )}
      title="Comprar créditos"
    >
      <Coins className="h-3.5 w-3.5" />
      <span>{creditos % 1 === 0 ? creditos.toFixed(0) : creditos.toFixed(1)}</span>
    </Link>
  );
}
