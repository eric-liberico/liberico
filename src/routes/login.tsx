import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  LANDING_FONT_LINK,
  LANDING as L,
  DEEP,
  CRIT,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
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
    links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }],
  }),
  component: LoginPage,
});

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;

// botón primario reutilizable (índigo + glow), igual que la landing
const ctaPrimary = {
  backgroundColor: L.primary,
  color: "#fff",
  boxShadow: "0 16px 30px -12px rgba(79,70,229,0.55)",
} as const;

// Motivo examinador (ilustrativo) — eco del ExaminerSheet de la landing
const CRITERIA = [
  { l: "A", es: "Comprensión", en: "Understanding", s: 4, c: CRIT.A },
  { l: "B", es: "Análisis", en: "Analysis", s: 4, c: CRIT.B },
  { l: "C", es: "Organización", en: "Organisation", s: 4, c: CRIT.C },
  { l: "D", es: "Lengua", en: "Language", s: 3, c: CRIT.D },
] as const;

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

  const t = isEN
    ? {
        back: "Back to home",
        eyebrowSub: "IB prep · criteria-based feedback",
        badge: "IB examiners and grade-boundary standardisers",
        headline: "Practise, get feedback and track your progress.",
        sub: "A support platform for IB students. Guided exercises, criteria-based assessment and progress tracking — all in one place.",
        sampleLabel: "Sample correction · criteria A–D",
        grade: "Grade",
        titleLogin: "Sign in",
        titleSignup: "Create your account",
        titleReset: "Reset password",
        subLogin: "Keep preparing for your IB.",
        subSignup: "Start with guided practice and personalised feedback.",
        subReset: "We'll email you a reset link.",
        name: "Name",
        namePh: "Your name",
        email: "Email",
        password: "Password",
        forgot: "Forgot your password?",
        submitLogin: "Sign in",
        submitSignup: "Create account",
        submitReset: "Send link",
        busy: "Processing…",
        noAccount: "Don't have an account?",
        signupCta: "Sign up",
        backToLogin: "← Back to sign in",
        terms1: "By creating an account you agree to our ",
        termsTerms: "Terms",
        terms2: " and acknowledge our ",
        termsPrivacy: "Privacy Policy",
      }
    : {
        back: "Volver al inicio",
        eyebrowSub: "Preparación IB · feedback por criterios",
        badge: "Examinadores y estandarizadores de notas de corte del IB",
        headline: "Practica, recibe feedback y mide tu progreso.",
        sub: "Una plataforma de apoyo para estudiantes IB. Ejercicios guiados, evaluación por criterios y seguimiento de avances, en un mismo espacio.",
        sampleLabel: "Corrección de ejemplo · criterios A–D",
        grade: "Nota",
        titleLogin: "Inicia sesión",
        titleSignup: "Crea tu cuenta",
        titleReset: "Restablecer contraseña",
        subLogin: "Continúa preparando tu IB.",
        subSignup: "Empieza con práctica guiada y feedback personalizado.",
        subReset: "Te enviaremos un enlace a tu correo.",
        name: "Nombre",
        namePh: "Tu nombre",
        email: "Correo electrónico",
        password: "Contraseña",
        forgot: "¿Olvidaste la contraseña?",
        submitLogin: "Entrar",
        submitSignup: "Crear cuenta",
        submitReset: "Enviar enlace",
        busy: "Procesando…",
        noAccount: "¿No tienes cuenta?",
        signupCta: "Regístrate",
        backToLogin: "← Volver al inicio de sesión",
        terms1: "Al crear una cuenta aceptas nuestros ",
        termsTerms: "Términos",
        terms2: " y reconoces nuestra ",
        termsPrivacy: "Política de privacidad",
      };

  const title = mode === "login" ? t.titleLogin : mode === "signup" ? t.titleSignup : t.titleReset;
  const subtitle = mode === "login" ? t.subLogin : mode === "signup" ? t.subSignup : t.subReset;
  const submitLabel = busy
    ? t.busy
    : mode === "login"
      ? t.submitLogin
      : mode === "signup"
        ? t.submitSignup
        : t.submitReset;

  return (
    <div
      id="login-root"
      className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.9fr)]"
      style={{ ...fontSans, backgroundColor: L.bg, color: L.ink }}
    >
      <style>{`
        #login-root .lib-press{transition:transform 0.12s cubic-bezier(0.23,1,0.32,1);}
        #login-root .lib-press:active{transform:scale(0.97);}
        #login-root a:focus-visible,#login-root button:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:10px;}
        #login-root input:focus-visible{outline:2px solid ${L.primary};outline-offset:2px;}
        @media (prefers-reduced-motion: reduce){
          #login-root .lib-reveal{animation:none !important;}
        }
        #login-root .lib-reveal{animation:loginReveal 0.55s cubic-bezier(0.22,1,0.36,1) both;}
        @keyframes loginReveal{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}
      `}</style>

      {/* ── Panel izquierdo: banda de autoridad índigo ───────────────────── */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden border-r p-12 lg:flex"
        style={{
          background: `linear-gradient(155deg, ${DEEP.bg} 0%, ${DEEP.bgAlt} 100%)`,
          borderColor: DEEP.border,
          color: DEEP.text,
        }}
      >
        <Link to="/" className="lib-press relative z-10 flex items-center gap-3 hover:opacity-90">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl border"
            style={{ backgroundColor: DEEP.surface, borderColor: DEEP.border }}
          >
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xl font-semibold" style={headingStyle}>
              LIBerico
            </div>
            <div
              className="text-[0.6rem] uppercase tracking-[0.18em]"
              style={{ ...fontMono, color: DEEP.muted }}
            >
              {t.eyebrowSub}
            </div>
          </div>
        </Link>

        <div className="lib-reveal relative z-10 max-w-md">
          {/* eyebrow-chip ámbar (marca/autoridad) */}
          <div
            className="mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1"
            style={{ backgroundColor: L.amber + "1f" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: L.amber }} />
            <span
              className="text-[0.62rem] font-semibold uppercase tracking-[0.16em]"
              style={{ color: L.amber }}
            >
              {t.badge}
            </span>
          </div>

          <p className="text-4xl leading-[1.1]" style={headingStyle}>
            {t.headline}
          </p>
          <p className="mt-5 text-sm leading-relaxed" style={{ color: DEEP.muted }}>
            {t.sub}
          </p>

          {/* motivo examinador — micro-bandas de criterio */}
          <div
            className="mt-9 overflow-hidden rounded-2xl border"
            style={{ backgroundColor: DEEP.surface, borderColor: DEEP.border }}
          >
            <div
              className="flex items-center justify-between border-b px-4 py-3"
              style={{ borderColor: DEEP.border }}
            >
              <span
                className="text-[0.55rem] uppercase tracking-[0.16em]"
                style={{ ...fontMono, color: DEEP.muted }}
              >
                {t.sampleLabel}
              </span>
              <span
                className="rounded-md px-2 py-0.5 text-[0.62rem] font-bold"
                style={{ ...fontMono, backgroundColor: L.amber + "22", color: L.amber }}
              >
                15/20 · {t.grade} 6
              </span>
            </div>
            <div className="space-y-2.5 px-4 py-3.5">
              {CRITERIA.map((cr) => (
                <div key={cr.l} className="flex items-center gap-3">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-md text-[0.72rem] font-extrabold text-white"
                    style={{ ...fontMono, backgroundColor: cr.c }}
                  >
                    {cr.l}
                  </span>
                  <span
                    className="flex-1 truncate text-[0.82rem]"
                    style={{ color: "rgba(236,234,251,0.86)" }}
                  >
                    {isEN ? cr.en : cr.es}
                  </span>
                  <div
                    className="h-[3px] w-16 overflow-hidden rounded-full"
                    style={{ backgroundColor: "rgba(236,234,251,0.14)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(cr.s / 5) * 100}%`, backgroundColor: cr.c }}
                    />
                  </div>
                  <span
                    className="w-8 text-right text-[0.78rem] font-semibold"
                    style={{ ...fontMono, color: DEEP.text }}
                  >
                    {cr.s}/5
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* "7" decorativo (nota IB máxima) */}
        <div
          className="pointer-events-none absolute -right-16 -top-24 select-none text-[28rem] font-bold leading-none"
          style={{ ...headingStyle, color: "rgba(236,234,251,0.045)" }}
          aria-hidden
        >
          7
        </div>
      </div>

      {/* ── Panel derecho: formulario sobre lienzo cálido ────────────────── */}
      <div
        className="flex min-h-screen items-center justify-center p-6 sm:p-12"
        style={{ background: `linear-gradient(160deg, ${L.bg} 0%, ${L.bg2} 100%)` }}
      >
        <Card
          className="lib-reveal w-full max-w-md rounded-2xl border p-7 sm:p-8"
          style={{
            backgroundColor: L.surface,
            borderColor: L.line,
            color: L.ink,
            boxShadow: cardShadow,
          }}
        >
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-2 text-[0.66rem] font-semibold uppercase tracking-[0.16em] hover:opacity-80"
            style={{ ...fontMono, color: L.muted }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.back}
          </Link>

          {/* logo solo-móvil (el panel izquierdo se oculta en <lg) */}
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: L.primary, color: "#fff" }}
            >
              <BookOpen className="h-5 w-5" />
            </span>
            <div className="text-lg font-semibold" style={headingStyle}>
              LIBerico
            </div>
          </div>

          <h1 className="text-[1.7rem] font-semibold leading-tight" style={headingStyle}>
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: L.muted }}>
            {subtitle}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name" style={{ color: L.ink }}>
                  {t.name}
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.namePh}
                  className="h-11"
                  style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" style={{ color: L.ink }}>
                {t.email}
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
              />
            </div>
            {mode !== "reset" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" style={{ color: L.ink }}>
                    {t.password}
                  </Label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("reset")}
                      className="text-xs hover:underline"
                      style={{ color: L.muted }}
                    >
                      {t.forgot}
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
                  className="h-11"
                  style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="lib-press group flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold uppercase tracking-[0.07em] hover:opacity-95"
              style={ctaPrimary}
            >
              {submitLabel}
              {!busy && (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              )}
            </Button>

            {mode === "signup" && (
              <p className="text-center text-[11px] leading-relaxed" style={{ color: L.muted }}>
                {t.terms1}
                <Link to="/terms" className="underline hover:opacity-80">
                  {t.termsTerms}
                </Link>
                {t.terms2}
                <Link to="/privacy" className="underline hover:opacity-80">
                  {t.termsPrivacy}
                </Link>
                .
              </p>
            )}
          </form>

          <div className="mt-6 text-center text-sm" style={{ color: L.muted }}>
            {mode === "login" ? (
              <>
                {t.noAccount}{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="font-semibold hover:underline"
                  style={{ color: L.primary }}
                >
                  {t.signupCta}
                </button>
              </>
            ) : (
              <button
                onClick={() => setMode("login")}
                className="font-semibold hover:underline"
                style={{ color: L.primary }}
              >
                {t.backToLogin}
              </button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
