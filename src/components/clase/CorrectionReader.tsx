import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { LANDING as L, landingFontSans as fontSans } from "@/lib/landing-theme";
import { focusLabel } from "./clase-helpers";
import { CorrectionPanel } from "./CorrectionPanel";
import type { SessionFocus } from "./types";

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;

const readerCss = `
  .clase-reader-overlay{animation:claseReaderFade 0.2s ease both;}
  .clase-reader-panel{animation:claseReaderIn 0.28s cubic-bezier(0.22,1,0.36,1) both;}
  @keyframes claseReaderFade{from{opacity:0;}to{opacity:1;}}
  @keyframes claseReaderIn{from{transform:translateX(24px);opacity:0;}to{transform:none;opacity:1;}}
  @media (prefers-reduced-motion: reduce){
    .clase-reader-overlay,.clase-reader-panel{animation:none !important;}
  }
`;

export function CorrectionReader({
  paper,
  id,
  isEN,
  onClose,
}: {
  paper: SessionFocus;
  id: string;
  isEN: boolean;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="clase-reader-overlay fixed inset-0 z-50 flex justify-end"
      style={{ backgroundColor: "rgba(15,23,42,0.45)" }}
      onClick={onClose}
    >
      <style>{readerCss}</style>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={isEN ? "Correction detail" : "Detalle de la corrección"}
        className="clase-reader-panel flex h-dvh w-full max-w-3xl flex-col overflow-hidden outline-none"
        style={{ backgroundColor: L.bg }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera mínima */}
        <div
          className="flex items-center justify-between gap-3 border-b px-5 py-3"
          style={{ borderColor: L.line, backgroundColor: L.surface }}
        >
          <div className="min-w-0">
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: L.primary }}
            >
              {isEN ? "Correction" : "Corrección"}
            </div>
            <h2 className="truncate text-base font-semibold" style={headingStyle}>
              {focusLabel(paper, isEN)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isEN ? "Close" : "Cerrar"}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
            style={{ borderColor: L.line, color: L.muted, backgroundColor: L.surface }}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        {/* Panel completo del alumno (texto + respuesta anotada + evaluación + banda 5) */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <CorrectionPanel paper={paper} id={id} />
        </div>
      </div>
    </div>
  );
}
