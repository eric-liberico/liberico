import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
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
import { Coins, FileText, Loader2, ShieldCheck, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { COURSES } from "@/lib/ib-courses";
import {
  LANDING_FONT_LINK,
  LANDING as L,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";

export const Route = createFileRoute("/cuenta")({
  head: () => ({
    meta: [
      { title: "My account — LIBerico" },
      { name: "description", content: "Manage your LIBerico profile, security and credits." },
    ],
    links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }],
  }),
  component: CuentaPage,
});

const headingStyle = { ...fontSans, letterSpacing: "0" } as const;

// Tarjeta clara reutilizable (superficie blanca + hairline + sombra suave)
const cardStyle = {
  backgroundColor: L.surface,
  borderColor: L.line,
  boxShadow: cardShadow,
} as const;

// CTA primario (índigo + glow), igual que la landing/login
const ctaGlow = { boxShadow: "0 16px 30px -12px rgba(79,70,229,0.55)" } as const;

function formatCreditNumber(value: number, isEN: boolean) {
  return new Intl.NumberFormat(isEN ? "en" : "es", { maximumFractionDigits: 1 }).format(value);
}

function formatCreditAmount(value: number, isEN: boolean) {
  const display = formatCreditNumber(value, isEN);
  const unit = isEN ? `credit${value === 1 ? "" : "s"}` : `crédito${value === 1 ? "" : "s"}`;
  return `${display} ${unit}`;
}

function CuentaPage() {
  const { user, loading: authLoading, signOut, courseKey, creditos } = useAuth();
  const isEN = useUiLang() === "en";
  const navigate = useNavigate();

  // Perfil
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Eliminar cuenta
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmacion, setConfirmacion] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const deleteConfirmationWord = isEN ? "delete" : "eliminar";
  const deleteConfirmed = confirmacion.trim() === deleteConfirmationWord;
  const currentCourse = COURSES[courseKey]?.label ?? courseKey;
  const mainCostItems = COURSES[courseKey]?.capabilities.oralConversation
    ? [
        { label: isEN ? "Paper 1 correction" : "Corrección Prueba 1", cost: 1.5 },
        { label: isEN ? "Paper 2 correction" : "Corrección Prueba 2", cost: 2 },
        { label: isEN ? "Individual oral feedback" : "Feedback de oral individual", cost: 2 },
        { label: isEN ? "Live oral session" : "Sesión oral conversacional", cost: 5 },
      ]
    : [
        { label: isEN ? "Paper 1 correction" : "Corrección Prueba 1", cost: 1.5 },
        { label: isEN ? "Paper 2 correction" : "Corrección Prueba 2", cost: 2 },
        { label: isEN ? "Individual oral feedback" : "Feedback de oral individual", cost: 2 },
      ];

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
      toast.error(isEN ? "Could not save changes." : "No se pudieron guardar los cambios.");
    } else {
      toast.success(isEN ? "Profile updated." : "Perfil actualizado.");
    }
  };

  const enviarResetContrasena = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(user!.email!, {
      redirectTo: `${window.location.origin}/cuenta`,
    });
    if (error) {
      toast.error(isEN ? "Could not send email." : "No se pudo enviar el correo.");
    } else {
      toast.success(
        isEN
          ? "Check your inbox to reset your password."
          : "Revisa tu bandeja de entrada para restablecer la contraseña.",
      );
    }
  };

  const eliminarCuenta = async () => {
    if (!deleteConfirmed) return;
    setEliminando(true);
    const { error } = await supabase.functions.invoke("account-delete");
    if (error) {
      toast.error(
        isEN
          ? "Could not delete account. Try again."
          : "No se pudo eliminar la cuenta. Inténtalo de nuevo.",
      );
      setEliminando(false);
      return;
    }
    await signOut();
    navigate({ to: "/" });
  };

  if (authLoading || !user) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-screen items-center justify-center gap-2 text-sm"
        style={{ ...fontSans, backgroundColor: L.bg, color: L.muted }}
      >
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        {isEN ? "Loading…" : "Cargando…"}
      </div>
    );
  }

  return (
    <div
      id="cuenta-root"
      className="min-h-screen"
      style={{ ...fontSans, backgroundColor: L.bg, color: L.ink }}
    >
      <style>{`
        #cuenta-root{--primary:${L.primary};--ring:${L.primary};}
        #cuenta-root .lib-press{transition:transform 0.12s cubic-bezier(0.23,1,0.32,1);}
        #cuenta-root .lib-press:active{transform:scale(0.97);}
        #cuenta-root a:focus-visible,#cuenta-root button:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:10px;}
        #cuenta-root button:not([disabled]){cursor:pointer;}
        #cuenta-root .lib-reveal{animation:cuentaReveal 0.28s cubic-bezier(0.23,1,0.32,1) both;}
        @keyframes cuentaReveal{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}
        @media (prefers-reduced-motion: reduce){
          #cuenta-root .lib-reveal{animation:none !important;}
          #cuenta-root .lib-press{transition:none !important;}
        }
      `}</style>
      <SiteHeader claro />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="lib-reveal border-b pb-6" style={{ borderColor: L.line }}>
          <div
            className="mb-3 text-[10px] uppercase tracking-[0.22em]"
            style={{ ...fontMono, color: L.muted }}
          >
            {isEN ? "Account" : "Cuenta"}
          </div>
          <div className="min-w-0">
            <h1
              className="text-balance text-3xl font-semibold sm:text-4xl"
              style={{ ...headingStyle, color: L.ink }}
            >
              {isEN ? "My account" : "Mi cuenta"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {isEN
                ? "Manage your profile, password, credits and account data."
                : "Gestiona tu perfil, contraseña, créditos y datos de cuenta."}
            </p>
          </div>

          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
            <div className="min-w-0">
              <dt
                className="text-[10px] uppercase tracking-[0.16em]"
                style={{ ...fontMono, color: L.muted }}
              >
                {isEN ? "Email" : "Correo"}
              </dt>
              <dd className="mt-1 truncate font-medium" style={{ color: L.ink }}>
                {user.email}
              </dd>
            </div>
            <div className="min-w-0">
              <dt
                className="text-[10px] uppercase tracking-[0.16em]"
                style={{ ...fontMono, color: L.muted }}
              >
                {isEN ? "Subject" : "Asignatura"}
              </dt>
              <dd className="mt-1 truncate font-medium" style={{ color: L.ink }}>
                {currentCourse}
              </dd>
            </div>
            <div className="min-w-0">
              <dt
                className="text-[10px] uppercase tracking-[0.16em]"
                style={{ ...fontMono, color: L.muted }}
              >
                {isEN ? "Balance" : "Saldo"}
              </dt>
              <dd className="mt-1 font-medium tabular-nums" style={{ color: L.ink }}>
                {formatCreditAmount(creditos, isEN)}
              </dd>
            </div>
          </dl>
        </header>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <section className="space-y-5">
            <Card className="lib-reveal space-y-5 rounded-xl border p-5 sm:p-6" style={cardStyle}>
              <h2
                className="flex items-center gap-2 text-sm font-semibold"
                style={{ color: L.ink }}
              >
                <User aria-hidden="true" className="h-4 w-4" style={{ color: L.muted }} />
                {isEN ? "Profile" : "Perfil"}
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nombre">{isEN ? "First name" : "Nombre"}</Label>
                  <Input
                    id="nombre"
                    name="given-name"
                    autoComplete="given-name"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="apellido">{isEN ? "Last name" : "Apellidos"}</Label>
                  <Input
                    id="apellido"
                    name="family-name"
                    autoComplete="family-name"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                  />
                </div>
              </div>

              <div
                className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"
                style={{ borderColor: L.line }}
              >
                <p className="break-all text-sm text-muted-foreground">{user.email}</p>
                <Button
                  onClick={guardarPerfil}
                  disabled={savingProfile}
                  size="sm"
                  className="lib-press w-full rounded-lg sm:w-auto"
                  style={ctaGlow}
                >
                  {savingProfile ? (
                    <>
                      <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                      {isEN ? "Saving…" : "Guardando…"}
                    </>
                  ) : isEN ? (
                    "Save changes"
                  ) : (
                    "Guardar cambios"
                  )}
                </Button>
              </div>
            </Card>

            <Card
              className="lib-reveal space-y-4 rounded-xl border p-5 sm:p-6"
              style={{ ...cardStyle, animationDelay: "40ms" }}
            >
              <h2
                className="flex items-center gap-2 text-sm font-semibold"
                style={{ color: L.ink }}
              >
                <ShieldCheck aria-hidden="true" className="h-4 w-4" style={{ color: L.muted }} />
                {isEN ? "Security" : "Seguridad"}
              </h2>
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground/80">
                    {isEN ? "Password" : "Contraseña"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {isEN
                      ? "We'll send a reset link to your email."
                      : "Te enviaremos un enlace de restablecimiento a tu correo."}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={enviarResetContrasena}
                  className="lib-press shrink-0 rounded-lg"
                  style={{ borderColor: L.line, color: L.ink }}
                >
                  {isEN ? "Send reset email" : "Enviar enlace"}
                </Button>
              </div>
            </Card>
          </section>

          <aside className="space-y-5">
            <Card
              className="lib-reveal space-y-5 rounded-xl border p-5 sm:p-6"
              style={{ ...cardStyle, animationDelay: "60ms" }}
            >
              <div className="flex items-start justify-between gap-4">
                <h2
                  className="flex items-center gap-2 text-sm font-semibold"
                  style={{ color: L.ink }}
                >
                  <Coins aria-hidden="true" className="h-4 w-4" style={{ color: L.amberDeep }} />
                  {isEN ? "Credits" : "Créditos"}
                </h2>
                <span
                  className="shrink-0 rounded-full border px-2.5 py-0.5 text-[0.62rem] uppercase tracking-[0.12em]"
                  style={{
                    ...fontMono,
                    backgroundColor: L.bg2,
                    borderColor: L.line,
                    color: L.muted,
                  }}
                >
                  {isEN ? "No subscription" : "Sin suscripción"}
                </span>
              </div>

              <div>
                <p
                  className="text-[10px] uppercase tracking-[0.16em]"
                  style={{ ...fontMono, color: L.muted }}
                >
                  {isEN ? "Available balance" : "Saldo disponible"}
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span
                    className="text-4xl font-semibold tabular-nums"
                    style={{ ...headingStyle, color: L.ink }}
                  >
                    {formatCreditNumber(creditos, isEN)}
                  </span>
                  <span
                    className="text-xs font-semibold uppercase tracking-[0.12em]"
                    style={{ ...fontMono, color: L.muted }}
                  >
                    cr
                  </span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                {isEN
                  ? "Credits are pay-as-you-go: no subscription, no daily limit, no expiry under the current model."
                  : "Los créditos son pago por uso: sin suscripción, sin límite diario y sin caducidad bajo el modelo actual."}
              </p>

              <Button asChild size="sm" className="lib-press w-full rounded-lg" style={ctaGlow}>
                <Link to="/comprar-creditos" search={{}}>
                  {isEN ? "Buy credits" : "Comprar créditos"}
                </Link>
              </Button>

              <div className="space-y-2 border-t pt-4" style={{ borderColor: L.line }}>
                <p
                  className="text-[10px] uppercase tracking-[0.16em]"
                  style={{ ...fontMono, color: L.muted }}
                >
                  {isEN ? "Common costs" : "Costes habituales"}
                </p>
                {mainCostItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4 text-sm">
                    <span className="min-w-0 text-foreground/75">{item.label}</span>
                    <span className="shrink-0 font-medium tabular-nums" style={fontMono}>
                      {formatCreditAmount(item.cost, isEN)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </aside>
        </div>

        <section
          className="lib-reveal mt-6 border-t pt-5"
          style={{ borderColor: L.line, animationDelay: "80ms" }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2
                className="flex items-center gap-2 text-sm font-semibold"
                style={{ color: L.ink }}
              >
                <FileText aria-hidden="true" className="h-4 w-4" style={{ color: L.muted }} />
                {isEN ? "Data & privacy" : "Datos y privacidad"}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {isEN
                  ? "Your evaluations, history and credits stay tied to this account until you delete it."
                  : "Tus evaluaciones, historial y créditos quedan vinculados a esta cuenta hasta que la elimines."}
              </p>
            </div>
            <nav
              aria-label={isEN ? "Legal links" : "Enlaces legales"}
              className="flex flex-wrap gap-x-4 gap-y-2 text-sm"
            >
              <Link to="/privacy" className="font-medium hover:underline" style={{ color: L.ink }}>
                {isEN ? "Privacy policy" : "Privacidad"}
              </Link>
              <Link to="/terms" className="font-medium hover:underline" style={{ color: L.ink }}>
                {isEN ? "Terms" : "Términos"}
              </Link>
              <Link to="/cookies" className="font-medium hover:underline" style={{ color: L.ink }}>
                {isEN ? "Cookies" : "Cookies"}
              </Link>
            </nav>
          </div>
        </section>

        <section
          className="lib-reveal mt-5 rounded-xl border p-5 sm:p-6"
          style={{
            backgroundColor: L.surface,
            borderColor: "rgba(225,29,72,0.32)",
            boxShadow: cardShadow,
            animationDelay: "100ms",
          }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                {isEN ? "Danger zone" : "Zona de peligro"}
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {isEN
                  ? "Deleting your account permanently erases your evaluations, study plan and history."
                  : "Eliminar tu cuenta borra de forma permanente tus evaluaciones, plan de estudio e historial."}
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="shrink-0 rounded-lg"
              onClick={() => {
                setConfirmacion("");
                setDialogOpen(true);
              }}
            >
              {isEN ? "Delete account" : "Eliminar cuenta"}
            </Button>
          </div>
        </section>
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
            <DialogTitle className="text-destructive" style={headingStyle}>
              {isEN ? "Delete your account?" : "¿Eliminar tu cuenta?"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p id="delete-account-description" className="text-sm text-muted-foreground">
              {isEN
                ? "This action will permanently delete your account and all your data. There is no turning back."
                : "Esta acción borrará de forma permanente tu cuenta y todos tus datos. No hay vuelta atrás."}
            </p>
            <div>
              <Label
                htmlFor="delete-account-confirmation"
                className="mb-2 block text-[11px] text-muted-foreground"
              >
                {isEN ? "Type " : "Escribe "}
                <span className="font-semibold text-foreground">{deleteConfirmationWord}</span>
                {isEN ? " to confirm:" : " para confirmar:"}
              </Label>
              <Input
                id="delete-account-confirmation"
                name="delete-account-confirmation"
                autoComplete="off"
                spellCheck={false}
                aria-describedby="delete-account-description"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void eliminarCuenta();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={eliminando}>
              {isEN ? "Cancel" : "Cancelar"}
            </Button>
            <Button
              variant="destructive"
              onClick={eliminarCuenta}
              disabled={!deleteConfirmed || eliminando}
            >
              {eliminando ? (
                <>
                  <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
                  {isEN ? "Deleting…" : "Eliminando…"}
                </>
              ) : isEN ? (
                "Delete account"
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
