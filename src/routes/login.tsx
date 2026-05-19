import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
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
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-primary text-primary-foreground p-12 relative overflow-hidden">
        <div className="flex items-center gap-3 relative z-10">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-foreground/10">
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <div className="font-serif text-xl">LIBerico</div>
            <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">
              Preparación IB · feedback por criterios
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <p className="font-serif text-3xl leading-snug">
            Practica, recibe feedback y mide tu progreso.
          </p>
          <p className="mt-3 text-sm opacity-70">Una plataforma de apoyo para estudiantes IB</p>
          <p className="mt-10 text-sm opacity-80 leading-relaxed">
            Trabaja con ejercicios guiados, evaluaciones claras y seguimiento de tus avances en un
            mismo espacio.
          </p>
        </div>

        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary-foreground/5" />
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-md p-8 border-border">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <BookOpen className="h-5 w-5" />
            </span>
            <div className="font-serif text-lg text-ink">LIBerico</div>
          </div>

          <h1 className="font-serif text-2xl text-ink">
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
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login"
              ? "Continúa preparando tu IB."
              : mode === "signup"
                ? "Empieza con práctica guiada y feedback personalizado."
                : "Te enviaremos un enlace a tu correo."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {mode !== "reset" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("reset")}
                      className="text-xs text-muted-foreground hover:text-primary"
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
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy
                ? "Procesando…"
                : mode === "login"
                  ? "Entrar"
                  : mode === "signup"
                    ? "Crear cuenta"
                    : "Enviar enlace"}
            </Button>

            {mode === "signup" && (
              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                By creating an account you agree to our{" "}
                <Link to="/terms" className="underline hover:text-foreground">
                  Terms
                </Link>{" "}
                and acknowledge our{" "}
                <Link to="/privacy" className="underline hover:text-foreground">
                  Privacy Policy
                </Link>
                .
              </p>
            )}
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                ¿No tienes cuenta?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="text-primary hover:underline font-medium"
                >
                  Regístrate
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setMode("login")}
                  className="text-primary hover:underline font-medium"
                >
                  ← Volver al inicio de sesión
                </button>
              </>
            )}
          </div>

          <div className="mt-4 text-center">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
              ← Volver a la página principal
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
