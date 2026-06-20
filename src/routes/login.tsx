import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import {
  LANDING_FONT_LINK,
  LANDING as L,
  DEEP,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
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
const ctaPrimary = {
  backgroundColor: L.primary,
  color: "#fff",
  boxShadow: "0 16px 30px -12px rgba(79,70,229,0.55)",
} as const;
const OTP_LEN = 8;
const RESEND_COOLDOWN = 60; // Supabase email OTP default throttle

function getInternalPath(path?: string) {
  return path && path.startsWith("/") && !path.startsWith("//") ? path : "";
}

function getAuthCallbackUrl(next: string) {
  const url = new URL("/auth/callback", window.location.origin);
  if (next) url.searchParams.set("next", next);
  return url.toString();
}

function LoginPage() {
  const { user, loading, rol } = useAuth();
  const isEN = useUiLang() === "en";
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/login" });

  const [step, setStep] = useState<"choice" | "otp">("choice");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const redirectedRef = useRef(false);
  const verifyingRef = useRef(false);

  // Redirección post-login: respeta ?redirect=, si no, por rol.
  useEffect(() => {
    if (loading || !user || redirectedRef.current) return;
    redirectedRef.current = true;
    const next = getInternalPath(redirect);
    if (next) {
      navigate({ to: next });
      return;
    }
    if (rol === "admin") return void navigate({ to: "/admin" });
    if (rol === "profesor") return void navigate({ to: "/profesor" });
    navigate({ to: "/asignaturas" });
  }, [user, loading, rol, navigate, redirect]);

  // Cooldown de reenvío
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const t = isEN
    ? {
        back: "Back to home",
        badge: "IB examiners and grade-boundary standardisers",
        headline: "Practise, get feedback and track your progress.",
        sub: "A support platform for IB students. Guided exercises, criteria-based assessment and progress tracking — all in one place.",
        title: "Sign in or create your account",
        subtitle: "No passwords. Continue with Google or receive an 8-character email code.",
        google: "Continue with Google",
        or: "or",
        email: "Email",
        emailCta: "Send code",
        codeTitle: "Enter the 8-character code",
        codeSub: (e: string) => `We sent a code to ${e} if the address is valid.`,
        verify: "Verify and enter",
        resend: "Resend code",
        resendIn: (s: number) => `Resend in ${s}s`,
        changeEmail: "← Use another email",
        busy: "Processing…",
        sent: "If the email is valid, we've sent you a code.",
        terms1: "By continuing you agree to our ",
        termsTerms: "Terms",
        terms2: " and acknowledge our ",
        termsPrivacy: "Privacy Policy",
        errGeneric: "Something went wrong. Please try again.",
        errCode: "Invalid or expired code. Request a new one.",
      }
    : {
        back: "Volver al inicio",
        badge: "Examinadores y estandarizadores de notas de corte del IB",
        headline: "Practica, recibe feedback y mide tu progreso.",
        sub: "Una plataforma de apoyo para estudiantes IB. Ejercicios guiados, evaluación por criterios y seguimiento de avances, en un mismo espacio.",
        title: "Entra o crea tu cuenta",
        subtitle: "Sin contraseñas. Continúa con Google o recibe un código de 8 caracteres.",
        google: "Continuar con Google",
        or: "o",
        email: "Correo electrónico",
        emailCta: "Enviar código",
        codeTitle: "Introduce el código de 8 caracteres",
        codeSub: (e: string) => `Hemos enviado un código a ${e} si la dirección es válida.`,
        verify: "Verificar y entrar",
        resend: "Reenviar código",
        resendIn: (s: number) => `Reenviar en ${s}s`,
        changeEmail: "← Usar otro correo",
        busy: "Procesando…",
        sent: "Si el correo es válido, te hemos enviado un código.",
        terms1: "Al continuar aceptas nuestros ",
        termsTerms: "Términos",
        terms2: " y reconoces nuestra ",
        termsPrivacy: "Política de privacidad",
        errGeneric: "Algo salió mal. Inténtalo de nuevo.",
        errCode: "Código inválido o caducado. Pide uno nuevo.",
      };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const next = getInternalPath(redirect);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: "openid email profile",
          redirectTo: getAuthCallbackUrl(next),
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
      // Redirección la hace el navegador hacia Google.
    } catch {
      toast.error(t.errGeneric);
      setBusy(false);
    }
  };

  const sendOtp = async () => {
    if (!email) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: getAuthCallbackUrl(getInternalPath(redirect)),
        },
      });
      if (error) throw error;
      // Mensaje neutro: no revelamos si la cuenta existe.
      toast.success(t.sent);
      setStep("otp");
      setCooldown(RESEND_COOLDOWN);
    } catch {
      // Aun en error mostramos neutro y avanzamos para no filtrar existencia.
      toast.success(t.sent);
      setStep("otp");
      setCooldown(RESEND_COOLDOWN);
    } finally {
      setBusy(false);
    }
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    void sendOtp();
  };

  const handleVerify = async (token: string) => {
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
      if (error) throw error;
      // onAuthStateChange (useAuth) detecta la sesión → useEffect redirige.
    } catch {
      toast.error(t.errCode);
      setCode("");
      setBusy(false);
      verifyingRef.current = false;
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    await sendOtp();
  };

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
        #login-root button:not([disabled]){cursor:pointer;}
        @media (prefers-reduced-motion: reduce){#login-root .lib-reveal{animation:none !important;}}
        #login-root .lib-reveal{animation:loginReveal 0.55s cubic-bezier(0.22,1,0.36,1) both;}
        @keyframes loginReveal{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}
      `}</style>

      {/* Panel izquierdo (autoridad) — sin cambios respecto al diseño actual */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden border-r p-12 lg:flex"
        style={{
          background: `linear-gradient(155deg, ${DEEP.bg} 0%, ${DEEP.bgAlt} 100%)`,
          borderColor: DEEP.border,
          color: DEEP.text,
        }}
      >
        <Link
          to="/"
          className="lib-press relative z-10 text-2xl font-extrabold tracking-tight hover:opacity-80"
          style={{ ...headingStyle, color: DEEP.text }}
        >
          L<span style={{ color: L.amber }}>IB</span>erico
        </Link>
        <div className="lib-reveal relative z-10 max-w-md">
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
        </div>
        <div
          className="pointer-events-none absolute -right-16 -top-24 select-none text-[28rem] font-bold leading-none"
          style={{ ...headingStyle, color: "rgba(236,234,251,0.045)" }}
          aria-hidden
        >
          7
        </div>
      </div>

      {/* Panel derecho: acciones de auth */}
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

          <div
            className="mb-6 text-xl font-extrabold tracking-tight lg:hidden"
            style={{ ...headingStyle, color: L.ink }}
          >
            L<span style={{ color: L.amber }}>IB</span>erico
          </div>

          {step === "choice" ? (
            <>
              <h1 className="text-[1.7rem] font-bold leading-tight" style={headingStyle}>
                {t.title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: L.muted }}>
                {t.subtitle}
              </p>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={busy}
                aria-busy={busy}
                className="lib-press mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-2xl border text-sm font-semibold hover:opacity-95 disabled:opacity-60"
                style={{ backgroundColor: "#fff", borderColor: L.line, color: "#1f2937" }}
              >
                <GoogleIcon className="h-5 w-5" />
                {t.google}
              </button>

              <div className="my-5 flex items-center gap-3" aria-hidden>
                <span className="h-px flex-1" style={{ backgroundColor: L.line }} />
                <span className="text-xs uppercase tracking-widest" style={{ color: L.muted }}>
                  {t.or}
                </span>
                <span className="h-px flex-1" style={{ backgroundColor: L.line }} />
              </div>

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" style={{ color: L.ink }}>
                    {t.email}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                    style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={busy || !email}
                  aria-busy={busy}
                  className="lib-press group flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold uppercase tracking-[0.07em] hover:opacity-95"
                  style={ctaPrimary}
                >
                  <Mail className="h-4 w-4" />
                  {busy ? t.busy : t.emailCta}
                  {!busy && (
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  )}
                </Button>
              </form>

              <p
                className="mt-6 text-center text-[11px] leading-relaxed"
                style={{ color: L.muted }}
              >
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
            </>
          ) : (
            <>
              <h1 className="text-[1.7rem] font-bold leading-tight" style={headingStyle}>
                {t.codeTitle}
              </h1>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: L.muted }}>
                {t.codeSub(email)}
              </p>

              <div className="mt-6 flex justify-center">
                <InputOTP maxLength={OTP_LEN} value={code} onChange={setCode} disabled={busy}>
                  <InputOTPGroup>
                    {Array.from({ length: OTP_LEN }).map((_, i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                type="button"
                onClick={() => code.length === OTP_LEN && handleVerify(code)}
                disabled={busy || code.length !== OTP_LEN}
                aria-busy={busy}
                className="lib-press mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold uppercase tracking-[0.07em] hover:opacity-95"
                style={ctaPrimary}
              >
                {busy ? t.busy : t.verify}
              </Button>

              <div
                className="mt-5 flex items-center justify-between text-sm"
                style={{ color: L.muted }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setStep("choice");
                    setCode("");
                  }}
                  className="hover:underline"
                >
                  {t.changeEmail}
                </button>
                <button
                  type="button"
                  onClick={resend}
                  disabled={cooldown > 0}
                  className="font-semibold hover:underline disabled:opacity-50"
                  style={{ color: L.primary }}
                >
                  {cooldown > 0 ? t.resendIn(cooldown) : t.resend}
                </button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
