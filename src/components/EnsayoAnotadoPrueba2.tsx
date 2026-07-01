import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import type { AnotacionPrueba2, SugerenciaReescrituraPrueba2 } from "@/lib/ib-paper2";
import { textoEnsayoFormateado } from "@/lib/textFormatting";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LANDING as L,
  CRIT,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";

const cardStyle = {
  backgroundColor: L.surface,
  borderColor: L.line,
  boxShadow: cardShadow,
} as const;

const softCardStyle = {
  backgroundColor: L.bg2,
  borderColor: L.line,
} as const;

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;

type Criterio = AnotacionPrueba2["criterio"];
type TipoFiltro = Criterio;

type AnotacionInterna = {
  inicio: number;
  fin: number;
  tipo: TipoFiltro;
  criterio?: Criterio;
  etiqueta: string;
  problema: string;
  sugerencia: string;
  propuestaReescritura?: string;
  explicacionPedagogica?: string;
  nivelIntervencion?: string;
  esReescritura?: boolean;
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

function getColors(isEN: boolean): Record<TipoFiltro, { color: string; label: string }> {
  return {
    A: {
      color: CRIT.A,
      label: isEN ? "Criterion A" : "Criterio A",
    },
    B1: {
      color: CRIT.B,
      label: isEN ? "Criterion B1" : "Criterio B1",
    },
    B2: {
      color: L.primary,
      label: isEN ? "Criterion B2" : "Criterio B2",
    },
    C: {
      color: CRIT.C,
      label: isEN ? "Criterion C" : "Criterio C",
    },
    D: {
      color: CRIT.D,
      label: isEN ? "Criterion D" : "Criterio D",
    },
  };
}

function getFiltrosLeyenda(isEN: boolean): { tipo: TipoFiltro; nombre: string }[] {
  return [
    { tipo: "A", nombre: isEN ? "Knowledge & interpretation" : "Conocimiento e interpretación" },
    { tipo: "B1", nombre: isEN ? "Formal analysis" : "Análisis formal" },
    { tipo: "B2", nombre: isEN ? "Comparison" : "Comparación" },
    { tipo: "C", nombre: isEN ? "Organisation" : "Organización" },
    { tipo: "D", nombre: isEN ? "Language" : "Lenguaje" },
  ];
}

const TODOS_FILTROS: TipoFiltro[] = ["A", "B1", "B2", "C", "D"];

// ── Component ─────────────────────────────────────────────────────────────────

type EnsayoAnotadoPrueba2Props = {
  texto: string;
  anotaciones: AnotacionPrueba2[];
  evaluacionId?: string | null;
  sugerenciasIniciales?: SugerenciaReescrituraPrueba2[] | null;
  mostrarAnotaciones?: boolean;
  onSugerenciasChange?: (sugerencias: SugerenciaReescrituraPrueba2[]) => void;
};

export function EnsayoAnotadoPrueba2({
  texto,
  anotaciones,
  evaluacionId,
  sugerenciasIniciales,
  mostrarAnotaciones = true,
  onSugerenciasChange,
}: EnsayoAnotadoPrueba2Props) {
  const { courseKey } = useAuth();
  const isEN = useUiLang() === "en";
  const colors = useMemo(() => getColors(isEN), [isEN]);
  const filtrosLeyenda = useMemo(() => getFiltrosLeyenda(isEN), [isEN]);
  const [sugerencias, setSugerencias] = useState<SugerenciaReescrituraPrueba2[]>(
    sugerenciasIniciales ?? [],
  );
  const [generando, setGenerando] = useState(false);
  const [filtrosActivos, setFiltrosActivos] = useState<Set<TipoFiltro>>(
    () => new Set<TipoFiltro>(TODOS_FILTROS),
  );

  useEffect(() => {
    setSugerencias(sugerenciasIniciales ?? []);
  }, [evaluacionId, sugerenciasIniciales]);

  const generarReescrituras = useCallback(
    async (mostrarToast = true) => {
      if (!evaluacionId) {
        if (mostrarToast)
          toast.error(
            isEN
              ? "Save the assessment first to generate rewrites."
              : "Guarda primero la evaluación para generar reescrituras.",
          );
        return;
      }
      setGenerando(true);
      try {
        const { data, error } = await supabase.functions.invoke("lita-p2-rewrite", {
          body: { evaluacion_id: evaluacionId },
        });
        if (error)
          throw new Error(
            error.message ??
              (isEN ? "Could not generate rewrites." : "No se pudieron generar las reescrituras."),
          );
        if (data?.error) throw new Error(data.error as string);
        if (!Array.isArray(data?.sugerencias_reescritura)) {
          throw new Error(
            isEN
              ? "The AI did not return valid rewrite suggestions."
              : "La IA no devolvió sugerencias de reescritura válidas.",
          );
        }
        const nuevas = data.sugerencias_reescritura as SugerenciaReescrituraPrueba2[];
        setSugerencias(nuevas);
        onSugerenciasChange?.(nuevas);
        if (mostrarToast)
          toast.success(
            isEN ? "High-band rewrites generated." : "Reescrituras de banda alta generadas.",
          );
      } catch (err) {
        if (mostrarToast) {
          toast.error(
            err instanceof Error
              ? err.message
              : isEN
                ? "Could not generate rewrites."
                : "No se pudieron generar las reescrituras.",
          );
        }
      } finally {
        setGenerando(false);
      }
    },
    [evaluacionId, onSugerenciasChange, isEN],
  );

  const textoNormalizado = textoEnsayoFormateado(texto);

  const todasLasAnotaciones = useMemo((): AnotacionInterna[] => {
    if (!mostrarAnotaciones) return [];

    const result: AnotacionInterna[] = [];

    // Annotations from the evaluation tool (by criterion)
    for (const ann of anotaciones) {
      const rango = buscarRangoFragmento(textoNormalizado, ann.fragmento_original);
      if (!rango) continue;
      result.push({
        ...rango,
        tipo: ann.criterio,
        criterio: ann.criterio,
        etiqueta: textoNormalizado.slice(rango.inicio, rango.fin),
        problema: ann.problema,
        sugerencia: ann.sugerencia,
        prioridad: ann.prioridad,
      });
    }

    // Rewrite suggestions
    for (const s of sugerencias) {
      const fragmento = (s.fragmento_original ?? "").trim();
      const propuesta = (s.propuesta_reescritura ?? "").trim();
      if (!fragmento || !propuesta) continue;
      const rango = buscarRangoFragmento(textoNormalizado, fragmento);
      if (!rango) continue;
      result.push({
        ...rango,
        tipo: s.criterio,
        criterio: s.criterio,
        etiqueta: textoNormalizado.slice(rango.inicio, rango.fin),
        problema:
          s.problema ||
          (isEN
            ? "This fragment can gain precision and depth."
            : "Este fragmento puede ganar precisión y profundidad."),
        sugerencia: s.explicacion_pedagogica,
        propuestaReescritura: propuesta,
        nivelIntervencion: s.nivel_intervencion,
        esReescritura: true,
        prioridad: 90 + Math.max(0, Math.min(5, s.prioridad || 0)),
      });
    }

    return result;
  }, [textoNormalizado, anotaciones, mostrarAnotaciones, sugerencias, isEN]);

  const anotacionesFiltradas = useMemo(
    () => todasLasAnotaciones.filter((ann) => filtrosActivos.has(ann.tipo)),
    [todasLasAnotaciones, filtrosActivos],
  );

  const anotacionesVisibles = useMemo(
    () => filtrarAnotacionesVisibles(anotacionesFiltradas),
    [anotacionesFiltradas],
  );

  const segmentos = useMemo(
    () => segmentar(textoNormalizado, anotacionesVisibles),
    [textoNormalizado, anotacionesVisibles],
  );

  const todosActivos = filtrosActivos.size === TODOS_FILTROS.length;

  const toggleFiltro = (tipo: TipoFiltro) => {
    setFiltrosActivos((actual) => {
      const siguiente = new Set(actual);
      if (siguiente.has(tipo)) siguiente.delete(tipo);
      else siguiente.add(tipo);
      return siguiente;
    });
  };

  return (
    <Card
      className="lib-reveal relative rounded-2xl border p-6 has-[mark:hover]:z-30 has-[mark:focus]:z-30"
      style={cardStyle}
    >
      <div
        className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em]"
        style={{ ...fontMono, color: L.primary }}
      >
        {mostrarAnotaciones
          ? isEN
            ? "Your annotated essay"
            : "Tu ensayo anotado"
          : isEN
            ? "Your essay"
            : "Tu ensayo"}
      </div>
      <h3 className="mb-4 text-2xl font-semibold leading-tight" style={headingStyle}>
        {mostrarAnotaciones
          ? isEN
            ? "Comparative feedback in context"
            : "Feedback comparativo en contexto"
          : isEN
            ? "Original essay"
            : "Ensayo original"}
      </h3>

      {/* Filter panel */}
      {mostrarAnotaciones && todasLasAnotaciones.length > 0 && (
        <div className="mb-5 rounded-2xl border p-4" style={softCardStyle}>
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{ ...fontMono, color: L.muted }}
            >
              {isEN ? "Filter annotations" : "Filtrar anotaciones"}
            </div>
            {!todosActivos && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="lib-press h-8 justify-start rounded-xl px-3 text-xs font-semibold"
                style={{ color: L.primary }}
                onClick={() => setFiltrosActivos(new Set<TipoFiltro>(TODOS_FILTROS))}
              >
                {isEN ? "Show all" : "Mostrar todo"}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px]">
            {filtrosLeyenda.map(({ tipo, nombre }) => (
              <button
                key={tipo}
                type="button"
                className="lib-press flex min-h-8 items-center gap-1.5 rounded-xl border px-2.5 py-1 text-left transition-colors"
                style={{
                  borderColor: filtrosActivos.has(tipo) ? colors[tipo].color : L.line,
                  backgroundColor: filtrosActivos.has(tipo)
                    ? colors[tipo].color + "12"
                    : "transparent",
                  color: filtrosActivos.has(tipo) ? L.ink : L.muted,
                  opacity: filtrosActivos.has(tipo) ? 1 : 0.64,
                }}
                aria-pressed={filtrosActivos.has(tipo)}
                onClick={() => toggleFiltro(tipo)}
              >
                <span
                  className="inline-block h-3 w-3 rounded-sm border-b-2"
                  style={{
                    backgroundColor: colors[tipo].color + "24",
                    borderColor: colors[tipo].color,
                  }}
                />
                <span className="font-medium">{tipo}</span>
                {` — ${nombre}`}
              </button>
            ))}
          </div>
          {anotacionesVisibles.length === 0 && (
            <p className="mt-3 text-xs" style={{ color: L.muted }}>
              {isEN
                ? "Activate at least one type to see marks in the text."
                : "Activa al menos un tipo para ver marcas en el texto."}
            </p>
          )}
        </div>
      )}

      {mostrarAnotaciones && todasLasAnotaciones.length === 0 && !generando && (
        <div
          className="mb-5 rounded-2xl border p-4 text-xs leading-relaxed"
          style={{ backgroundColor: L.bg2, borderColor: L.line, color: L.muted }}
        >
          {isEN ? "No localisable marks yet." : "No hay marcas localizables todavía."}
        </div>
      )}

      {/* Annotated essay text */}
      <div className="space-y-4 text-sm leading-relaxed font-serif" style={{ color: L.ink }}>
        {agruparEnParrafos(segmentos).map((parrafo, pi) => (
          <p key={pi}>
            {parrafo.map((seg, i) =>
              seg.tipo === "texto" ? (
                <span key={i}>{seg.contenido}</span>
              ) : (
                <span key={i} className="relative inline group">
                  <mark
                    tabIndex={0}
                    className="cursor-help rounded-sm border-b-2 px-0.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                    style={{
                      backgroundColor: colors[seg.anotacion.tipo].color + "18",
                      borderBottomColor: colors[seg.anotacion.tipo].color,
                      color: L.ink,
                      outlineColor: L.primary,
                    }}
                  >
                    {seg.contenido}
                  </mark>
                  <span
                    className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 hidden w-96 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl border p-4 text-left font-sans text-xs leading-relaxed shadow-lg group-hover:block group-focus-within:block"
                    style={{ ...cardStyle, ...fontSans, color: L.ink }}
                  >
                    <span
                      className="mb-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
                      style={{
                        ...fontMono,
                        backgroundColor: colors[seg.anotacion.tipo].color + "14",
                        color: colors[seg.anotacion.tipo].color,
                      }}
                    >
                      {seg.anotacion.esReescritura && seg.anotacion.criterio
                        ? isEN
                          ? `Criterion ${seg.anotacion.criterio} · High-band rewrite`
                          : `Criterio ${seg.anotacion.criterio} · Reescritura de banda alta`
                        : colors[seg.anotacion.tipo].label}
                    </span>
                    <span className="block" style={{ color: L.ink }}>
                      {seg.anotacion.problema}
                    </span>
                    {seg.anotacion.propuestaReescritura && (
                      <span className="mt-3 block space-y-2">
                        <span className="block rounded-xl border p-3" style={softCardStyle}>
                          <span
                            className="block text-[10px] font-semibold uppercase tracking-[0.14em]"
                            style={{ ...fontMono, color: L.muted }}
                          >
                            {isEN ? "Your fragment" : "Tu fragmento"}
                          </span>
                          <span className="mt-1 block font-serif text-[13px] leading-relaxed">
                            {seg.anotacion.etiqueta}
                          </span>
                        </span>
                        <span
                          className="block rounded-xl border p-3"
                          style={{
                            backgroundColor: L.ok + "0f",
                            borderColor: L.ok + "33",
                            color: L.ink,
                          }}
                        >
                          <span
                            className="block text-[10px] font-semibold uppercase tracking-[0.14em]"
                            style={{ ...fontMono, color: L.ok }}
                          >
                            {isEN ? "Improved version" : "Versión mejorada"}
                          </span>
                          <span className="mt-1 block font-serif text-[13px] leading-relaxed">
                            {seg.anotacion.propuestaReescritura}
                          </span>
                        </span>
                        {seg.anotacion.nivelIntervencion && (
                          <span
                            className="block text-[10px] uppercase tracking-[0.12em]"
                            style={{ ...fontMono, color: L.muted }}
                          >
                            {isEN
                              ? `Intervention ${seg.anotacion.nivelIntervencion}`
                              : `Intervención ${seg.anotacion.nivelIntervencion}`}
                          </span>
                        )}
                      </span>
                    )}
                    {seg.anotacion.sugerencia && (
                      <span className="mt-2 block" style={{ color: L.primary }}>
                        <span className="font-semibold">
                          {seg.anotacion.propuestaReescritura
                            ? isEN
                              ? "Why it rises:"
                              : "Por qué sube:"
                            : isEN
                              ? "Suggestion:"
                              : "Sugerencia:"}
                        </span>{" "}
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
