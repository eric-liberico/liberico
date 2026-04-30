import { createFileRoute } from "@tanstack/react-router";
import { JuegoEsperaEvaluacion } from "@/components/JuegoEsperaEvaluacion";

export const Route = createFileRoute("/juego-preview")({
  component: JuegoPreviewPage,
});

function JuegoPreviewPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col gap-10 items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground text-center">
          modo prueba1
        </p>
        <JuegoEsperaEvaluacion modo="prueba1" />
      </div>
      <div className="w-full max-w-2xl space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground text-center">
          modo prueba2
        </p>
        <JuegoEsperaEvaluacion modo="prueba2" />
      </div>
    </div>
  );
}
