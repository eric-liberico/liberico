import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { LANDING as L, landingFontSans as fontSans } from "@/lib/landing-theme";
import { focusLabel } from "./clase-helpers";
import {
  type CorrectionView,
  type PaperKind,
  fetchCorrectionView,
} from "./correction-content";

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;

type Tab = "texto" | "respuesta" | "evaluacion";

const readerCss = `
  .clase-reader-overlay{animation:claseReaderFade 0.2s ease both;}
  .clase-reader-panel{animation:claseReaderIn 0.28s cubic-bezier(0.22,1,0.36,1) both;}
  @keyframes claseReaderFade{from{opacity:0;}to{opacity:1;}}
  @keyframes claseReaderIn{from{transform:translateX(24px);opacity:0;}to{transform:none;opacity:1;}}
  @media (prefers-reduced-motion: reduce){
    .clase-reader-overlay,.clase-reader-panel{animation:none !important;}
  }
`;

function fmtFecha(iso: string, isEN: boolean) {
  return new Date(iso).toLocaleDateString(isEN ? "en-GB" : "es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function CorrectionReader({
  paper,
  id,
  isEN,
  onClose,
}: {
  paper: PaperKind;
  id: string;
  isEN: boolean;
  onClose: () => void;
}) {
  const [view, setView] = useState<CorrectionView | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("texto");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void fetchCorrectionView(paper, id, isEN).then((v) => {
      if (alive) {
        setView(v);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [paper, id, isEN]);

  // Esc para cerrar + bloquear scroll del fondo + foco inicial
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

  const tabs: { key: Tab; label: string }[] = [
    { key: "texto", label: isEN ? "Text" : "Texto" },
    { key: "respuesta", label: isEN ? "Student" : "Respuesta" },
    { key: "evaluacion", label: isEN ? "Evaluation" : "Evaluación" },
  ];

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
        className="clase-reader-panel flex h-dvh w-full max-w-2xl flex-col overflow-hidden outline-none"
        style={{ backgroundColor: L.bg }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div
          className="flex items-start justify-between gap-3 border-b px-5 py-4"
          style={{ borderColor: L.line, backgroundColor: L.surface }}
        >
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: L.primary }}>
              {focusLabel(paper, isEN)}
            </div>
            <h2 className="text-lg font-semibold" style={headingStyle}>
              {isEN ? "Correction" : "Corrección"}
              {view && (
                <span className="ml-2 text-sm font-normal" style={{ color: L.muted }}>
                  {fmtFecha(view.created_at, isEN)}
                </span>
              )}
            </h2>
            {view && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {view.criteria.map((c) => (
                  <span
                    key={c.label}
                    className="rounded-md border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums"
                    style={{ backgroundColor: L.bg2, borderColor: L.line, color: L.ink }}
                  >
                    {c.label} {c.value}/{c.max}
                  </span>
                ))}
                {view.notaIb != null && (
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums"
                    style={{ backgroundColor: L.primary + "12", color: L.primary }}
                  >
                    {isEN ? "Grade" : "Nota"} {view.notaIb}
                  </span>
                )}
              </div>
            )}
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

        {/* Tabs */}
        <div className="flex gap-1 border-b px-5" style={{ borderColor: L.line, backgroundColor: L.surface }}>
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className="-mb-px border-b-2 px-3 py-2.5 text-sm transition-colors"
                style={{
                  borderColor: active ? L.primary : "transparent",
                  color: active ? L.ink : L.muted,
                  fontWeight: active ? 600 : 400,
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Contenido */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" style={{ color: L.muted }} />
            </div>
          ) : !view ? (
            <p className="text-sm" style={{ color: L.muted }}>
              {isEN ? "Could not load this correction." : "No se pudo cargar esta corrección."}
            </p>
          ) : (
            <div className="mx-auto max-w-prose">
              {tab === "texto" && <ReadingBlocks blocks={view.textBlocks} emptyEN="No text." emptyES="Sin texto." isEN={isEN} />}
              {tab === "respuesta" && (
                <ReadingBlocks blocks={[view.answer]} emptyEN="No answer." emptyES="Sin respuesta." isEN={isEN} />
              )}
              {tab === "evaluacion" && <EvaluationTab view={view} isEN={isEN} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReadingBlocks({
  blocks,
  emptyES,
  emptyEN,
  isEN,
}: {
  blocks: { heading: string; body: string }[];
  emptyES: string;
  emptyEN: string;
  isEN: boolean;
}) {
  const real = blocks.filter((b) => b.body.trim());
  if (real.length === 0) {
    return (
      <p className="text-sm" style={{ color: L.muted }}>
        {isEN ? emptyEN : emptyES}
      </p>
    );
  }
  return (
    <div className="space-y-6">
      {real.map((b, i) => (
        <section key={i}>
          <h3
            className="mb-1.5 text-xs font-semibold uppercase tracking-wide"
            style={{ ...fontSans, color: L.muted }}
          >
            {b.heading}
          </h3>
          <p
            className="whitespace-pre-wrap text-[15px] leading-7"
            style={{ color: L.ink }}
          >
            {b.body}
          </p>
        </section>
      ))}
    </div>
  );
}

function EvaluationTab({ view, isEN }: { view: CorrectionView; isEN: boolean }) {
  const Field = ({ label, body }: { label: string; body: string | null }) =>
    body ? (
      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ ...fontSans, color: L.muted }}>
          {label}
        </h3>
        <p className="whitespace-pre-wrap text-[15px] leading-7" style={{ color: L.ink }}>
          {body}
        </p>
      </section>
    ) : null;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {view.criteria.map((c) => (
          <div key={c.label} className="rounded-xl border p-3" style={{ backgroundColor: L.surface, borderColor: L.line }}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: L.ink }}>
                {isEN ? "Criterion" : "Criterio"} {c.label}
              </span>
              <span className="text-sm font-semibold tabular-nums" style={{ color: L.primary }}>
                {c.value}/{c.max}
              </span>
            </div>
            {c.justification && (
              <p className="whitespace-pre-wrap text-sm leading-6" style={{ color: L.muted }}>
                {c.justification}
              </p>
            )}
          </div>
        ))}
      </div>
      <Field label={isEN ? "Strengths" : "Fortalezas"} body={view.fortalezas} />
      <Field label={isEN ? "Areas to improve" : "Áreas de mejora"} body={view.areas_mejora} />
      <Field label={isEN ? "Overall comment" : "Comentario global"} body={view.comentario_global} />
    </div>
  );
}
