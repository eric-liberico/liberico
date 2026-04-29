import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { MessageSquare, Users, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/profesor")({
  head: () => ({
    meta: [
      { title: "Panel del profesor — LIBerico" },
      { name: "description", content: "Panel de gestión para profesores de LIBerico." },
    ],
  }),
  component: ProfesorPage,
});

function ProfesorPage() {
  const { user, loading: authLoading, rol } = useAuth();
  const navigate = useNavigate();
  const [codigoClase, setCodigoClase] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (rol !== null && rol !== "profesor") navigate({ to: "/" });
  }, [user, authLoading, rol, navigate]);

  useEffect(() => {
    if (!user || rol !== "profesor") return;
    supabase
      .from("perfiles")
      .select("codigo_clase")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setCodigoClase(data?.codigo_clase ?? null));
  }, [user, rol]);

  if (authLoading || !user || rol !== "profesor") {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <div className="mb-10">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Panel del profesor
          </div>
          <h1 className="font-serif text-3xl text-ink">Bienvenido</h1>
          <p className="text-foreground/70 mt-2 max-w-2xl">
            Desde aquí puedes consultar a Claude sobre criterios, textos y estrategias pedagógicas,
            y gestionar el progreso de tus alumnos.
          </p>
          {codigoClase && (
            <div className="mt-4 inline-flex items-center gap-3 bg-muted rounded-lg px-4 py-2.5">
              <span className="text-xs text-muted-foreground">Código de clase:</span>
              <span className="font-mono font-bold text-ink tracking-widest">{codigoClase}</span>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {/* Chat */}
          <Link to="/profesor-chat" className="group">
            <Card className="p-6 h-full flex flex-col gap-4 hover:border-primary/40 hover:bg-accent/20 transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-ink">Chat con Claude</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Pregunta sobre criterios de evaluación, análisis de textos, diseño de actividades
                  o cualquier aspecto del programa IB.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-primary font-medium">
                Abrir chat <ArrowRight className="h-4 w-4" />
              </div>
            </Card>
          </Link>

          {/* Alumnos */}
          <Link to="/profesor-alumnos" className="group">
            <Card className="p-6 h-full flex flex-col gap-4 hover:border-primary/40 hover:bg-accent/20 transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-ink">Mis alumnos</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Consulta el progreso de cada alumno por criterio, revisa su historial de
                  evaluaciones y comparte tu código de clase para vincularlos.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-primary font-medium">
                Ver alumnos <ArrowRight className="h-4 w-4" />
              </div>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}
