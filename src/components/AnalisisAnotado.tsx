import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Evaluacion, SugerenciaReescritura } from "@/lib/ib";
import { textoEnsayoFormateado } from "@/lib/textFormatting";
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

type CriterioFiltro = "A" | "B" | "C" | "D";

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

function addFallbackEstructura(
  texto: string,
  ev: Evaluacion,
  anotaciones: Anotacion[],
  isEN: boolean,
) {
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
    isEN ? "Structure: essay focus" : "Estructura: foco del ensayo",
    problema?.evaluacion ||
      ev.justificacion_c ||
      (isEN
        ? "The organisation needs a more explicit focus."
        : "La organización necesita un foco más explícito."),
    problema?.sugerencia ||
      (isEN
        ? "Make the thesis visible from the start and connect each paragraph to that central idea."
        : "Haz visible la tesis desde el inicio y conecta cada párrafo con esa idea central."),
    66,
  );
}

function getVerbosDebiles(isEN: boolean) {
  return [
    {
      regex: isEN ? /\b(there is|there are|there's|there're)\b/gi : /\bhay\b/gi,
      etiqueta: isEN ? "there is" : "hay",
      alternativa: isEN
        ? "Replace with an analytical verb: reveals, establishes, suggests, or foregrounds."
        : "Sustituye por un verbo analítico: plantea, establece, revela o sugiere.",
    },
    {
      regex: isEN ? /\b(has|have)\b/gi : /\b(tiene|tienen)\b/gi,
      etiqueta: isEN ? "has" : "tiene",
      alternativa: isEN
        ? "Specify the function: constructs, reinforces, intensifies, or shapes."
        : "Precisa la función: articula, construye, refuerza o intensifica.",
    },
    {
      regex: isEN ? /\b(makes|make)\b/gi : /\b(hace|hacen)\b/gi,
      etiqueta: isEN ? "makes" : "hace",
      alternativa: isEN
        ? "Explain the effect with a specific verb: provokes, displaces, or emphasises."
        : "Explica el efecto con un verbo específico: provoca, desplaza o enfatiza.",
    },
    {
      regex: isEN ? /\b(shows|show)\b/gi : /\b(muestra|muestran)\b/gi,
      etiqueta: isEN ? "shows" : "muestra",
      alternativa: isEN
        ? "Consider reveals, underscores, highlights, or problematises."
        : "Puedes usar revela, subraya, evidencia o problematiza.",
    },
    {
      regex: isEN ? /\b(says|say)\b/gi : /\b(dice|dicen)\b/gi,
      etiqueta: isEN ? "says" : "dice",
      alternativa: isEN
        ? "In literary analysis, 'suggests', 'states', or 'conveys' is often more precise."
        : "En análisis literario suele ser más preciso sugiere, enuncia o revela.",
    },
    {
      regex: isEN ? /\b(is|are)\b/gi : /\b(es|son)\b/gi,
      etiqueta: isEN ? "is" : "es",
      alternativa: isEN
        ? "Avoid relying on 'is': express the relationship with configures, condenses, or projects."
        : "Evita depender de 'es': formula la relación con configura, condensa o proyecta.",
    },
    {
      regex: isEN ? /\b(uses|use)\b/gi : /\b(usa|usan|utiliza|utilizan)\b/gi,
      etiqueta: isEN ? "uses" : "usa",
      alternativa: isEN
        ? "Name the device's function: constructs, intensifies, contrasts, or articulates."
        : "Nombra la función del recurso: construye, intensifica, contrasta o articula.",
    },
  ];
}

function addFallbackVerbosDebiles(
  texto: string,
  ev: Evaluacion,
  anotaciones: Anotacion[],
  isEN: boolean,
) {
  if (anotaciones.some((ann) => ann.tipo === "verbo_debil")) return;

  const verbos = getVerbosDebiles(isEN);

  let total = 0;
  for (const verbo of verbos) {
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
        isEN
          ? `"${verbo.etiqueta}" reduces analytical precision when repeated as a catch-all verb.`
          : `"${verbo.etiqueta}" reduce la precisión del análisis si se repite como verbo comodín.`,
        verbo.alternativa,
        52,
      );
      total += 1;
    }
  }
}

function getInterferenciasComunes(isEN: boolean) {
  return [
    {
      regex: isEN ? /\b(in addition|in addition to)\b/gi : /\ben adici[oó]n\b/gi,
      explicacion: isEN
        ? "Redundant transition. Consider 'furthermore', 'moreover', or simply 'also'."
        : "Calco de 'in addition'. En español académico suena más natural 'además'.",
      correccion: isEN
        ? "Replace with 'furthermore', 'moreover', or 'additionally'."
        : "Cámbialo por 'además' o 'asimismo'.",
    },
    {
      regex: isEN ? /\bmakes sense\b/gi : /\bhace sentido\b/gi,
      explicacion: isEN
        ? "Too colloquial for literary analysis. State the logical relationship explicitly."
        : "Calco de 'makes sense'. En español académico se prefiere 'tiene sentido'.",
      correccion: isEN
        ? "Reformulate with 'is consistent with', 'aligns with', or explain the relationship directly."
        : "Usa 'tiene sentido' o formula la relación de forma más precisa.",
    },
    {
      regex: isEN ? /\b(kind of|sort of)\b/gi : /\bcomo que\b/gi,
      explicacion: isEN
        ? "Colloquial filler that weakens academic register and analytical precision."
        : "Conector coloquial influido por estructuras del inglés; debilita el registro.",
      correccion: isEN
        ? "Replace with 'insofar as', 'given that', or a more precise subordinate clause."
        : "Sustitúyelo por 'ya que', 'puesto que' o una subordinada más precisa.",
    },
    {
      regex: isEN ? /\bbeing\s+\w+/gi : /\bsiendo\s+\w+/gi,
      explicacion: isEN
        ? "Rigid use of the present participle; often creates awkward phrasing."
        : "Uso rígido del gerundio, frecuente por interferencia del inglés.",
      correccion: isEN
        ? "Reformulate with a main clause or a more direct adjective."
        : "Reformula con una oración principal o un adjetivo más directo.",
    },
  ];
}

function addFallbackInterferencias(texto: string, anotaciones: Anotacion[], isEN: boolean) {
  if (anotaciones.some((ann) => ann.tipo === "interferencia")) return;

  const interferencias = getInterferenciasComunes(isEN);

  let total = 0;
  for (const patron of interferencias) {
    const matches = Array.from(texto.matchAll(patron.regex));
    for (const match of matches) {
      if (total >= 3 || match.index === undefined) return;
      const rango = rangoContexto(texto, match.index, match.index + match[0].length);
      pushAnotacionDirecta(
        texto,
        anotaciones,
        rango,
        "interferencia",
        isEN ? "English interference" : "Interferencia del inglés",
        patron.explicacion,
        patron.correccion,
        82,
      );
      total += 1;
    }
  }
}

function construirAnotaciones(texto: string, ev: Evaluacion, isEN: boolean): Anotacion[] {
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
        ? `${seccion}: ${isEN ? "element achieved" : "elemento logrado"}`
        : tipo === "estructura_mejora"
          ? `${seccion}: ${isEN ? "needs development" : "necesita desarrollo"}`
          : `${seccion}: ${isEN ? "structural problem" : "problema estructural"}`;

    addAnotacion(
      el.fragmento,
      tipo,
      titulo,
      el.evaluacion,
      el.sugerencia,
      tipo === "estructura_alerta" ? 70 : tipo === "estructura_mejora" ? 60 : 20,
    );
  };

  ev.introduccion?.elementos?.forEach((el) =>
    addElementoEstructural(isEN ? "Introduction" : "Introducción", el),
  );
  ev.parrafos?.forEach((parrafo) => {
    parrafo.elementos?.forEach((el) =>
      addElementoEstructural(`${isEN ? "Paragraph" : "Párrafo"} ${parrafo.numero}`, el),
    );
    if (parrafo.extracto_inicio && parrafo.sugerencia_global) {
      addAnotacion(
        parrafo.extracto_inicio,
        "estructura_mejora",
        `${isEN ? "Paragraph" : "Párrafo"} ${parrafo.numero}: ${isEN ? "global improvement" : "mejora global"}`,
        parrafo.sugerencia_global,
        undefined,
        55,
      );
    }
  });
  ev.conclusion?.elementos?.forEach((el) =>
    addElementoEstructural(isEN ? "Conclusion" : "Conclusión", el),
  );

  (ev.lenguaje_analitico?.interferencias_ingles ?? []).forEach((int) => {
    addAnotacion(
      int.fragmento_original ?? "",
      "interferencia",
      isEN ? "English interference" : "Interferencia del inglés",
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
      isEN ? "Weak verb" : "Verbo débil",
      isEN ? `Weak verb used ${v.frecuencia}×` : `Verbo débil usado ${v.frecuencia}×`,
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
      titulo: `${isEN ? "Criterion" : "Criterio"} ${s.criterio}: ${isEN ? "high-band rewrite" : "reescritura de banda alta"}`,
      explicacion:
        s.problema ||
        (isEN
          ? "This fragment can gain precision and depth."
          : "Este fragmento puede ganar precisión y profundidad."),
      sugerencia: s.explicacion_pedagogica,
      propuestaReescritura: propuesta,
      criterio: s.criterio,
      nivelIntervencion: s.nivel_intervencion,
      etiqueta: texto.slice(rango.inicio, rango.fin),
      prioridad: 90 + Math.max(0, Math.min(5, s.prioridad || 0)),
    });
  });

  addFallbackEstructura(texto, ev, anotaciones, isEN);
  addFallbackVerbosDebiles(texto, ev, anotaciones, isEN);
  addFallbackInterferencias(texto, anotaciones, isEN);

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

function getColor(isEN: boolean): Record<CriterioFiltro, { color: string; label: string }> {
  return {
    A: {
      color: CRIT.A,
      label: isEN ? "Criterion A" : "Criterio A",
    },
    B: {
      color: CRIT.B,
      label: isEN ? "Criterion B" : "Criterio B",
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

function criterioDeAnotacion(anotacion: Anotacion): CriterioFiltro {
  if (
    anotacion.criterio === "A" ||
    anotacion.criterio === "B" ||
    anotacion.criterio === "C" ||
    anotacion.criterio === "D"
  ) {
    return anotacion.criterio;
  }
  if (anotacion.tipo.startsWith("estructura")) return "C";
  if (anotacion.tipo === "interferencia" || anotacion.tipo === "verbo_debil") return "D";
  return "B";
}

function getFiltrosLeyenda(isEN: boolean): { criterio: CriterioFiltro; descripcion: string }[] {
  return [
    {
      criterio: "A",
      descripcion: isEN
        ? "Criterion A: knowledge and interpretation"
        : "Criterio A: conocimiento e interpretación",
    },
    {
      criterio: "B",
      descripcion: isEN ? "Criterion B: analysis of choices" : "Criterio B: análisis de decisiones",
    },
    {
      criterio: "C",
      descripcion: isEN ? "Criterion C: focus and organisation" : "Criterio C: foco y organización",
    },
    { criterio: "D", descripcion: isEN ? "Criterion D: language" : "Criterio D: lengua" },
  ];
}

function getCRITERIOS_ANOTACION(isEN: boolean): CriterioFiltro[] {
  return getFiltrosLeyenda(isEN).map((item) => item.criterio);
}

type AnalisisAnotadoProps = {
  texto: string;
  ev: Evaluacion;
  mostrarAnotaciones?: boolean;
  onSugerenciasChange?: (sugerencias: SugerenciaReescritura[]) => void;
};

export function AnalisisAnotado({
  texto,
  ev,
  mostrarAnotaciones = true,
  onSugerenciasChange,
}: AnalisisAnotadoProps) {
  const { courseKey } = useAuth();
  const isEN = useUiLang() === "en";
  const COLOR = getColor(isEN);
  const LEYENDA = getFiltrosLeyenda(isEN);
  const CRITERIOS_ANOTACION = getCRITERIOS_ANOTACION(isEN);
  const [sugerencias, setSugerencias] = useState<SugerenciaReescritura[]>(
    ev.sugerencias_reescritura ?? [],
  );
  const [criteriosActivos, setCriteriosActivos] = useState<Set<CriterioFiltro>>(
    () => new Set(CRITERIOS_ANOTACION),
  );

  useEffect(() => {
    setSugerencias(ev.sugerencias_reescritura ?? []);
  }, [ev.evaluacion_id, ev.sugerencias_reescritura]);

  const textoNormalizado = textoEnsayoFormateado(texto);
  const parrafosTextoPlano = useMemo(
    () =>
      textoNormalizado
        .split(/\n+/)
        .map((parrafo) => parrafo.trim())
        .filter(Boolean),
    [textoNormalizado],
  );
  const evConSugerencias = useMemo(
    () => ({ ...ev, sugerencias_reescritura: sugerencias }),
    [ev, sugerencias],
  );
  const todasLasAnotaciones = useMemo(
    () =>
      mostrarAnotaciones ? construirAnotaciones(textoNormalizado, evConSugerencias, isEN) : [],
    [mostrarAnotaciones, textoNormalizado, evConSugerencias, isEN],
  );
  const anotacionesFiltradas = useMemo(
    () => todasLasAnotaciones.filter((ann) => criteriosActivos.has(criterioDeAnotacion(ann))),
    [todasLasAnotaciones, criteriosActivos],
  );
  const anotaciones = useMemo(
    () => filtrarAnotacionesVisibles(anotacionesFiltradas),
    [anotacionesFiltradas],
  );
  const segmentos = useMemo(
    () => segmentar(textoNormalizado, anotaciones),
    [textoNormalizado, anotaciones],
  );
  const todosLosTiposActivos = criteriosActivos.size === CRITERIOS_ANOTACION.length;

  const toggleCriterio = (criterio: CriterioFiltro) => {
    setCriteriosActivos((actual) => {
      const siguiente = new Set(actual);
      if (siguiente.has(criterio)) siguiente.delete(criterio);
      else siguiente.add(criterio);
      return siguiente;
    });
  };

  if (!mostrarAnotaciones) {
    return (
      <Card className="lib-reveal rounded-2xl border p-6" style={cardStyle}>
        <div
          className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em]"
          style={{ ...fontMono, color: L.primary }}
        >
          {isEN ? "Your annotated response" : "Tu solución anotada"}
        </div>

        <div className="space-y-4 text-sm leading-relaxed font-serif" style={{ color: L.ink }}>
          {parrafosTextoPlano.length > 0 ? (
            parrafosTextoPlano.map((parrafo, i) => <p key={i}>{parrafo}</p>)
          ) : (
            <p className="italic" style={{ color: L.muted }}>
              {isEN ? "No content." : "Sin contenido."}
            </p>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="lib-reveal rounded-2xl border p-6" style={cardStyle}>
      <div
        className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em]"
        style={{ ...fontMono, color: L.primary }}
      >
        {isEN ? "Your annotated response" : "Tu solución anotada"}
      </div>
      <h3 className="mb-4 text-2xl font-semibold leading-tight" style={headingStyle}>
        {isEN ? "Text-level feedback" : "Feedback sobre el texto"}
      </h3>

      {todasLasAnotaciones.length > 0 && (
        <div className="mb-5 rounded-2xl border p-4" style={softCardStyle}>
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{ ...fontMono, color: L.muted }}
            >
              {isEN ? "Filter annotations" : "Filtrar anotaciones"}
            </div>
            {!todosLosTiposActivos && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="lib-press h-8 justify-start rounded-xl px-3 text-xs font-semibold"
                style={{ color: L.primary }}
                onClick={() => setCriteriosActivos(new Set(CRITERIOS_ANOTACION))}
              >
                {isEN ? "Show all" : "Mostrar todo"}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px]">
            {LEYENDA.map(({ criterio, descripcion }) => (
              <button
                key={criterio}
                type="button"
                className="lib-press flex min-h-8 items-center gap-1.5 rounded-xl border px-2.5 py-1 text-left transition-colors"
                style={{
                  borderColor: criteriosActivos.has(criterio) ? COLOR[criterio].color : L.line,
                  backgroundColor: criteriosActivos.has(criterio)
                    ? COLOR[criterio].color + "12"
                    : "transparent",
                  color: criteriosActivos.has(criterio) ? L.ink : L.muted,
                  opacity: criteriosActivos.has(criterio) ? 1 : 0.64,
                }}
                aria-pressed={criteriosActivos.has(criterio)}
                onClick={() => toggleCriterio(criterio)}
              >
                <span
                  className="inline-block h-3 w-3 rounded-sm border-b-2"
                  style={{
                    backgroundColor: COLOR[criterio].color + "24",
                    borderColor: COLOR[criterio].color,
                  }}
                />
                <span className="font-medium">{criterio}</span>
                {descripcion}
              </button>
            ))}
          </div>
          {anotaciones.length === 0 && (
            <p className="mt-3 text-xs" style={{ color: L.muted }}>
              {isEN
                ? "Enable at least one type to see highlights in the text again."
                : "Activa al menos un tipo para volver a ver marcas en el texto."}
            </p>
          )}
        </div>
      )}

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
                      backgroundColor: COLOR[criterioDeAnotacion(seg.anotacion)].color + "18",
                      borderBottomColor: COLOR[criterioDeAnotacion(seg.anotacion)].color,
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
                        backgroundColor: COLOR[criterioDeAnotacion(seg.anotacion)].color + "14",
                        color: COLOR[criterioDeAnotacion(seg.anotacion)].color,
                      }}
                    >
                      {seg.anotacion.tipo === "reescritura"
                        ? isEN
                          ? `Criterion ${seg.anotacion.criterio ?? ""} · High-band rewrite`
                          : `Criterio ${seg.anotacion.criterio ?? ""} · Reescritura de banda alta`
                        : seg.anotacion.titulo}
                    </span>
                    <span className="block" style={{ color: L.ink }}>
                      {seg.anotacion.explicacion}
                    </span>
                    {seg.anotacion.propuestaReescritura && (
                      <span className="mt-3 block space-y-2">
                        <span className="block rounded-xl border p-3" style={softCardStyle}>
                          <span
                            className="block text-[10px] font-semibold uppercase tracking-[0.14em]"
                            style={{ ...fontMono, color: L.muted }}
                          >
                            {isEN ? "Your excerpt" : "Tu fragmento"}
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
                        <span
                          className="block text-[10px] uppercase tracking-[0.12em]"
                          style={{ ...fontMono, color: L.muted }}
                        >
                          {isEN ? "Intervention" : "Intervención"} {seg.anotacion.nivelIntervencion}
                        </span>
                      </span>
                    )}
                    {seg.anotacion.sugerencia && (
                      <span className="mt-2 block" style={{ color: L.primary }}>
                        <span className="font-semibold">
                          {seg.anotacion.propuestaReescritura
                            ? isEN
                              ? "Why it improves:"
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
