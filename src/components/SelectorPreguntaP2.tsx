import { useEffect, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
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
  const [abierto, setAbierto] = useState(false);
  const [preguntas, setPreguntas] = useState<PreguntaP2[]>([]);
  const [cargando, setCargando] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const cargar = async () => {
    if (cargado) return;
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from("preguntas_prueba2")
        .select("id, pregunta, anio")
        .order("pregunta", { ascending: true });

      if (error) throw new Error(error.message);
      setPreguntas((data as PreguntaP2[]) ?? []);
      setCargado(true);
    } catch {
      toast.error("No se pudieron cargar las preguntas.");
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

  const seleccionar = (p: PreguntaP2) => {
    onSeleccion(p.pregunta);
    setAbierto(false);
    setBusqueda("");
  };

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Ver preguntas de past papers
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[480px] p-0" align="start">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar pregunta…"
              className="pl-8 h-8 text-sm"
              autoFocus
            />
          </div>
        </div>

        {cargando ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            Cargando preguntas…
          </div>
        ) : filtradas.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            {preguntas.length === 0
              ? "No hay preguntas disponibles aún."
              : "Ninguna pregunta coincide con tu búsqueda."}
          </div>
        ) : (
          <ScrollArea className="h-80">
            <ul className="py-1">
              {filtradas.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors flex items-start gap-3"
                    onClick={() => seleccionar(p)}
                  >
                    <span className="flex-1 leading-snug">{p.pregunta}</span>
                    {p.anio && (
                      <span className="shrink-0 text-[11px] text-muted-foreground mt-0.5">
                        {p.anio}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
