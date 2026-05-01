function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(parseInt(code, 16)));
}

function isHtmlLike(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

export function textoLecturaPlano(value: string): string {
  let output = value;

  if (isHtmlLike(output)) {
    output = output
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
      .replace(/<p[^>]*>/gi, "")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<\/li>/gi, "")
      .replace(/<\/?(ul|ol)[^>]*>/gi, "\n")
      .replace(/<[^>]*>/g, "");
  }

  return decodeHtmlEntities(output)
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function dividirParrafoLargo(parrafo: string): string[] {
  if (parrafo.length <= 850) return [parrafo];

  const frases = parrafo
    .match(/[^.!?;:…]+[.!?;:…]+["”»]?|[^.!?;:…]+$/g)
    ?.map((frase) => frase.trim())
    .filter(Boolean);

  if (!frases || frases.length <= 1) return [parrafo];

  const bloques: string[] = [];
  let actual = "";
  let frasesEnBloque = 0;

  for (const frase of frases) {
    const siguiente = actual ? `${actual} ${frase}` : frase;
    if (actual && (siguiente.length > 700 || frasesEnBloque >= 4)) {
      bloques.push(actual);
      actual = frase;
      frasesEnBloque = 1;
    } else {
      actual = siguiente;
      frasesEnBloque += 1;
    }
  }

  if (actual) bloques.push(actual);
  return bloques;
}

function normalizarBloqueLectura(bloque: string): string {
  const lineas = bloque
    .split(/\n+/)
    .map((linea) => linea.trim())
    .filter(Boolean);

  if (lineas.length <= 1) return bloque.trim();

  const longitudMedia = lineas.reduce((total, linea) => total + linea.length, 0) / lineas.length;
  const lineasConCierre = lineas.filter((linea) => /[.!?;:…)"”»]$/.test(linea)).length;
  const pareceVerso = longitudMedia < 70 && lineasConCierre / lineas.length < 0.45;
  const pareceLista = lineas.every((linea) => /^([-*•]|\d+[.)])\s+/.test(linea));

  if (pareceVerso || pareceLista) return lineas.join("\n");

  return lineas.join(" ");
}

export function separarParrafosLectura(value: string): string[] {
  const texto = textoLecturaPlano(value);
  if (!texto) return [];

  const bloquesExplicitos = texto
    .split(/\n{2,}/)
    .map((bloque) => bloque.trim())
    .filter(Boolean);

  if (bloquesExplicitos.length > 1) {
    return bloquesExplicitos.map(normalizarBloqueLectura).flatMap(dividirParrafoLargo);
  }

  const lineas = texto
    .split(/\n+/)
    .map((linea) => linea.trim())
    .filter(Boolean);

  if (lineas.length > 1) {
    const longitudMedia = lineas.reduce((total, linea) => total + linea.length, 0) / lineas.length;
    const lineasConCierre = lineas.filter((linea) => /[.!?;:…)"”»]$/.test(linea)).length;
    const pareceVerso = longitudMedia < 70 && lineasConCierre / lineas.length < 0.45;

    if (pareceVerso) return [lineas.join("\n")];

    return dividirParrafoLargo(lineas.join(" "));
  }

  return dividirParrafoLargo(texto);
}

export function textoLecturaFormateado(value: string): string {
  return separarParrafosLectura(value).join("\n\n");
}

function pareceEnsayoConSaltosArtificiales(bloques: string[]): boolean {
  if (bloques.length < 6) return false;

  const longitudes = bloques.map((bloque) => bloque.length);
  const longitudMedia = longitudes.reduce((total, length) => total + length, 0) / longitudes.length;
  const bloquesCortos = longitudes.filter((length) => length < 260).length / bloques.length;
  const cierresFrase =
    bloques.filter((bloque) => /[.!?;:…)"”»]$/.test(bloque)).length / bloques.length;

  return bloquesCortos >= 0.7 && (longitudMedia < 220 || cierresFrase < 0.75);
}

function unirLineasComoEnsayo(lineas: string[]): string[] {
  const parrafos: string[] = [];
  let actual = "";

  for (const linea of lineas) {
    const limpia = linea.replace(/\s+/g, " ").trim();
    if (!limpia) continue;

    actual = actual ? `${actual} ${limpia}` : limpia;

    const cierreNatural = /[.!?…)"”»]$/.test(actual);
    if ((actual.length >= 520 && cierreNatural) || actual.length >= 850) {
      parrafos.push(actual);
      actual = "";
    }
  }

  if (actual) parrafos.push(actual);
  return parrafos.flatMap(dividirParrafoLargo);
}

function pareceVersoLiterario(lineas: string[]): boolean {
  if (lineas.length < 4) return false;

  const longitudes = lineas.map((linea) => linea.length);
  const longitudMedia = longitudes.reduce((total, length) => total + length, 0) / lineas.length;
  const longitudMaxima = Math.max(...longitudes);
  const cierresFrase = lineas.filter((linea) => /[.!?;:…)"”»]$/.test(linea)).length / lineas.length;

  return longitudMedia <= 80 && longitudMaxima <= 160 && cierresFrase < 0.70;
}

function pareceProsaConSaltosArtificiales(lineas: string[]): boolean {
  if (lineas.length < 4) return false;

  const longitudes = lineas.map((linea) => linea.length);
  const longitudMedia = longitudes.reduce((total, length) => total + length, 0) / lineas.length;
  const lineasCortadas = longitudes.filter((length) => length < 260).length / lineas.length;
  const cierresFrase = lineas.filter((linea) => /[.!?;:…)"”»]$/.test(linea)).length / lineas.length;
  const continuacionesEnMinuscula =
    lineas.slice(1).filter((linea) => /^[a-záéíóúñü]/.test(linea)).length /
    Math.max(1, lineas.length - 1);

  return (
    lineasCortadas >= 0.65 &&
    ((longitudMedia >= 55 && (longitudMedia >= 80 || cierresFrase < 0.75)) ||
      continuacionesEnMinuscula >= 0.25)
  );
}

export function separarParrafosTextoLiterario(value: string): string[] {
  const texto = textoLecturaPlano(value);
  if (!texto) return [];

  const bloquesExplicitos = texto
    .split(/\n{2,}/)
    .map((bloque) => bloque.trim())
    .filter(Boolean);

  if (bloquesExplicitos.length > 1) {
    const bloquesNormalizados = bloquesExplicitos.map((bloque) =>
      normalizarBloqueLectura(bloque).replace(/\n+/g, " "),
    );

    if (pareceVersoLiterario(bloquesNormalizados)) {
      return [bloquesNormalizados.join("\n")];
    }

    if (pareceProsaConSaltosArtificiales(bloquesNormalizados)) {
      return unirLineasComoEnsayo(bloquesNormalizados);
    }

    return bloquesNormalizados.flatMap(dividirParrafoLargo);
  }

  const lineas = texto
    .split(/\n+/)
    .map((linea) => linea.trim())
    .filter(Boolean);

  if (lineas.length > 1) {
    if (pareceVersoLiterario(lineas)) {
      return [lineas.join("\n")];
    }

    return unirLineasComoEnsayo(lineas);
  }

  return dividirParrafoLargo(texto);
}

export function separarParrafosEnsayo(value: string): string[] {
  const texto = textoLecturaPlano(value);
  if (!texto) return [];

  const bloquesExplicitos = texto
    .split(/\n{2,}/)
    .map((bloque) => bloque.trim())
    .filter(Boolean);

  if (bloquesExplicitos.length > 1) {
    const bloquesNormalizados = bloquesExplicitos.map((bloque) =>
      normalizarBloqueLectura(bloque).replace(/\n+/g, " "),
    );

    if (pareceEnsayoConSaltosArtificiales(bloquesNormalizados)) {
      return unirLineasComoEnsayo(bloquesNormalizados);
    }

    return bloquesNormalizados.flatMap(dividirParrafoLargo);
  }

  const lineas = texto
    .split(/\n+/)
    .map((linea) => linea.trim())
    .filter(Boolean);

  if (lineas.length > 1) {
    return unirLineasComoEnsayo(lineas);
  }

  return dividirParrafoLargo(texto);
}

export function textoEnsayoFormateado(value: string): string {
  return separarParrafosEnsayo(value).join("\n\n");
}

export function plainTextToEditorHtml(value: string): string {
  if (!value.trim() || isHtmlLike(value)) return value;

  const escaped = value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  const blocks = escaped
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) return "";

  return blocks.map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`).join("");
}
