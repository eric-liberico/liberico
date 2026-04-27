import { separarParrafosLectura } from "@/lib/textFormatting";
import { cn } from "@/lib/utils";

type Props = {
  texto: string;
  className?: string;
  paragraphClassName?: string;
};

export function TextoLectura({ texto, className, paragraphClassName }: Props) {
  const parrafos = separarParrafosLectura(texto);

  if (parrafos.length === 0) {
    return <p className={cn("text-sm text-muted-foreground italic", className)}>Sin contenido.</p>;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {parrafos.map((parrafo, index) => (
        <p key={index} className={cn("whitespace-pre-wrap", paragraphClassName)}>
          {parrafo}
        </p>
      ))}
    </div>
  );
}
