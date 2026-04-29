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
      { title: "Teoría — LIBerico" },
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
  Escritura: "bg-teal-500/15 text-teal-700 border-teal-300",
};

const SECCIONES: Seccion[] = [
  {
    id: "movimientos",
    titulo: "Movimientos literarios",
    descripcion:
      "Del Romanticismo al Boom latinoamericano: características, autores y contexto histórico.",
    tag: "Contexto",
  },
  {
    id: "poesia",
    titulo: "Poesía",
    descripcion:
      "Hablante lírico y sinónimos, métrica, isosilabismo, encabalgamiento, soneto y romance.",
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
  {
    id: "vocabulario",
    titulo: "Vocabulario de análisis literario",
    descripcion:
      "Conectores del discurso, verbos analíticos y evaluativos, adverbios, sinónimos clave y frases de arranque.",
    tag: "Escritura",
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

      <H3>Terminología equivalente</H3>
      <Tabla
        cabeceras={["Término", "Cuándo usarlo", "Nota"]}
        filas={[
          ["Hablante lírico", "Siempre. Término neutro y académico.", "Recomendado en la Prueba 1"],
          [
            "Yo poético / Yo lírico",
            "Cuando la voz habla en 1.ª persona explícita.",
            "«Yo soy un hombre sincero…»",
          ],
          [
            "Voz poética / Voz lírica",
            "Equivalente a hablante lírico; énfasis en la enunciación.",
            "Intercambiable con hablante lírico",
          ],
          [
            "Tú poético / Tú lírico",
            "El destinatario al que el hablante se dirige en el poema.",
            "«No te muevas, no respires…» (Paz)",
          ],
        ]}
      />

      <H3>Tono y temple de ánimo</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        El <strong>tono</strong> es la actitud del hablante lírico ante el tema: nostálgico,
        irónico, exaltado, melancólico, desafiante, íntimo, solemne. El{" "}
        <strong>temple de ánimo</strong> es el estado emocional general que transmite el poema al
        lector. Ambos se construyen a través de los recursos léxicos y formales, no son datos
        externos al texto.
      </p>

      <H3>Cómputo silábico</H3>
      <div className="space-y-3">
        <Def titulo="Sinalefa">
          Cuando una palabra termina en vocal y la siguiente empieza en vocal (o h muda), las dos
          vocales se cuentan como una sola sílaba. <em>«la es-tre-lla a-pa-re-ce»</em> → la sinalefa
          une «lla» y «a».
        </Def>
        <Def titulo="Acento final del verso">
          Si el último acento cae en sílaba <strong>aguda</strong> (oxítona), se suma 1. Si cae en
          sílaba <strong>esdrújula</strong> (proparoxítona), se resta 1. Si es{" "}
          <strong>llana</strong> (lo más habitual), el recuento no varía.
        </Def>
      </div>

      <H3>Versos isosilábicos y anisosilábicos</H3>
      <div className="space-y-3">
        <Def titulo="Isosilábico">
          Todos los versos tienen el mismo número de sílabas. Es la norma de la poesía clásica
          española (soneto, lira, décima…). Crea un ritmo regular y previsible.{" "}
          <em>«Cerrar podrá mis ojos la postrera»</em> /{" "}
          <em>«sombra que me llevare el blanco día»</em> — ambos endecasílabos (11 sílabas).
        </Def>
        <Def titulo="Anisosilábico">
          Los versos tienen distinto número de sílabas. Característico del verso libre y de
          variantes modernas. El contenido dicta la longitud del verso; produce un ritmo variable y
          menos predecible. <em>«Puedo escribir los versos más tristes esta noche»</em> — verso
          libre, sin medida fija.
        </Def>
      </div>

      <H3>Tipos de verso más frecuentes en el IB</H3>
      <Tabla
        cabeceras={["Nombre", "Sílabas", "Arte", "Uso habitual"]}
        filas={[
          ["Octosílabo", "8", "Menor", "Romance, poesía popular, teatro del Siglo de Oro"],
          [
            "Endecasílabo",
            "11",
            "Mayor",
            "Soneto, silva, lira. Tradición italianizante desde el Renacimiento.",
          ],
          [
            "Alejandrino",
            "14 (7+7)",
            "Mayor",
            "Modernismo (Darío), épica medieval. Cesura central obligatoria.",
          ],
          ["Verso libre", "Variable", "—", "Poesía contemporánea, Neruda, vanguardismo."],
        ]}
      />

      <H3>Verso esticomítico y encabalgamiento</H3>
      <Def titulo="Verso esticomítico">
        La unidad sintáctica coincide exactamente con el verso: la oración o sintagma se cierra al
        final del verso sin desbordarse al siguiente. Produce un ritmo cortado y enfático; cada
        verso es autónomo semánticamente.{" "}
        <em>«Verde que te quiero verde. / Verde viento. Verdes ramas.»</em> — cada verso es una
        unidad cerrada (Lorca, «Romance sonámbulo»).
      </Def>
      <Def titulo="Encabalgamiento">
        La oración o sintagma comenzado en un verso continúa en el siguiente, rompiendo la pausa
        métrica esperada. Crea tensión entre el ritmo del verso y el flujo del sentido; el lector
        queda en suspenso al final del verso encabalgante.
      </Def>
      <Tabla
        cabeceras={["Tipo", "Definición", "Ejemplo"]}
        filas={[
          [
            "Suave",
            "La pausa sintáctica llega tarde en el verso siguiente (el elemento montado es largo). El desbordamiento se percibe con suavidad.",
            "«Cerrar podrá mis ojos la postrera / sombra que me llevare el blanco día» (Quevedo)",
          ],
          [
            "Abrupto",
            "La pausa llega muy pronto en el verso siguiente (el elemento montado es muy corto). Produce un corte brusco y enfático.",
            "«La luna vino a la fragua / con su polisón de nardos.» (Lorca)",
          ],
          [
            "Sirremático",
            "La ruptura separa dos elementos de un mismo sintagma (artículo + sustantivo, adjetivo + sustantivo…). Forma más frecuente en la poesía clásica.",
            "«…y podrá desatar esta alma / mía» — «esta alma» separado de «mía» (Quevedo)",
          ],
        ]}
      />

      <H3>Tipos de rima</H3>
      <div className="space-y-3">
        <Def titulo="Rima consonante">
          Coinciden todos los sonidos a partir de la última vocal acentuada.{" "}
          <em>«noche / derroche»</em> → consonante. Más estricta; mayor sensación de cierre formal.
        </Def>
        <Def titulo="Rima asonante">
          Solo coinciden las <strong>vocales</strong> a partir de la última vocal acentuada.{" "}
          <em>«golondrinas / vida»</em> → asonante en i-a. El romance usa rima asonante: suena más
          natural y popular.
        </Def>
        <Def titulo="Verso blanco">
          Métrica fija pero sin rima. Frecuente en el teatro del Siglo de Oro y en la poesía
          neoclásica.
        </Def>
        <Def titulo="Verso libre">
          Sin métrica fija <strong>ni</strong> rima. El ritmo surge de la sintaxis, las imágenes y
          la disposición tipográfica.
        </Def>
      </div>

      <H3>El soneto</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Forma estrófica de <strong>14 versos endecasílabos</strong> distribuidos en dos cuartetos
        (ABBA ABBA) y dos tercetos (CDC DCD o variantes). Estructura argumentativa tripartita:
        planteamiento (cuartetos) → desarrollo → síntesis o <em>volta</em> (tercetos). El verso
        final suele ser el más denso semánticamente.
      </p>
      <div className="p-4 rounded-lg border border-border bg-muted/30 mt-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          Ejemplo completo
        </div>
        <pre className="font-serif text-sm text-ink leading-relaxed whitespace-pre-wrap">{`Cerrar podrá mis ojos la postrera  (A)
sombra que me llevare el blanco día,  (B)
y podrá desatar esta alma mía  (B)
hora a su afán ansioso lisonjera;  (A)

mas no, de esotra parte, en la ribera,  (A)
dejará la memoria, en donde ardía;  (B)
nadar sabe mi llama el agua fría,  (B)
y perder el respeto a ley severa.  (A)

Alma a quien todo un dios prisión ha sido,  (C)
venas que humor a tanto fuego han dado,  (D)
médulas que han gloriosamente ardido,  (C)

su cuerpo dejará, no su cuidado;  (D)
serán ceniza, mas tendrán sentido;  (C)
polvo serán, mas polvo enamorado.  (D)`}</pre>
        <p className="text-xs text-muted-foreground mt-2">
          — Francisco de Quevedo, «Amor constante más allá de la muerte» (s. XVII)
        </p>
        <p className="text-xs text-foreground/70 mt-1.5 leading-relaxed">
          La <em>volta</em> está en «mas no» (v. 5): el hablante acepta la muerte del cuerpo pero
          niega la del amor. El verso final concentra la paradoja central del poema.
        </p>
      </div>

      <H3>El romance</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Serie indefinida de <strong>octosílabos</strong> con{" "}
        <strong>rima asonante en los versos pares</strong>; los impares quedan libres. Forma de raíz
        oral y popular fijada en la tradición española desde la Edad Media. En el s. XX, Lorca la
        recupera en el <em>Romancero gitano</em> dotándola de un lirismo y un simbolismo modernos.
      </p>
      <div className="p-4 rounded-lg border border-border bg-muted/30 mt-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          Ejemplo
        </div>
        <pre className="font-serif text-sm text-ink leading-relaxed whitespace-pre-wrap">{`Abenámar, Abenámar,  (-)
moro de la morería,  (a)
el día que tú naciste  (-)
grandes señales había.  (a)
Estaba la mar en calma,  (-)
la luna estaba crecida,  (a)
moro que en tal signo nace  (-)
no debe decir mentira.  (a)`}</pre>
        <p className="text-xs text-muted-foreground mt-2">
          — «Romance de Abenámar» (anónimo medieval). Rima asonante en -ía.
        </p>
        <p className="text-xs text-foreground/70 mt-1.5 leading-relaxed">
          Observa el diálogo directo, el inicio in medias res y el final abierto: marcas narrativas
          características del romance.
        </p>
      </div>

      <H3>Principales géneros poéticos</H3>
      <Tabla
        cabeceras={["Género", "Características", "Ejemplo"]}
        filas={[
          [
            "Soneto",
            "14 versos endecasílabos: dos cuartetos + dos tercetos. Estructura argumentativa.",
            "Quevedo, Garcilaso (ss. XVI-XVII)",
          ],
          [
            "Romance",
            "Serie indefinida de octosílabos con rima asonante en los pares.",
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

      <TipIB>
        Cuando analices un poema, menciona el tipo de verso y la rima en la introducción y conecta
        esa elección formal con el tono y el tema. Un endecasílabo en soneto trae consigo toda la
        tradición renacentista y barroca; el octosílabo del romance, el peso de la poesía popular.
        Recuerda además: en poesía, la voz es siempre «el hablante lírico» —nunca «el poeta» o el
        nombre del autor.
      </TipIB>
    </div>
  );
}

function contenidoNarratologia() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">
        La narratología es la disciplina que estudia la estructura y el funcionamiento de los relatos.
        Distingue entre <strong>qué</strong> se cuenta (historia) y <strong>cómo</strong> se cuenta
        (discurso). Dominar esta distinción es clave para el análisis de prosa en la Prueba 1.
      </p>

      {/* 1. Historia vs Discurso */}
      <H3>Historia y discurso</H3>
      <div className="space-y-3">
        <Def titulo="Historia (fábula)">
          La secuencia lógica y cronológica de los acontecimientos tal como habrían ocurrido en la
          realidad. Es el «qué»: los hechos en su orden natural.
        </Def>
        <Def titulo="Discurso (sujeto)">
          La manera en que esos hechos son presentados al lector: el orden elegido, el ritmo, el
          punto de vista, los recursos. Es el «cómo»: la construcción artística del relato.
        </Def>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Un mismo conjunto de hechos puede contarse de formas radicalmente distintas. El análisis
        narratológico consiste en comparar la historia con el discurso: ¿por qué el autor eligió
        empezar por el final? ¿Por qué omitió ciertos datos? ¿Qué efecto produce ese orden?
      </p>

      {/* 2. Narrador, narratario, pacto ficcional */}
      <H3>Narrador, narratario y pacto ficcional</H3>
      <div className="space-y-3">
        <Def titulo="Narrador">
          Instancia textual que cuenta la historia. No es el autor: es una voz construida por el
          texto. Puede ser fiable o no fiable, cercano o distante, omnisciente o limitado.
        </Def>
        <Def titulo="Narratario">
          El receptor implícito al que se dirige el narrador dentro del texto. No es el lector real,
          sino una figura construida: «tú, lector» en Cervantes, el jurado en una novela epistolar,
          etc. Identificar el narratario revela mucho sobre el tono y la estrategia retórica.
        </Def>
        <Def titulo="Pacto ficcional (verosimilitud)">
          Acuerdo tácito entre texto y lector: aceptamos las convenciones del mundo narrado.
          El narrador omnisciente que conoce los pensamientos íntimos de todos los personajes es
          inverosímil en la vida real, pero el pacto ficcional lo hace aceptable. Cuando un texto
          rompe ese pacto deliberadamente (metaficción, narrador no fiable) el efecto es
          desconcertante o revelador.
        </Def>
      </div>

      {/* 3. La acción */}
      <H3>La acción: estructura y técnicas</H3>
      <div className="space-y-3">
        <Def titulo="In medias res">
          El relato comienza en mitad de la acción, sin introducción previa. Obliga al lector a
          reconstruir el contexto y crea inmersión inmediata.
        </Def>
        <Def titulo="In extrema res">
          El relato comienza directamente en el desenlace o en el punto de mayor tensión. Genera
          expectativa invertida: sabemos el resultado, pero no cómo se llegó a él.
        </Def>
        <Def titulo="Final abierto">
          El texto termina sin resolver la tensión central. El lector debe completar el significado.
          Efecto: ambigüedad, invitación a la interpretación, mímesis de la vida real.
        </Def>
        <Def titulo="Digresión">
          Interrupción del hilo narrativo para incluir reflexiones, descripciones o historias
          secundarias. Puede ser decorativa, simbólica o funcionalmente retardataria (dilata el clímax).
        </Def>
        <Def titulo="Contrapunto">
          Alternancia entre dos o más líneas narrativas simultáneas que se iluminan mutuamente por
          contraste o paralelismo. Técnica cinematográfica adaptada a la prosa.
        </Def>
      </div>

      {/* 4. La descripción */}
      <H3>La descripción</H3>
      <div className="space-y-3">
        <Def titulo="Prosopografía">
          Descripción del aspecto físico de un personaje: rasgos, complexión, ropa, gestos. En el
          IB, analiza qué selecciona el narrador y por qué: cada detalle físico puede ser simbólico.
        </Def>
        <Def titulo="Etopeya">
          Descripción del carácter, valores, comportamientos y mundo interior de un personaje.
          A menudo más reveladora que la prosopografía: muestra al personaje en acción o en pensamiento.
        </Def>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Las descripciones cumplen cuatro funciones narrativas:
      </p>
      <Tabla
        cabeceras={["Función", "Qué hace", "Efecto"]}
        filas={[
          [
            "Dilatoria",
            "Detiene el avance de la acción para describir",
            "Crea suspense, retarda el clímax, da tiempo al lector para situarse",
          ],
          [
            "Demarcativa",
            "Marca un cambio de escena, tiempo o perspectiva",
            "Señaliza transiciones; organiza la estructura del relato",
          ],
          [
            "Simbólica",
            "El objeto o lugar descrito representa algo más",
            "Condensa significado; convierte detalles en metáforas del tema",
          ],
          [
            "Decorativa",
            "Ambienta sin función estructural directa",
            "Crea atmósfera, verosimilitud, placer estético",
          ],
        ]}
      />

      {/* 5. El tiempo narrativo */}
      <H3>El tiempo narrativo</H3>
      <div className="space-y-3">
        <Def titulo="Tiempo externo">
          El periodo histórico en que se sitúa la historia (época, año, contexto sociopolítico).
          Puede ser explícito («Madrid, 1936») o reconstruible por referencias culturales.
        </Def>
        <Def titulo="Tiempo interno">
          La duración y organización interna del relato: cuánto tiempo abarca, cómo se distribuye
          esa duración a lo largo del texto, qué momentos se dilatan y cuáles se comprimen.
        </Def>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed font-medium">Anacronías (alteraciones del orden cronológico):</p>
      <div className="space-y-3">
        <Def titulo="Analepsis (flashback)">
          El relato retrocede al pasado para narrar algo anterior al presente de la historia.
          Efecto: explicar el origen de un conflicto, contrastar pasado y presente, revelar
          información retenida para crear suspense.
        </Def>
        <Def titulo="Prolepsis (flashforward)">
          El relato anticipa eventos futuros. Ejemplo canónico: el incipit de{" "}
          <em>Cien años de soledad</em> («Muchos años después, frente al pelotón de fusilamiento…»).
          Efecto: instala la fatalidad desde el inicio; el lector sabe el destino pero no el camino.
        </Def>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed font-medium mt-3">
        Anisocronías (ritmo narrativo): relación entre tiempo de la historia y espacio del texto
      </p>
      <Tabla
        cabeceras={["Modalidad", "Definición", "Efecto típico"]}
        filas={[
          [
            "Escena",
            "El tiempo de la historia y el del discurso son equivalentes (diálogos, acción directa)",
            "Inmersión; el lector vive los hechos en tiempo real",
          ],
          [
            "Resumen",
            "Se condensan años en pocas líneas",
            "Acelera la narración; salta lo irrelevante; da perspectiva temporal amplia",
          ],
          [
            "Pausa",
            "La acción se detiene para una descripción o reflexión",
            "Enfatiza un elemento; crea atmósfera; dilata el tiempo",
          ],
          [
            "Elipsis",
            "Se omite un periodo sin mencionarlo",
            "El lector debe inferir qué pasó; puede crear misterio o agilizar el ritmo",
          ],
          [
            "Paralipsis",
            "Se omite deliberadamente información relevante que debería haberse dado",
            "Narrador no fiable o estratégicamente selectivo; genera suspense o ambigüedad",
          ],
        ]}
      />

      {/* 6. El espacio */}
      <H3>El espacio narrativo</H3>
      <div className="space-y-3">
        <Def titulo="Espacio objetivo">
          El lugar tal como se describe de forma observable y concreta: «una habitación con paredes
          blancas, una sola ventana al este». El narrador no filtra emocionalmente.
        </Def>
        <Def titulo="Espacio subjetivo (espacio-reflejo)">
          El espacio filtrado por la conciencia o el estado emocional del personaje. El mismo cuarto
          puede ser «luminoso» para uno y «claustrofóbico» para otro. El espacio refleja la
          interioridad: analiza si el ambiente refuerza o contradice el estado del personaje.
        </Def>
        <Def titulo="Espacio-ambiente">
          El entorno que determina o condiciona la psicología de los personajes y el desarrollo de
          la acción. Recurso central del Naturalismo: el medio moldea al individuo.
        </Def>
      </div>
      <TipIB>
        Cuando analices el espacio, pregunta siempre: ¿qué representa este lugar más allá de su
        función literal? La casa de Cortázar es la trampa mental; el laberinto borgesiano es el
        tiempo o el pensamiento; Macondo es el origen del mundo. El espacio narrativo rara vez es
        neutro en los textos de calidad literaria.
      </TipIB>

      {/* 7. Los personajes */}
      <H3>Los personajes</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Los personajes se pueden clasificar según su presencia en el texto y según su complejidad:
      </p>
      <Tabla
        cabeceras={["Por aparición", "Descripción"]}
        filas={[
          ["Protagonista", "Centro de la acción; la historia gira en torno a él"],
          ["Antagonista", "Se opone al protagonista; genera el conflicto principal"],
          ["Personaje secundario", "Apoya o complica la trama; puede tener su propio arco"],
          ["Personaje episódico", "Aparece brevemente; función puntual o simbólica"],
          ["Personaje colectivo", "Un grupo que actúa como unidad (el pueblo, la familia, la masa)"],
        ]}
      />
      <Tabla
        cabeceras={["Por caracterización (E.M. Forster)", "Descripción"]}
        filas={[
          [
            "Plano (flat)",
            "Definido por un solo rasgo dominante; predecible; sin evolución. Funciona como arquetipo o símbolo.",
          ],
          [
            "Redondo (round)",
            "Complejo, contradictorio, capaz de sorprender. Evoluciona a lo largo del relato. Mímesis psicológica.",
          ],
        ]}
      />
      <div className="space-y-3 mt-3">
        <Def titulo="Monólogo interior">
          Reproducción directa del flujo de pensamiento de un personaje, generalmente en primera
          persona y presente. Muestra la mente tal como piensa: sin filtro narrativo, con
          asociaciones libres. Ejemplo: Molly Bloom en{" "}
          <em>Ulises</em> de Joyce.
        </Def>
        <Def titulo="Corriente de conciencia (stream of consciousness)">
          Técnica narrativa más radical que el monólogo interior: reproduce el pensamiento
          fragmentado, prelingüístico, asociativo, incluyendo percepciones sensoriales y memoria
          involuntaria. La puntuación se vuelve convencional o desaparece. Efecto: máxima
          inmersión en la subjetividad del personaje.
        </Def>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Los atributos del personaje incluyen: nombre (¿significativo o neutro?), rasgos físicos
        (prosopografía), rasgos psicológicos (etopeya), función en la trama, relaciones con otros
        personajes y valor simbólico.
      </p>

      {/* 8. El narrador: punto de vista */}
      <H3>El narrador y el punto de vista</H3>
      <p className="text-sm text-foreground/80 leading-relaxed font-medium">
        Participación del narrador en la historia (Genette):
      </p>
      <Tabla
        cabeceras={["Tipo", "Definición", "Personas gramaticales"]}
        filas={[
          [
            "Heterodiegético",
            "El narrador no es personaje de la historia que cuenta. Externo, fuera de la fábula.",
            "3ª persona",
          ],
          [
            "Homodiegético",
            "El narrador participa en la historia que cuenta. Puede ser protagonista o testigo.",
            "1ª persona",
          ],
          [
            "Autodiegético",
            "Variante homodiegética: el narrador es el protagonista absoluto de su propio relato.",
            "1ª persona",
          ],
        ]}
      />
      <p className="text-sm text-foreground/80 leading-relaxed font-medium mt-3">
        Perspectiva temporal del narrador:
      </p>
      <div className="space-y-3">
        <Def titulo="Perspectiva actual (simultánea)">
          El narrador cuenta los hechos mientras ocurren. Efecto de inmediatez e incertidumbre;
          el narrador no sabe cómo terminará.
        </Def>
        <Def titulo="Perspectiva retrospectiva">
          El narrador cuenta desde después de los hechos, mirando hacia atrás. Puede haber ironía
          entre lo que el personaje creía entonces y lo que el narrador sabe ahora.
        </Def>
        <Def titulo="Perspectiva prospectiva">
          El narrador anticipa lo que va a ocurrir, proyectando desde el presente hacia el futuro.
          Crea expectativa y a veces fatalismo.
        </Def>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed font-medium mt-3">
        Focalización (Genette): quién percibe, no quién habla
      </p>
      <Tabla
        cabeceras={["Focalización", "Qué sabe / percibe", "Efecto"]}
        filas={[
          [
            "Cero (narrador omnisciente)",
            "Accede a todos los pensamientos, pasados y futuros de todos los personajes. «El narrador sabe más que cualquier personaje.»",
            "Autoridad total; sensación de orden y control; típico de la novela decimonónica",
          ],
          [
            "Interna fija",
            "Adopta la perspectiva de un único personaje durante todo el relato. Solo sabe lo que ese personaje sabe.",
            "Intimidad con un solo punto de vista; el lector comparte sus limitaciones y sesgos",
          ],
          [
            "Interna variable",
            "Adopta sucesivamente la perspectiva de diferentes personajes en distintas partes del texto.",
            "Visión polifónica; el lector compara perspectivas y construye una verdad más compleja",
          ],
          [
            "Externa (narrador objetivo)",
            "Solo registra lo observable: acciones, palabras, gestos. No accede a ninguna mente.",
            "Efecto documental o behaviorista; el lector debe inferir emociones e intenciones",
          ],
          [
            "Perspectivismo",
            "Variante de la focalización variable: la misma historia se narra desde puntos de vista opuestos que se contradicen.",
            "Relativismo epistémico; ninguna versión es «la verdad»; característico de Unamuno o Faulkner",
          ],
        ]}
      />
      <p className="text-sm text-foreground/80 leading-relaxed font-medium mt-3">
        Intervención del narrador en el discurso:
      </p>
      <div className="space-y-3">
        <Def titulo="Narrador subjetivo">
          Comenta, valora, juzga o ironiza sobre los hechos y personajes que narra. Su voz es
          visible y marca ideológicamente el relato.
        </Def>
        <Def titulo="Narrador objetivo (behaviorista)">
          Se limita a registrar hechos observables sin valorar ni interpretar. Semeja a una cámara
          o a un informe. El lector extrae sus propias conclusiones.
        </Def>
      </div>

      {/* 9. Estilos de discurso */}
      <H3>Estilos de reproducción del discurso</H3>
      <Tabla
        cabeceras={["Estilo", "Características", "Ejemplo"]}
        filas={[
          [
            "Directo",
            "Las palabras del personaje se reproducen literalmente, con marcas tipográficas (guion, comillas) y verbum dicendi.",
            "—Quiero marcharme —dijo Elena.",
          ],
          [
            "Indirecto",
            "El narrador reformula las palabras del personaje. Cambio de persona y tiempo verbal. Sin comillas.",
            "Elena dijo que quería marcharse.",
          ],
          [
            "Indirecto libre",
            "Las palabras o pensamientos del personaje se integran en la voz del narrador sin verbum dicendi ni marca tipográfica. Fusión de voces.",
            "¿Para qué quedarse? No había nada que la retuviera allí.",
          ],
        ]}
      />
      <p className="text-sm text-foreground/80 leading-relaxed">
        El <strong>estilo indirecto libre</strong> es el más sofisticado y el más frecuente en la
        narrativa moderna. Su efecto principal es la ambigüedad: no siempre está claro si quien
        habla es el narrador o el personaje. Identificarlo en un fragmento y explicar qué efecto
        produce es una respuesta de nivel IB.
      </p>

      {/* 10. Aspectos lingüísticos */}
      <H3>Aspectos lingüísticos del discurso narrativo</H3>
      <div className="space-y-3">
        <Def titulo="Hipotaxis">
          Construcción sintáctica subordinada: oraciones complejas encadenadas con conectores
          (porque, aunque, cuando, si bien…). Refleja pensamiento elaborado, causalidad, matiz.
          Típica del Realismo y la prosa intelectual.
        </Def>
        <Def titulo="Parataxis">
          Construcción sintáctica coordinada o yuxtapuesta: oraciones breves, pocas subordinadas,
          ritmo cortado. Crea inmediatez, urgencia o sencillez. Típica de Hemingway, el minimalismo
          y ciertos narradores no sofisticados.
        </Def>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed font-medium">
        Tiempos verbales y su función narrativa:
      </p>
      <Tabla
        cabeceras={["Tiempo verbal", "Uso narrativo", "Efecto"]}
        filas={[
          [
            "Pretérito indefinido (canté)",
            "Acción pasada concluida; tiempo base del relato",
            "Avance de la acción; distancia temporal respecto al narrador",
          ],
          [
            "Pretérito imperfecto (cantaba)",
            "Acción pasada durativa, habitual o de trasfondo",
            "Descripción, atmósfera, estado permanente; ralentiza la narración",
          ],
          [
            "Presente histórico (canta)",
            "Hechos pasados narrados en presente",
            "Vivacidad, inmediatez, dramatismo; aproxima el pasado al lector",
          ],
          [
            "Pluscuamperfecto (había cantado)",
            "Anterioridad respecto a otro tiempo pasado",
            "Marca analepsis; señala la anterioridad cronológica",
          ],
        ]}
      />

      <TipIB>
        En la Prueba 1, el análisis del narrador es uno de los elementos más valorados en el
        criterio B (Técnica y estructura). No basta con nombrar el tipo de narrador: hay que
        explicar qué efecto produce, qué información retiene o revela, y cómo esa elección refuerza
        el tema o el tono del fragmento. Relaciona siempre focalización, estilo de discurso y
        tiempo verbal como un sistema coherente de decisiones del autor.
      </TipIB>
    </div>
  );
}

function contenidoTeatro() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">
        El teatro es el género más complejo de analizar en la Prueba 1 porque el texto no es el
        producto final: es un guion para ser representado. Hay una dimensión visual, espacial y
        sonora que el análisis debe tener en cuenta incluso cuando solo se lee.
      </p>

      <H3>Orígenes: las fiestas dionisíacas</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        El teatro occidental nace en la Grecia antigua como ritual religioso en honor a{" "}
        <strong>Dioniso</strong>, dios del vino, la fertilidad y el éxtasis. Las dos grandes
        festividades eran las <strong>Leneas</strong> (invierno, competiciones de comedia) y las{" "}
        <strong>Grandes Dionisias</strong> (primavera, competiciones de tragedia). En estos
        festivales cívicos se presentaban obras ante toda la ciudad; asistir era un acto político y
        religioso, no solo de entretenimiento.
      </p>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        El origen formal del teatro se atribuye a <strong>Tespis</strong> (s. VI a.C.), que separó a
        un actor del coro para crear el diálogo. Antes existía el <strong>ditirambo</strong>: un
        himno coral cantado y bailado en honor a Dioniso, del que surgieron los primeros
        intercambios dramáticos. El <strong>coro</strong> siguió siendo esencial en la tragedia
        griega: comentaba la acción, representaba la voz de la comunidad y enlazaba los episodios
        con sus odas.
      </p>

      <H3>
        Aristóteles y la <em>Poética</em>
      </H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        En su <em>Poética</em> (s. IV a.C.), Aristóteles sistematizó el teatro griego y ofreció las
        primeras categorías analíticas de la literatura occidental. Su influencia llega hasta hoy:
        conceptos como <em>catarsis</em>, <em>hamartia</em> y los seis elementos de la tragedia son
        vocabulario activo del análisis literario.
      </p>

      <H3>Definición de tragedia (Aristóteles)</H3>
      <div className="p-4 rounded-lg border border-border bg-muted/30">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          Definición de la <em>Poética</em> (libro VI)
        </div>
        <p className="font-serif text-sm text-ink leading-relaxed italic">
          «La tragedia es la imitación de una acción noble, completa y de cierta magnitud, en un
          lenguaje embellecido, con personajes que actúan y no mediante narración, y que a través de
          la compasión y el terror provoca la catarsis de tales pasiones.»
        </p>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        Cuatro ideas clave en esta definición: (1) <strong>imitación</strong> (<em>mímesis</em>): el
        teatro representa la acción humana, no la reproduce literalmente; (2){" "}
        <strong>noble y completa</strong>: acción de cierta grandeza con principio, nudo y
        desenlace; (3) <strong>actuada</strong>: los personajes actúan, no narran; (4){" "}
        <strong>catarsis</strong>: la obra purga emocionalmente al espectador.
      </p>

      <H3>Los seis elementos de la tragedia</H3>
      <Tabla
        cabeceras={["Elemento (griego)", "Traducción", "Función"]}
        filas={[
          [
            "Mythos",
            "Trama / fábula",
            "La construcción de los hechos. El más importante según Aristóteles: «el alma de la tragedia».",
          ],
          [
            "Ethos",
            "Carácter",
            "Las disposiciones morales de los personajes; lo que revela sus elecciones y su naturaleza.",
          ],
          [
            "Dianoia",
            "Pensamiento / ideas",
            "Los argumentos y reflexiones expresados en los discursos de los personajes.",
          ],
          [
            "Lexis",
            "Elocución / lenguaje",
            "La expresión verbal: elección de palabras, estilo, ritmo del diálogo.",
          ],
          [
            "Melos",
            "Melodía / canto",
            "El elemento musical y coral. En el teatro griego, el coro cantaba entre episodios.",
          ],
          [
            "Opsis",
            "Espectáculo",
            "Lo visual y escenográfico. Aristóteles lo consideraba el menos importante artísticamente.",
          ],
        ]}
      />
      <div className="space-y-3 mt-3">
        <Def titulo="Hamartia">
          El error de juicio o falla trágica que desencadena la caída del protagonista. No es
          simplemente un defecto moral: es una equivocación —a veces producto de la hybris
          (soberbia), a veces de la ignorancia— que desata una cadena de consecuencias inevitables.
          Ejemplo: la soberbia y la terquedad de Edipo; la ambición de Macbeth.
        </Def>
        <Def titulo="Catarsis">
          La purga o purificación emocional que experimenta el espectador ante el terror y la
          compasión que provoca la tragedia. Al identificarse con el héroe que cae, el espectador
          descarga sus propias emociones reprimidas y sale emocionalmente liberado. Es el fin último
          de la tragedia para Aristóteles.
        </Def>
        <Def titulo="Hybris">
          La soberbia o desmesura del héroe trágico: el exceso de orgullo que lo lleva a desafiar el
          orden divino o natural. La hybris suele provocar la nemesis (castigo divino o del
          destino). Es una de las formas más frecuentes de hamartia.
        </Def>
      </div>

      <H3>La regla de las tres unidades</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Sistematizada por los humanistas italianos del Renacimiento a partir de la <em>Poética</em>{" "}
        de Aristóteles, y adoptada como norma del teatro clásico francés (Racine, Corneille).
        Establece que una obra de teatro debe respetar:
      </p>
      <div className="space-y-3 mt-2">
        <Def titulo="Unidad de acción">
          Una sola trama principal, sin subtramas que la distraigan. Aristóteles la menciona
          explícitamente: la fábula debe ser «una y entera». Es la única unidad que él consideró
          obligatoria.
        </Def>
        <Def titulo="Unidad de tiempo">
          La acción dramática no debe superar las 24 horas. Los humanistas dedujeron esta norma de
          una observación de Aristóteles, aunque él no la prescribió estrictamente.
        </Def>
        <Def titulo="Unidad de lugar">
          La acción ocurre en un único espacio. Esta unidad es la más artificial: no aparece en
          Aristóteles; fue añadida por los teóricos renacentistas. El teatro isabelino y el español
          del Siglo de Oro la ignoraron deliberadamente.
        </Def>
      </div>

      <H3>
        El <em>Arte nuevo de hacer comedias</em> (Lope de Vega, 1609)
      </H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        En este poema-manifiesto de 389 endecasílabos, Lope de Vega justifica —con ironía y lucidez—
        su ruptura con las reglas clásicas y define la fórmula de la <strong>comedia nueva</strong>{" "}
        española que dominaría el teatro barroco durante dos siglos.
      </p>
      <div className="space-y-2 mt-3">
        {[
          {
            t: "Ruptura con las tres unidades",
            d: "Lope rechaza las unidades de tiempo y lugar por artificiales. La acción puede durar años y trasladarse de ciudad en ciudad si la fábula lo requiere.",
          },
          {
            t: "Mezcla de lo trágico y lo cómico",
            d: "«Lo trágico y lo cómico mezclado, / Terencio con Séneca». Los personajes nobles y los vulgares (el gracioso) conviven en la misma obra, reflejando la diversidad de la vida.",
          },
          {
            t: "Tres actos en vez de cinco",
            d: "Frente a los cinco actos de la tradición grecolatina, Lope propone tres: exposición, nudo y desenlace. Esta estructura se mantiene en el teatro occidental hasta hoy.",
          },
          {
            t: "Polimetría",
            d: "Cada momento dramático tiene su metro apropiado: el romance para la narración de hechos, las redondillas para el diálogo cotidiano, el soneto para los monólogos reflexivos, las décimas para el lamento.",
          },
          {
            t: "El vulgo como árbitro",
            d: "«Porque como las paga el vulgo, es justo / hablarle en necio para darle gusto.» Lope defiende que el teatro debe conectar con el público real, no solo con los eruditos.",
          },
          {
            t: "El honor como tema central",
            d: "Junto con el amor y la fe, el honor es el motor dramático del teatro áureo: su pérdida genera el conflicto y su recuperación (o imposibilidad) dicta el desenlace.",
          },
        ].map((item) => (
          <div key={item.t} className="p-3 rounded-md border border-border bg-card flex gap-3">
            <div>
              <span className="text-sm font-medium text-ink">{item.t}. </span>
              <span className="text-sm text-foreground/80">{item.d}</span>
            </div>
          </div>
        ))}
      </div>

      <H3>La ironía dramática</H3>
      <Def titulo="Definición">
        Situación en la que el espectador (o lector) sabe algo que uno o más personajes ignoran.
        Esta asimetría de información crea tensión, suspense o pathos: el público observa cómo el
        personaje actúa sin conocer una verdad que cambiará su destino.
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        El ejemplo clásico es <em>Edipo Rey</em> de Sófocles: el espectador griego conocía el mito y
        sabía desde el principio que Edipo había matado a su padre y se había casado con su madre;
        toda la obra es una ironía dramática sostenida. En el teatro moderno, García Lorca usa la
        ironía dramática al mostrarnos la represión de la casa de Bernarda mientras el exterior late
        con vida: el espectador ve lo que los personajes no pueden ver o nombrar.
      </p>
      <div className="space-y-2 mt-2">
        {[
          {
            t: "Ironía dramática situacional",
            d: "El público sabe más que el personaje sobre los hechos. Crea suspense o pathos.",
          },
          {
            t: "Ironía dramática verbal",
            d: "Un personaje dice algo cuyo doble sentido el público entiende pero el personaje no. Frecuente en la comedia y en la tragedia shakespeariana.",
          },
          {
            t: "Ironía trágica",
            d: "El personaje avanza confiadamente hacia su propia destrucción sin saberlo. Intensifica la sensación de inevitabilidad y catarsis.",
          },
        ].map((item) => (
          <div key={item.t} className="flex gap-2 text-sm">
            <span className="font-medium text-ink min-w-[200px] shrink-0">{item.t}</span>
            <span className="text-foreground/75 leading-relaxed">{item.d}</span>
          </div>
        ))}
      </div>

      <H3>Estructura dramática</H3>
      <div className="space-y-1.5 text-sm">
        {[
          {
            t: "Acto",
            d: "Unidad mayor; equivale al capítulo en narrativa. Se separa por el descenso del telón o un cambio equivalente.",
          },
          {
            t: "Escena",
            d: "Subdivisión del acto; cambia cuando un personaje entra o sale del escenario.",
          },
          {
            t: "Cuadro",
            d: "División basada en el cambio de espacio o decorado, independientemente de los personajes.",
          },
        ].map((e) => (
          <div key={e.t} className="flex gap-2">
            <span className="font-medium text-ink min-w-[80px] shrink-0">{e.t}</span>
            <span className="text-foreground/75 leading-relaxed">{e.d}</span>
          </div>
        ))}
      </div>
      <div className="p-4 rounded-lg border border-border bg-muted/30 mt-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          Estructura interna clásica
        </div>
        <div className="space-y-1 text-sm">
          {[
            { t: "Exposición", d: "Presenta personajes, contexto y el conflicto inicial." },
            { t: "Nudo / desarrollo", d: "El conflicto se intensifica; surgen complicaciones." },
            { t: "Clímax", d: "Punto de máxima tensión dramática." },
            { t: "Desenlace", d: "Resolución del conflicto (trágica, cómica o ambigua)." },
          ].map((e) => (
            <div key={e.t} className="flex gap-2">
              <span className="font-medium text-ink min-w-[130px] shrink-0">{e.t}</span>
              <span className="text-foreground/75 leading-relaxed">{e.d}</span>
            </div>
          ))}
        </div>
      </div>

      <H3>Elementos del texto dramático</H3>
      <div className="space-y-3">
        <Def titulo="Acotaciones (didascalias)">
          Instrucciones del dramaturgo sobre el espacio, los gestos, el tono o la escenografía.
          Aparecen en cursiva o entre corchetes. En la Prueba 1 son tan analizables como los
          diálogos: revelan la intención del autor que los personajes no pueden expresar con
          palabras.
        </Def>
        <Def titulo="Diálogo">
          El intercambio de palabras entre dos o más personajes. El análisis debe atender tanto a lo
          que se dice como a lo que <em>no</em> se dice: los silencios, las evasiones y las
          interrupciones son significativos.
        </Def>
        <Def titulo="Monólogo">
          Un personaje habla durante un tiempo prolongado sin interrupciones. Puede dirigirse a
          personajes presentes, al público o a sí mismo.
        </Def>
        <Def titulo="Soliloquio">
          El personaje reflexiona en voz alta, generalmente solo en escena. El espectador accede a
          sus pensamientos íntimos. Equivalente dramático del monólogo interior en narrativa.
        </Def>
        <Def titulo="Aparte">
          El personaje dice algo al público que los otros personajes fingen no oír (convención
          teatral). Crea complicidad con el espectador. Frecuente en el Siglo de Oro.
        </Def>
      </div>

      <H3>Tipos de espacio teatral</H3>
      <div className="space-y-3">
        <Def titulo="Espacio escénico">
          El espacio físico real donde actúan los actores (el escenario). Lo que el espectador ve
          materialmente.
        </Def>
        <Def titulo="Espacio dramático">
          El espacio ficticio que la obra imagina: puede ser mucho más amplio que el escenario.
          Ciudades, batallas o interiores que no caben en el escenario existen en el espacio
          dramático, construido por el lenguaje y las acotaciones.
        </Def>
        <Def titulo="Espacio lúdico">
          La relación entre el espacio escénico y el espacio del público; el «entre» donde sucede el
          juego teatral.
        </Def>
      </div>
      <Tabla
        cabeceras={["Tipo de escenario", "Descripción", "Ejemplo histórico"]}
        filas={[
          [
            "Teatro a la italiana",
            "Escenario rectangular con arco de proscenio; público frente a la escena. Crea distancia y separación clara entre actores y espectadores.",
            "Ópera barroca; teatros del s. XIX",
          ],
          [
            "Teatro en arena (teatro circular)",
            "Escenario central rodeado por el público en todos los lados. Máxima proximidad; sin cuarta pared.",
            "Teatro griego antiguo; teatro contemporáneo",
          ],
          [
            "Teatro isabelino (thrust stage)",
            "Escenario que avanza hacia el público; espectadores en tres lados. Permite intimidad y acción simultánea.",
            "Globe Theatre de Shakespeare (Londres, 1599)",
          ],
          [
            "Corral de comedias",
            "Patio interior descubierto de edificio urbano. Tablado al fondo; público en el patio (mosqueteros), galerías y aposentos. Espacio vivo y ruidoso.",
            "Corral del Príncipe (Madrid, s. XVII)",
          ],
        ]}
      />

      <H3>La iluminación</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        En el teatro griego y del Siglo de Oro las representaciones eran diurnas y al aire libre: la
        luz natural era la única iluminación. A partir del s. XVII (teatro isabelino con velas;
        teatro italiano con candilejas) y sobre todo en el teatro moderno, la iluminación artificial
        se convierte en un recurso expresivo fundamental.
      </p>
      <div className="space-y-2 mt-3">
        {[
          {
            t: "Función atmosférica",
            d: "La luz crea el ambiente emocional de la escena: una iluminación tenue y fría produce inquietud; una luz cálida y difusa, intimidad.",
          },
          {
            t: "Función simbólica",
            d: "La luz asociada a la vida, la razón, lo divino; la oscuridad a la muerte, el miedo, lo oculto. Este simbolismo, presente ya en los textos escritos, se materializa en escena.",
          },
          {
            t: "Función directiva",
            d: "El foco de luz guía la atención del espectador hacia lo que el director quiere que vea. El resto del escenario queda en penumbra o en negro.",
          },
          {
            t: "En el análisis de texto",
            d: "Cuando el texto describe luz en sus acotaciones («sale el sol», «cae la noche», «una vela solitaria»), esa imagen es analizable como símbolo, no solo como decorado.",
          },
        ].map((item) => (
          <div key={item.t} className="flex gap-2 text-sm">
            <span className="font-medium text-ink min-w-[180px] shrink-0">{item.t}</span>
            <span className="text-foreground/75 leading-relaxed">{item.d}</span>
          </div>
        ))}
      </div>

      <H3>Géneros teatrales</H3>
      <div className="space-y-3">
        <Def titulo="Tragedia">
          Presenta un conflicto inevitable que lleva al protagonista —un ser de cierta grandeza— a
          un final funesto, habitualmente causado por su propia hamartia. Su fin es la catarsis en
          el espectador. Origen griego; máximos exponentes: Sófocles, Eurípides, Shakespeare, García
          Lorca.
        </Def>
        <Def titulo="Comedia">
          Conflictos que se resuelven favorablemente; uso del humor, la ironía, el enredo y la
          parodia. Refleja y critica costumbres sociales. Suele terminar con matrimonio o
          reconciliación. Origen griego (Aristófanes); Siglo de Oro (Lope de Vega, Tirso); comedia
          de costumbres moderna.
        </Def>
        <Def titulo="Tragicomedia / Drama">
          Combina elementos trágicos y cómicos; no necesariamente con final feliz ni fatal. Refleja
          la ambigüedad de la vida cotidiana. Lope lo teorizó en el <em>Arte nuevo</em>; es el
          género dominante en el teatro moderno y contemporáneo.
        </Def>
        <Def titulo="Teatro del absurdo">
          Corriente del s. XX (Beckett, Ionesco) que dramatiza la incomunicación humana y la
          ausencia de sentido mediante situaciones ilógicas, diálogos circulares y estructuras que
          se niegan a sí mismas. <em>Esperando a Godot</em> es el ejemplo canónico.
        </Def>
      </div>

      <H3>El conflicto dramático</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Todo texto teatral se organiza en torno a un <strong>conflicto</strong>: la tensión entre
        fuerzas opuestas. Puede ser <strong>externo</strong> (entre personajes o entre el individuo
        y la sociedad: Bernarda vs. sus hijas; Fuente Ovejuna vs. el Comendador) o{" "}
        <strong>interno</strong> (dentro del personaje: la duda de Hamlet, la ambición de Macbeth).
        En la tragedia, el conflicto es irresoluble; en la comedia, se resuelve.
      </p>

      <H3>Breve cronología</H3>
      <Tabla
        cabeceras={["Período", "Características", "Autores clave"]}
        filas={[
          [
            "Teatro griego (ss. VI-IV a.C.)",
            "Fiestas dionisíacas. Tragedia, comedia, sátira. Coro, máscara, anfiteatro al aire libre.",
            "Esquilo, Sófocles, Eurípides, Aristófanes",
          ],
          [
            "Teatro romano (ss. III a.C.–V d.C.)",
            "Adapta los modelos griegos. Comedia de enredo. Primer teatro con edificio fijo.",
            "Plauto, Terencio, Séneca",
          ],
          [
            "Teatro del Siglo de Oro español (ss. XVI-XVII)",
            "Comedia nueva: tres actos, honor, polimetría, mezcla de géneros. Corrales de comedias.",
            "Lope de Vega, Tirso de Molina, Calderón de la Barca",
          ],
          [
            "Teatro clásico francés (s. XVII)",
            "Rigurosa aplicación de las tres unidades. Tragedia de corte aristotélico.",
            "Racine, Corneille, Molière",
          ],
          [
            "Teatro moderno (ss. XIX-XX)",
            "Realismo psicológico, simbolismo, crítica social. El director como figura creativa.",
            "Ibsen, Chéjov, García Lorca, Brecht",
          ],
          [
            "Teatro contemporáneo",
            "Teatro del absurdo, metateatro, teatro postdramático, ruptura de la cuarta pared.",
            "Beckett, Ionesco, Arrabal, Müller",
          ],
        ]}
      />

      <TipIB>
        En la Prueba 1, si el texto es teatro, analiza siempre las acotaciones: son la voz del
        dramaturgo que los personajes no pueden expresar. El bastón de Bernarda, la luz que Lorca
        describe, los silencios anotados: todo es material analizable. Y recuerda: en teatro, la
        ironía dramática —lo que el espectador sabe y el personaje no— es uno de los efectos más
        poderosos que puedes identificar y razonar.
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

function contenidoVocabulario() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">
        Un análisis literario de nivel IB se distingue no solo por lo que dice, sino por{" "}
        <strong>cómo lo dice</strong>. Esta ficha reúne el vocabulario imprescindible: conectores
        para estructurar el argumento, verbos para describir lo que hace el texto, adverbios para
        graduar la valoración y sinónimos para evitar repeticiones que debilitan el ensayo.
      </p>

      {/* 1. Conectores del discurso */}
      <H3>Conectores del discurso</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Los conectores articulan el razonamiento y guían al lector. Usarlos con precisión es un
        indicador directo del criterio C (Organización y desarrollo).
      </p>
      <Tabla
        cabeceras={["Función", "Conectores"]}
        filas={[
          [
            "Adición",
            "además, asimismo, del mismo modo, igualmente, también, de igual manera, por añadidura, sumado a esto, cabe añadir que, junto a ello",
          ],
          [
            "Contraste / concesión",
            "sin embargo, no obstante, a pesar de ello, aunque, si bien, con todo, aun así, pese a que, a diferencia de, en contraposición a, en cambio, por el contrario",
          ],
          [
            "Causa",
            "porque, dado que, puesto que, ya que, en vista de que, debido a, a causa de, por cuanto, en tanto que",
          ],
          [
            "Consecuencia",
            "por tanto, por consiguiente, en consecuencia, de ahí que, de modo que, así pues, lo que lleva a, lo cual produce, esto origina que",
          ],
          [
            "Ejemplo / ilustración",
            "por ejemplo, en concreto, en particular, tal como se aprecia en, como se evidencia en, a saber, sirva de ejemplo, esto se manifiesta cuando",
          ],
          [
            "Énfasis",
            "en efecto, de hecho, ciertamente, es más, incluso, sobre todo, especialmente, cabe destacar que, conviene subrayar que, resulta significativo que",
          ],
          [
            "Ordenación",
            "en primer lugar, en segundo lugar, en tercer lugar, por último, por una parte… por otra, a continuación, seguidamente, para empezar, para concluir",
          ],
          [
            "Conclusión",
            "en conclusión, en definitiva, en suma, en síntesis, para finalizar, en último término, todo ello muestra que, de lo anterior se desprende que",
          ],
          [
            "Reformulación",
            "es decir, o sea, en otras palabras, dicho de otro modo, esto es, lo que equivale a decir que",
          ],
        ]}
      />

      {/* 2. Verbos analíticos */}
      <H3>Verbos analíticos</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Sirven para describir con precisión qué hace el texto, el autor o el recurso. Sustituyen a
        los verbos comodín «decir», «hablar» o «hacer».
      </p>
      <Tabla
        cabeceras={["Función", "Verbos"]}
        filas={[
          [
            "El autor construye / articula",
            "construye, articula, estructura, elabora, desarrolla, traza, diseña, teje, configura, forja, dispone, organiza, compone, orquesta",
          ],
          [
            "El texto muestra / presenta",
            "presenta, expone, plantea, introduce, ofrece, despliega, exhibe, manifiesta, revela, refleja, pone de manifiesto, saca a la luz, deja entrever",
          ],
          [
            "El recurso sugiere / evoca",
            "sugiere, evoca, connota, implica, alude a, remite a, apunta hacia, insinúa, deja implícito, abre la posibilidad de, suscita la imagen de",
          ],
          [
            "El narrador / hablante describe",
            "describe, caracteriza, retrata, dibuja, pinta, reconstruye, narra, relata, cuenta, rememora, recupera, recrea",
          ],
          [
            "El texto cuestiona / problematiza",
            "cuestiona, problematiza, interroga, desafía, subvierte, transgrede, pone en entredicho, desmonta, deconstruye, ironiza sobre",
          ],
          [
            "El autor recurre / emplea",
            "recurre a, emplea, utiliza, se vale de, hace uso de, incorpora, introduce, integra, inserta, apela a, acude a",
          ],
          [
            "El texto establece / relaciona",
            "establece, relaciona, vincula, conecta, asocia, contrapone, yuxtapone, paraleliza, contrasta, equipara, asimila",
          ],
        ]}
      />

      {/* 3. Verbos evaluativos */}
      <H3>Verbos evaluativos</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Expresan el juicio analítico: qué efecto produce el recurso y por qué es significativo. Son
        los verbos que elevan una descripción a análisis real.
      </p>
      <Tabla
        cabeceras={["Función", "Verbos y expresiones"]}
        filas={[
          [
            "El recurso logra / consigue",
            "logra, consigue, alcanza, obtiene, produce, genera, provoca, suscita, desencadena, origina, propicia, favorece, potencia, intensifica, amplifica, refuerza",
          ],
          [
            "El recurso contribuye a",
            "contribuye a, colabora en, participa en, coadyuva a, redunda en, incide en, repercute en, tiene el efecto de",
          ],
          [
            "El recurso ilustra / demuestra",
            "ilustra, demuestra, evidencia, pone de relieve, pone en primer plano, subraya, enfatiza, accentúa, resalta, destaca, jerarquiza",
          ],
          [
            "Expresiones de valoración",
            "es significativo que, resulta llamativo que, llama la atención que, no es casual que, cabe señalar que, conviene destacar que, hay que notar que, es de notar que, merece atención el hecho de que",
          ],
          [
            "Introduce el efecto en el lector",
            "crea en el lector, genera en el receptor, invita al lector a, obliga al lector a, lleva al lector a, produce el efecto de, deja en el lector la sensación de",
          ],
        ]}
      />

      {/* 4. Adverbios y expresiones evaluativas */}
      <H3>Adverbios y expresiones evaluativos</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Gradúan la intensidad del análisis y matizan las afirmaciones. Evitan el tono absoluto o
        simplista («el poema dice que la vida es triste»).
      </p>
      <Tabla
        cabeceras={["Función", "Adverbios y expresiones"]}
        filas={[
          [
            "Certeza / evidencia",
            "claramente, evidentemente, manifiestamente, ostensiblemente, notablemente, palmariamente, inequívocamente, indudablemente, sin lugar a dudas",
          ],
          [
            "Grado / intensidad",
            "especialmente, particularmente, extraordinariamente, profundamente, marcadamente, destacadamente, de modo singular, de forma notable",
          ],
          [
            "Precisión",
            "precisamente, justamente, exactamente, concretamente, específicamente, en particular, de manera puntual",
          ],
          [
            "Matiz / probabilidad",
            "aparentemente, posiblemente, quizá, acaso, en cierta medida, en algún sentido, podría interpretarse que, cabe la posibilidad de que, parece sugerir que",
          ],
          [
            "Contraste con lo esperado",
            "paradójicamente, sorprendentemente, de manera inesperada, contra todo pronóstico, curiosamente, llamativamente",
          ],
          [
            "Efecto acumulativo",
            "progresivamente, paulatinamente, de manera gradual, de forma creciente, cada vez más, con mayor intensidad a medida que avanza",
          ],
        ]}
      />

      {/* 5. Sinónimos imprescindibles */}
      <H3>Sinónimos imprescindibles</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Palabras que se repiten en exceso en los ensayos IB y sus alternativas más precisas.
      </p>
      <Tabla
        cabeceras={["Palabra sobreutilizada", "Alternativas con matiz"]}
        filas={[
          [
            "mostrar",
            "revelar, manifestar, evidenciar, poner de manifiesto, denotar, reflejar, indicar, señalar, subrayar, apuntar, hacer patente, dejar entrever, transparentar",
          ],
          [
            "decir / hablar de",
            "relatar, narrar, describir, plantear, exponer, articular, formular, enunciar, afirmar, sostener, defender, evocar, aludir a, referirse a",
          ],
          [
            "importante / relevante",
            "significativo, llamativo, notable, destacado, sugerente, revelador, fundamental, decisivo, determinante, clave, central, medular",
          ],
          [
            "el autor",
            "el escritor, el poeta, la voz poética, el hablante lírico, el narrador, el enunciador, quien escribe, la instancia narrativa, la voz autorial",
          ],
          [
            "el texto / el poema",
            "el fragmento, el pasaje, el extracto, la obra, el relato, el poema, la estrofa, el verso, el párrafo, el episodio, el segmento",
          ],
          [
            "usar / utilizar",
            "emplear, recurrir a, valerse de, hacer uso de, incorporar, integrar, introducir, acudir a, servirse de, desplegar",
          ],
          [
            "efecto / resultado",
            "consecuencia, impacto, repercusión, alcance, resonancia, peso, carga semántica, connotación, dimensión, lectura posible",
          ],
          [
            "bonito / interesante",
            "sugerente, evocador, expresivo, logrado, eficaz, original, llamativo, insólito, perturbador, cargado de significado",
          ],
          [
            "triste / alegre",
            "melancólico, sombrío, lúgubre, elegíaco, nostálgico / jubiloso, exultante, vitalista, eufórico, luminoso",
          ],
          [
            "hablar sobre un tema",
            "abordar, tratar, desarrollar, explorar, examinar, problematizar, reflexionar sobre, profundizar en, indagar en, poner en cuestión",
          ],
        ]}
      />

      {/* 6. Frases de arranque por párrafo */}
      <H3>Frases de arranque por sección del ensayo</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Modelos de apertura para cada parte del análisis. No son fórmulas fijas: adáptalas al texto.
      </p>
      <Tabla
        cabeceras={["Sección", "Frases de arranque"]}
        filas={[
          [
            "Introducción (tesis)",
            "En este fragmento, [autor] construye… · El texto explora la tensión entre… · A través de [recurso], [autor] articula una visión de… · El poema / relato plantea desde su primer verso / línea…",
          ],
          [
            "Análisis de un recurso",
            "El empleo de [recurso] en [línea / párrafo] contribuye a… · Resulta significativo que [autor] recurra a [recurso], ya que… · La presencia de [recurso] genera un efecto de… · Cabe destacar que…",
          ],
          [
            "Conexión recurso → tema",
            "Este recurso no es meramente decorativo: refuerza la idea central de que… · Más allá de su función [estética / rítmica], [recurso] subraya… · Lo que en apariencia es [X] resulta ser, en realidad, una expresión de…",
          ],
          [
            "Contraste / comparación",
            "En contraposición a [elemento A], [elemento B] establece… · Si en los primeros versos / párrafos prevalece [X], hacia el final el tono se torna… · Mientras que [personaje A] representa [X], [personaje B] encarna…",
          ],
          [
            "Cierre / conclusión",
            "En definitiva, [autor] logra [efecto] mediante… · El texto consigue así [objetivo] a través de… · Todo ello convierte este fragmento en una exploración de… · En suma, la combinación de [recursos] produce un efecto de…",
          ],
        ]}
      />

      <TipIB>
        La diferencia entre un ensayo de banda 3 y uno de banda 5 suele estar en el vocabulario de
        transición y valoración. Evita «el autor usa metáforas para mostrar» y apunta a «el autor
        despliega una red de metáforas acuáticas que construye progresivamente la sensación de
        ahogamiento del protagonista». Específico, preciso, argumentado: esa es la fórmula.
      </TipIB>
    </div>
  );
}

const CONTENIDOS: Record<string, () => React.JSX.Element> = {
  movimientos: contenidoMovimientos,
  poesia: contenidoPoesia,
  narratologia: contenidoNarratologia,
  teatro: contenidoTeatro,
  recursos: contenidoRecursos,
  vocabulario: contenidoVocabulario,
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
            Seis fichas con los conceptos teóricos fundamentales para la Prueba 1 del IB Español A:
            movimientos literarios, poesía, narrativa, teatro, análisis de recursos y vocabulario
            de análisis.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
