import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
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
  status?: "exito" | "cancelado";
  session_id?: string;
};

export const Route = createFileRoute("/comprar-creditos")({
  component: ComprarCreditos,
  head: () => ({
    links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }],
  }),
  validateSearch: (search: Record<string, unknown>): ComprarCreditosSearch => {
    const status =
      search.status === "exito" || search.status === "cancelado" ? search.status : undefined;
    const sessionId = typeof search.session_id === "string" ? search.session_id : undefined;

    return {
      ...(status ? { status } : {}),
      ...(sessionId ? { session_id: sessionId } : {}),
    };
  },
});

const MIN = 5;
const MAX = 200;

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
  #comprar-creditos-root a:focus-visible,#comprar-creditos-root button:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:10px;}
  #comprar-creditos-root button:not([disabled]){cursor:pointer;}
  #comprar-creditos-root .lib-reveal{animation:ccReveal 0.5s cubic-bezier(0.22,1,0.36,1) both;}
  @keyframes ccReveal{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}
  @media (prefers-reduced-motion: reduce){
    #comprar-creditos-root .lib-reveal{animation:none !important;}
    #comprar-creditos-root .lib-press{transition:none !important;}
  }
`;

function ComprarCreditos() {
  const { user, creditos, loading, refreshRol } = useAuth();
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

  const handleTestCredits = async () => {
    setAñadiendoTest(true);
    setError(null);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("No autenticado");
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/add-test-credits`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      );
      const data = (await res.json()) as { mensaje?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      // Refresca el saldo inmediatamente (fallback por si realtime tarda)
      await refreshRol();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setAñadiendoTest(false);
    }
  };

  if (loading || !user) return null;

  const precioEur = cantidad;
  const precioSek = cantidad * 10;
  const maxComprable = Math.min(MAX, MAX - creditos);

  const handleComprar = async () => {
    if (cantidad < MIN || cantidad > MAX) return;
    if (creditos + cantidad > MAX) {
      setError(
        `Tu saldo actual (${creditos.toFixed(1)}) más esta compra superaría el máximo de ${MAX} créditos.`,
      );
      return;
    }
    setComprando(true);
    setError(null);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("No autenticado");

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

      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Error al crear la sesión de pago.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setComprando(false);
    }
  };

  if (status === "exito") {
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
            ¡Pago completado!
          </h1>
          <p className="mb-2" style={{ color: L.muted }}>
            Tus créditos se añadirán en unos segundos.
          </p>
          <p className="mb-6 text-sm" style={{ color: L.muted }}>
            Saldo actual:{" "}
            <strong style={{ ...fontMono, color: L.ink }}>
              {creditos % 1 === 0 ? creditos.toFixed(0) : creditos.toFixed(1)} créditos
            </strong>
          </p>
          <Button asChild className="lib-press rounded-2xl" style={ctaGlow}>
            <Link to="/asignaturas">Ir a mis asignaturas</Link>
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
            Compra cancelada
          </h1>
          <p className="mb-6" style={{ color: L.muted }}>
            No se ha realizado ningún cargo.
          </p>
          <Button
            variant="outline"
            className="lib-press rounded-2xl"
            style={{ borderColor: L.line, color: L.ink }}
            onClick={() => void navigate({ to: "/comprar-creditos", search: {} })}
          >
            Intentar de nuevo
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
              Volver
            </Link>
          </Button>
        </div>

        <div className="mb-8 lib-reveal">
          <h1
            className="flex items-center gap-2 text-3xl font-bold"
            style={{ ...headingStyle, color: L.ink }}
          >
            <Coins className="h-8 w-8" style={{ color: L.amber }} />
            Comprar créditos
          </h1>
          <p className="mt-1" style={{ color: L.muted }}>
            1 crédito = 1 € = 10 SEK. Los créditos no caducan.
          </p>
        </div>

        {testCreditsEnabled && (
          <div className="mb-6 rounded-lg border border-dashed border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Modo prueba</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Añade 20 créditos sin pago real para probar la funcionalidad.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-400 text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900 shrink-0"
              onClick={() => void handleTestCredits()}
              disabled={añadiendoTest || creditos >= 200}
            >
              {añadiendoTest ? "Añadiendo…" : "+ 20 créditos gratis"}
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
              Tu saldo actual
            </span>
            <span className="text-xl font-bold tabular-nums" style={{ ...fontMono, color: L.ink }}>
              {creditos % 1 === 0 ? creditos.toFixed(0) : creditos.toFixed(1)} créditos
            </span>
          </div>
        </Card>

        {/* Precios de referencia */}
        <Card className="mb-6 rounded-2xl border p-4 lib-reveal" style={cardStyle}>
          <h2
            className="mb-3 text-[0.7rem] uppercase tracking-[0.14em]"
            style={{ ...fontMono, color: L.muted }}
          >
            Precios de referencia
          </h2>
          <div className="space-y-2 text-sm">
            {[
              { label: "Spanish B Paper 1 — corrección", coste: "1.5 cr" },
              { label: "Spanish B Paper 1 — feedback completo", coste: "+2 cr" },
              { label: "Spanish B Paper 2 — preguntas", coste: "0.5 cr" },
              { label: "Spanish B Paper 2 — corrección", coste: "2 cr" },
              { label: "Spanish B Oral — corrección", coste: "2 cr" },
            ].map(({ label, coste }) => (
              <div key={label} className="flex justify-between">
                <span style={{ color: L.muted }}>{label}</span>
                <span className="font-medium tabular-nums" style={{ ...fontMono, color: L.ink }}>
                  {coste}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Formulario de compra */}
        <Card className="rounded-2xl border p-6 lib-reveal" style={cardStyle}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cantidad">Cantidad de créditos</Label>
              <p className="mb-2 text-xs" style={{ color: L.muted }}>
                Mínimo {MIN} · Máximo {maxComprable > 0 ? maxComprable : MAX} (saldo máximo: {MAX})
              </p>
              <Input
                id="cantidad"
                type="number"
                min={MIN}
                max={maxComprable > 0 ? maxComprable : MAX}
                step={1}
                value={cantidad}
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
                  <span>{cantidad} créditos</span>
                  <span
                    className="font-semibold tabular-nums"
                    style={{ ...fontMono, color: L.ink }}
                  >
                    {precioEur.toFixed(2)} €
                  </span>
                </div>
                <div className="flex justify-between" style={{ color: L.muted }}>
                  <span>Equivalente en SEK</span>
                  <span className="tabular-nums" style={fontMono}>
                    ~{precioSek} SEK
                  </span>
                </div>
                <p
                  className="border-t pt-1 text-xs"
                  style={{ borderColor: L.line, color: L.muted }}
                >
                  + IVA según tu país (p. ej. 25% en Suecia, 21% en España). Stripe calcula el
                  impuesto aplicable al pagar.
                </p>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            {creditos + cantidad > MAX && cantidad >= MIN && (
              <p className="text-sm font-medium" style={{ color: L.amberDeep }}>
                Superarías el saldo máximo de {MAX} créditos. Reduce la cantidad.
              </p>
            )}

            <Button
              className="lib-press w-full rounded-2xl"
              size="lg"
              style={ctaGlow}
              onClick={() => void handleComprar()}
              disabled={comprando || cantidad < MIN || cantidad > MAX || creditos + cantidad > MAX}
            >
              {comprando ? "Redirigiendo a Stripe…" : `Pagar ${precioEur.toFixed(2)} €`}
            </Button>

            <p className="text-center text-xs" style={{ color: L.muted }}>
              Pago seguro procesado por Stripe. LIBerico no almacena datos de tarjeta.
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}
