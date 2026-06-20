import { createFileRoute } from "@tanstack/react-router";
import { JuegoEsperaEvaluacion } from "@/components/JuegoEsperaEvaluacion";
import {
  LANDING_FONT_LINK,
  LANDING as L,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";

const scopedCss = `
  #juego-preview-root{--primary:${L.primary};--ring:${L.primary};}
  #juego-preview-root button:not([disabled]){cursor:pointer;}
  #juego-preview-root button:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:10px;}
`;

export const Route = createFileRoute("/juego-preview")({
  head: () => ({
    links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }],
  }),
  component: JuegoPreviewPage,
});

function JuegoPreviewPage() {
  return (
    <div
      id="juego-preview-root"
      className="flex min-h-screen flex-col items-center justify-center gap-10 p-8"
      style={{ ...fontSans, backgroundColor: L.bg, color: L.ink }}
    >
      <style>{scopedCss}</style>
      <div className="w-full max-w-2xl space-y-2">
        <p
          className="text-center text-xs uppercase tracking-widest"
          style={{ ...fontMono, color: L.muted }}
        >
          modo prueba1
        </p>
        <JuegoEsperaEvaluacion modo="prueba1" />
      </div>
      <div className="w-full max-w-2xl space-y-2">
        <p
          className="text-center text-xs uppercase tracking-widest"
          style={{ ...fontMono, color: L.muted }}
        >
          modo prueba2
        </p>
        <JuegoEsperaEvaluacion modo="prueba2" />
      </div>
    </div>
  );
}
