import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CreditCard, Loader2, ShieldCheck, Trash2, User } from "lucide-react";
import { toast } from "sonner";

const LIMITES = { p1: 20, p2: 8, oral: 5, simulador: 2 };

export const Route = createFileRoute("/cuenta")({
  head: () => ({
    meta: [
      { title: "Mi cuenta — LIBerico" },
      { name: "description", content: "Gestiona tu perfil, seguridad y créditos de LIBerico." },
    ],
  }),
  component: CuentaPage,
});

function CuentaPage() {
  const { user, loading: authLoading, signOut, courseKey } = useAuth();
  const isEN = courseKey === "english-a-literature";
  const navigate = useNavigate();

  // Perfil
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Créditos por producto
  const [cuotas, setCuotas] = useState<{
    p1: number;
    p2: number;
    oral: number;
    simulador: number;
  } | null>(null);

  // Eliminar cuenta
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmacion, setConfirmacion] = useState("");
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    // Cargar nombre/apellido desde perfiles (fuente de verdad); user_metadata como fallback
    const meta = (user.user_metadata ?? {}) as Record<string, string>;
    supabase
      .from("perfiles")
      .select("nombre, apellido")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setNombre(data?.nombre ?? meta.nombre ?? "");
        setApellido(data?.apellido ?? meta.apellido ?? "");
      });

    // Cuotas por producto en las últimas 24 h (misma fuente que las RPCs: llm_uso)
    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    Promise.all([
      supabase
        .from("llm_uso")
        .select("id", { count: "exact", head: true })
        .eq("edge_function", "evaluate-analysis")
        .gte("created_at", desde),
      supabase
        .from("llm_uso")
        .select("id", { count: "exact", head: true })
        .eq("edge_function", "evaluate-paper2")
        .gte("created_at", desde),
      supabase
        .from("llm_uso")
        .select("id", { count: "exact", head: true })
        .eq("edge_function", "evaluate-oral")
        .gte("created_at", desde),
      supabase
        .from("llm_uso")
        .select("id", { count: "exact", head: true })
        .eq("edge_function", "create-oral-simulation-session")
        .eq("modelo", "elevenlabs-convai-fase1")
        .gte("created_at", desde),
    ]).then(([r1, r2, r3, r4]) => {
      setCuotas({
        p1: r1.count ?? 0,
        p2: r2.count ?? 0,
        oral: r3.count ?? 0,
        simulador: r4.count ?? 0,
      });
    });
  }, [user]);

  const guardarPerfil = async () => {
    setSavingProfile(true);
    const nombreTrim = nombre.trim();
    const apellidoTrim = apellido.trim();
    const display =
      [nombreTrim, apellidoTrim].filter(Boolean).join(" ") || user!.email!.split("@")[0];
    const [{ error: authError }, { error: perfilError }] = await Promise.all([
      supabase.auth.updateUser({
        data: { nombre: nombreTrim, apellido: apellidoTrim, display_name: display },
      }),
      supabase
        .from("perfiles")
        .update({ nombre: nombreTrim, apellido: apellidoTrim })
        .eq("user_id", user!.id),
    ]);
    setSavingProfile(false);
    if (authError ?? perfilError) {
      toast.error("No se pudieron guardar los cambios.");
    } else {
      toast.success("Perfil actualizado.");
    }
  };

  const enviarResetContrasena = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(user!.email!, {
      redirectTo: `${window.location.origin}/cuenta`,
    });
    if (error) {
      toast.error("No se pudo enviar el correo.");
    } else {
      toast.success("Revisa tu bandeja de entrada para restablecer la contraseña.");
    }
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

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-10 sm:py-14 space-y-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
            Cuenta
          </div>
          <h1 className="font-serif text-3xl text-ink">Mi cuenta</h1>
        </div>

        {/* ── Perfil ── */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <User className="h-4 w-4 text-muted-foreground" />
            Perfil
          </div>

          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Correo electrónico
            </p>
            <p className="text-sm text-foreground/80">{user.email}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder={isEN ? "Your name" : "Tu nombre"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apellido">Apellidos</Label>
              <Input
                id="apellido"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                placeholder={isEN ? "Your last name" : "Tus apellidos"}
              />
            </div>
          </div>

          <Button
            onClick={guardarPerfil}
            disabled={savingProfile}
            size="sm"
            className="w-full sm:w-auto"
          >
            {savingProfile ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Guardando…
              </>
            ) : (
              isEN ? "Save changes" : "Guardar cambios"
            )}
          </Button>
        </Card>

        {/* ── Seguridad ── */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            Seguridad
          </div>
          <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
            <div>
              <p className="text-sm font-medium text-foreground/80">Contraseña</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Te enviaremos un enlace a tu correo para restablecerla.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={enviarResetContrasena}
              className="shrink-0"
            >
              Restablecer contraseña
            </Button>
          </div>
        </Card>

        {/* ── Plan y créditos ── */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            Plan y créditos
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground/80">Plan actual</span>
            <span className="text-xs font-medium border border-border px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              Gratuito
            </span>
          </div>

          <div className="space-y-2">
            {(
              [
                { label: isEN ? "Paper 1 — Literary analysis" : "Prueba 1 — Comentario", key: "p1" },
                { label: isEN ? "Paper 2 — Comparative essay" : "Prueba 2 — Ensayo", key: "p2" },
                { label: isEN ? "Individual Oral" : "Oral Individual", key: "oral" },
                { label: isEN ? "Oral simulator" : "Simulador oral", key: "simulador" },
              ] as { label: string; key: keyof typeof LIMITES }[]
            ).map(({ label, key }) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-foreground/75">{label}</span>
                <span className="font-medium tabular-nums text-foreground/80">
                  {cuotas === null ? "…" : `${cuotas[key]} / ${LIMITES[key]}`}
                </span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-1">Se renuevan cada 24 horas.</p>
          </div>
        </Card>

        {/* ── Zona de peligro ── */}
        <div className="border border-destructive/40 rounded-lg p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-destructive mb-2">
            <Trash2 className="h-4 w-4" />
            Zona de peligro
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Eliminar tu cuenta borrará permanentemente todos tus datos: evaluaciones, plan de
            estudio e historial. Esta acción no se puede deshacer.
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setConfirmacion("");
              setDialogOpen(true);
            }}
          >
            Eliminar mi cuenta
          </Button>
        </div>
      </main>

      {/* ── Dialog confirmación ── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open && !eliminando) setDialogOpen(false);
        }}
      >
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
                Escribe <span className="font-semibold text-foreground">eliminar</span> para
                confirmar:
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
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={eliminando}>
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
