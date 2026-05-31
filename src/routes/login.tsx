import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { LANDING_FONT_LINK, NAVY, landingFontSans, landingFontSerif } from "@/lib/landing-theme";
import { ArrowLeft, BookOpen } from "lucide-react";
import { toast } from "sonner";

async function enviarResetContrasena(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/cuenta`,
  });
  if (error) throw error;
}

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — LIBerico" },
      {
        name: "description",
        content:
          "Accede a LIBerico para preparar el IB con práctica guiada y feedback por criterios.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: LANDING_FONT_LINK,
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading, rol } = useAuth();
  const isEN = useUiLang() === "en";
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  // Tras signup redirigir a onboarding; tras login usar la entrada propia de cada rol.
  const destinoRef = useRef<string>("/asignaturas");

  useEffect(() => {
    if (loading || !user) return;
    if (destinoRef.current === "/onboarding") {
      navigate({ to: "/onboarding" });
      return;
    }
    if (rol === "admin") {
      navigate({ to: "/admin" });
      return;
    }
    if (rol === "profesor") {
      navigate({ to: "/profesor" });
      return;
    }
    navigate({ to: "/asignaturas" });
  }, [user, loading, rol, navigate]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "reset") {
        await enviarResetContrasena(email);
        toast.success(
          isEN
            ? "Check your email to reset your password."
            : "Revisa tu correo para restablecer la contraseña.",
        );
        setMode("login");
        setBusy(false);
        return;
      }
      if (mode === "signup") {
        destinoRef.current = "/onboarding";
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) {
          destinoRef.current = "/asignaturas";
          throw error;
        }
        toast.success(
          isEN
            ? "Account created. Check your email if confirmation is required."
            : "Cuenta creada. Revisa tu correo si se requiere confirmación.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(isEN ? "Welcome back" : "Bienvenido/a");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error de autenticación");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]"
      style={{ ...landingFontSans, backgroundColor: NAVY.bg, color: NAVY.paper }}
    >
      {/* Left brand panel */}
      <div
        className="relative hidden overflow-hidden border-r p-12 lg:flex flex-col justify-between"
        style={{
          backgroundColor: NAVY.bgDeep,
          borderColor: "rgba(232,237,243,0.1)",
        }}
      >
        <Link to="/" className="relative z-10 flex items-center gap-3 hover:opacity-85">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-md border"
            style={{
              backgroundColor: "rgba(232,237,243,0.08)",
              borderColor: "rgba(232,237,243,0.14)",
            }}
          >
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xl italic" style={landingFontSerif}>
              LIBerico
            </div>
            <div
              className="text-[10px] uppercase tracking-[0.18em]"
              style={{ color: "rgba(232,237,243,0.58)" }}
            >
              Preparación IB · feedback por criterios
            </div>
          </div>
        </Link>

        <div className="relative z-10 max-w-md">
          <p className="text-4xl leading-tight" style={landingFontSerif}>
            Practica, recibe feedback y mide tu progreso.
          </p>
          <p className="mt-4 text-sm" style={{ color: "rgba(232,237,243,0.62)" }}>
            Una plataforma de apoyo para estudiantes IB
          </p>
          <p className="mt-10 text-sm leading-relaxed" style={{ color: "rgba(232,237,243,0.72)" }}>
            Trabaja con ejercicios guiados, evaluaciones claras y seguimiento de tus avances en un
            mismo espacio.
          </p>
          <div
            className="mt-10 grid grid-cols-3 gap-px border"
            style={{
              backgroundColor: "rgba(232,237,243,0.08)",
              borderColor: "rgba(232,237,243,0.08)",
            }}
          >
            {[
              ["A-D", "Criterios"],
              ["3", "Componentes"],
              ["ES/EN", "Cursos"],
            ].map(([value, label]) => (
              <div key={label} className="p-4" style={{ backgroundColor: NAVY.bg }}>
                <div className="text-2xl leading-none" style={landingFontSerif}>
                  {value}
                </div>
                <div
                  className="mt-2 text-[10px] uppercase tracking-[0.18em]"
                  style={{ color: "rgba(232,237,243,0.48)" }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="absolute -right-16 -top-24 select-none text-[28rem] font-bold leading-none"
          style={{ ...landingFontSerif, color: "rgba(232,237,243,0.04)" }}
          aria-hidden
        >
          7
        </div>
      </div>

      {/* Right form */}
      <div
        className="flex min-h-screen items-center justify-center p-6 sm:p-12"
        style={{
          background: `linear-gradient(160deg, ${NAVY.bg} 0%, ${NAVY.mid} 100%)`,
        }}
      >
        <Card
          className="w-full max-w-md rounded-md border p-7 shadow-2xl sm:p-8"
          style={{
            backgroundColor: NAVY.paper,
            borderColor: "rgba(232,237,243,0.22)",
            color: NAVY.bg,
          }}
        >
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest hover:underline"
            style={{ color: "rgba(15,27,61,0.62)" }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al inicio
          </Link>

          <div className="lg:hidden flex items-center gap-2 mb-6">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-md"
              style={{ backgroundColor: NAVY.bg, color: NAVY.paper }}
            >
              <BookOpen className="h-5 w-5" />
            </span>
            <div className="text-lg italic" style={landingFontSerif}>
              LIBerico
            </div>
          </div>

          <h1 className="text-2xl" style={landingFontSerif}>
            {mode === "login"
              ? isEN
                ? "Sign in"
                : "Inicia sesión"
              : mode === "signup"
                ? isEN
                  ? "Create your account"
                  : "Crea tu cuenta"
                : "Restablecer contraseña"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(15,27,61,0.65)" }}>
            {mode === "login"
              ? "Continúa preparando tu IB."
              : mode === "signup"
                ? "Empieza con práctica guiada y feedback personalizado."
                : "Te enviaremos un enlace a tu correo."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name" style={{ color: NAVY.bg }}>
                  Nombre
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  className="h-11 bg-white/80"
                  style={{ borderColor: "rgba(15,27,61,0.18)", color: NAVY.bg }}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" style={{ color: NAVY.bg }}>
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-white/80"
                style={{ borderColor: "rgba(15,27,61,0.18)", color: NAVY.bg }}
              />
            </div>
            {mode !== "reset" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" style={{ color: NAVY.bg }}>
                    Contraseña
                  </Label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("reset")}
                      className="text-xs hover:underline"
                      style={{ color: "rgba(15,27,61,0.6)" }}
                    >
                      ¿Olvidaste la contraseña?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-white/80"
                  style={{ borderColor: "rgba(15,27,61,0.18)", color: NAVY.bg }}
                />
              </div>
            )}

            <Button
              type="submit"
              className="h-11 w-full rounded-md font-bold uppercase tracking-widest shadow-none hover:opacity-90"
              disabled={busy}
              style={{ backgroundColor: NAVY.bg, color: NAVY.paper }}
            >
              {busy
                ? "Procesando…"
                : mode === "login"
                  ? "Entrar"
                  : mode === "signup"
                    ? "Crear cuenta"
                    : "Enviar enlace"}
            </Button>

            {mode === "signup" && (
              <p
                className="text-center text-[11px] leading-relaxed"
                style={{ color: "rgba(15,27,61,0.58)" }}
              >
                By creating an account you agree to our{" "}
                <Link to="/terms" className="underline hover:opacity-80">
                  Terms
                </Link>{" "}
                and acknowledge our{" "}
                <Link to="/privacy" className="underline hover:opacity-80">
                  Privacy Policy
                </Link>
                .
              </p>
            )}
          </form>

          <div className="mt-6 text-center text-sm" style={{ color: "rgba(15,27,61,0.62)" }}>
            {mode === "login" ? (
              <>
                ¿No tienes cuenta?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="font-medium hover:underline"
                  style={{ color: NAVY.mid }}
                >
                  Regístrate
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setMode("login")}
                  className="font-medium hover:underline"
                  style={{ color: NAVY.mid }}
                >
                  ← Volver al inicio de sesión
                </button>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
