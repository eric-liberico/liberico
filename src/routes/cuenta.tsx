import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/cuenta")({
  head: () => ({
    meta: [
      { title: "Mi cuenta — IB Literatura" },
      { name: "description", content: "Gestiona tu cuenta de IB Literatura." },
    ],
  }),
  component: CuentaPage,
});

function CuentaPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmacion, setConfirmacion] = useState("");
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Cargando…
      </div>
    );
  }

  const abrirDialog = () => {
    setConfirmacion("");
    setDialogOpen(true);
  };

  const eliminarCuenta = async () => {
    if (confirmacion !== "eliminar") return;
    setEliminando(true);
    const { error } = await supabase.functions.invoke("delete-account");
    if (error) {
      toast.error("No se pudo eliminar la cuenta. Inténtalo de nuevo.");
      setEliminando(false);
      return;
    }
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-10 sm:py-14">
        <div className="mb-8">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
            Cuenta
          </div>
          <h1 className="font-serif text-3xl text-ink">Mi cuenta</h1>
        </div>

        <div className="mb-10 space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Correo</div>
          <p className="text-sm text-foreground">{user.email}</p>
        </div>

        <div className="border border-destructive/40 rounded-lg p-6">
          <h2 className="font-serif text-lg text-destructive mb-2">Zona de peligro</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Eliminar tu cuenta borrará permanentemente todos tus datos: evaluaciones, plan de
            estudio e historial. Esta acción no se puede deshacer.
          </p>
          <Button variant="destructive" size="sm" onClick={abrirDialog}>
            Eliminar mi cuenta
          </Button>
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open && !eliminando) setDialogOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-destructive">¿Eliminar tu cuenta?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Esta acción borrará de forma permanente tu cuenta y todos tus datos. No hay vuelta
              atrás.
            </p>
            <div>
              <p className="text-[11px] text-muted-foreground mb-2">
                Escribe{" "}
                <span className="font-semibold text-foreground">eliminar</span> para confirmar:
              </p>
              <Input
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                placeholder="eliminar"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") void eliminarCuenta();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={eliminando}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={eliminarCuenta}
              disabled={confirmacion !== "eliminar" || eliminando}
            >
              {eliminando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando…
                </>
              ) : (
                "Eliminar cuenta"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
