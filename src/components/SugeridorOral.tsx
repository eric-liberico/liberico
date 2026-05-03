import { useState } from "react";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { JuegoEsperaEvaluacion } from "@/components/JuegoEsperaEvaluacion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Obra = { titulo: string; autor: string };

type Sugerencia = {
  asunto_global: string;
  obra1: Obra;
  obra2: Obra;
  justificacion: string;
};

type Props = {
  onSeleccion: (asuntoGlobal: string, obra1: Obra, obra2: Obra) => void;
  onSaltar: () => void;
};

function isObra(v: unknown): v is Obra {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as Obra).titulo === "string" &&
    typeof (v as Obra).autor === "string"
  );
}

function isSugerencia(v: unknown): v is Sugerencia {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Sugerencia;
  return (
    typeof s.asunto_global === "string" &&
    isObra(s.obra1) &&
    isObra(s.obra2) &&
    typeof s.justificacion === "string"
  );
}

export function SugeridorOral({ onSeleccion, onSaltar }: Props) {
  const [intereses, setIntereses] = useState("");
  const [cargando, setCargando] = useState(false);
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);

  const sugerir = async () => {
    if (!intereses.trim()) {
      toast.error("Describe brevemente tus intereses para recibir sugerencias.");
      return;
    }

    setCargando(true);
    setSugerencias([]);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-oral-topics", {
        body: { intereses: intereses.trim() },
      });

      if (error) throw new Error(error.message ?? "Error al generar sugerencias.");
      if (data?.error) throw new Error(data.error);

      const lista: unknown[] = Array.isArray(data?.sugerencias) ? data.sugerencias : [];
      const validas = lista.filter(isSugerencia);

      if (validas.length === 0) {
        throw new Error("No se generaron sugerencias válidas. Inténtalo de nuevo.");
      }

      setSugerencias(validas);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al generar sugerencias.");
    } finally {
      setCargando(false);
    }
  };

  const seleccionar = (s: Sugerencia) => {
    onSeleccion(s.asunto_global, s.obra1, s.obra2);
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="max-w-2xl">
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5" />
          Sugeridor de temas
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl text-ink leading-tight">
          ¿Sobre qué quieres hablar en tu oral?
        </h2>
        <p className="mt-2 text-sm text-foreground/70 leading-relaxed">
          Describe tus intereses y la IA te propone tres asuntos globales con obras que encajan.
          Puedes saltar este paso si ya tienes claro tu tema.
        </p>
      </div>

      {/* Formulario de intereses */}
      {sugerencias.length === 0 && (
        <Card className="p-6 border-border space-y-4 max-w-2xl">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Mis intereses
            </label>
            <Textarea
              value={intereses}
              onChange={(e) => setIntereses(e.target.value)}
              placeholder="Ej.: me interesa el fútbol, las redes sociales, la relación con mis padres, la presión por rendir…"
              rows={4}
              disabled={cargando}
              maxLength={1000}
              className="resize-none text-sm"
            />
            <p className="text-[11px] text-muted-foreground/70">
              Cuanto más concreto seas, mejores serán las sugerencias.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={sugerir} disabled={cargando || !intereses.trim()}>
              {cargando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando sugerencias…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Sugerir asuntos globales
                </>
              )}
            </Button>
            <Button type="button" variant="ghost" onClick={onSaltar} disabled={cargando}>
              Ir directamente al formulario
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {cargando && (
            <div className="mt-2">
              <JuegoEsperaEvaluacion modo="oral" />
            </div>
          )}
        </Card>
      )}

      {/* Resultados */}
      {sugerencias.length > 0 && (
        <div className="space-y-4 max-w-2xl">
          <p className="text-sm text-foreground/70">
            Elige una opción o{" "}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
              onClick={() => setSugerencias([])}
            >
              vuelve a intentarlo
            </button>{" "}
            con otros intereses.
          </p>

          {sugerencias.map((s, i) => (
            <Card key={i} className="p-5 border-border space-y-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Opción {i + 1}
              </div>
              <p className="font-medium text-foreground leading-snug">{s.asunto_global}</p>
              <div className="grid sm:grid-cols-2 gap-2 text-sm text-foreground/75">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground block mb-0.5">
                    Obra 1
                  </span>
                  <span className="font-medium">{s.obra1.titulo}</span>
                  <span className="text-muted-foreground"> · {s.obra1.autor}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground block mb-0.5">
                    Obra 2
                  </span>
                  <span className="font-medium">{s.obra2.titulo}</span>
                  <span className="text-muted-foreground"> · {s.obra2.autor}</span>
                </div>
              </div>
              <p className="text-sm text-foreground/60 leading-relaxed">{s.justificacion}</p>
              <Button type="button" size="sm" onClick={() => seleccionar(s)}>
                Usar esta opción
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Card>
          ))}

          <Button type="button" variant="ghost" size="sm" onClick={onSaltar}>
            Prefiero rellenar el formulario directamente
          </Button>
        </div>
      )}
    </div>
  );
}
