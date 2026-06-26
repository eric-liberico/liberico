import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AnotacionOral } from "@/lib/ib-oral";
import { textoEnsayoFormateado } from "@/lib/textFormatting";
import { LANDING as L, cardShadow, landingFontMono as fontMono } from "@/lib/landing-theme";

const cardStyle = {
  backgroundColor: L.surface,
  borderColor: L.line,
  boxShadow: cardShadow,
  color: L.ink,
} as const;

type CriterioOral = AnotacionOral["criterio"];

type AnotacionInterna = {
  inicio: number;
  fin: number;
  criterio: CriterioOral;
  etiqueta: string;
  problema: string;
  sugerencia: string;
  prioridad: number;
};

type Segmento =
  | { tipo: "texto"; contenido: string }
  | { tipo: "anotacion"; contenido: string; anotacion: AnotacionInterna };

// ── Fuzzy matching ────────────────────────────────────────────────────────────

function limpiarFragmento(value: string): string {
  return value.replace(/^["""«»]+|["""«»]+$/g, "").trim();
}

function normalizarToken(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function tokenizarConRangos(value: string): { token: string; inicio: number; fin: number }[] {
  return Array.from(value.matchAll(/[A-Za-zÀ-ÖØ-öø-ÿ0-9]+/g)).map((match) => ({
    token: normalizarToken(match[0]),
    inicio: match.index ?? 0,
    fin: (match.index ?? 0) + match[0].length,
  }));
}

function buscarRangoPorTokens(
  texto: string,
  fragmentoOriginal: string,
): { inicio: number; fin: number } | null {
  const tokensTexto = tokenizarConRangos(texto);
  const tokensFragmento = tokenizarConRangos(fragmentoOriginal).map((item) => item.token);
  if (tokensFragmento.length < 4 || tokensTexto.length < tokensFragmento.length) return null;

  let mejor: { inicio: number; fin: number; score: number } | null = null;

  const minWindow = Math.max(4, tokensFragmento.length - 3);
  const maxWindow = Math.min(tokensTexto.length, tokensFragmento.length + 4);
  const fragmentoSet = new Set(tokensFragmento);

  for (let inicio = 0; inicio < tokensTexto.length; inicio += 1) {
    for (
      let largo = minWindow;
      largo <= maxWindow && inicio + largo <= tokensTexto.length;
      largo += 1
    ) {
      const ventana = tokensTexto.slice(inicio, inicio + largo);
      const coincidencias = ventana.filter((item) => fragmentoSet.has(item.token)).length;
      const scoreCobertura = coincidencias / tokensFragmento.length;

      let secuencia = 0;
      let cursor = 0;
      for (const item of ventana) {
        if (item.token === tokensFragmento[cursor]) {
          secuencia += 1;
          cursor += 1;
        }
      }
      const scoreSecuencia = secuencia / tokensFragmento.length;
      const score = Math.max(scoreCobertura, scoreSecuencia);

      if (!mejor || score > mejor.score) {
        mejor = {
          inicio: ventana[0].inicio,
          fin: ventana[ventana.length - 1].fin,
          score,
        };
      }
    }
  }

  if (!mejor || mejor.score < 0.68) return null;
  return { inicio: mejor.inicio, fin: mejor.fin };
}

function buscarRangoFragmento(
  texto: string,
  fragmentoOriginal: string,
): { inicio: number; fin: number } | null {
  const fragmento = limpiarFragmento(fragmentoOriginal);
  if (!fragmento) return null;

  const exacto = texto.toLowerCase().indexOf(fragmento.toLowerCase());
  if (exacto !== -1) return { inicio: exacto, fin: exacto + fragmento.length };

  const pattern = fragmento.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const match = texto.match(new RegExp(pattern, "i"));
  if (!match || match.index === undefined) return buscarRangoPorTokens(texto, fragmento);

  return { inicio: match.index, fin: match.index + match[0].length };
}

function filtrarAnotacionesVisibles(anotaciones: AnotacionInterna[]): AnotacionInterna[] {
  const filtradas: AnotacionInterna[] = [];
  const porPrioridad = [...anotaciones].sort(
    (a, b) =>
      b.prioridad - a.prioridad || b.fin - b.inicio - (a.fin - a.inicio) || a.inicio - b.inicio,
  );
  for (const ann of porPrioridad) {
    const solapa = filtradas.some((actual) => ann.inicio < actual.fin && ann.fin > actual.inicio);
    if (!solapa) filtradas.push(ann);
  }
  return filtradas.sort((a, b) => a.inicio - b.inicio);
}

function segmentar(texto: string, anotaciones: AnotacionInterna[]): Segmento[] {
  const segmentos: Segmento[] = [];
  let cursor = 0;
  for (const ann of anotaciones) {
    if (ann.inicio > cursor) {
      segmentos.push({ tipo: "texto", contenido: texto.slice(cursor, ann.inicio) });
    }
    segmentos.push({
      tipo: "anotacion",
      contenido: texto.slice(ann.inicio, ann.fin),
      anotacion: ann,
    });
    cursor = ann.fin;
  }
  if (cursor < texto.length) {
    segmentos.push({ tipo: "texto", contenido: texto.slice(cursor) });
  }
  return segmentos;
}

function agruparEnParrafos(segmentos: Segmento[]): Segmento[][] {
  const parrafos: Segmento[][] = [[]];
  for (const seg of segmentos) {
    if (seg.tipo === "texto") {
      const partes = seg.contenido.split(/\n+/);
      partes.forEach((parte, i) => {
        if (i > 0) parrafos.push([]);
        if (parte.trim()) parrafos[parrafos.length - 1].push({ tipo: "texto", contenido: parte });
      });
    } else {
      parrafos[parrafos.length - 1].push(seg);
    }
  }
  return parrafos.filter((p) => p.length > 0);
}

// ── Color map ─────────────────────────────────────────────────────────────────

const COLOR: Record<CriterioOral, { mark: string; swatch: string; badge: string; label: string }> =
  {
    A: {
      mark: "bg-blue-100 text-blue-950 border-b-2 border-blue-500 rounded-sm px-0.5",
      swatch: "bg-blue-200 border-blue-500",
      badge: "bg-blue-100 text-blue-800",
      label: "Criterio A · Conocimiento e interpretación",
    },
    B: {
      mark: "bg-green-100 text-green-950 border-b-2 border-green-600 rounded-sm px-0.5",
      swatch: "bg-green-200 border-green-600",
      badge: "bg-green-100 text-green-800",
      label: "Criterio B · Análisis y evaluación",
    },
    C: {
      mark: "bg-yellow-100 text-yellow-950 border-b-2 border-yellow-500 rounded-sm px-0.5",
      swatch: "bg-yellow-200 border-yellow-500",
      badge: "bg-yellow-100 text-yellow-800",
      label: "Criterio C · Foco y organización",
    },
    D: {
      mark: "bg-red-100 text-red-950 border-b-2 border-red-600 rounded-sm px-0.5",
      swatch: "bg-red-200 border-red-600",
      badge: "bg-red-100 text-red-800",
      label: "Criterio D · Lenguaje",
    },
  };

const CRITERIOS_LEYENDA: CriterioOral[] = ["A", "B", "C", "D"];

// ── Component ─────────────────────────────────────────────────────────────────

export function GuionAnotadoOral({
  guion,
  anotaciones,
}: {
  guion: string;
  anotaciones?: AnotacionOral[] | null;
}) {
  const anotacionesActivas = useMemo(() => anotaciones ?? [], [anotaciones]);
  const [filtrosActivos, setFiltrosActivos] = useState<Set<CriterioOral>>(
    () => new Set<CriterioOral>(CRITERIOS_LEYENDA),
  );

  const textoNormalizado = textoEnsayoFormateado(guion);
  const tieneAnotaciones = anotacionesActivas.length > 0;

  const anotacionesInternas = useMemo((): AnotacionInterna[] => {
    if (!tieneAnotaciones) return [];
    const result: AnotacionInterna[] = [];
    for (const ann of anotacionesActivas) {
      if (!filtrosActivos.has(ann.criterio)) continue;
      const rango = buscarRangoFragmento(textoNormalizado, ann.fragmento_original);
      if (!rango) continue;
      result.push({
        ...rango,
        criterio: ann.criterio,
        etiqueta: textoNormalizado.slice(rango.inicio, rango.fin),
        problema: ann.problema,
        sugerencia: ann.sugerencia,
        prioridad: ann.prioridad,
      });
    }
    return result;
  }, [textoNormalizado, anotacionesActivas, filtrosActivos, tieneAnotaciones]);

  const anotacionesVisibles = useMemo(
    () => filtrarAnotacionesVisibles(anotacionesInternas),
    [anotacionesInternas],
  );

  const segmentos = useMemo(
    () => segmentar(textoNormalizado, anotacionesVisibles),
    [textoNormalizado, anotacionesVisibles],
  );

  const todosActivos = filtrosActivos.size === CRITERIOS_LEYENDA.length;

  return (
    <Card
      className="lib-reveal relative rounded-2xl border p-5 has-[mark:hover]:z-30 has-[mark:focus]:z-30"
      style={cardStyle}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div
          className="text-[10px] uppercase tracking-[0.2em]"
          style={{ ...fontMono, color: L.muted }}
        >
          {tieneAnotaciones ? "Tu guion anotado" : "Tu guion"}
        </div>
      </div>

      {/* Panel de filtros */}
      {tieneAnotaciones && (
        <div
          className="mb-4 rounded-xl border p-3"
          style={{ backgroundColor: L.bg2, borderColor: L.line }}
        >
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="text-[10px] uppercase tracking-[0.18em]"
              style={{ ...fontMono, color: L.muted }}
            >
              Filtrar por criterio
            </div>
            {!todosActivos && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 justify-start px-2 text-xs text-muted-foreground"
                onClick={() => setFiltrosActivos(new Set<CriterioOral>(CRITERIOS_LEYENDA))}
              >
                Mostrar todo
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px]">
            {CRITERIOS_LEYENDA.map((criterio) => (
              <button
                key={criterio}
                type="button"
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1 transition-colors ${
                  filtrosActivos.has(criterio)
                    ? "border-border bg-background text-foreground"
                    : "border-transparent bg-transparent text-muted-foreground/60 opacity-60"
                }`}
                aria-pressed={filtrosActivos.has(criterio)}
                onClick={() =>
                  setFiltrosActivos((prev) => {
                    const next = new Set(prev);
                    if (next.has(criterio)) next.delete(criterio);
                    else next.add(criterio);
                    return next;
                  })
                }
              >
                <span
                  className={`inline-block h-3 w-3 rounded-sm border-b-2 ${COLOR[criterio].swatch}`}
                />
                <span className="font-medium">{criterio}</span>
                {" — "}
                {COLOR[criterio].label.split("· ")[1]}
              </button>
            ))}
          </div>
          {anotacionesVisibles.length === 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Activa al menos un criterio para ver marcas en el texto.
            </p>
          )}
        </div>
      )}

      {/* Texto del guion */}
      <div className="space-y-4 font-serif text-sm leading-relaxed" style={{ color: L.ink }}>
        {agruparEnParrafos(segmentos).map((parrafo, pi) => (
          <p key={pi}>
            {parrafo.map((seg, i) =>
              seg.tipo === "texto" ? (
                <span key={i}>{seg.contenido}</span>
              ) : (
                <span key={i} className="relative inline group">
                  <mark
                    tabIndex={0}
                    className={`${COLOR[seg.anotacion.criterio].mark} cursor-help outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1`}
                  >
                    {seg.contenido}
                  </mark>
                  <span
                    className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 hidden w-96 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border p-3 text-left font-sans text-xs leading-relaxed shadow-lg group-hover:block group-focus-within:block"
                    style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
                  >
                    <span
                      className={`mb-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${COLOR[seg.anotacion.criterio].badge}`}
                    >
                      {COLOR[seg.anotacion.criterio].label}
                    </span>
                    <span className="block" style={{ color: L.muted }}>
                      {seg.anotacion.problema}
                    </span>
                    {seg.anotacion.sugerencia && (
                      <span className="mt-2 block" style={{ color: L.primary }}>
                        <span className="font-semibold">Sugerencia:</span>{" "}
                        {seg.anotacion.sugerencia}
                      </span>
                    )}
                  </span>
                </span>
              ),
            )}
          </p>
        ))}
      </div>
    </Card>
  );
}
