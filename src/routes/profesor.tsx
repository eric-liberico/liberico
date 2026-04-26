import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/profesor")({
  head: () => ({
    meta: [
      { title: "Panel del profesor — IB Literatura" },
      { name: "description", content: "Panel de gestión para profesores de IB Literatura." },
    ],
  }),
  component: ProfesorPage,
});

function ProfesorPage() {
  const { user, loading: authLoading, rol } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (rol !== null && rol !== "profesor") navigate({ to: "/" });
  }, [user, authLoading, rol, navigate]);

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
            y próximamente gestionar el progreso de tus alumnos.
          </p>
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

          {/* Alumnos — próximamente */}
          <Card className="p-6 h-full flex flex-col gap-4 opacity-60">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Users className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-ink flex items-center gap-2">
                Mis alumnos
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                  Próximamente
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Invita a tus alumnos, consulta su progreso por criterio, modifica su plan de estudio
                y añade contenido personalizado.
              </p>
            </div>
            <Button variant="outline" size="sm" disabled className="w-fit">
              Disponible pronto
            </Button>
          </Card>
        </div>
      </main>
    </div>
  );
}
