import { Link } from "@tanstack/react-router";
import { Coins, ShoppingCart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LANDING as L, landingFontSans as fontSans } from "@/lib/landing-theme";

interface CreditGateProps {
  coste: number;
  concepto: string;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Muestra el coste en créditos de forma compacta: "1.5 cr" o "2 cr". */
export function CreditCostBadge({ coste, className }: { coste: number; className?: string }) {
  const display = coste % 1 === 0 ? coste.toFixed(0) : coste.toFixed(1);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium text-[#9A5E10] dark:text-amber-400",
        className,
      )}
    >
      <Coins className="h-3 w-3" aria-hidden="true" />
      {display} cr
    </span>
  );
}

export function CreditGate({ coste, concepto, open, onConfirm, onCancel }: CreditGateProps) {
  const { creditos } = useAuth();
  const saldoSuficiente = creditos >= coste;
  const costeDisplay = coste % 1 === 0 ? coste.toFixed(0) : coste.toFixed(1);
  const saldoDisplay = creditos % 1 === 0 ? creditos.toFixed(0) : creditos.toFixed(1);
  const saldoTras = saldoSuficiente ? creditos - coste : null;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onCancel();
      }}
    >
      <AlertDialogContent id="credit-gate-content" style={{ ...fontSans }}>
        {/* Scope Claro premium: el diálogo se portea a <body>, así que remapeamos
            aquí --primary → índigo para que el CTA de confirmación no quede navy legacy. */}
        <style>{`#credit-gate-content{ --primary:${L.primary}; --primary-foreground:#ffffff; }`}</style>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" style={{ color: L.amber }} aria-hidden="true" />
            Confirmar acción
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p className="text-foreground font-medium">
                Esta acción supone un coste de{" "}
                <span className="text-[#9A5E10] dark:text-amber-400 font-bold">
                  {costeDisplay} crédito{coste !== 1 ? "s" : ""}
                </span>
                . ¿Estás seguro de querer realizarla?
              </p>
              <p className="text-muted-foreground text-xs">{concepto}</p>

              <div className="rounded-lg border bg-muted/50 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Coste de esta acción</span>
                  <span className="font-semibold text-foreground">{costeDisplay} créditos</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tu saldo actual</span>
                  <span
                    className={`font-semibold ${saldoSuficiente ? "text-foreground" : "text-destructive"}`}
                  >
                    {saldoDisplay} créditos
                  </span>
                </div>
                {saldoTras !== null && (
                  <div className="flex justify-between border-t pt-1.5">
                    <span className="text-muted-foreground">Saldo tras la acción</span>
                    <span className="font-semibold text-foreground">
                      {saldoTras % 1 === 0 ? saldoTras.toFixed(0) : saldoTras.toFixed(1)} créditos
                    </span>
                  </div>
                )}
              </div>

              {!saldoSuficiente && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  <p className="font-medium">Saldo insuficiente</p>
                  <p className="mt-0.5 text-xs">
                    Te faltan {(coste - creditos).toFixed(1)} créditos.{" "}
                    <Link
                      to="/comprar-creditos"
                      search={{}}
                      className="underline font-medium"
                      onClick={onCancel}
                    >
                      Comprar créditos
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
          {saldoSuficiente ? (
            <AlertDialogAction onClick={onConfirm}>Sí, continuar</AlertDialogAction>
          ) : (
            <Button asChild>
              <Link to="/comprar-creditos" search={{}} onClick={onCancel}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Comprar créditos
              </Link>
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
