import { useState, useRef, useCallback } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type TipoAnotacion = "subrayado" | "sugerencia" | "correccion";

export type Anotacion = {
  id: string;
  inicio: number;
  fin: number;
  texto_seleccionado: string;
  tipo: TipoAnotacion;
  comentario: string;
};

type Props = {
  texto: string;
  anotaciones: Anotacion[];
  modoEdicion?: boolean;
  onCrear?: (
    inicio: number,
    fin: number,
    textoSel: string,
    tipo: TipoAnotacion,
    comentario: string,
  ) => Promise<void>;
  onEliminar?: (id: string) => Promise<void>;
};

const TIPOS: { tipo: TipoAnotacion; label: string; clases: string }[] = [
  {
    tipo: "subrayado",
    label: "Subrayado",
    clases: "bg-yellow-100 border-yellow-400 text-yellow-900",
  },
  {
    tipo: "sugerencia",
    label: "Sugerencia",
    clases: "bg-blue-100 border-blue-400 text-blue-900",
  },
  {
    tipo: "correccion",
    label: "Corrección",
    clases: "bg-red-100 border-red-400 text-red-900",
  },
];

const MARK_CLASES: Record<TipoAnotacion, string> = {
  subrayado: "bg-yellow-100 border-b-2 border-yellow-400 hover:bg-yellow-200",
  sugerencia: "bg-blue-100 border-b-2 border-blue-400 hover:bg-blue-200",
  correccion: "bg-red-100 border-b-2 border-red-400 hover:bg-red-200",
};

function getCharOffset(container: HTMLElement, node: Node, offset: number): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let chars = 0;
  while (walker.nextNode()) {
    const current = walker.currentNode;
    if (current === node) return chars + offset;
    chars += current.textContent?.length ?? 0;
  }
  return chars + offset;
}

type Segmento = { texto: string; anotacion: Anotacion | null };

function buildSegments(texto: string, anotaciones: Anotacion[]): Segmento[] {
  const sorted = [...anotaciones].sort((a, b) => a.inicio - b.inicio);
  const segments: Segmento[] = [];
  let pos = 0;

  for (const ann of sorted) {
    const inicio = Math.max(0, Math.min(ann.inicio, texto.length));
    const fin = Math.max(inicio, Math.min(ann.fin, texto.length));
    if (fin <= pos) continue;
    const efectivoInicio = Math.max(pos, inicio);
    if (efectivoInicio > pos) {
      segments.push({ texto: texto.slice(pos, efectivoInicio), anotacion: null });
    }
    if (efectivoInicio < fin) {
      segments.push({ texto: texto.slice(efectivoInicio, fin), anotacion: ann });
    }
    pos = fin;
  }

  if (pos < texto.length) {
    segments.push({ texto: texto.slice(pos), anotacion: null });
  }

  return segments;
}

export function TextoAnotado({
  texto,
  anotaciones,
  modoEdicion = false,
  onCrear,
  onEliminar,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pendiente, setPendiente] = useState<{
    inicio: number;
    fin: number;
    textoSel: string;
  } | null>(null);
  const [tipoSel, setTipoSel] = useState<TipoAnotacion>("subrayado");
  const [comentario, setComentario] = useState("");
  const [guardando, setGuardando] = useState(false);

  const handleMouseUp = useCallback(() => {
    if (!modoEdicion || !containerRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;

    const textoSel = sel.toString().trim();
    if (textoSel.length < 2) return;

    const range = sel.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) return;

    const inicio = getCharOffset(
      containerRef.current,
      range.startContainer,
      range.startOffset,
    );
    const fin = getCharOffset(containerRef.current, range.endContainer, range.endOffset);

    if (inicio < fin) {
      setPendiente({ inicio, fin, textoSel });
      setTipoSel("subrayado");
      setComentario("");
    }
  }, [modoEdicion]);

  const guardar = async () => {
    if (!pendiente || !onCrear) return;
    setGuardando(true);
    await onCrear(pendiente.inicio, pendiente.fin, pendiente.textoSel, tipoSel, comentario);
    setGuardando(false);
    setPendiente(null);
    window.getSelection()?.removeAllRanges();
  };

  const cancelar = () => {
    setPendiente(null);
    window.getSelection()?.removeAllRanges();
  };

  const segments = buildSegments(texto, anotaciones);

  return (
    <>
      <div
        ref={containerRef}
        className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed"
        onMouseUp={handleMouseUp}
      >
        {segments.map((seg, i) =>
          seg.anotacion ? (
            <Popover key={i}>
              <PopoverTrigger asChild>
                <mark
                  className={cn(
                    "rounded-[2px] px-[1px] cursor-pointer",
                    MARK_CLASES[seg.anotacion.tipo],
                  )}
                >
                  {seg.texto}
                </mark>
              </PopoverTrigger>
              <PopoverContent className="w-72" side="top">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <span
                      className={cn(
                        "inline-flex text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded mb-2 border",
                        TIPOS.find((t) => t.tipo === seg.anotacion!.tipo)?.clases,
                      )}
                    >
                      {TIPOS.find((t) => t.tipo === seg.anotacion!.tipo)?.label}
                    </span>
                    {seg.anotacion.comentario ? (
                      <p className="text-sm text-foreground/80 leading-snug">
                        {seg.anotacion.comentario}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Sin comentario</p>
                    )}
                  </div>
                  {modoEdicion && onEliminar && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => onEliminar(seg.anotacion!.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <span key={i}>{seg.texto}</span>
          ),
        )}
      </div>

      {modoEdicion && (
        <p className="text-[10px] text-muted-foreground mt-2 italic">
          Selecciona texto para añadir una anotación.
        </p>
      )}

      <Dialog
        open={!!pendiente}
        onOpenChange={(open) => {
          if (!open) cancelar();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Nueva anotación</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-muted rounded-md px-3 py-2">
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
                Texto seleccionado
              </p>
              <p className="text-sm font-serif italic text-ink line-clamp-3">
                &ldquo;{pendiente?.textoSel}&rdquo;
              </p>
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                Tipo
              </p>
              <div className="flex gap-2 flex-wrap">
                {TIPOS.map(({ tipo, label, clases }) => (
                  <button
                    key={tipo}
                    onClick={() => setTipoSel(tipo)}
                    className={cn(
                      "text-[11px] font-semibold px-3 py-1.5 rounded border-2 transition-all",
                      clases,
                      tipoSel === tipo
                        ? "ring-2 ring-offset-1 ring-current"
                        : "border-transparent opacity-60 hover:opacity-100",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                Comentario{tipoSel === "subrayado" ? " (opcional)" : ""}
              </p>
              <Textarea
                placeholder={
                  tipoSel === "subrayado"
                    ? "Observación sobre este fragmento…"
                    : tipoSel === "sugerencia"
                      ? "¿Cómo podrías reformular esto?"
                      : "¿Qué necesita corregirse aquí?"
                }
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                className="resize-none"
                rows={3}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cancelar}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar anotación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
