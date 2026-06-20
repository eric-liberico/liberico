import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { toast } from "sonner";
import { LANDING as L, cardShadow, landingFontMono as fontMono } from "@/lib/landing-theme";

const popoverStyle = {
  backgroundColor: L.surface,
  borderColor: L.line,
  boxShadow: cardShadow,
} as const;

type PreguntaP2 = {
  id: string;
  pregunta: string;
  anio: number | null;
};

type Props = {
  onSeleccion: (pregunta: string) => void;
};

export function SelectorPreguntaP2({ onSeleccion }: Props) {
  const { courseKey } = useAuth();
  const isEN = useUiLang() === "en";

  const [abierto, setAbierto] = useState(false);
  const [preguntas, setPreguntas] = useState<PreguntaP2[]>([]);
  const [cargando, setCargando] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  // Reload when course changes
  useEffect(() => {
    setCargado(false);
    setPreguntas([]);
  }, [courseKey]);

  const cargar = useCallback(async () => {
    if (cargado) return;
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from("preguntas_prueba2")
        .select("id, pregunta, anio")
        .eq("course_key", courseKey)
        .order("pregunta", { ascending: true });

      if (error) throw new Error(error.message);
      setPreguntas((data as PreguntaP2[]) ?? []);
      setCargado(true);
    } catch {
      toast.error(isEN ? "Could not load questions." : "No se pudieron cargar las preguntas.");
    } finally {
      setCargando(false);
    }
  }, [cargado, courseKey, isEN]);

  useEffect(() => {
    if (abierto) cargar();
  }, [abierto, cargar]);

  const filtradas = preguntas.filter((p) =>
    p.pregunta.toLowerCase().includes(busqueda.toLowerCase()),
  );

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="lib-press h-8 gap-1.5 rounded-xl text-xs font-semibold"
          style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
        >
          {isEN ? "Question bank" : "Banco de preguntas"}
          <ChevronDown aria-hidden="true" className="h-3 w-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(480px,95vw)] rounded-2xl p-0"
        style={popoverStyle}
        align="start"
      >
        <div className="border-b p-3" style={{ borderColor: L.line }}>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-2.5 top-2.5 h-3.5 w-3.5"
              style={{ color: L.muted }}
            />
            <Input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={isEN ? "Search questions…" : "Buscar preguntas…"}
              aria-label={isEN ? "Search Paper 2 questions" : "Buscar preguntas de Prueba 2"}
              autoComplete="off"
              spellCheck={false}
              className="h-8 rounded-xl pl-8 text-sm"
              style={{ borderColor: L.line, color: L.ink }}
            />
          </div>
        </div>
        <ScrollArea className="h-72">
          {cargando ? (
            <p className="p-4 text-sm" style={{ color: L.muted }}>
              {isEN ? "Loading…" : "Cargando…"}
            </p>
          ) : filtradas.length === 0 ? (
            <p className="p-4 text-sm" style={{ color: L.muted }}>
              {preguntas.length === 0
                ? isEN
                  ? "No questions available for this course yet."
                  : "Aún no hay preguntas disponibles para este curso."
                : isEN
                  ? "No results."
                  : "Sin resultados."}
            </p>
          ) : (
            <div className="py-1">
              {filtradas.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm leading-snug transition-colors hover:bg-accent"
                  style={{ color: L.ink }}
                  onClick={() => {
                    onSeleccion(p.pregunta);
                    setAbierto(false);
                    setBusqueda("");
                  }}
                >
                  {p.pregunta}
                  {p.anio && (
                    <span className="ml-1.5 text-[11px]" style={{ ...fontMono, color: L.muted }}>
                      ({p.anio})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
