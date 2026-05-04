import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AnotacionPrueba2, SugerenciaReescrituraPrueba2 } from "@/lib/ib-paper2";
import { textoEnsayoFormateado } from "@/lib/textFormatting";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Criterio = AnotacionPrueba2["criterio"];
type TipoFiltro = Criterio | "reescritura";

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

const COLOR: Record<TipoFiltro, { mark: string; swatch: string; badge: string; label: string }> = {
  A: {
    mark: "bg-blue-100 text-blue-950 border-b-2 border-blue-500 rounded-sm px-0.5",
    swatch: "bg-blue-200 border-blue-500",
    badge: "bg-blue-100 text-blue-800",
    label: "Criterio A",
  },
  B1: {
    mark: "bg-purple-100 text-purple-950 border-b-2 border-purple-500 rounded-sm px-0.5",
    swatch: "bg-purple-200 border-purple-500",
    badge: "bg-purple-100 text-purple-800",
    label: "Criterio B1",
  },
  B2: {
    mark: "bg-indigo-100 text-indigo-950 border-b-2 border-indigo-500 rounded-sm px-0.5",
    swatch: "bg-indigo-200 border-indigo-500",
    badge: "bg-indigo-100 text-indigo-800",
    label: "Criterio B2",
  },
  C: {
    mark: "bg-amber-100 text-amber-950 border-b-2 border-amber-500 rounded-sm px-0.5",
    swatch: "bg-amber-200 border-amber-500",
    badge: "bg-amber-100 text-amber-800",
    label: "Criterio C",
  },
  D: {
    mark: "bg-rose-100 text-rose-950 border-b-2 border-rose-500 rounded-sm px-0.5",
    swatch: "bg-rose-200 border-rose-500",
    badge: "bg-rose-100 text-rose-800",
    label: "Criterio D",
  },
  reescritura: {
    mark: "bg-teal-100 text-teal-950 border-b-2 border-teal-600 rounded-sm px-0.5",
    swatch: "bg-teal-200 border-teal-600",
    badge: "bg-teal-100 text-teal-800",
    label: "Reescritura de banda alta",
  },
};

const FILTROS_LEYENDA: { tipo: TipoFiltro; nombre: string }[] = [
  { tipo: "A", nombre: "Conocimiento e interpretación" },
  { tipo: "B1", nombre: "Análisis formal" },
  { tipo: "B2", nombre: "Comparación" },
  { tipo: "C", nombre: "Organización" },
  { tipo: "D", nombre: "Lenguaje" },
  { tipo: "reescritura", nombre: "Reescritura de banda alta" },
];

const TODOS_FILTROS: TipoFiltro[] = ["A", "B1", "B2", "C", "D", "reescritura"];

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
        if (mostrarToast) toast.error("Guarda primero la evaluación para generar reescrituras.");
        return;
      }
      setGenerando(true);
      try {
        const { data, error } = await supabase.functions.invoke("generate-rewrite-suggestions-p2", {
          body: { evaluacion_id: evaluacionId },
        });
        if (error) throw new Error(error.message ?? "No se pudieron generar las reescrituras.");
        if (data?.error) throw new Error(data.error as string);
        if (!Array.isArray(data?.sugerencias_reescritura)) {
          throw new Error("La IA no devolvió sugerencias de reescritura válidas.");
        }
        const nuevas = data.sugerencias_reescritura as SugerenciaReescrituraPrueba2[];
        setSugerencias(nuevas);
        onSugerenciasChange?.(nuevas);
        if (mostrarToast) toast.success("Reescrituras de banda alta generadas.");
      } catch (err) {
        if (mostrarToast) {
          toast.error(
            err instanceof Error ? err.message : "No se pudieron generar las reescrituras.",
          );
        }
      } finally {
        setGenerando(false);
      }
    },
    [evaluacionId, onSugerenciasChange],
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
        tipo: "reescritura",
        criterio: s.criterio,
        etiqueta: textoNormalizado.slice(rango.inicio, rango.fin),
        problema: s.problema || "Este fragmento puede ganar precisión y profundidad.",
        sugerencia: s.explicacion_pedagogica,
        propuestaReescritura: propuesta,
        nivelIntervencion: s.nivel_intervencion,
        prioridad: 90 + Math.max(0, Math.min(5, s.prioridad || 0)),
      });
    }

    return result;
  }, [textoNormalizado, anotaciones, mostrarAnotaciones, sugerencias]);

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
    <Card className="p-5 bg-card border-border">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
        {mostrarAnotaciones ? "Tu ensayo anotado" : "Tu ensayo"}
      </div>

      {/* Filter panel */}
      {mostrarAnotaciones && todasLasAnotaciones.length > 0 && (
        <div className="mb-4 rounded-md border border-border bg-muted/30 p-3">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Filtrar anotaciones
            </div>
            {!todosActivos && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 justify-start px-2 text-xs text-muted-foreground"
                onClick={() => setFiltrosActivos(new Set<TipoFiltro>(TODOS_FILTROS))}
              >
                Mostrar todo
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px]">
            {FILTROS_LEYENDA.map(({ tipo, nombre }) => (
              <button
                key={tipo}
                type="button"
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-left transition-colors ${
                  filtrosActivos.has(tipo)
                    ? "border-border bg-background text-foreground"
                    : "border-transparent bg-transparent text-muted-foreground/60 opacity-60"
                }`}
                aria-pressed={filtrosActivos.has(tipo)}
                onClick={() => toggleFiltro(tipo)}
              >
                <span
                  className={`inline-block h-3 w-3 rounded-sm border-b-2 ${COLOR[tipo].swatch}`}
                />
                {tipo !== "reescritura" && <span className="font-medium">{tipo}</span>}
                {tipo !== "reescritura" ? ` — ${nombre}` : nombre}
              </button>
            ))}
          </div>
          {anotacionesVisibles.length === 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Activa al menos un tipo para ver marcas en el texto.
            </p>
          )}
        </div>
      )}

      {mostrarAnotaciones && todasLasAnotaciones.length === 0 && !generando && (
        <div className="mb-4 rounded-md border border-border bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
          No hay marcas localizables todavía.
        </div>
      )}

      {/* Annotated essay text */}
      <div className="space-y-4 text-sm leading-relaxed text-foreground/85 font-serif">
        {agruparEnParrafos(segmentos).map((parrafo, pi) => (
          <p key={pi}>
            {parrafo.map((seg, i) =>
              seg.tipo === "texto" ? (
                <span key={i}>{seg.contenido}</span>
              ) : (
                <span key={i} className="relative inline group">
                  <mark
                    tabIndex={0}
                    className={`${COLOR[seg.anotacion.tipo].mark} cursor-help outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1`}
                  >
                    {seg.contenido}
                  </mark>
                  <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 hidden w-96 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-md border border-border bg-card p-3 text-left font-sans text-xs leading-relaxed text-card-foreground shadow-lg group-hover:block group-focus-within:block">
                    <span
                      className={`mb-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${COLOR[seg.anotacion.tipo].badge}`}
                    >
                      {seg.anotacion.tipo === "reescritura" && seg.anotacion.criterio
                        ? `Criterio ${seg.anotacion.criterio} · Reescritura de banda alta`
                        : COLOR[seg.anotacion.tipo].label}
                    </span>
                    <span className="block text-foreground/80">{seg.anotacion.problema}</span>
                    {seg.anotacion.propuestaReescritura && (
                      <span className="mt-3 block space-y-2">
                        <span className="block rounded-md border border-border bg-muted/40 p-2 text-foreground/75">
                          <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Tu fragmento
                          </span>
                          <span className="mt-1 block font-serif text-[13px] leading-relaxed">
                            {seg.anotacion.etiqueta}
                          </span>
                        </span>
                        <span className="block rounded-md border border-teal-200 bg-teal-50 p-2 text-teal-950">
                          <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700">
                            Versión mejorada
                          </span>
                          <span className="mt-1 block font-serif text-[13px] leading-relaxed">
                            {seg.anotacion.propuestaReescritura}
                          </span>
                        </span>
                        {seg.anotacion.nivelIntervencion && (
                          <span className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                            Intervención {seg.anotacion.nivelIntervencion}
                          </span>
                        )}
                      </span>
                    )}
                    {seg.anotacion.sugerencia && (
                      <span className="mt-2 block text-primary/90">
                        <span className="font-semibold">
                          {seg.anotacion.propuestaReescritura ? "Por qué sube:" : "Sugerencia:"}
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
