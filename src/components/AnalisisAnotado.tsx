import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Evaluacion, SugerenciaReescritura } from "@/lib/ib";
import { textoEnsayoFormateado } from "@/lib/textFormatting";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getFunctionErrorMessage } from "@/lib/functionErrors";

type Anotacion = {
  inicio: number;
  fin: number;
  tipo:
    | "estructura_lograda"
    | "estructura_mejora"
    | "estructura_alerta"
    | "interferencia"
    | "verbo_debil"
    | "reescritura";
  titulo: string;
  explicacion: string;
  sugerencia?: string;
  propuestaReescritura?: string;
  criterio?: string;
  nivelIntervencion?: string;
  etiqueta: string;
  prioridad: number;
};

type Segmento =
  | { tipo: "texto"; contenido: string }
  | { tipo: "anotacion"; contenido: string; anotacion: Anotacion };

function limpiarFragmento(value: string): string {
  return value.replace(/^[“”"«»]+|[“”"«»]+$/g, "").trim();
}

function normalizarToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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

  let mejor: {
    inicio: number;
    fin: number;
    score: number;
  } | null = null;

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

function rangoLimpio(texto: string, inicio: number, fin: number): { inicio: number; fin: number } {
  let limpioInicio = Math.max(0, inicio);
  let limpioFin = Math.min(texto.length, fin);
  while (limpioInicio < limpioFin && /\s/.test(texto[limpioInicio])) limpioInicio += 1;
  while (limpioFin > limpioInicio && /\s/.test(texto[limpioFin - 1])) limpioFin -= 1;
  return { inicio: limpioInicio, fin: limpioFin };
}

function rangoContexto(
  texto: string,
  inicio: number,
  fin: number,
): { inicio: number; fin: number } {
  const tokens = tokenizarConRangos(texto);
  const tokenIndex = tokens.findIndex((token) => token.inicio <= inicio && token.fin >= fin);
  if (tokenIndex === -1) return rangoLimpio(texto, inicio, fin);

  const desde = Math.max(0, tokenIndex - 5);
  const hasta = Math.min(tokens.length - 1, tokenIndex + 9);
  return rangoLimpio(texto, tokens[desde].inicio, tokens[hasta].fin);
}

function rangoInicioEnsayo(texto: string): { inicio: number; fin: number } | null {
  const match = texto.match(/\S[\s\S]*?(?=\n{2,}|$)/);
  if (!match || match.index === undefined) return null;
  const inicio = match.index;
  const finFrase = texto.slice(inicio, inicio + 260).search(/[.!?;:…]\s/);
  const fin = finFrase === -1 ? Math.min(texto.length, inicio + 180) : inicio + finFrase + 1;
  return rangoLimpio(texto, inicio, fin);
}

function pushAnotacionDirecta(
  texto: string,
  anotaciones: Anotacion[],
  rango: { inicio: number; fin: number },
  tipo: Anotacion["tipo"],
  titulo: string,
  explicacion: string,
  sugerencia: string | undefined,
  prioridad: number,
) {
  if (rango.fin <= rango.inicio) return;
  anotaciones.push({
    ...rango,
    tipo,
    titulo,
    explicacion,
    sugerencia,
    etiqueta: texto.slice(rango.inicio, rango.fin),
    prioridad,
  });
}

function addFallbackEstructura(texto: string, ev: Evaluacion, anotaciones: Anotacion[]) {
  const yaHayProblema = anotaciones.some(
    (ann) => ann.tipo === "estructura_mejora" || ann.tipo === "estructura_alerta",
  );
  if (yaHayProblema || ev.banda_c >= 5) return;

  const elementos = [
    ...(ev.introduccion?.elementos ?? []),
    ...(ev.parrafos?.flatMap((parrafo) => parrafo.elementos) ?? []),
    ...(ev.conclusion?.elementos ?? []),
  ];
  const problema = elementos.find(
    (el) =>
      el.estado !== "presente" || (el.tipo === "nueva_informacion" && el.estado === "presente"),
  );
  const rango = rangoInicioEnsayo(texto);
  if (!rango) return;

  pushAnotacionDirecta(
    texto,
    anotaciones,
    rango,
    ev.banda_c <= 2 ? "estructura_alerta" : "estructura_mejora",
    "Estructura: foco del ensayo",
    problema?.evaluacion || ev.justificacion_c || "La organización necesita un foco más explícito.",
    problema?.sugerencia ||
      "Haz visible la tesis desde el inicio y conecta cada párrafo con esa idea central.",
    66,
  );
}

const VERBOS_DEBILES = [
  {
    regex: /\bhay\b/gi,
    etiqueta: "hay",
    alternativa: "Sustituye por un verbo analítico: plantea, establece, revela o sugiere.",
  },
  {
    regex: /\b(tiene|tienen)\b/gi,
    etiqueta: "tiene",
    alternativa: "Precisa la función: articula, construye, refuerza o intensifica.",
  },
  {
    regex: /\b(hace|hacen)\b/gi,
    etiqueta: "hace",
    alternativa: "Explica el efecto con un verbo específico: provoca, desplaza o enfatiza.",
  },
  {
    regex: /\b(muestra|muestran)\b/gi,
    etiqueta: "muestra",
    alternativa: "Puedes usar revela, subraya, evidencia o problematiza.",
  },
  {
    regex: /\b(dice|dicen)\b/gi,
    etiqueta: "dice",
    alternativa: "En análisis literario suele ser más preciso sugiere, enuncia o revela.",
  },
  {
    regex: /\b(es|son)\b/gi,
    etiqueta: "es",
    alternativa: "Evita depender de 'es': formula la relación con configura, condensa o proyecta.",
  },
  {
    regex: /\b(usa|usan|utiliza|utilizan)\b/gi,
    etiqueta: "usa",
    alternativa: "Nombra la función del recurso: construye, intensifica, contrasta o articula.",
  },
];

function addFallbackVerbosDebiles(texto: string, ev: Evaluacion, anotaciones: Anotacion[]) {
  if (anotaciones.some((ann) => ann.tipo === "verbo_debil")) return;

  let total = 0;
  for (const verbo of VERBOS_DEBILES) {
    const matches = Array.from(texto.matchAll(verbo.regex));
    if (matches.length < 2 && ev.banda_d > 3) continue;

    const ejemplos = matches.slice(0, matches.length >= 2 ? 2 : 1);
    for (const match of ejemplos) {
      if (total >= 4 || match.index === undefined) return;
      const rango = rangoContexto(texto, match.index, match.index + match[0].length);
      pushAnotacionDirecta(
        texto,
        anotaciones,
        rango,
        "verbo_debil",
        "Verbo poco analítico",
        `"${verbo.etiqueta}" reduce la precisión del análisis si se repite como verbo comodín.`,
        verbo.alternativa,
        52,
      );
      total += 1;
    }
  }
}

const INTERFERENCIAS_COMUNES = [
  {
    regex: /\ben adici[oó]n\b/gi,
    explicacion: "Calco de 'in addition'. En español académico suena más natural 'además'.",
    correccion: "Cámbialo por 'además' o 'asimismo'.",
  },
  {
    regex: /\bhace sentido\b/gi,
    explicacion: "Calco de 'makes sense'. En español académico se prefiere 'tiene sentido'.",
    correccion: "Usa 'tiene sentido' o formula la relación de forma más precisa.",
  },
  {
    regex: /\bcomo que\b/gi,
    explicacion: "Conector coloquial influido por estructuras del inglés; debilita el registro.",
    correccion: "Sustitúyelo por 'ya que', 'puesto que' o una subordinada más precisa.",
  },
  {
    regex: /\bsiendo\s+\w+/gi,
    explicacion: "Uso rígido del gerundio, frecuente por interferencia del inglés.",
    correccion: "Reformula con una oración principal o un adjetivo más directo.",
  },
];

function addFallbackInterferencias(texto: string, anotaciones: Anotacion[]) {
  if (anotaciones.some((ann) => ann.tipo === "interferencia")) return;

  let total = 0;
  for (const patron of INTERFERENCIAS_COMUNES) {
    const matches = Array.from(texto.matchAll(patron.regex));
    for (const match of matches) {
      if (total >= 3 || match.index === undefined) return;
      const rango = rangoContexto(texto, match.index, match.index + match[0].length);
      pushAnotacionDirecta(
        texto,
        anotaciones,
        rango,
        "interferencia",
        "Interferencia del inglés",
        patron.explicacion,
        patron.correccion,
        82,
      );
      total += 1;
    }
  }
}

function construirAnotaciones(texto: string, ev: Evaluacion): Anotacion[] {
  const anotaciones: Anotacion[] = [];

  const addAnotacion = (
    fragmento: string,
    tipo: Anotacion["tipo"],
    titulo: string,
    explicacion: string,
    sugerencia: string | undefined,
    prioridad: number,
  ) => {
    const rango = buscarRangoFragmento(texto, fragmento);
    if (!rango) return;
    anotaciones.push({
      ...rango,
      tipo,
      titulo,
      explicacion,
      sugerencia,
      etiqueta: texto.slice(rango.inicio, rango.fin),
      prioridad,
    });
  };

  const addElementoEstructural = (
    seccion: string,
    el: NonNullable<Evaluacion["introduccion"]>["elementos"][number],
  ) => {
    if (!el.fragmento) return;
    const defectoInvertido = el.tipo === "nueva_informacion" && el.estado === "presente";
    const tipo =
      defectoInvertido || el.estado === "ausente"
        ? "estructura_alerta"
        : el.estado === "parcial"
          ? "estructura_mejora"
          : "estructura_lograda";
    const titulo =
      tipo === "estructura_lograda"
        ? `${seccion}: elemento logrado`
        : tipo === "estructura_mejora"
          ? `${seccion}: necesita desarrollo`
          : `${seccion}: problema estructural`;

    addAnotacion(
      el.fragmento,
      tipo,
      titulo,
      el.evaluacion,
      el.sugerencia,
      tipo === "estructura_alerta" ? 70 : tipo === "estructura_mejora" ? 60 : 20,
    );
  };

  ev.introduccion?.elementos?.forEach((el) => addElementoEstructural("Introducción", el));
  ev.parrafos?.forEach((parrafo) => {
    parrafo.elementos?.forEach((el) => addElementoEstructural(`Párrafo ${parrafo.numero}`, el));
    if (parrafo.extracto_inicio && parrafo.sugerencia_global) {
      addAnotacion(
        parrafo.extracto_inicio,
        "estructura_mejora",
        `Párrafo ${parrafo.numero}: mejora global`,
        parrafo.sugerencia_global,
        undefined,
        55,
      );
    }
  });
  ev.conclusion?.elementos?.forEach((el) => addElementoEstructural("Conclusión", el));

  (ev.lenguaje_analitico?.interferencias_ingles ?? []).forEach((int) => {
    addAnotacion(
      int.fragmento_original ?? "",
      "interferencia",
      "Interferencia del inglés",
      int.explicacion ?? "",
      int.correccion ?? "",
      80,
    );
  });

  (ev.lenguaje_analitico?.verbos_debiles ?? []).forEach((v) => {
    const ejemplo = (v.ejemplo_original ?? "").trim();
    if (!ejemplo) return;
    let buscar = ejemplo;
    // Si el ejemplo tiene comillas, buscar sólo el fragmento entre ellas
    const match = ejemplo.match(/[“”"«»](.+?)[“”"«»]/);
    if (match) buscar = match[1];
    addAnotacion(
      buscar,
      "verbo_debil",
      "Verbo débil",
      `Verbo débil usado ${v.frecuencia}×`,
      v.alternativa_mejorada,
      50,
    );
  });

  (ev.sugerencias_reescritura ?? []).forEach((s) => {
    const fragmento = (s.fragmento_original ?? "").trim();
    const propuesta = (s.propuesta_reescritura ?? "").trim();
    if (!fragmento || !propuesta) return;

    const rango = buscarRangoFragmento(texto, fragmento);
    if (!rango) return;

    anotaciones.push({
      ...rango,
      tipo: "reescritura",
      titulo: `Criterio ${s.criterio}: reescritura de banda alta`,
      explicacion: s.problema || "Este fragmento puede ganar precisión y profundidad.",
      sugerencia: s.explicacion_pedagogica,
      propuestaReescritura: propuesta,
      criterio: s.criterio,
      nivelIntervencion: s.nivel_intervencion,
      etiqueta: texto.slice(rango.inicio, rango.fin),
      prioridad: 90 + Math.max(0, Math.min(5, s.prioridad || 0)),
    });
  });

  addFallbackEstructura(texto, ev, anotaciones);
  addFallbackVerbosDebiles(texto, ev, anotaciones);
  addFallbackInterferencias(texto, anotaciones);

  return anotaciones;
}

function filtrarAnotacionesVisibles(anotaciones: Anotacion[]): Anotacion[] {
  const filtradas: Anotacion[] = [];
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

function segmentar(texto: string, anotaciones: Anotacion[]): Segmento[] {
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

const COLOR = {
  estructura_lograda: {
    mark: "bg-emerald-100 text-emerald-950 border-b-2 border-emerald-500 rounded-sm px-0.5",
    swatch: "bg-emerald-200 border-emerald-500",
    badge: "bg-emerald-100 text-emerald-800",
    label: "Estructura lograda",
  },
  estructura_mejora: {
    mark: "bg-sky-100 text-sky-950 border-b-2 border-sky-500 rounded-sm px-0.5",
    swatch: "bg-sky-200 border-sky-500",
    badge: "bg-sky-100 text-sky-800",
    label: "Estructura a desarrollar",
  },
  estructura_alerta: {
    mark: "bg-rose-100 text-rose-950 border-b-2 border-rose-500 rounded-sm px-0.5",
    swatch: "bg-rose-200 border-rose-500",
    badge: "bg-rose-100 text-rose-800",
    label: "Problema estructural",
  },
  interferencia: {
    mark: "bg-red-100 text-red-900 border-b-2 border-red-500 rounded-sm px-0.5",
    swatch: "bg-red-200 border-red-500",
    badge: "bg-red-100 text-red-800",
    label: "Interferencia del inglés",
  },
  verbo_debil: {
    mark: "bg-amber-100 text-amber-900 border-b-2 border-amber-500 rounded-sm px-0.5",
    swatch: "bg-amber-200 border-amber-500",
    badge: "bg-amber-100 text-amber-800",
    label: "Verbo débil",
  },
  reescritura: {
    mark: "bg-teal-100 text-teal-950 border-b-2 border-teal-600 rounded-sm px-0.5",
    swatch: "bg-teal-200 border-teal-600",
    badge: "bg-teal-100 text-teal-800",
    label: "Reescritura de banda alta",
  },
} as const;

const LEYENDA: { tipo: Anotacion["tipo"]; descripcion: string }[] = [
  { tipo: "estructura_lograda", descripcion: "Elemento estructural bien resuelto" },
  { tipo: "estructura_mejora", descripcion: "Parte que necesita desarrollo" },
  { tipo: "estructura_alerta", descripcion: "Problema de estructura o foco" },
  { tipo: "interferencia", descripcion: "Interferencia del inglés" },
  { tipo: "verbo_debil", descripcion: "Verbo poco analítico" },
  { tipo: "reescritura", descripcion: "Propuesta para subir de banda" },
];

const TIPOS_ANOTACION = LEYENDA.map((item) => item.tipo);

type AnalisisAnotadoProps = {
  texto: string;
  ev: Evaluacion;
  autoGenerarReescrituras?: boolean;
  onSugerenciasChange?: (sugerencias: SugerenciaReescritura[]) => void;
};

export function AnalisisAnotado({
  texto,
  ev,
  autoGenerarReescrituras = false,
  onSugerenciasChange,
}: AnalisisAnotadoProps) {
  const [sugerencias, setSugerencias] = useState<SugerenciaReescritura[]>(
    ev.sugerencias_reescritura ?? [],
  );
  const [generandoReescrituras, setGenerandoReescrituras] = useState(false);
  const [autoIntentado, setAutoIntentado] = useState(false);
  const [tiposActivos, setTiposActivos] = useState<Set<Anotacion["tipo"]>>(
    () => new Set(TIPOS_ANOTACION),
  );

  useEffect(() => {
    setSugerencias(ev.sugerencias_reescritura ?? []);
    setAutoIntentado(false);
  }, [ev.evaluacion_id, ev.sugerencias_reescritura]);

  const generarReescrituras = useCallback(
    async (mostrarToast = true) => {
      if (!ev.evaluacion_id) {
        if (mostrarToast) {
          toast.error("Guarda primero la evaluación para generar reescrituras anotadas.");
        }
        return;
      }

      setGenerandoReescrituras(true);
      try {
        const { data, error } = await supabase.functions.invoke("generate-rewrite-suggestions", {
          body: { evaluacion_id: ev.evaluacion_id },
        });

        if (error) {
          throw new Error(
            await getFunctionErrorMessage(error, "No se pudieron generar las reescrituras."),
          );
        }
        if (data?.error) throw new Error(data.error);
        if (!Array.isArray(data?.sugerencias_reescritura)) {
          throw new Error("La IA no devolvió sugerencias de reescritura válidas.");
        }

        const nuevas = data.sugerencias_reescritura as SugerenciaReescritura[];
        setSugerencias(nuevas);
        onSugerenciasChange?.(nuevas);
        if (mostrarToast) toast.success("Reescrituras de banda alta generadas.");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "No se pudieron generar las reescrituras.",
        );
      } finally {
        setGenerandoReescrituras(false);
      }
    },
    [ev.evaluacion_id, onSugerenciasChange],
  );

  useEffect(() => {
    if (
      !autoGenerarReescrituras ||
      !ev.evaluacion_id ||
      autoIntentado ||
      generandoReescrituras ||
      sugerencias.length >= 5
    ) {
      return;
    }

    setAutoIntentado(true);
    void generarReescrituras(false);
  }, [
    autoGenerarReescrituras,
    autoIntentado,
    ev.evaluacion_id,
    generandoReescrituras,
    generarReescrituras,
    sugerencias.length,
  ]);

  const textoNormalizado = textoEnsayoFormateado(texto);
  const evConSugerencias = useMemo(
    () => ({ ...ev, sugerencias_reescritura: sugerencias }),
    [ev, sugerencias],
  );
  const todasLasAnotaciones = useMemo(
    () => construirAnotaciones(textoNormalizado, evConSugerencias),
    [textoNormalizado, evConSugerencias],
  );
  const anotacionesFiltradas = useMemo(
    () => todasLasAnotaciones.filter((ann) => tiposActivos.has(ann.tipo)),
    [todasLasAnotaciones, tiposActivos],
  );
  const anotaciones = useMemo(
    () => filtrarAnotacionesVisibles(anotacionesFiltradas),
    [anotacionesFiltradas],
  );
  const segmentos = useMemo(
    () => segmentar(textoNormalizado, anotaciones),
    [textoNormalizado, anotaciones],
  );
  const puedeGenerarReescrituras = Boolean(ev.evaluacion_id);
  const faltanReescrituras = sugerencias.length < 5;
  const todosLosTiposActivos = tiposActivos.size === TIPOS_ANOTACION.length;

  const toggleTipo = (tipo: Anotacion["tipo"]) => {
    setTiposActivos((actual) => {
      const siguiente = new Set(actual);
      if (siguiente.has(tipo)) siguiente.delete(tipo);
      else siguiente.add(tipo);
      return siguiente;
    });
  };

  return (
    <Card className="p-5 bg-card border-border">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
        Tu solución anotada
      </div>

      {todasLasAnotaciones.length > 0 && (
        <div className="mb-4 rounded-md border border-border bg-muted/30 p-3">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Filtrar anotaciones
            </div>
            {!todosLosTiposActivos && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 justify-start px-2 text-xs text-muted-foreground"
                onClick={() => setTiposActivos(new Set(TIPOS_ANOTACION))}
              >
                Mostrar todo
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px]">
            {LEYENDA.map(({ tipo, descripcion }) => (
              <button
                key={tipo}
                type="button"
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-left transition-colors ${
                  tiposActivos.has(tipo)
                    ? "border-border bg-background text-foreground"
                    : "border-transparent bg-transparent text-muted-foreground/60 opacity-60"
                }`}
                aria-pressed={tiposActivos.has(tipo)}
                onClick={() => toggleTipo(tipo)}
              >
                <span
                  className={`inline-block h-3 w-3 rounded-sm border-b-2 ${COLOR[tipo].swatch}`}
                />
                {descripcion}
              </button>
            ))}
          </div>
          {anotaciones.length === 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Activa al menos un tipo para volver a ver marcas en el texto.
            </p>
          )}
        </div>
      )}

      {puedeGenerarReescrituras && (faltanReescrituras || generandoReescrituras) && (
        <div className="mb-4 rounded-md border border-teal-200 bg-teal-50/70 p-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-teal-700">
            Reescrituras de banda alta
          </div>
          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-teal-950/80">
              Genera marcas adicionales con propuestas concretas para elevar tu texto respetando tu
              voz, tus ideas y tu estructura.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-teal-300 bg-background text-teal-900 hover:bg-teal-100"
              onClick={() => void generarReescrituras()}
              disabled={generandoReescrituras}
            >
              {generandoReescrituras ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando
                </>
              ) : (
                "Generar reescrituras"
              )}
            </Button>
          </div>
        </div>
      )}

      {todasLasAnotaciones.length === 0 && !generandoReescrituras && (
        <div className="mb-4 rounded-md border border-border bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
          No hay marcas localizables todavía. Si acabas de recibir la corrección, espera a que se
          generen las reescrituras de banda alta; si no aparecen, vuelve a generar las reescrituras.
        </div>
      )}

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
                      {seg.anotacion.titulo}
                    </span>
                    <span className="block text-foreground/80">{seg.anotacion.explicacion}</span>
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
                        <span className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          Intervención {seg.anotacion.nivelIntervencion}
                        </span>
                      </span>
                    )}
                    {seg.anotacion.sugerencia && (
                      <span className="mt-2 block text-primary">
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
