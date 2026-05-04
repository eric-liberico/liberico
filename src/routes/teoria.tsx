import { createFileRoute, Link, useNavigate, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { COURSES } from "@/lib/ib-courses";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, Lock } from "lucide-react";
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

type Topico = {
  nombre: string;
  traduccion: string;
  explicacion: string;
  ejemplo: string;
  pistas: string;
  ib: string;
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
  Teoría: "bg-indigo-500/15 text-indigo-700 border-indigo-300",
  Clásicos: "bg-orange-500/15 text-orange-700 border-orange-300",
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
  {
    id: "teoria-literaria",
    titulo: "Teoría literaria",
    descripcion:
      "Psicoanálisis, feminismo, marxismo, formalismo, intertextualidad y más: cómo usar cada enfoque en un comentario real.",
    tag: "Teoría",
  },
  {
    id: "topicos",
    titulo: "Tópicos literarios",
    descripcion:
      "23 tópicos clásicos en tarjetas interactivas: carpe diem, locus amoenus, vanitas, theatrum mundi y mucho más.",
    tag: "Clásicos",
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

function TarjetaTopico({ topico }: { topico: Topico }) {
  const [abierta, setAbierta] = useState(false);
  const toggle = () => setAbierta((a) => !a);
  return (
    <div
      className={cn(
        "rounded-lg border cursor-pointer select-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
        abierta
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-card hover:border-primary/30 hover:bg-accent/20",
      )}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
      role="button"
      tabIndex={0}
      aria-expanded={abierta}
      aria-label={topico.nombre}
    >
      {!abierta ? (
        <div className="p-4 min-h-[90px] flex flex-col justify-between gap-2">
          <div className="font-serif text-sm font-semibold text-ink leading-snug">
            {topico.nombre}
          </div>
          <div className="text-[11px] text-foreground/55 italic">{topico.traduccion}</div>
          <div className="text-[10px] text-primary/70 mt-1">Clic para ver →</div>
        </div>
      ) : (
        <div className="p-4 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-serif text-sm font-semibold text-ink leading-snug">
                {topico.nombre}
              </div>
              <div className="text-[11px] text-foreground/55 italic">{topico.traduccion}</div>
            </div>
            <button
              className="text-[10px] text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
              onClick={(e) => {
                e.stopPropagation();
                toggle();
              }}
            >
              cerrar ✕
            </button>
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed">{topico.explicacion}</p>
          <p className="text-xs text-foreground/75 leading-relaxed">
            <span className="font-medium text-ink">Ejemplo: </span>
            {topico.ejemplo}
          </p>
          <p className="text-xs text-foreground/75 leading-relaxed">
            <span className="font-medium text-ink">Cómo reconocerlo: </span>
            {topico.pistas}
          </p>
          <div className="p-2.5 rounded-md bg-primary/5 border border-primary/15 text-xs">
            <span className="font-medium text-primary">En el análisis IB: </span>
            <span className="text-foreground/80">{topico.ib}</span>
          </div>
        </div>
      )}
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
        La narratología es la disciplina que estudia la estructura y el funcionamiento de los
        relatos. Distingue entre <strong>qué</strong> se cuenta (historia) y <strong>cómo</strong>{" "}
        se cuenta (discurso). Dominar esta distinción es clave para el análisis de prosa en la
        Prueba 1.
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
          Acuerdo tácito entre texto y lector: aceptamos las convenciones del mundo narrado. El
          narrador omnisciente que conoce los pensamientos íntimos de todos los personajes es
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
          secundarias. Puede ser decorativa, simbólica o funcionalmente retardataria (dilata el
          clímax).
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
          Descripción del carácter, valores, comportamientos y mundo interior de un personaje. A
          menudo más reveladora que la prosopografía: muestra al personaje en acción o en
          pensamiento.
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
      <p className="text-sm text-foreground/80 leading-relaxed font-medium">
        Anacronías (alteraciones del orden cronológico):
      </p>
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
          [
            "Personaje colectivo",
            "Un grupo que actúa como unidad (el pueblo, la familia, la masa)",
          ],
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
          asociaciones libres. Ejemplo: Molly Bloom en <em>Ulises</em> de Joyce.
        </Def>
        <Def titulo="Corriente de conciencia (stream of consciousness)">
          Técnica narrativa más radical que el monólogo interior: reproduce el pensamiento
          fragmentado, prelingüístico, asociativo, incluyendo percepciones sensoriales y memoria
          involuntaria. La puntuación se vuelve convencional o desaparece. Efecto: máxima inmersión
          en la subjetividad del personaje.
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
          El narrador cuenta los hechos mientras ocurren. Efecto de inmediatez e incertidumbre; el
          narrador no sabe cómo terminará.
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
          Se limita a registrar hechos observables sin valorar ni interpretar. Semeja a una cámara o
          a un informe. El lector extrae sus propias conclusiones.
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
        el tema o el tono del fragmento. Relaciona siempre focalización, estilo de discurso y tiempo
        verbal como un sistema coherente de decisiones del autor.
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

function contenidoTeoriaLiteraria() {
  const TEORIAS = [
    {
      nombre: "Psicoanálisis",
      lema: "Los textos, como los sueños, dicen más de lo que parecen",
      explicacion:
        "Aplica las ideas de Freud al texto: busca deseos reprimidos, miedos inconscientes y conflictos psíquicos en los personajes, los símbolos y las imágenes. No se trata de psicoanalizaron al autor; se trata de leer el texto como si fuera un sueño colectivo.",
      preguntas: [
        "¿Qué deseos o miedos revela el comportamiento del personaje?",
        "¿Hay símbolos de muerte, erotismo o transgresión?",
        "¿El texto oculta o disfraza algo que el lector puede descifrar?",
        "¿Hay una figura paterna, materna o autoritaria relevante?",
      ],
      ejemplo:
        'En "La casa de Bernarda Alba", el caballo negro puede leerse como símbolo del deseo sexual reprimido de las hijas, y Bernarda como el superego que lo aplasta. El pozo simboliza el inconsciente: oscuro, profundo, peligroso.',
      enElIB:
        "Analiza un símbolo y argumenta qué conflicto psíquico o deseo reprimido representa. No afirmes nada sobre la vida del autor; analiza el texto.",
    },
    {
      nombre: "Teoría feminista",
      lema: "¿A quién da voz el texto? ¿A quién silencia?",
      explicacion:
        "Examina cómo el género configura la experiencia de los personajes y la voz narrativa. Pregunta cómo se representan las mujeres, qué estereotipos reproduce o cuestiona el texto, y qué voces quedan al margen.",
      preguntas: [
        "¿Los personajes femeninos tienen agencia (capacidad de decidir) o son objetos del deseo de otros?",
        "¿La voz narradora adopta una perspectiva masculina o femenina?",
        "¿El texto refuerza roles de género o los cuestiona?",
        "¿Qué personajes tienen poder y cuáles no, y por qué?",
      ],
      ejemplo:
        'En "La casa de Bernarda Alba", Lorca muestra una sociedad en la que las mujeres solo tienen dos salidas: la sumisión o la represión del deseo convertida en poder sobre otras (Bernarda). Una lectura feminista analiza cómo el patriarcado destruye desde dentro.',
      enElIB:
        "Señala qué rol tiene un personaje femenino y argumenta si el texto lo problematiza o lo normaliza. Evita juicios morales; analiza cómo funciona el texto.",
    },
    {
      nombre: "Teoría de la recepción",
      lema: "El significado lo construye quien lee, no solo quien escribe",
      explicacion:
        "El mismo texto puede significar cosas muy distintas para lectores de épocas o culturas diferentes. Cada lector trae un horizonte de expectativas propio: conocimientos, valores, prejuicios. El significado es siempre una negociación entre texto y lector.",
      preguntas: [
        "¿Qué esperaba yo al leer este texto y cómo se cumplieron o frustraron esas expectativas?",
        "¿Cómo lo habría leído un lector de la época del autor?",
        "¿El texto deja huecos o ambigüedades que el lector debe completar?",
        "¿Qué efecto produce en mí como lector y por qué?",
      ],
      ejemplo:
        '"Don Quijote" fue leído en el s. XVII como parodia cómica. En el s. XIX romántico, como tragedia del idealismo. Hoy, como metaficción. Ninguna lectura es "la correcta"; cada una dice algo sobre la época del lector.',
      enElIB:
        'Comenta qué efecto produce el texto en el lector y si ese efecto depende de claves internas del texto o del contexto de quien lo lee. Es válido decir: "Un lector contemporáneo podría interpretar esto como..."',
    },
    {
      nombre: "Marxismo / Crítica social",
      lema: "¿A qué clase social pertenecen los personajes? ¿A quién sirve el texto?",
      explicacion:
        "Lee la literatura como reflejo o cuestionamiento de las relaciones de poder económico y social. Examina quién tiene poder en el texto, cómo se reproduce la desigualdad de clases, y si el texto normaliza o critica ese sistema.",
      preguntas: [
        "¿Qué clase social representan los personajes principales y secundarios?",
        "¿El texto muestra conflictos entre clases o grupos sociales?",
        "¿Hay personajes explotados o marginados? ¿Cómo los representa el narrador?",
        "¿A qué intereses favorece la visión del mundo que propone el texto?",
      ],
      ejemplo:
        'En "Fuente Ovejuna" (Lope de Vega), el conflicto entre el Comendador y el pueblo no es solo de honor: es una lucha de clases en la que el pueblo unido vence al opresor. Una lectura marxista analiza si Lope legitima esa resistencia o la contiene.',
      enElIB:
        "Si el texto muestra desigualdad social, comenta qué posición adopta el narrador ante ella: ¿la critica, la naturaliza, la ironiza? Un párrafo que relacione clase social con elecciones formales del texto es de nivel IB.",
    },
    {
      nombre: "Formalismo / Nueva crítica",
      lema: "El texto es suficiente: todo lo que importa está en las palabras",
      explicacion:
        "Propone leer el texto como un objeto autónomo. La biografía del autor, el contexto histórico y las intenciones declaradas son irrelevantes: solo cuenta lo que está escrito. Se analizan la forma, el estilo y la tensión entre lo que se dice y cómo se dice.",
      preguntas: [
        "¿Cómo está construido el texto? ¿Qué rasgos formales son más llamativos?",
        "¿Hay tensión o ironía entre lo que dice el texto y cómo lo dice?",
        "¿Qué hace el lenguaje para producir su efecto específico?",
        "¿Hay patrones de repetición, contraste o simetría que organicen el texto?",
      ],
      ejemplo:
        'Una lectura formalista de "Romance sonámbulo" de Lorca no pregunta qué quiso decir Lorca: analiza la estructura del romance (octosílabos, rima asonante), el uso del verde como color recurrente, la ambigüedad sintáctica de las frases y el efecto de desorientación que produce.',
      enElIB:
        'La Prueba 1 es, por diseño, una lectura formalista: se te da un texto sin contexto biográfico y debes analizarlo desde dentro. Esta es la habilidad central del examen. Cuando dices "el autor usa X para lograr Y", estás siendo formalista.',
    },
    {
      nombre: "Estructuralismo",
      lema: "El texto tiene una gramática oculta que lo organiza",
      explicacion:
        "Busca en los textos estructuras profundas que organizan el significado: oposiciones binarias (vida/muerte, ciudad/campo, masculino/femenino), arquetipos narrativos y sistemas de signos. No analiza el contenido; analiza el sistema que lo produce.",
      preguntas: [
        "¿Qué oposiciones binarias estructuran el texto?",
        "¿El protagonista sigue un patrón arquetípico (héroe, prueba, transformación)?",
        "¿Hay un sistema de valores que organice el mundo del texto?",
        "¿Qué personajes o elementos representan los dos lados de una oposición central?",
      ],
      ejemplo:
        "En muchos cuentos latinoamericanos, la oposición civilización/naturaleza (o ciudad/selva) estructura el conflicto: el protagonista entra en un espacio salvaje y regresa transformado. Esta estructura se repite en Quiroga, Rivera y muchos autores del Boom.",
      enElIB:
        "Identifica una oposición binaria central (luz/oscuridad, orden/caos, público/privado) y analiza cómo los personajes y el lenguaje se posicionan en relación a ella. Es un buen armazón para la tesis de un ensayo.",
    },
    {
      nombre: "Postcolonialismo",
      lema: "¿Desde qué punto de vista se cuenta esta historia?",
      explicacion:
        "Examina cómo la literatura reproduce o cuestiona las relaciones de poder entre culturas dominantes y colonizadas. Analiza quién tiene voz en el texto, qué culturas se presentan como normales y cuáles como exóticas, y cómo el lenguaje puede ser instrumento de dominio o de resistencia.",
      preguntas: [
        "¿Desde qué posición cultural o social se narra la historia?",
        "¿Hay personajes cuya cultura o identidad se exotiza o inferioriza?",
        "¿El texto reproduce estereotipos coloniales o los desmonta?",
        "¿Quién no tiene voz en este texto y por qué?",
      ],
      ejemplo:
        "En muchas novelas del Boom latinoamericano (García Márquez, Vargas Llosa), la mezcla de español castizo con elementos orales, indígenas o locales no es un defecto de estilo: es una afirmación de identidad cultural frente a la tradición literaria europea.",
      enElIB:
        "Si el texto pertenece a una cultura no occidental o mezcla lenguas y tradiciones, comenta cómo el lenguaje mismo es un acto político. Evita leer textos latinoamericanos o africanos con criterios exclusivamente europeos.",
    },
    {
      nombre: "Intertextualidad",
      lema: "Ningún texto nace de la nada: todo texto dialoga con otros textos",
      explicacion:
        "Todo texto está tejido de referencias a otros textos: citas, alusiones, parodias, reescrituras. No es una deficiencia; es la condición natural de la literatura. El diálogo puede ser explícito (cita directa) o implícito (ecos temáticos, estructurales o estilísticos).",
      preguntas: [
        "¿El texto alude a otros textos, mitos o tradiciones literarias?",
        "¿Reescribe o parodia un texto anterior?",
        "¿Qué añade ese diálogo intertextual al significado del texto?",
        "¿El lector necesita conocer el texto original para entender la referencia?",
      ],
      ejemplo:
        '"Bodas de sangre" dialoga con el romance tradicional español y la tragedia griega. "Cien años de soledad" abre con una estructura circular que recuerda al Génesis bíblico. "Don Quijote" parodia las novelas de caballería que cita explícitamente.',
      enElIB:
        "Si reconoces una alusión mítica, bíblica o literaria, explica qué añade esa referencia al significado. No es obligatorio conocerlo todo, pero si lo reconoces, mencionarlo —y razonarlo— eleva el análisis claramente.",
    },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-foreground/80 leading-relaxed">
        Los enfoques de teoría literaria son lentes: cada uno ilumina aspectos distintos del mismo
        texto. No tienes que elegir uno y aplicarlo de forma rígida —en la Prueba 1 puedes combinar
        varios—, pero conocer cada enfoque amplía las preguntas que sabes hacerle a un texto.
      </p>
      <TipIB>
        En la Prueba 1 no se te pide que nombres el enfoque teórico que usas. Lo que importa es que
        hagas las preguntas correctas al texto. Estos enfoques son una caja de herramientas, no una
        lista de términos para demostrar que los sabes.
      </TipIB>
      <div className="space-y-5">
        {TEORIAS.map((t) => (
          <div key={t.nombre} className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-accent/20">
              <div className="font-serif text-base font-semibold text-ink">{t.nombre}</div>
              <div className="text-[11px] text-foreground/55 italic mt-0.5">{t.lema}</div>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-foreground/80 leading-relaxed">{t.explicacion}</p>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                  Preguntas que puedes hacerle al texto
                </div>
                <ul className="space-y-1">
                  {t.preguntas.map((p) => (
                    <li key={p} className="flex gap-2 text-xs text-foreground/75 leading-relaxed">
                      <span className="text-primary/60 shrink-0 mt-0.5">→</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-3 rounded-md border border-amber-200 bg-amber-50/60">
                <div className="text-[10px] uppercase tracking-[0.18em] text-amber-700 mb-1.5">
                  Ejemplo
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">{t.ejemplo}</p>
              </div>
              <div className="p-3 rounded-md border border-primary/15 bg-primary/5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-primary mb-1.5">
                  Cómo usarlo en el análisis IB
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">{t.enElIB}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function contenidoTopicos() {
  const TOPICOS: Topico[] = [
    {
      nombre: "Carpe diem",
      traduccion: "Aprovecha el día",
      explicacion:
        "La vida es breve y el placer debe disfrutarse ahora, antes de que la muerte llegue. No es nihilismo: es una invitación urgente a vivir. El tiempo pasa y no espera.",
      ejemplo:
        'Garcilaso, soneto XXIII: "En tanto que de rosa y azucena / se muestra la color en vuestro gesto...". Horacio: "Collige, virgo, rosas". Don Juan, que seduce con el argumento de que el tiempo es corto.',
      pistas:
        "Imágenes de flores que se marchitan, belleza que se va, juventud fugaz. Verbos en imperativo (vive, goza, aprovecha). Urgencia temporal.",
      ib: "Analiza qué urgencia crea en el texto y qué dice sobre la relación del hablante con el tiempo o la muerte. Si hay imperativos, comenta su efecto.",
    },
    {
      nombre: "Tempus fugit",
      traduccion: "El tiempo huye",
      explicacion:
        "El tiempo pasa irremediablemente y no podemos detenerlo. A diferencia del carpe diem (que invita a actuar), el tempus fugit se detiene a contemplar la pérdida con melancolía.",
      ejemplo:
        'Manrique, "Coplas a la muerte de su padre". Quevedo, sonetos morales. Las elegías románticas de Bécquer.',
      pistas:
        "Verbos de paso y cambio (se fue, ya no, ha pasado). Comparaciones con ríos, vientos o sombras que desaparecen. Tono melancólico o elegíaco.",
      ib: "Comenta qué recursos formales (tiempos verbales, imágenes de movimiento o desaparición) refuerzan la sensación de tiempo que escapa.",
    },
    {
      nombre: "Memento mori",
      traduccion: "Recuerda que vas a morir",
      explicacion:
        "La muerte es inevitable y universal. Recordarlo constantemente debe servir para orientar la vida hacia lo que importa. No es desesperación, sino una llamada a la lucidez.",
      ejemplo:
        'Manrique, "Coplas". Los relojes de sol con inscripción "tempus fugit omnia". Los bodegones barrocos con calaveras y flores. La "Danza de la muerte" medieval.',
      pistas:
        "Símbolos de muerte (calavera, reloj, hoguera, ceniza). Reflexiones directas sobre la mortalidad. Segunda persona que interpela al lector.",
      ib: "Analiza qué efecto produce en el lector la confrontación directa con la muerte y qué visión del mundo implica ese gesto.",
    },
    {
      nombre: "Ubi sunt",
      traduccion: "¿Dónde están?",
      explicacion:
        "Pregunta retórica sobre el paradero de los grandes, los poderosos o los bellos del pasado. La respuesta implícita es siempre la misma: los se llevó el tiempo. Es un lamento elegíaco sobre lo que desaparece.",
      ejemplo:
        'Manrique, "Coplas": "¿Qué fue de los caballeros...?". Villon: "¿Dónde están las nieves de antaño?". Listas de nombres ilustres cuya grandeza se ha evaporado.',
      pistas:
        "Preguntas retóricas sobre personas o cosas del pasado. Listas de figuras históricas desaparecidas. Tono asombrado ante la ruina o el olvido.",
      ib: "Analiza la función de las preguntas retóricas acumuladas: ¿qué efecto produce esa lista de pérdidas sobre el lector? ¿A qué le invita a reflexionar?",
    },
    {
      nombre: "Locus amoenus",
      traduccion: "Lugar agradable",
      explicacion:
        "El lugar ideal: un prado con agua, sombra y brisa suave donde el hablante puede descansar, amar o reflexionar. Es un espacio de armonía y paz, alejado del ruido social.",
      ejemplo:
        "Las églogas de Garcilaso. La novela pastoril renacentista. Los espacios naturales idílicos en García Lorca. Cualquier jardín literario donde el tiempo parece detenerse.",
      pistas:
        "Prado, río o fuente, árbol con sombra, brisa suave, canto de pájaros, flores. Adjetivos positivos y sensoriales. Pausa narrativa contemplativa.",
      ib: "Analiza qué función tiene ese espacio en el texto: ¿contrasta con el conflicto humano? ¿Refleja o contradice el estado emocional del hablante?",
    },
    {
      nombre: "Locus horridus",
      traduccion: "Lugar terrible",
      explicacion:
        "El opuesto del locus amoenus: una naturaleza hostil, oscura y amenazante que refleja el caos interior del personaje o el tono oscuro del texto.",
      ejemplo:
        'Las tormentas del teatro romántico. La selva en "La vorágine" de Rivera. El páramo de Cómala en "Pedro Páramo" de Rulfo. El mar embravecido como espejo del dolor.',
      pistas:
        "Naturaleza oscura, amenazante o decadente. Adjetivos negativos (árido, tenebroso, asfixiante). El espacio como proyección del estado interior del personaje.",
      ib: "Analiza cómo el espacio amplifica el estado emocional del personaje o el tono del fragmento. La naturaleza hostil raramente es decorado: casi siempre es símbolo.",
    },
    {
      nombre: "Beatus ille",
      traduccion: "Dichoso aquel...",
      explicacion:
        "La alabanza de la vida sencilla del campo frente a la vida ambiciosa de la ciudad o la corte. El campo representa la autenticidad, la paz y la vida conforme a la naturaleza.",
      ejemplo:
        'Horacio, Oda II.16. Fray Luis de León, "Oda a la vida retirada". Fernández de Andrade, "Epístola moral a Fabio".',
      pistas:
        "Elogio de la vida simple y el campo. Crítica implícita a la ambición o la vida cortesana. Invitación a retirarse del mundo. Vocabulario de paz y suficiencia.",
      ib: "Relaciona este tópico con los valores que defiende el texto: ¿qué rechaza el hablante? ¿Es evasión personal o crítica social encubierta?",
    },
    {
      nombre: "Aurea mediocritas",
      traduccion: "Dorada medianía",
      explicacion:
        "El ideal horaciano de la vida moderada: ni demasiado rica ni demasiado pobre, alejada de los extremos. La felicidad está en la suficiencia, no en el exceso ni en la carencia.",
      ejemplo:
        'Horacio, "Odas". Fray Luis de León. Contrapunto en textos que critican la ambición desmedida o la miseria extrema.',
      pistas:
        "Elogio de lo moderado y suficiente. Rechazo de la ambición y el lujo. Vocabulario de equilibrio (bastante, suficiente, ni más ni menos, lo justo).",
      ib: "Analiza qué visión moral del mundo implica y si el texto la defiende, la cuestiona o la presenta como un ideal inalcanzable.",
    },
    {
      nombre: "Fortuna mutabilis",
      traduccion: "La fortuna es cambiante",
      explicacion:
        "La diosa Fortuna mueve su rueda sin cesar: quien hoy está arriba mañana caerá. Es una advertencia contra el orgullo y un consuelo para el que está abajo.",
      ejemplo:
        '"El conde Lucanor" (la rueda de la fortuna). Manrique, "Coplas". Reyes o poderosos que caen repentinamente en tragedias barrocas.',
      pistas:
        "Imagen de la rueda. Ascensos y caídas repentinas de personajes. Advertencias contra la soberbia. Exempla de grandes figuras caídas.",
      ib: "Analiza la función de la rueda de la Fortuna en la visión del mundo del texto: ¿es fatalismo, lección moral, o ambas cosas?",
    },
    {
      nombre: "Homo viator",
      traduccion: "El hombre viajero",
      explicacion:
        "La vida como un viaje, un camino que se recorre hacia un destino (la muerte, Dios, la sabiduría). El viajero aprende en el camino; el camino es la vida misma.",
      ejemplo:
        'Machado: "Caminante, son tus huellas el camino y nada más...". La Odisea. El Camino de Santiago. Dante en la "Divina Comedia".',
      pistas:
        "Vocabulario de viaje y camino. Etapas, obstáculos, pruebas que transforman al personaje. El destino como meta vital o espiritual.",
      ib: "Analiza cómo el viaje exterior refleja un camino interior: aprendizaje, pérdida, maduración. ¿Qué transforma al personaje en el recorrido?",
    },
    {
      nombre: "Vita flumen",
      traduccion: "La vida es un río",
      explicacion:
        "La vida comparada con un río que fluye sin parar hacia el mar, que es la muerte. La imagen expresa la inevitabilidad del paso del tiempo y la dirección única del destino.",
      ejemplo:
        'Manrique, "Coplas a la muerte de su padre": "Nuestras vidas son los ríos que van a dar en la mar, que es el morir."',
      pistas:
        "Comparación o metáfora explícita del río, el fluir, la corriente. El mar como destino final. Verbos de movimiento continuo e irreversible.",
      ib: "Analiza cómo la imagen del río condensa la visión del tiempo y la muerte. ¿Qué emociones produce en el lector esa imagen de movimiento sin retorno?",
    },
    {
      nombre: "Theatrum mundi",
      traduccion: "El mundo es un teatro",
      explicacion:
        "La vida es una representación: Dios es el director, los seres humanos somos actores que interpretamos un papel que no hemos elegido, y la muerte cae el telón. La existencia no es más real que una obra de teatro.",
      ejemplo:
        'Calderón, "El gran teatro del mundo". Hamlet: "El mundo entero es un escenario". Quevedo. La vida como farsa o ilusión representada.',
      pistas:
        "Vocabulario teatral en contextos no teatrales (papel, escena, representar, máscara). La vida como ilusión o engaño. Reflexiones sobre el libre albedrío.",
      ib: "Analiza la función filosófica de esta metáfora: ¿qué dice sobre la identidad del personaje, el libre albedrío o el sentido de la vida?",
    },
    {
      nombre: "Vanitas vanitatum",
      traduccion: "Vanidad de vanidades",
      explicacion:
        "Todo en el mundo es vano, efímero, insignificante. Las riquezas, la belleza, el poder: todo se marchita y desaparece. Origen bíblico (Eclesiastés). Muy frecuente en el Barroco.",
      ejemplo:
        'Quevedo, soneto "Miré los muros de la patria mía". Los bodegones barrocos con flores marchitas y calaveras. La poesía de las ruinas.',
      pistas:
        "Imágenes de ruinas, flores marchitas, objetos que se deterioran. Reflexiones sobre la inutilidad del esfuerzo humano. Tono desengañado o melancólico.",
      ib: "Analiza cómo los objetos o imágenes del texto encarnan la vanidad: ¿qué visión del mundo transmiten? ¿Qué invitan al lector a reconsiderar?",
    },
    {
      nombre: "Somnium vitae",
      traduccion: "La vida es un sueño",
      explicacion:
        "La vida es ilusoria, efímera, sin realidad firme. Al despertar (la muerte), se revela que todo era ficción. No sabemos si lo que vivimos es real.",
      ejemplo:
        'Calderón, "La vida es sueño": "¿Qué es la vida? Un frenesí. ¿Qué es la vida? Una ilusión, / una sombra, una ficción...". Quevedo. Los sueños y delirios del Romanticismo.',
      pistas:
        "Vocabulario onírico fuera de contexto literal (sueño, ilusión, despertar, engaño, ficción). Personajes que dudan de su propia experiencia. Metáforas de sombra.",
      ib: "Analiza qué visión de la realidad propone el texto: ¿el mundo es real o ilusorio? ¿Qué consecuencias tiene esa incertidumbre para los personajes?",
    },
    {
      nombre: "Collige, virgo, rosas",
      traduccion: "Recoge, virgen, las rosas",
      explicacion:
        "Variante del carpe diem dirigida a una mujer joven: disfruta de tu belleza y juventud ahora, antes de que se marchiten. Tiene una dimensión erótica implícita.",
      ejemplo:
        "Ausonio (origen latino). Garcilaso, soneto XXIII. Herrera. Quevedo. El motivo de la rosa como belleza femenina que envejece.",
      pistas:
        "Flores como símbolo de la belleza femenina que se marchita. Imperativo dirigido a una mujer joven. Urgencia del tiempo. Tono amoroso o seductor.",
      ib: "Comenta la dimensión de género: ¿el texto instrumentaliza la belleza femenina o la celebra? ¿Qué relación de poder implica el hablante con la destinataria?",
    },
    {
      nombre: "Descriptio puellae",
      traduccion: "Descripción de la muchacha",
      explicacion:
        "Descripción idealizada de la belleza femenina según un canon físico fijo: de arriba abajo, cabello rubio, frente blanca, ojos claros, mejillas sonrosadas, labios rojos... Es una convención literaria, no un retrato real.",
      ejemplo:
        "El cancionero petrarquista. Garcilaso y los sonetos del Renacimiento español. Casi cualquier descripción de la amada en la lírica del siglo XVI.",
      pistas:
        "Enumeración de rasgos físicos de arriba a abajo. Comparaciones con materiales nobles (oro, nieve, coral, rubí). Adjetivos superlativos. Sin psicología del personaje.",
      ib: "Analiza la función de la idealización: ¿el texto presenta a una persona real o a un ideal cultural? ¿Qué revela sobre la mirada y los valores del hablante?",
    },
    {
      nombre: "Donna angelicata",
      traduccion: "La dama angelicada",
      explicacion:
        "La amada es un ángel, un ser casi divino que eleva espiritualmente al amante. Su belleza no es solo física: es una manifestación de lo sagrado que acerca al amante a Dios o al ideal platónico.",
      ejemplo:
        'Dante, "Vita Nuova" (Beatriz). Petrarca (Laura). El petrarquismo en toda la poesía española del siglo XVI.',
      pistas:
        "La amada descrita con vocabulario celestial (ángel, divino, cielo, luz, gracia divina). Efecto purificador sobre el amante. Distancia enorme entre amante y amada.",
      ib: "Analiza cómo esta idealización define la relación: ¿hay igualdad? ¿Puede el amante realmente amar a alguien tan distante? ¿Qué dice esto sobre el amor que plantea el texto?",
    },
    {
      nombre: "Amor post mortem",
      traduccion: "Amor más allá de la muerte",
      explicacion:
        "El amor es tan poderoso que trasciende la muerte: los amantes se reúnen en el más allá, o la muerte del amado no extingue el amor del superviviente.",
      ejemplo:
        '"Romeo y Julieta". Quevedo, "Amor constante más allá de la muerte". Los amantes de Teruel. El amor romántico que solo puede culminar con la muerte.',
      pistas:
        "Muerte de uno o ambos amantes. Promesas de reencuentro eterno. Amor que se intensifica con la proximidad de la muerte. El más allá como espacio amoroso.",
      ib: "Analiza qué visión del amor propone el texto: ¿es romanticismo, espiritualidad, o ambos? ¿La muerte destruye el amor o lo perfecciona?",
    },
    {
      nombre: "Contemptus mundi",
      traduccion: "Desprecio del mundo",
      explicacion:
        "El mundo terrenal es corruptible, engañoso y sin valor. La verdadera vida está en el más allá o en la renuncia a lo material. Es la cara más extrema de la vanitas.",
      ejemplo:
        'Poesía ascético-mística (San Juan de la Cruz, Santa Teresa). Kempis, "Imitación de Cristo". El monje medieval que abandona todo lo mundano.',
      pistas:
        "Rechazo explícito de los placeres del mundo. Vocabulario ascético. Comparaciones entre el mundo y la nada o el polvo. Llamada a la vida espiritual.",
      ib: "Analiza qué relación propone el texto entre lo material y lo espiritual: ¿el rechazo del mundo es liberación, escapismo, o una forma de crítica social?",
    },
    {
      nombre: "Poder igualatorio de la muerte",
      traduccion: "La muerte nos iguala a todos",
      explicacion:
        "Ante la muerte, ricos y pobres, reyes y mendigos, sabios e ignorantes son iguales. Es un tópico democrático y subversivo: la muerte desmonta jerarquías sociales.",
      ejemplo:
        '"La danza de la muerte" medieval. Manrique, "Coplas". "El burlador de Sevilla" (Don Juan vencido por el comendador muerto). La muerte como gran niveladora.',
      pistas:
        "Personajes de muy diferentes clases sociales ante la muerte. Énfasis en que el poder no salva. Tono igualitario o irónico ante la vanidad del poderoso.",
      ib: "Analiza qué crítica social implica este tópico en el texto: ¿es consuelo para el humilde, advertencia al poderoso, o ambas cosas a la vez?",
    },
    {
      nombre: "Edad de oro",
      traduccion: "El tiempo mejor fue el pasado",
      explicacion:
        "En el pasado remoto los seres humanos vivían en armonía, inocencia y felicidad. El presente es una degradación de ese ideal. Puede ser un paraíso perdido, una infancia, o una utopía.",
      ejemplo:
        'Don Quijote discursa ante los cabreros sobre la Edad de Oro (cap. XI). Rousseau y el "buen salvaje". La infancia como paraíso en poemas elegíacos.',
      pistas:
        "Nostalgia del pasado. Contraste entre el antes ideal y el ahora degradado. Vocabulario de inocencia, armonía, naturaleza no corrompida.",
      ib: "Analiza qué valores defiende el hablante mediante esta idealización del pasado y qué crítica implica al presente.",
    },
    {
      nombre: "Menosprecio de corte y alabanza de aldea",
      traduccion: "La ciudad corrompe, el campo purifica",
      explicacion:
        "La vida cortesana (o urbana) es ambición, hipocresía y corrupción. La vida campesina es honesta, sencilla y verdadera. No siempre es ingenua: a veces es crítica política encubierta.",
      ejemplo:
        'Antonio de Guevara, "Menosprecio de corte y alabanza de aldea". Fray Luis de León. Las églogas renacentistas. Cualquier texto que oponga lo urbano a lo rural.',
      pistas:
        "Contraste explícito ciudad/campo. Adjetivos negativos para la corte (artificioso, engañoso, ruidoso) y positivos para el campo (paz, verdad, naturaleza). Voz con experiencia de ambos mundos.",
      ib: "Analiza qué visión de la sociedad propone el texto: ¿es evasión personal, crítica del poder, o nostalgia? ¿Es el campo una solución real o un ideal inalcanzable?",
    },
    {
      nombre: "Militia amoris",
      traduccion: "El amor es una guerra",
      explicacion:
        "El amor se describe con vocabulario militar: la amada es una fortaleza, el amante es un soldado que la asedia, las miradas son flechas, el corazón es el campo de batalla.",
      ejemplo:
        'Ovidio, "Ars amatoria". La poesía trovadoresca y petrarquista. Sonetos del siglo XVI donde el amante habla de heridas, rendición o victoria.',
      pistas:
        "Metáforas bélicas (flecha, herida, rendición, victoria, asedio, escudo, batalla). La amada como fortaleza o enemiga. El amante como guerrero vencido.",
      ib: "Analiza qué relación de poder implica esta metáfora: ¿quién tiene el poder en esta 'guerra'? ¿La amada es activa o pasiva? ¿El texto celebra esa dinámica o la critica?",
    },
    {
      nombre: "Religio amoris",
      traduccion: "El amor como religión",
      explicacion:
        "El amor se convierte en una religión laica: la amada es diosa, el amante es devoto, el amor es un culto con sus rituales y sus mártires. Todo el vocabulario religioso se aplica al amor.",
      ejemplo:
        'La lírica trovadoresca. El petrarquismo. "Cántico espiritual" de San Juan (en sentido inverso: mística que usa lenguaje amoroso).',
      pistas:
        "Vocabulario religioso en contexto amoroso (adorar, rezar, templo, dios, milagro, devoto, martirio, éxtasis, culto).",
      ib: "Analiza el efecto de mezclar lo sagrado y lo profano: ¿eleva el amor, ironiza sobre la religión, o ambas cosas? ¿Qué dice sobre la intensidad del sentimiento?",
    },
    {
      nombre: "Omnia vincit amor",
      traduccion: "El amor todo lo vence",
      explicacion:
        "El amor es la fuerza más poderosa del universo: vence a la muerte, al tiempo, al poder y a la razón. Es irresistible e inevitable; no hay voluntad que lo detenga.",
      ejemplo:
        'Virgilio, Églogas X. El amor cortés. Don Juan como esclavo del amor. El amor que mueve el mundo en el cierre de la "Divina Comedia" de Dante.',
      pistas:
        "Amor presentado como fuerza sobrehumana e irresistible. Personajes que actúan contra su razón o interés por amor. El amor como explicación última de las acciones.",
      ib: "Analiza si el texto celebra esta omnipotencia amorosa o la problematiza: ¿es el amor una fuerza liberadora o una pérdida de voluntad y razón?",
    },
    {
      nombre: "Exegi monumentum",
      traduccion: "He erigido un monumento",
      explicacion:
        "La convicción de que la obra literaria es más duradera que el mármol, los imperios o la vida humana. El poeta afirma que su escritura lo hará inmortal.",
      ejemplo:
        'Horacio: "Exegi monumentum aere perennius". Quevedo, "Amor constante más allá de la muerte" (el verso sobrevive al cuerpo). Shakespeare: "So long as men can breathe, or eyes can see..."',
      pistas:
        "Comparación entre la obra y materiales duraderos (bronce, piedra, mármol). Afirmación de que la escritura supera el tiempo o la muerte. Orgullo o consuelo ante la mortalidad.",
      ib: "Analiza qué dice este tópico sobre la relación entre el artista, su obra y la inmortalidad. ¿Es orgullo, consuelo, o ambos?",
    },
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">
        Los tópicos literarios son ideas y situaciones recurrentes que la literatura ha repetido y
        reelaborado durante siglos. Reconocerlos en un texto es el punto de partida; lo que cuenta
        en el análisis IB es explicar cómo ese tópico clásico funciona en ese texto concreto y qué
        efecto produce.
      </p>
      <div className="p-3 rounded-lg border border-border bg-muted/30">
        <p className="text-xs text-foreground/70">
          <span className="font-medium text-ink">Cómo usar estas tarjetas: </span>
          haz clic en cualquier tarjeta para ver la explicación completa, ejemplos y pistas para el
          análisis. Clic de nuevo para cerrarla.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {TOPICOS.map((t) => (
          <TarjetaTopico key={t.nombre} topico={t} />
        ))}
      </div>
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
  "teoria-literaria": contenidoTeoriaLiteraria,
  topicos: contenidoTopicos,
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
  const { user, loading: authLoading, rol, courseKey } = useAuth();
  const navigate = useNavigate();
  // const { capabilities } = COURSES[courseKey];

  const [selected, setSelected] = useState<Seccion | null>(null);
  // null = sin restricción (admin/profesor); Set vacío = alumno sin grants
  const [grants, setGrants] = useState<Set<string> | null>(null);
  // Separar loading de "sin restricción" para no mostrar contenido bloqueado durante la carga
  const [cargandoGrants, setCargandoGrants] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  // Cargar grants del alumno. Profesores y admins ven todo sin restricción.
  useEffect(() => {
    if (!user || !rol) return;
    if (rol === "admin" || rol === "profesor") {
      setGrants(null); // null = sin restricción
      setCargandoGrants(false);
      return;
    }
    supabase
      .from("theory_access_grants")
      .select("section_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setGrants(new Set((data ?? []).map((g) => g.section_id as string)));
        setCargandoGrants(false);
      });
  }, [user, rol]);

  const puedeAbrir = (sectionId: string): boolean => {
    if (cargandoGrants) return false; // bloqueado mientras carga, nunca abierto por defecto
    if (grants === null) return true; // admin / profesor
    return grants.has(sectionId);
  };

  const tieneAlgunGrant = !cargandoGrants && grants !== null && grants.size > 0;

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
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Inicio
        </Link>

        <div className="mb-8">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Teoría
          </div>
          <h1 className="font-serif text-3xl text-ink">Fichas de teoría literaria</h1>
          <p className="text-foreground/70 mt-2 max-w-2xl">
            Ocho fichas con los conceptos teóricos fundamentales para la Prueba 1 del IB Español A:
            movimientos literarios, poesía, narrativa, teatro, recursos, vocabulario, enfoques de
            teoría literaria y tópicos clásicos.
          </p>
        </div>

        {/* CTA si el alumno no tiene ningún grant */}
        {grants !== null && !tieneAlgunGrant && (
          <div className="mb-8 rounded-xl border border-border bg-muted/30 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 font-medium text-sm">
                <Lock className="h-4 w-4 text-muted-foreground" />
                Fichas de teoría bloqueadas
              </div>
              <p className="text-sm text-foreground/70 leading-relaxed">
                Reserva una sesión de tutoría 1:1 y elige el área que quieres trabajar. Al
                confirmarse la compra se desbloqueará la ficha correspondiente.
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link to="/reservar-sesion">Reservar tutoría</Link>
            </Button>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECCIONES.map((s) => {
            const abierta = puedeAbrir(s.id);
            return abierta ? (
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
            ) : (
              <div key={s.id} className="opacity-50 cursor-not-allowed">
                <Card className="p-5 h-full flex flex-col gap-3 border-dashed">
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border self-start",
                      TAG_COLOR[s.tag],
                    )}
                  >
                    {s.tag}
                  </span>
                  <div className="flex-1">
                    <div className="font-serif text-base text-ink leading-snug flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      {s.titulo}
                    </div>
                    <div className="text-xs text-foreground/60 mt-1.5 leading-relaxed">
                      {s.descripcion}
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
