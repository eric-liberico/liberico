import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coins, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import {
  LANDING_FONT_LINK,
  LANDING as L,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";

type ComprarCreditosSearch = {
  status?: "exito" | "cancelado" | "simulado";
  session_id?: string;
};

export const Route = createFileRoute("/comprar-creditos")({
  component: ComprarCreditos,
  head: () => ({
    links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }],
  }),
  validateSearch: (search: Record<string, unknown>): ComprarCreditosSearch => {
    const status =
      search.status === "exito" || search.status === "cancelado" || search.status === "simulado"
        ? search.status
        : undefined;
    const sessionId = typeof search.session_id === "string" ? search.session_id : undefined;

    return {
      ...(status ? { status } : {}),
      ...(sessionId ? { session_id: sessionId } : {}),
    };
  },
});

const MIN = 5;
const MAX = 200;
const PRESET_AMOUNTS = [5, 10, 20, 50] as const;

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;
const cardStyle = {
  backgroundColor: L.surface,
  borderColor: L.line,
  boxShadow: cardShadow,
} as const;
const ctaGlow = { boxShadow: "0 16px 30px -12px rgba(79,70,229,0.55)" } as const;

const scopedCss = `
  #comprar-creditos-root{--primary:${L.primary};--ring:${L.primary};}
  #comprar-creditos-root .lib-press{transition:transform 0.12s cubic-bezier(0.23,1,0.32,1);}
  #comprar-creditos-root .lib-press:active{transform:scale(0.97);}
  #comprar-creditos-root a:focus-visible,#comprar-creditos-root button:focus-visible,#comprar-creditos-root input:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:10px;}
  #comprar-creditos-root button:not([disabled]){cursor:pointer;}
  #comprar-creditos-root .lib-reveal{animation:ccReveal 0.5s cubic-bezier(0.22,1,0.36,1) both;}
  @keyframes ccReveal{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}
  @media (prefers-reduced-motion: reduce){
    #comprar-creditos-root .lib-reveal{animation:none !important;}
    #comprar-creditos-root .lib-press{transition:none !important;}
  }
`;

const BUY_COPY_ES = {
  notAuthenticated: "No autenticado",
  unknownError: "Error desconocido",
  unexpectedError: "Error inesperado.",
  checkoutError: "Error al crear la sesión de pago.",
  maxError: (current: string, max: number) =>
    `Tu saldo actual (${current}) más esta compra superaría el máximo de ${max} créditos.`,
  successTitle: "¡Pago completado!",
  successBody: "Tus créditos se añadirán en unos segundos.",
  simulatedTitle: "Créditos simulados añadidos",
  simulatedBody: "La lógica de compra se ha ejecutado localmente sin Stripe.",
  currentBalance: "Saldo actual",
  successCta: "Ir a mis asignaturas",
  canceledTitle: "Compra cancelada",
  canceledBody: "No se ha realizado ningún cargo.",
  retry: "Intentar de nuevo",
  back: "Volver",
  title: "Comprar créditos",
  subtitle: "1 crédito = 1 € = 10 SEK. Los créditos no caducan.",
  testTitle: "Modo prueba",
  testBody: "Añade 20 créditos sin pago real para probar la funcionalidad.",
  testAdding: "Añadiendo…",
  testCta: "+ 20 créditos gratis",
  balanceTitle: "Tu saldo actual",
  pricesTitle: "Precios de referencia",
  prices: [
    { label: "Spanish B Paper 1 — corrección", cost: "1.5 cr" },
    { label: "Spanish B Paper 1 — feedback completo", cost: "+2 cr" },
    { label: "Spanish B Paper 2 — preguntas", cost: "0.5 cr" },
    { label: "Spanish B Paper 2 — corrección", cost: "2 cr" },
    { label: "Spanish B Oral — corrección", cost: "2 cr" },
  ],
  amountLabel: "Cantidad de créditos",
  amountHelp: (min: number, max: number, balanceMax: number) =>
    max > 0
      ? `Mínimo ${min} · Máximo ${max} (saldo máximo: ${balanceMax})`
      : `Saldo máximo alcanzado (${balanceMax} créditos)`,
  quickAmounts: "Cantidades rápidas",
  equivalentSek: "Equivalente en SEK",
  taxNote:
    "+ IVA según tu país (p. ej. 25% en Suecia, 21% en España). Stripe calcula el impuesto aplicable al pagar.",
  maxExceeded: (max: number) =>
    `Superarías el saldo máximo de ${max} créditos. Reduce la cantidad.`,
  redirecting: "Redirigiendo a Stripe…",
  pay: (price: string) => `Pagar ${price} €`,
  secure: "Pago seguro procesado por Stripe. LIBerico no almacena datos de tarjeta.",
};

const BUY_COPY_EN: typeof BUY_COPY_ES = {
  notAuthenticated: "Not authenticated",
  unknownError: "Unknown error",
  unexpectedError: "Unexpected error.",
  checkoutError: "Could not create the payment session.",
  maxError: (current: string, max: number) =>
    `Your current balance (${current}) plus this purchase would exceed the ${max}-credit maximum.`,
  successTitle: "Payment completed",
  successBody: "Your credits will be added in a few seconds.",
  simulatedTitle: "Simulated credits added",
  simulatedBody: "The purchase logic ran locally without Stripe.",
  currentBalance: "Current balance",
  successCta: "Go to my subjects",
  canceledTitle: "Purchase cancelled",
  canceledBody: "No charge was made.",
  retry: "Try again",
  back: "Back",
  title: "Buy credits",
  subtitle: "1 credit = 1 € = 10 SEK. Credits do not expire.",
  testTitle: "Test mode",
  testBody: "Add 20 credits without a real payment to test the flow.",
  testAdding: "Adding…",
  testCta: "+ 20 free credits",
  balanceTitle: "Current balance",
  pricesTitle: "Reference prices",
  prices: [
    { label: "Spanish B Paper 1 — marking", cost: "1.5 cr" },
    { label: "Spanish B Paper 1 — full feedback", cost: "+2 cr" },
    { label: "Spanish B Paper 2 — questions", cost: "0.5 cr" },
    { label: "Spanish B Paper 2 — marking", cost: "2 cr" },
    { label: "Spanish B Oral — marking", cost: "2 cr" },
  ],
  amountLabel: "Credits to buy",
  amountHelp: (min: number, max: number, balanceMax: number) =>
    max > 0
      ? `Minimum ${min} · Maximum ${max} (balance cap: ${balanceMax})`
      : `Maximum balance reached (${balanceMax} credits)`,
  quickAmounts: "Quick amounts",
  equivalentSek: "Equivalent in SEK",
  taxNote:
    "+ VAT according to your country (for example, 25% in Sweden, 21% in Spain). Stripe calculates the applicable tax at checkout.",
  maxExceeded: (max: number) =>
    `This would exceed the ${max}-credit balance cap. Reduce the amount.`,
  redirecting: "Redirecting to Stripe…",
  pay: (price: string) => `Pay ${price} €`,
  secure: "Secure payment processed by Stripe. LIBerico does not store card details.",
};

function formatCredits(value: number, isEN: boolean) {
  const display = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${display} ${isEN ? `credit${value === 1 ? "" : "s"}` : `crédito${value === 1 ? "" : "s"}`}`;
}

function ComprarCreditos() {
  const { user, creditos, loading, refreshRol } = useAuth();
  const isEN = useUiLang() === "en";
  const c = isEN ? BUY_COPY_EN : BUY_COPY_ES;
  const navigate = useNavigate();
  const { status } = useSearch({ from: "/comprar-creditos" });
  const testCreditsEnabled = import.meta.env.VITE_ENABLE_TEST_CREDITS === "true";
  const [cantidad, setCantidad] = useState(10);
  const [comprando, setComprando] = useState(false);
  const [añadiendoTest, setAñadiendoTest] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      void navigate({ to: "/login" });
    }
  }, [loading, navigate, user]);

  useEffect(() => {
    if (status === "exito" || status === "simulado") {
      void refreshRol();
    }
  }, [refreshRol, status]);

  const handleTestCredits = async () => {
    setAñadiendoTest(true);
    setError(null);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error(c.notAuthenticated);
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/add-test-credits`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      );
      const data = (await res.json()) as { mensaje?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? c.unknownError);
      // Refresca el saldo inmediatamente (fallback por si realtime tarda)
      await refreshRol();
    } catch (err) {
      setError(err instanceof Error ? err.message : c.unexpectedError);
    } finally {
      setAñadiendoTest(false);
    }
  };

  if (loading || !user) return null;

  const precioEur = cantidad;
  const precioSek = cantidad * 10;
  const maxComprable = Math.max(0, Math.min(MAX, MAX - creditos));

  const handleComprar = async () => {
    if (cantidad < MIN || cantidad > MAX) return;
    if (creditos + cantidad > MAX) {
      setError(c.maxError(creditos.toFixed(1), MAX));
      return;
    }
    setComprando(true);
    setError(null);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error(c.notAuthenticated);

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ cantidad_creditos: cantidad }),
        },
      );

      const data = (await res.json()) as {
        url?: string;
        error?: string;
        simulated?: boolean;
        session_id?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? c.checkoutError);
      }
      if (data.simulated) {
        await refreshRol();
        void navigate({
          to: "/comprar-creditos",
          search: { status: "simulado", session_id: data.session_id },
        });
        return;
      }
      if (!data.url) {
        throw new Error(c.checkoutError);
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : c.unexpectedError);
      setComprando(false);
    }
  };

  if (status === "exito" || status === "simulado") {
    const simulated = status === "simulado";
    return (
      <div
        id="comprar-creditos-root"
        className="min-h-screen"
        style={{ ...fontSans, backgroundColor: L.bg, color: L.ink }}
      >
        <style>{scopedCss}</style>
        <SiteHeader claro />
        <main className="mx-auto max-w-md px-4 py-16 text-center lib-reveal">
          <CheckCircle className="mx-auto mb-4 h-16 w-16" style={{ color: L.ok }} />
          <h1 className="mb-2 text-2xl font-bold" style={{ ...headingStyle, color: L.ink }}>
            {simulated ? c.simulatedTitle : c.successTitle}
          </h1>
          <p className="mb-2" style={{ color: L.muted }}>
            {simulated ? c.simulatedBody : c.successBody}
          </p>
          <p className="mb-6 text-sm" style={{ color: L.muted }}>
            {c.currentBalance}:{" "}
            <strong style={{ ...fontMono, color: L.ink }}>{formatCredits(creditos, isEN)}</strong>
          </p>
          <Button asChild className="lib-press rounded-2xl" style={ctaGlow}>
            <Link to="/asignaturas">{c.successCta}</Link>
          </Button>
        </main>
      </div>
    );
  }

  if (status === "cancelado") {
    return (
      <div
        id="comprar-creditos-root"
        className="min-h-screen"
        style={{ ...fontSans, backgroundColor: L.bg, color: L.ink }}
      >
        <style>{scopedCss}</style>
        <SiteHeader claro />
        <main className="mx-auto max-w-md px-4 py-16 text-center lib-reveal">
          <XCircle className="mx-auto mb-4 h-16 w-16" style={{ color: L.muted }} />
          <h1 className="mb-2 text-2xl font-bold" style={{ ...headingStyle, color: L.ink }}>
            {c.canceledTitle}
          </h1>
          <p className="mb-6" style={{ color: L.muted }}>
            {c.canceledBody}
          </p>
          <Button
            variant="outline"
            className="lib-press rounded-2xl"
            style={{ borderColor: L.line, color: L.ink }}
            onClick={() => void navigate({ to: "/comprar-creditos", search: {} })}
          >
            {c.retry}
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div
      id="comprar-creditos-root"
      className="min-h-screen"
      style={{ ...fontSans, backgroundColor: L.bg, color: L.ink }}
    >
      <style>{scopedCss}</style>
      <SiteHeader claro />
      <main className="mx-auto max-w-lg px-4 py-10">
        <div className="mb-6 lib-reveal">
          <Button variant="ghost" size="sm" asChild className="lib-press">
            <Link to="/asignaturas" style={{ color: L.muted }}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {c.back}
            </Link>
          </Button>
        </div>

        <div className="mb-8 lib-reveal">
          <h1
            className="flex items-center gap-2 text-3xl font-bold"
            style={{ ...headingStyle, color: L.ink }}
          >
            <Coins className="h-8 w-8" style={{ color: L.amber }} />
            {c.title}
          </h1>
          <p className="mt-1" style={{ color: L.muted }}>
            {c.subtitle}
          </p>
        </div>

        {testCreditsEnabled && (
          <div className="mb-6 rounded-lg border border-dashed border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {c.testTitle}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{c.testBody}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-400 text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900 shrink-0"
              onClick={() => void handleTestCredits()}
              disabled={añadiendoTest || creditos >= 200}
            >
              {añadiendoTest ? c.testAdding : c.testCta}
            </Button>
          </div>
        )}

        {/* Saldo actual */}
        <Card
          className="mb-6 rounded-2xl border p-4 lib-reveal"
          style={{ backgroundColor: L.bg2, borderColor: L.line }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: L.muted }}>
              {c.balanceTitle}
            </span>
            <span className="text-xl font-bold tabular-nums" style={{ ...fontMono, color: L.ink }}>
              {formatCredits(creditos, isEN)}
            </span>
          </div>
        </Card>

        {/* Precios de referencia */}
        <Card className="mb-6 rounded-2xl border p-4 lib-reveal" style={cardStyle}>
          <h2
            className="mb-3 text-[0.7rem] uppercase tracking-[0.14em]"
            style={{ ...fontMono, color: L.muted }}
          >
            {c.pricesTitle}
          </h2>
          <div className="space-y-2 text-sm">
            {c.prices.map(({ label, cost }) => (
              <div key={label} className="flex justify-between">
                <span style={{ color: L.muted }}>{label}</span>
                <span className="font-medium tabular-nums" style={{ ...fontMono, color: L.ink }}>
                  {cost}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Formulario de compra */}
        <Card className="rounded-2xl border p-6 lib-reveal" style={cardStyle}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cantidad">{c.amountLabel}</Label>
              <p id="cantidad-help" className="mb-2 text-xs" style={{ color: L.muted }}>
                {c.amountHelp(MIN, maxComprable, MAX)}
              </p>
              <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label={c.quickAmounts}>
                {PRESET_AMOUNTS.map((amount) => {
                  const active = cantidad === amount;
                  const disabled = maxComprable < amount;
                  return (
                    <button
                      key={amount}
                      type="button"
                      className="lib-press rounded-full border px-3 py-1.5 text-sm font-medium tabular-nums transition-[background-color,border-color,color,transform] duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-40"
                      style={
                        active
                          ? { backgroundColor: L.primary, borderColor: L.primary, color: "#fff" }
                          : { backgroundColor: L.bg2, borderColor: L.line, color: L.ink }
                      }
                      disabled={disabled}
                      onClick={() => setCantidad(amount)}
                      aria-pressed={active}
                    >
                      {amount} <span className="text-[10px] uppercase opacity-70">cr</span>
                    </button>
                  );
                })}
              </div>
              <Input
                id="cantidad"
                name="cantidad_creditos"
                type="number"
                inputMode="numeric"
                min={MIN}
                max={maxComprable > 0 ? maxComprable : MIN}
                step={1}
                value={cantidad}
                aria-describedby="cantidad-help"
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v)) setCantidad(Math.max(1, Math.min(MAX, v)));
                }}
                className="text-lg font-medium"
              />
            </div>

            {cantidad >= MIN && (
              <div
                className="space-y-1 rounded-xl border p-3 text-sm"
                style={{ backgroundColor: L.bg2, borderColor: L.line }}
              >
                <div className="flex justify-between">
                  <span>{formatCredits(cantidad, isEN)}</span>
                  <span
                    className="font-semibold tabular-nums"
                    style={{ ...fontMono, color: L.ink }}
                  >
                    {precioEur.toFixed(2)} €
                  </span>
                </div>
                <div className="flex justify-between" style={{ color: L.muted }}>
                  <span>{c.equivalentSek}</span>
                  <span className="tabular-nums" style={fontMono}>
                    ~{precioSek} SEK
                  </span>
                </div>
                <p
                  className="border-t pt-1 text-xs"
                  style={{ borderColor: L.line, color: L.muted }}
                >
                  {c.taxNote}
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            {creditos + cantidad > MAX && cantidad >= MIN && (
              <p className="text-sm font-medium" style={{ color: L.amberDeep }}>
                {c.maxExceeded(MAX)}
              </p>
            )}

            <Button
              className="lib-press w-full rounded-2xl"
              size="lg"
              style={ctaGlow}
              onClick={() => void handleComprar()}
              disabled={comprando || cantidad < MIN || cantidad > MAX || creditos + cantidad > MAX}
            >
              {comprando ? c.redirecting : c.pay(precioEur.toFixed(2))}
            </Button>

            <p className="text-center text-xs" style={{ color: L.muted }}>
              {c.secure}
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}
