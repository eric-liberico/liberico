import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/teoria")({
  head: () => ({
    meta: [
      { title: "Teoría — IB Literatura" },
      { name: "description", content: "Teoría literaria para la Prueba 1 del IB Español A." },
    ],
  }),
  component: TeoriaPage,
});

// ── TIPOS ────────────────────────────────────────────────────

type Seccion = {
  id: string;
  titulo: string;
  descripcion: string;
  tag: string;
};

// ── DATOS ────────────────────────────────────────────────────

const TAG_COLOR: Record<string, string> = {
  Base: "bg-slate-100 text-slate-700 border-slate-300",
  Poesía: "bg-violet-500/15 text-violet-700 border-violet-300",
  Narrativa: "bg-amber-500/15 text-amber-700 border-amber-300",
  Teatro: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
  Contexto: "bg-blue-500/15 text-blue-700 border-blue-300",
  IB: "bg-rose-500/15 text-rose-700 border-rose-300",
};

const SECCIONES: Seccion[] = [
  {
    id: "generos",
    titulo: "Géneros literarios",
    descripcion:
      "Las cuatro formas literarias del IB y qué herramientas analíticas aplica cada una.",
    tag: "Base",
  },
  {
    id: "movimientos",
    titulo: "Movimientos literarios",
    descripcion:
      "Del Romanticismo al Boom latinoamericano: características, autores y contexto histórico.",
    tag: "Contexto",
  },
  {
    id: "poesia",
    titulo: "Poesía: teoría general",
    descripcion: "Hablante lírico, tono, géneros poéticos y cómo hablar de poesía en el examen.",
    tag: "Poesía",
  },
  {
    id: "versificacion",
    titulo: "Versificación y tipos de verso",
    descripcion:
      "Cómputo silábico, sinalefa, verso agudo/llano/esdrújulo y los metros más frecuentes.",
    tag: "Poesía",
  },
  {
    id: "rima",
    titulo: "Rima y esquemas métricos",
    descripcion:
      "Rima consonante y asonante, verso blanco y libre, soneto, romance y otros esquemas.",
    tag: "Poesía",
  },
  {
    id: "narratologia",
    titulo: "Narratología",
    descripcion:
      "Tipos de narrador, tiempo narrativo, espacio y estructura en la prosa de ficción.",
    tag: "Narrativa",
  },
  {
    id: "teatro",
    titulo: "Teatro",
    descripcion:
      "Origen, elementos del texto dramático (acotaciones, aparte, soliloquio) y géneros teatrales.",
    tag: "Teatro",
  },
  {
    id: "recursos",
    titulo: "Recursos literarios en el examen IB",
    descripcion:
      "Cómo analizar (no solo identificar) un recurso. Errores frecuentes y estructura de respuesta.",
    tag: "IB",
  },
];

// ── HELPERS ──────────────────────────────────────────────────

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="font-serif text-base font-semibold text-ink mt-5 mb-2">{children}</h3>;
}

function Def({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-1">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{titulo}</div>
      <div className="text-sm text-foreground/85 leading-relaxed">{children}</div>
    </div>
  );
}

function TipIB({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
      <div className="text-[10px] uppercase tracking-[0.18em] text-primary mb-2">Consejo IB</div>
      <div className="text-sm text-foreground/85 leading-relaxed">{children}</div>
    </div>
  );
}

function Tabla({ cabeceras, filas }: { cabeceras: string[]; filas: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-accent/50">
            {cabeceras.map((h) => (
              <th key={h} className="text-left p-2.5 font-medium text-ink border border-border">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={i} className={i % 2 === 1 ? "bg-accent/20" : ""}>
              {fila.map((celda, j) => (
                <td key={j} className="p-2.5 border border-border text-foreground/80 align-top">
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── CONTENIDOS ───────────────────────────────────────────────

function contenidoGeneros() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">
        El IB Español A NM trabaja con cuatro formas literarias. Identificar la forma antes de
        empezar el análisis determina qué herramientas son relevantes y cuáles no aplican.
      </p>

      <Tabla
        cabeceras={["Forma literaria", "Subgéneros", "Herramientas clave"]}
        filas={[
          [
            "Prosa ficcional",
            "Novela, cuento, nouvelle",
            "Narrador, tiempo narrativo, espacio, personaje, estructura",
          ],
          [
            "Prosa no ficcional",
            "Ensayo, crónica, autobiografía",
            "Voz, argumento, tono, recursos retóricos, estructura persuasiva",
          ],
          [
            "Poesía",
            "Soneto, romance, oda, elegía, silva, verso libre",
            "Hablante lírico, métrica, rima, imágenes, recursos fónicos",
          ],
          [
            "Teatro",
            "Tragedia, comedia, tragicomedia",
            "Acotaciones, diálogo, conflicto dramático, espacio escénico",
          ],
        ]}
      />

      <H3>Prosa ficcional</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        La narrativa ficcional construye un mundo imaginario habitado por personajes. Sus elementos
        fundamentales son el <strong>narrador</strong> (quién cuenta, desde dónde, con qué
        limitaciones), el <strong>tiempo</strong> (el orden y la duración de los eventos) y el{" "}
        <strong>espacio</strong>, que en muchos textos tiene función simbólica más allá de lo
        ambiental.
      </p>

      <H3>Prosa no ficcional</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        El ensayo y la crónica hablan del mundo real, pero nunca de forma neutral: siempre hay una
        voz que selecciona, interpreta y argumenta. En autores como Paz, Martí o Galeano, la forma
        retórica es inseparable de la tesis: <em>cómo</em> se dice algo es parte de <em>qué</em> se
        dice.
      </p>

      <H3>Poesía</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        La poesía concentra el lenguaje: cada palabra está más cargada de significado que en la
        prosa. La forma —métrica, rima, recursos sonoros— no es decorativa: el ritmo de un poema es
        significativo en sí mismo, no un accidente formal.
      </p>

      <H3>Teatro</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        El texto teatral está diseñado para ser representado. Las <strong>acotaciones</strong>{" "}
        (instrucciones escénicas) son tan analizables como los diálogos: revelan cómo el dramaturgo
        concibe el espacio, el gesto y la atmósfera. El <strong>conflicto dramático</strong> es el
        motor de toda obra teatral.
      </p>

      <TipIB>
        En la Prueba 1, identifica la forma literaria en los primeros segundos. Un texto teatral se
        analiza de forma diferente a un poema: las acotaciones y el diálogo son herramientas
        específicas del género dramático que no existen en la prosa.
      </TipIB>
    </div>
  );
}

function contenidoMovimientos() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">
        Conocer el movimiento literario de un texto no es un dato de erudición: ayuda a entender qué
        valores, qué visión del mundo y qué recursos formales son típicos de ese autor, y por qué
        hace las elecciones que hace.
      </p>

      <H3>Romanticismo (s. XIX)</H3>
      <Def titulo="Autores representativos">
        Bécquer, Zorrilla, Espronceda, Gertrudis Gómez de Avellaneda
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        El Romanticismo reacciona contra la razón ilustrada exaltando el <strong>yo</strong>, la
        emoción y la libertad. Sus temas: amor imposible o truncado, muerte, naturaleza como espejo
        del estado de ánimo, rebeldía individual, nostalgia y melancolía. En lo formal: lenguaje
        emotivo, exclamaciones, interrogaciones retóricas, imágenes de ruinas, noche y tormenta.
      </p>

      <H3>Modernismo (1888–1920)</H3>
      <Def titulo="Autores representativos">
        Rubén Darío, José Martí, Leopoldo Lugones, Amado Nervo
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        El Modernismo busca renovar la lengua literaria desde el esteticismo: el lenguaje es un
        objeto bello en sí mismo. Influenciado por el Simbolismo francés (Baudelaire, Verlaine). Sus
        características: musicalidad, sinestesias, vocabulario exótico o culto, escapismo hacia
        mundos lejanos o mitológicos, y una crítica implícita al materialismo de la sociedad
        burguesa.
      </p>

      <H3>Generación del 98 (España)</H3>
      <Def titulo="Autores representativos">
        Miguel de Unamuno, Antonio Machado, Pío Baroja, Valle-Inclán
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        Surge a raíz de la crisis de 1898 (pérdida de las últimas colonias españolas). Reflexionan
        sobre la identidad de España, el sentido de la existencia y la angustia espiritual. Estilo
        austero y directo, alejado del ornamentalismo modernista.
      </p>

      <H3>Vanguardismo (1920–1940)</H3>
      <Def titulo="Autores representativos">
        César Vallejo, Vicente Huidobro, Rafael Alberti, Pablo Neruda (primera época)
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        Las vanguardias (ultraísmo, creacionismo, surrealismo) rompen con las normas establecidas:
        imagen irracional, supresión de la puntuación, tipografía experimental, libre asociación. El
        Surrealismo influye especialmente en la poesía hispánica: imágenes oníricas, el inconsciente
        como fuente creativa.
      </p>

      <H3>Generación del 27 (España)</H3>
      <Def titulo="Autores representativos">
        Federico García Lorca, Rafael Alberti, Jorge Guillén, Pedro Salinas, Luis Cernuda
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        Síntesis entre tradición (Góngora, el romance popular) y vanguardia (imagen surrealista).
        Cultivan desde la poesía pura (Guillén) hasta el neopopularismo lorquiano. La Guerra Civil
        (1936) marca el fin del grupo: exilio, muerte (Lorca), silencio.
      </p>

      <H3>Boom latinoamericano (1960–1980)</H3>
      <Def titulo="Autores representativos">
        Gabriel García Márquez, Julio Cortázar, Mario Vargas Llosa, Carlos Fuentes
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        El Boom internacionaliza la narrativa latinoamericana. Experimentación formal: tiempo no
        lineal, múltiples narradores, monólogo interior. El <strong>realismo mágico</strong> (García
        Márquez, Rulfo) integra lo sobrenatural en la realidad cotidiana sin asombro: lo maravilloso
        y lo ordinario coexisten sin contradicción.
      </p>

      <TipIB>
        En la Prueba 1 no necesitas saber la fecha exacta de un movimiento, pero sí reconocer sus
        características cuando aparecen en el texto. Si un poema tiene imágenes irracionales y
        ruptura sintáctica, probablemente es vanguardismo; si tiene musicalidad exuberante y
        esteticismo, modernismo.
      </TipIB>
    </div>
  );
}

function contenidoPoesia() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">
        La poesía es el género donde la forma y el contenido están más íntimamente ligados. Analizar
        un poema sin atender a su forma —ritmo, rima, disposición de los versos— es analizar solo la
        mitad del texto.
      </p>

      <H3>El hablante lírico</H3>
      <Def titulo="Concepto clave">
        El <strong>hablante lírico</strong> es la voz que habla en el poema. No es el autor. Neruda
        construye un hablante lírico en el Poema XX; ese hablante no es idéntico a Neruda, aunque
        comparta experiencias.
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        En la Prueba 1, nunca escribas «Neruda dice que...» o «Lorca siente...». Di siempre «el
        hablante lírico», «la voz poética» o «el yo lírico». Esta distinción es fundamental en la
        valoración del IB: demuestra que entiendes que el poema es una construcción literaria, no
        una confesión autobiográfica directa.
      </p>

      <H3>Tono y temple de ánimo</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        El <strong>tono</strong> es la actitud del hablante lírico ante el tema: nostálgico,
        irónico, exaltado, melancólico, desafiante, íntimo, solemne. El{" "}
        <strong>temple de ánimo</strong> es el estado emocional general que transmite el poema al
        lector. Ambos se construyen a través de los recursos léxicos y formales, no son datos
        externos al texto.
      </p>

      <H3>Principales géneros poéticos</H3>
      <Tabla
        cabeceras={["Género", "Características", "Ejemplo"]}
        filas={[
          [
            "Soneto",
            "14 versos endecasílabos: dos cuartetos + dos tercetos. Estructura argumentativa.",
            "Siglos XVI-XVII (Quevedo, Garcilaso)",
          ],
          [
            "Romance",
            "Serie indefinida de octosílabos con rima asonante en los versos pares.",
            "Romancero gitano de Lorca",
          ],
          [
            "Oda",
            "Poema de tono elevado, generalmente de alabanza o reflexión. Estrofas largas.",
            "Odas elementales de Neruda",
          ],
          [
            "Elegía",
            "Poema de lamento por una pérdida (muerte, amor, patria). Tono melancólico.",
            "Coplas de Manrique, Rima LIII de Bécquer",
          ],
          [
            "Verso libre",
            "Sin métrica fija ni rima. El ritmo surge de la sintaxis y la imagen.",
            "Neruda tardío, poesía contemporánea",
          ],
        ]}
      />

      <H3>Encabalgamiento</H3>
      <Def titulo="Definición">
        El <strong>encabalgamiento</strong> ocurre cuando la unidad sintáctica no coincide con el
        final del verso: la frase «se derrama» hacia el verso siguiente.
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        Efecto: acelera el ritmo, crea tensión, obliga al lector a continuar. El encabalgamiento
        puede ser <em>suave</em> (la pausa es posible) o <em>abrupto</em> (la pausa sería
        antinatural). Cuando aparece en un poema que generalmente respeta las pausas versales, su
        uso resulta especialmente expresivo.
      </p>

      <TipIB>
        Cuando analices un poema en la Prueba 1, usa siempre «el hablante lírico». Menciona el tono
        en tu introducción. Y recuerda: el final de un verso es una pausa semántica —lo que ocurre
        al final del verso recibe énfasis, igual que la última palabra de una frase.
      </TipIB>
    </div>
  );
}

function contenidoVersificacion() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">
        La métrica estudia la medida de los versos. No es un ejercicio mecánico: saber que un poema
        usa endecasílabos te dice que pertenece a una tradición culta renacentista o barroca; que
        usa octosílabos apunta al romance popular.
      </p>

      <H3>Cómputo silábico</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Para contar las sílabas de un verso se aplican estas reglas:
      </p>
      <div className="space-y-3">
        <Def titulo="Sinalefa">
          Cuando una palabra termina en vocal y la siguiente empieza en vocal (o h muda), las dos
          vocales se cuentan como una sola sílaba. Es la regla más frecuente.{" "}
          <em>«la es-tre-lla-a-pa-re-ce»</em> → la sinalefa une «lla» y «a».
        </Def>
        <Def titulo="Acento final del verso">
          Si el último acento del verso cae en sílaba <strong>aguda</strong> (oxítona), se suma 1.
          Si cae en sílaba <strong>esdrújula</strong> (proparoxítona), se resta 1. Si es
          <strong>llana</strong> (paroxítona, lo más habitual), el recuento no varía.
        </Def>
      </div>

      <H3>Tipos de verso más frecuentes en el IB</H3>
      <Tabla
        cabeceras={["Nombre", "Sílabas", "Uso habitual", "Ejemplo"]}
        filas={[
          [
            "Octosílabo",
            "8",
            "Romance, poesía popular, teatro del Siglo de Oro",
            "«Verde que te quie-ro ver-de»",
          ],
          [
            "Endecasílabo",
            "11",
            "Soneto, silva, lira. Tradición italianizante desde el Renacimiento.",
            "«Vol-ve-rán las os-cu-ras go-lon-dri-nas»",
          ],
          [
            "Alejandrino",
            "14 (7+7)",
            "Modernismo (Rubén Darío), épica medieval. Verso de arte mayor con cesura central.",
            "«Yo soy a-quel que a-yer // no más de-cí-a»",
          ],
          [
            "Verso libre",
            "Variable",
            "Poesía contemporánea, Neruda tardío, vanguardismo.",
            "Sin regla fija de sílabas.",
          ],
        ]}
      />

      <H3>Arte menor y arte mayor</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Los versos de <strong>arte menor</strong> tienen hasta 8 sílabas; los de{" "}
        <strong>arte mayor</strong>, 9 o más. Esta distinción tiene implicaciones de tono y
        tradición: el arte mayor se asocia a géneros cultos y elevados; el arte menor, a géneros
        populares y líricos.
      </p>

      <TipIB>
        En la Prueba 1 no necesitas demostrar que sabes contar sílabas mecánicamente. Lo que sí
        debes hacer es identificar el tipo de verso (octosílabo, endecasílabo…) cuando sea
        relevante, y conectarlo con la tradición literaria o el efecto rítmico que produce.
      </TipIB>
    </div>
  );
}

function contenidoRima() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">
        La rima es la repetición de sonidos al final de los versos. No es solo un elemento musical:
        la rima crea expectativas, las cumple o las defrauda, y en esa tensión genera significado.
      </p>

      <H3>Tipos de rima</H3>
      <div className="space-y-3">
        <Def titulo="Rima consonante">
          Coinciden todos los sonidos a partir de la última vocal acentuada.{" "}
          <em>«golondrina / contemplar»</em> → NO es consonante. <em>«noche / derroche»</em> → SÍ.
          La rima consonante es más estricta y da mayor sensación de cierre.
        </Def>
        <Def titulo="Rima asonante">
          Solo coinciden las <strong>vocales</strong> a partir de la última vocal acentuada.{" "}
          <em>«golondrinas / vida»</em> → asonante en i-a. El romance usa rima asonante, que suena
          más natural y popular.
        </Def>
        <Def titulo="Verso blanco">
          Tiene <strong>métrica fija</strong> pero sin rima. Frecuente en el teatro del Siglo de Oro
          y en la poesía neoclásica. No confundir con verso libre.
        </Def>
        <Def titulo="Verso libre">
          Sin métrica fija <strong>ni</strong> rima. La poesía contemporánea lo usa ampliamente. El
          ritmo surge de la sintaxis, las imágenes y la disposición tipográfica.
        </Def>
      </div>

      <H3>Esquemas de rima frecuentes</H3>
      <Tabla
        cabeceras={["Esquema", "Nombre", "Métrica habitual", "Ejemplo"]}
        filas={[
          ["ABBA", "Cuarteto", "Endecasílabo", "Soneto (estrofa 1 y 2)"],
          ["ABAB", "Serventesio", "Endecasílabo / alejandrino", "Modernismo, poesía culta"],
          ["AA", "Pareado", "Variable", "Proverbios, epigramas"],
          ["-a-a-a-a", "Romance", "Octosílabo", "Versos impares libres, pares con rima asonante"],
          [
            "ABA BCB CDC",
            "Tercetos encadenados",
            "Endecasílabo",
            "Divina Comedia, influencia italiana",
          ],
        ]}
      />

      <H3>El soneto</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        El soneto tiene 14 versos endecasílabos divididos en dos cuartetos (ABBA ABBA) y dos
        tercetos (CDC DCD, o variantes). Su estructura tiene una lógica argumentativa: los cuartetos
        presentan el problema o la situación; los tercetos ofrecen la resolución, el giro o la
        conclusión. El verso final suele ser el más denso semánticamente.
      </p>

      <H3>El romance</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        El romance es una serie indefinida de octosílabos donde los versos pares riman en asonante y
        los impares quedan libres. Es la forma más característica de la poesía popular española y
        fue recuperada por el Romanticismo y la Generación del 27 (Lorca lo elevó a alta poesía en
        el Romancero gitano).
      </p>

      <TipIB>
        Cuando identifiques la rima, pregúntate qué palabras quedan unidas por ella. En Bécquer, la
        rima consonante de «contemplar / nuestros nombres» une dos ideas que el poema quiere
        vincular emocionalmente. La rima no es solo música: es argumento.
      </TipIB>
    </div>
  );
}

function contenidoNarratologia() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">
        La narratología estudia cómo están construidas las narraciones. En la Prueba 1, las
        preguntas más frecuentes sobre prosa tienen que ver con el narrador, el tiempo y la función
        del espacio.
      </p>

      <H3>Tipos de narrador</H3>
      <Tabla
        cabeceras={["Tipo", "Persona", "Qué sabe", "Efecto"]}
        filas={[
          [
            "Omnisciente",
            "3ª",
            "Todo: pensamientos, sentimientos y acciones de todos los personajes",
            "Sensación de control total; autoridad narrativa",
          ],
          [
            "Focalización interna (equisciente)",
            "3ª",
            "Solo lo que sabe un personaje específico",
            "Intimidad con ese personaje; suspense sobre lo que los demás piensan",
          ],
          [
            "1ª persona protagonista",
            "1ª",
            "Sus propias experiencias y percepciones",
            "Subjetividad marcada; el lector debe evaluar la fiabilidad del narrador",
          ],
          [
            "1ª persona testigo",
            "1ª",
            "Lo que observa desde fuera; no accede a la mente del protagonista",
            "Distancia y objetividad aparente; el protagonista se vuelve misterioso",
          ],
          [
            "2ª persona",
            "2ª (tú/usted)",
            "Implica directamente al lector",
            "Efecto inmersivo o acusatorio; muy poco frecuente",
          ],
        ]}
      />

      <H3>Narrador fidedigno vs. no fidedigno</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Un narrador en 1ª persona puede ser <strong>no fidedigno</strong>: sus afirmaciones no son
        objetivamente ciertas, ya sea por ignorancia, autoengaño o mentira deliberada. Detectar la
        no fiabilidad de un narrador es un análisis de nivel IB: implica leer lo que el narrador
        dice <em>y</em> lo que el texto muestra a pesar de lo que él dice.
      </p>

      <H3>Tiempo narrativo</H3>
      <div className="space-y-3">
        <Def titulo="Analepsis (flashback)">
          El relato retrocede en el tiempo para narrar algo anterior al momento presente de la
          historia. Efecto: explicar el origen de una situación, crear contraste entre pasado y
          presente.
        </Def>
        <Def titulo="Prolepsis (flashforward)">
          El relato anticipa eventos futuros. Ejemplo: el incipit de Cien años de soledad («Muchos
          años después, frente al pelotón de fusilamiento…»). Efecto: instala la fatalidad desde el
          principio.
        </Def>
        <Def titulo="In medias res">
          El relato comienza en medio de la acción, sin introducción previa. Efecto: inmersión
          inmediata, obliga al lector a reconstruir el contexto.
        </Def>
        <Def titulo="Estructura circular">
          El relato termina en el mismo punto (o imagen) donde empezó. Efecto: sensación de
          inevitabilidad, de que nada cambia o de que el ciclo se repite.
        </Def>
      </div>

      <H3>El espacio como elemento narrativo</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        El espacio no es solo el decorado donde ocurre la acción. En los mejores textos, el espacio
        tiene <strong>función simbólica</strong>: la casa de Cortázar es la trampa; Macondo es el
        mundo en su infancia; el laberinto borgesiano es el tiempo o la mente. Cuando analices el
        espacio, pregunta siempre: ¿qué representa este lugar más allá de su función literal?
      </p>

      <TipIB>
        Siempre que identifiques el tipo de narrador, añade por qué el autor eligió ese narrador y
        qué efecto tiene. «El narrador es omnisciente» es descripción; «el narrador omnisciente nos
        permite acceder a los pensamientos de Bernarda, creando una ironía dramática entre lo que
        ella dice y lo que realmente siente» es análisis.
      </TipIB>
    </div>
  );
}

function contenidoTeatro() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">
        El teatro es el género más complejo de analizar en la Prueba 1 porque el texto no es el
        producto final: es un guion para ser representado. Esto significa que hay una dimensión
        visual y espacial que el análisis debe tener en cuenta.
      </p>

      <H3>Breve historia del teatro</H3>
      <Tabla
        cabeceras={["Período", "Características", "Autores clave"]}
        filas={[
          [
            "Teatro griego (s. V a.C.)",
            "Tragedia (conflicto fatal, catarsis) y comedia. Coro como voz colectiva.",
            "Sófocles, Eurípides, Aristófanes",
          ],
          [
            "Teatro del Siglo de Oro (s. XVI-XVII)",
            "Mezcla de tragedia y comedia (tragicomedia). Tres actos. Temas: honor, amor, fe.",
            "Lope de Vega, Calderón de la Barca",
          ],
          [
            "Teatro moderno (s. XIX-XX)",
            "Realismo psicológico, simbolismo, crítica social. Reducción del elemento espectacular.",
            "Ibsen, Chéjov, García Lorca, Brecht",
          ],
          [
            "Teatro contemporáneo",
            "Teatro del absurdo, metateatro, fragmentación, ruptura de la cuarta pared.",
            "Beckett, Ionesco, Arrabal",
          ],
        ]}
      />

      <H3>Elementos del texto dramático</H3>
      <div className="space-y-3">
        <Def titulo="Acotaciones">
          Instrucciones del dramaturgo sobre el espacio, los gestos, el tono o la escenografía.
          Están en cursiva o entre paréntesis. En la Prueba 1 son analizables: revelan la intención
          del autor que los personajes no pueden expresar con palabras.
        </Def>
        <Def titulo="Diálogo">
          El intercambio de palabras entre dos o más personajes. Es el cuerpo principal del texto
          teatral. El análisis debe atender a lo que se dice y a lo que se <em>no</em> se dice
          (silencios, evasiones).
        </Def>
        <Def titulo="Monólogo">
          Un personaje habla durante un tiempo prolongado sin interrupciones. Puede estar dirigido a
          otros personajes presentes o a sí mismo.
        </Def>
        <Def titulo="Soliloquio">
          El personaje reflexiona en voz alta, generalmente solo en escena. El lector / espectador
          accede a sus pensamientos íntimos. Técnica equivalente al monólogo interior en narrativa.
        </Def>
        <Def titulo="Aparte">
          El personaje dice algo al público (o a sí mismo) que los otros personajes que están en
          escena fingen no oír. Crea una complicidad entre el personaje y el espectador. Frecuente
          en el teatro del Siglo de Oro.
        </Def>
      </div>

      <H3>Géneros teatrales</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        La <strong>tragedia</strong> presenta un conflicto inevitable que lleva al protagonista a un
        final funesto; genera <em>catarsis</em> (purga emocional) en el espectador. La{" "}
        <strong>comedia</strong> termina felizmente y suele incluir crítica social mediante el
        humor. La <strong>tragicomedia</strong>, introducida por Lope de Vega, mezcla elementos de
        ambas: personajes nobles y vulgares, momentos trágicos y cómicos.
      </p>

      <H3>El conflicto dramático</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Todo texto teatral se organiza en torno a un <strong>conflicto</strong>: la tensión entre
        fuerzas opuestas. Puede ser externo (entre personajes: Bernarda vs. sus hijas; el pueblo vs.
        el Comendador) o interno (dentro del propio personaje: la duda de Hamlet). Identificar el
        conflicto es identificar el motor de la obra.
      </p>

      <TipIB>
        En la Prueba 1, si el texto es teatro, analiza siempre las acotaciones: son la voz del
        dramaturgo que los personajes no pueden expresar. El bastón de Bernarda, la escenografía que
        Lorca describe, los silencios indicados en una acotación: todo es material analizable.
      </TipIB>
    </div>
  );
}

function contenidoRecursos() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">
        Identificar un recurso literario es el punto de partida, no el objetivo. El IB no evalúa si
        sabes nombrar figuras retóricas: evalúa si sabes explicar qué hacen en el texto y cómo
        contribuyen al significado global.
      </p>

      <H3>La estructura INCA</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Para analizar cualquier recurso en la Prueba 1, aplica esta estructura:
      </p>
      <div className="space-y-2">
        <Def titulo="I — Identificar">
          Nombra el recurso con precisión: no «hay una repetición» sino «hay una anáfora».
        </Def>
        <Def titulo="N — Nombrar el fragmento">
          Cita el fragmento exacto donde aparece. La cita debe ser breve y precisa.
        </Def>
        <Def titulo="C — Conectar con el significado">
          Explica qué hace el recurso en ese contexto: ¿qué intensifica, qué contrasta, qué sugiere,
          qué enmascara?
        </Def>
        <Def titulo="A — Articular el efecto en el lector">
          ¿Qué le produce al lector? ¿Qué emoción, qué idea, qué pregunta despierta?
        </Def>
      </div>

      <H3>Descripción vs. análisis: la diferencia en el examen</H3>
      <div className="space-y-3">
        <div className="p-4 rounded-lg border border-rose-300 bg-rose-50/50">
          <div className="text-[10px] uppercase tracking-[0.18em] text-rose-700 mb-2">
            Descripción (insuficiente)
          </div>
          <p className="text-sm text-foreground/80 italic">
            «Neruda usa anáfora en el Poema XX: repite el verso "Puedo escribir los versos más
            tristes esta noche" varias veces.»
          </p>
        </div>
        <div className="p-4 rounded-lg border border-emerald-300 bg-emerald-50/50">
          <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-700 mb-2">
            Análisis (nivel IB)
          </div>
          <p className="text-sm text-foreground/80 italic">
            «La anáfora del verso "Puedo escribir los versos más tristes esta noche" regresa a lo
            largo del poema marcando cada oscilación emocional del hablante lírico: cada vez que el
            verso reaparece, el hablante ha intentado sin éxito distanciarse del recuerdo. La
            repetición mimetiza en la forma la incapacidad de olvidar —el verso vuelve como vuelve
            el amante a los mismos pensamientos.»
          </p>
        </div>
      </div>

      <H3>Los cinco errores más frecuentes</H3>
      <div className="space-y-2">
        {[
          {
            n: "1",
            titulo: "Nombrar sin analizar",
            texto:
              "Listar recursos sin explicar su efecto. El corrector IB necesita saber qué hace el recurso, no solo que existe.",
          },
          {
            n: "2",
            titulo: "Decir «el autor» en poesía",
            texto:
              "En poesía, siempre es «el hablante lírico» o «la voz poética». Decir «Lorca dice» implica que el poema es autobiográfico, lo que es una simplificación inaceptable en el IB.",
          },
          {
            n: "3",
            titulo: "Analizar el contenido, no la forma",
            texto:
              "Parafrasear lo que dice el texto en lugar de analizar cómo lo dice. La Prueba 1 evalúa el análisis literario, no el resumen.",
          },
          {
            n: "4",
            titulo: "Citar demasiado",
            texto:
              "Las citas largas consumen espacio sin aportar análisis. Cita lo mínimo necesario y analiza lo máximo posible.",
          },
          {
            n: "5",
            titulo: "Repetir la misma idea",
            texto:
              "Decir lo mismo con distintas palabras en varios párrafos. El corrector busca profundidad, no extensión.",
          },
        ].map((e) => (
          <div key={e.n} className="flex gap-3 p-3 rounded-md border border-border bg-card">
            <span className="text-[11px] font-bold text-muted-foreground mt-0.5 shrink-0 w-4">
              {e.n}
            </span>
            <div>
              <span className="text-sm font-medium text-ink">{e.titulo}. </span>
              <span className="text-sm text-foreground/80">{e.texto}</span>
            </div>
          </div>
        ))}
      </div>

      <H3>Jerarquía de análisis</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        No todos los recursos tienen el mismo peso. En la Prueba 1, prioriza los recursos que
        aparecen de forma sistemática (el color verde como símbolo en todo el poema de Lorca, la
        anáfora que estructura el Poema XX) sobre los que aparecen una sola vez. Un recurso
        recurrente es una elección deliberada; un recurso aislado puede ser relevante o no.
      </p>

      <TipIB>
        La pregunta que un corrector IB se hace al leer tu análisis es: «¿Por qué el autor eligió
        este recurso en este momento? ¿Qué conseguiría con otra elección que no consigue con esta?».
        Si puedes responder esa pregunta, estás analizando.
      </TipIB>
    </div>
  );
}

const CONTENIDOS: Record<string, () => React.JSX.Element> = {
  generos: contenidoGeneros,
  movimientos: contenidoMovimientos,
  poesia: contenidoPoesia,
  versificacion: contenidoVersificacion,
  rima: contenidoRima,
  narratologia: contenidoNarratologia,
  teatro: contenidoTeatro,
  recursos: contenidoRecursos,
};

// ── COMPONENTES ──────────────────────────────────────────────

function SeccionDetalle({ seccion, onVolver }: { seccion: Seccion; onVolver: () => void }) {
  const renderContenido = CONTENIDOS[seccion.id];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        <Button variant="ghost" size="sm" onClick={onVolver} className="mb-6">
          <ChevronLeft className="h-4 w-4" />
          Volver a la teoría
        </Button>

        <div className="mb-6">
          <span
            className={cn(
              "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border mb-3 inline-block",
              TAG_COLOR[seccion.tag],
            )}
          >
            {seccion.tag}
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-ink">{seccion.titulo}</h1>
        </div>

        <Card className="p-6 sm:p-8">{renderContenido()}</Card>
      </main>
    </div>
  );
}

function TeoriaPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Seccion | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Cargando…
      </div>
    );
  }

  if (selected) {
    return <SeccionDetalle seccion={selected} onVolver={() => setSelected(null)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <div className="mb-8">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Teoría
          </div>
          <h1 className="font-serif text-3xl text-ink">Fichas de teoría literaria</h1>
          <p className="text-foreground/70 mt-2 max-w-2xl">
            Ocho fichas con los conceptos teóricos fundamentales para la Prueba 1 del IB Español A:
            géneros, movimientos, versificación, narratología y más.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SECCIONES.map((s) => (
            <button key={s.id} onClick={() => setSelected(s)} className="text-left group">
              <Card className="p-5 h-full flex flex-col gap-3 transition-colors hover:border-primary/40 hover:bg-accent/20">
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border self-start",
                    TAG_COLOR[s.tag],
                  )}
                >
                  {s.tag}
                </span>
                <div className="flex-1">
                  <div className="font-serif text-base text-ink leading-snug">{s.titulo}</div>
                  <div className="text-xs text-foreground/60 mt-1.5 leading-relaxed">
                    {s.descripcion}
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
