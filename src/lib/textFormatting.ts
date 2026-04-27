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

export function separarParrafosLectura(value: string): string[] {
  const texto = textoLecturaPlano(value);
  if (!texto) return [];

  const bloquesExplicitos = texto
    .split(/\n{2,}/)
    .map((bloque) => bloque.trim())
    .filter(Boolean);

  if (bloquesExplicitos.length > 1) {
    return bloquesExplicitos.flatMap(dividirParrafoLargo);
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
