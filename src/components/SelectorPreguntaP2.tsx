import { useEffect, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { toast } from "sonner";

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

  const cargar = async () => {
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
  };

  useEffect(() => {
    if (abierto) cargar();
  }, [abierto]);

  const filtradas = preguntas.filter((p) =>
    p.pregunta.toLowerCase().includes(busqueda.toLowerCase()),
  );

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7">
          {isEN ? "Question bank" : "Banco de preguntas"}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(480px,95vw)] p-0" align="start">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={isEN ? "Search questions…" : "Buscar preguntas…"}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        <ScrollArea className="h-72">
          {cargando ? (
            <p className="p-4 text-sm text-muted-foreground">{isEN ? "Loading…" : "Cargando…"}</p>
          ) : filtradas.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
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
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors leading-snug"
                  onClick={() => {
                    onSeleccion(p.pregunta);
                    setAbierto(false);
                    setBusqueda("");
                  }}
                >
                  {p.pregunta}
                  {p.anio && (
                    <span className="ml-1.5 text-[11px] text-muted-foreground">({p.anio})</span>
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
