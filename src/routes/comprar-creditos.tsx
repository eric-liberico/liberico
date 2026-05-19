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

type ComprarCreditosSearch = {
  status?: "exito" | "cancelado";
  session_id?: string;
};

export const Route = createFileRoute("/comprar-creditos")({
  component: ComprarCreditos,
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
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto max-w-md px-4 py-16 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">¡Pago completado!</h1>
          <p className="text-muted-foreground mb-2">Tus créditos se añadirán en unos segundos.</p>
          <p className="text-muted-foreground mb-6 text-sm">
            Saldo actual:{" "}
            <strong>
              {creditos % 1 === 0 ? creditos.toFixed(0) : creditos.toFixed(1)} créditos
            </strong>
          </p>
          <Button asChild>
            <Link to="/asignaturas">Ir a mis asignaturas</Link>
          </Button>
        </main>
      </div>
    );
  }

  if (status === "cancelado") {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto max-w-md px-4 py-16 text-center">
          <XCircle className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Compra cancelada</h1>
          <p className="text-muted-foreground mb-6">No se ha realizado ningún cargo.</p>
          <Button
            variant="outline"
            onClick={() => void navigate({ to: "/comprar-creditos", search: {} })}
          >
            Intentar de nuevo
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-lg px-4 py-10">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/asignaturas">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Coins className="h-8 w-8 text-amber-500" />
            Comprar créditos
          </h1>
          <p className="text-muted-foreground mt-1">
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
        <Card className="p-4 mb-6 bg-muted/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tu saldo actual</span>
            <span className="text-xl font-bold">
              {creditos % 1 === 0 ? creditos.toFixed(0) : creditos.toFixed(1)} créditos
            </span>
          </div>
        </Card>

        {/* Precios de referencia */}
        <Card className="p-4 mb-6">
          <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
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
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{coste}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Formulario de compra */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="cantidad">Cantidad de créditos</Label>
              <p className="text-xs text-muted-foreground mb-2">
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
              <div className="rounded-lg border bg-muted/50 p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>{cantidad} créditos</span>
                  <span className="font-semibold">{precioEur.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Equivalente en SEK</span>
                  <span>~{precioSek} SEK</span>
                </div>
                <p className="text-xs text-muted-foreground pt-1 border-t">
                  + IVA según tu país (p. ej. 25% en Suecia, 21% en España). Stripe calcula el
                  impuesto aplicable al pagar.
                </p>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            {creditos + cantidad > MAX && cantidad >= MIN && (
              <p className="text-sm text-amber-600">
                Superarías el saldo máximo de {MAX} créditos. Reduce la cantidad.
              </p>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={() => void handleComprar()}
              disabled={comprando || cantidad < MIN || cantidad > MAX || creditos + cantidad > MAX}
            >
              {comprando ? "Redirigiendo a Stripe…" : `Pagar ${precioEur.toFixed(2)} €`}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Pago seguro procesado por Stripe. LIBerico no almacena datos de tarjeta.
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}
