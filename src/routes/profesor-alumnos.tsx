import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, Users, ChevronRight, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/profesor-alumnos")({
  head: () => ({
    meta: [
      { title: "Mis alumnos — LIBerico" },
      { name: "description", content: "Gestiona y consulta el progreso de tus alumnos." },
    ],
  }),
  component: ProfesorAlumnosPage,
});

type Alumno = {
  user_id: string;
  email: string;
  nota_ib_media: number | null;
  num_evaluaciones: number;
  ultima_evaluacion: string | null;
  banda_a_media: number | null;
  banda_b_media: number | null;
  banda_c_media: number | null;
  banda_d_media: number | null;
};

function BandaBadge({ label, valor }: { label: string; valor: number | null }) {
  if (valor === null) return null;
  const color =
    valor >= 4
      ? "bg-green-100 text-green-800"
      : valor >= 3
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-800";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded",
        color,
      )}
    >
      {label} {valor.toFixed(1)}
    </span>
  );
}

function ProfesorAlumnosPage() {
  const { user, loading: authLoading, rol } = useAuth();
  const navigate = useNavigate();
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [cargando, setCargando] = useState(true);
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
    (async () => {
      // Código de clase del profesor
      const { data: perfil } = await supabase
        .from("perfiles")
        .select("codigo_clase")
        .eq("user_id", user.id)
        .maybeSingle();
      setCodigoClase(perfil?.codigo_clase ?? null);

      // Lista de alumnos con stats
      const { data, error } = await supabase.rpc("get_mis_alumnos");
      if (error) toast.error("No se pudo cargar la lista de alumnos.");
      else setAlumnos((data ?? []) as Alumno[]);
      setCargando(false);
    })();
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
        <div className="mb-8">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Panel del profesor
          </div>
          <h1 className="font-serif text-3xl text-ink">Mis alumnos</h1>
          <p className="text-foreground/70 mt-2">
            Comparte tu código de clase con tus alumnos para que puedan vincularse.
          </p>
        </div>

        {/* Código de clase */}
        <Card className="p-5 mb-8 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
              Tu código de clase
            </div>
            <div className="font-mono text-2xl font-bold text-ink tracking-widest">
              {codigoClase ?? "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              El alumno lo introduce en su plan de estudio para vincularse a ti.
            </p>
          </div>
        </Card>

        {/* Lista de alumnos */}
        {cargando ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : alumnos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
            <Users className="h-10 w-10 opacity-30" />
            <p className="text-sm">Aún no tienes alumnos vinculados.</p>
            <p className="text-xs max-w-xs">
              Comparte el código de clase con tus alumnos para que aparezcan aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground mb-3">
              {alumnos.length} alumno{alumnos.length !== 1 ? "s" : ""} vinculado
              {alumnos.length !== 1 ? "s" : ""}
            </div>
            {alumnos.map((alumno) => (
              <Link
                key={alumno.user_id}
                to="/profesor-alumno/$alumnoId"
                params={{ alumnoId: alumno.user_id }}
                className="block"
              >
                <Card className="p-4 hover:border-primary/40 hover:bg-accent/20 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-medium text-ink truncate">
                          {alumno.email}
                        </span>
                        {alumno.nota_ib_media !== null && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <BarChart2 className="h-3 w-3" />
                            Nota {alumno.nota_ib_media.toFixed(1)} media
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <BandaBadge label="A" valor={alumno.banda_a_media} />
                        <BandaBadge label="B" valor={alumno.banda_b_media} />
                        <BandaBadge label="C" valor={alumno.banda_c_media} />
                        <BandaBadge label="D" valor={alumno.banda_d_media} />
                        <span className="text-[10px] text-muted-foreground self-center">
                          {alumno.num_evaluaciones} evaluacion
                          {alumno.num_evaluaciones !== 1 ? "es" : ""}
                          {alumno.ultima_evaluacion && (
                            <>
                              {" "}
                              · última{" "}
                              {new Date(alumno.ultima_evaluacion).toLocaleDateString("es-ES", {
                                day: "numeric",
                                month: "short",
                              })}
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
