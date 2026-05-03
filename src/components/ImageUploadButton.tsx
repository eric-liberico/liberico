import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  onTranscripcion: (texto: string) => void;
  label?: string;
};

const MIME_ACEPTADOS =
  "image/jpeg,image/png,image/webp,image/gif,application/pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.pdf";

export function ImageUploadButton({
  onTranscripcion,
  label = "Subir foto de texto manuscrito",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [transcribiendo, setTranscribiendo] = useState(false);
  const [textoRevisable, setTextoRevisable] = useState<string | null>(null);
  const [dialogAbierto, setDialogAbierto] = useState(false);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Extraer solo la parte base64 (eliminar "data:image/...;base64,")
        const base64 = result.split(",")[1];
        if (!base64) reject(new Error("No se pudo convertir la imagen."));
        else resolve(base64);
      };
      reader.onerror = () => reject(new Error("Error al leer el archivo."));
      reader.readAsDataURL(file);
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Resetear el input para permitir resubir el mismo archivo
    e.target.value = "";

    const MAX_BYTES = 8 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      toast.error(
        "El archivo supera el límite de 8 MB. Reduce la resolución o el tamaño antes de subir.",
      );
      return;
    }

    setTranscribiendo(true);
    try {
      const base64 = await fileToBase64(file);
      const mimeType = file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg");

      const { data, error } = await supabase.functions.invoke("transcribe-image", {
        body: { imagen_base64: base64, mime_type: mimeType },
      });

      if (error) {
        throw new Error(error.message ?? "No se pudo transcribir la imagen.");
      }
      if (data?.error) throw new Error(data.error);
      if (typeof data?.texto !== "string" || !data.texto.trim()) {
        throw new Error("No se detectó texto en la imagen.");
      }

      setTextoRevisable(data.texto.trim());
      setDialogAbierto(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo transcribir la imagen.");
    } finally {
      setTranscribiendo(false);
    }
  };

  const confirmarTexto = () => {
    if (textoRevisable !== null) {
      onTranscripcion(textoRevisable);
      setDialogAbierto(false);
      setTextoRevisable(null);
    }
  };

  const cancelar = () => {
    setDialogAbierto(false);
    setTextoRevisable(null);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={MIME_ACEPTADOS}
        className="hidden"
        onChange={handleFileChange}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={transcribiendo}
        onClick={() => inputRef.current?.click()}
        title={label}
      >
        {transcribiendo ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Transcribiendo…
          </>
        ) : (
          <>
            <Camera className="h-3.5 w-3.5" />
            {label}
          </>
        )}
      </Button>

      <Dialog
        open={dialogAbierto}
        onOpenChange={(open) => {
          if (!open) cancelar();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Revisa el texto transcrito</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Corrige cualquier error antes de insertar el texto en el campo.
          </p>
          <Textarea
            value={textoRevisable ?? ""}
            onChange={(e) => setTextoRevisable(e.target.value)}
            rows={10}
            className="resize-y font-mono text-sm"
          />
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={cancelar}>
              Cancelar
            </Button>
            <Button type="button" onClick={confirmarTexto} disabled={!textoRevisable?.trim()}>
              Usar este texto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
