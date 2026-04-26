-- Fase 3: Biblioteca de textos literarios

CREATE TABLE public.textos_biblioteca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  autor TEXT NOT NULL,
  epoca TEXT NOT NULL,
  movimiento TEXT NOT NULL,
  forma_literaria TEXT NOT NULL CHECK (forma_literaria IN ('prosa_ficcional', 'prosa_no_ficcional', 'poesia', 'teatro')),
  fragmento TEXT NOT NULL,
  pregunta_orientacion TEXT NOT NULL,
  marco_analisis TEXT NOT NULL,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.textos_biblioteca ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer todos los textos
CREATE POLICY "Authenticated users read textos"
  ON public.textos_biblioteca FOR SELECT
  TO authenticated USING (true);

-- Textos que cada usuario ha analizado (desbloquea el marco)
CREATE TABLE public.textos_vistos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  texto_id UUID NOT NULL REFERENCES public.textos_biblioteca ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, texto_id)
);

ALTER TABLE public.textos_vistos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own textos_vistos"
  ON public.textos_vistos FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own textos_vistos"
  ON public.textos_vistos FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_textos_vistos_user ON public.textos_vistos(user_id);

-- ============================================================
-- DATOS SEMILLA: 12 textos canónicos (3 por forma literaria)
-- ============================================================

INSERT INTO public.textos_biblioteca
  (titulo, autor, epoca, movimiento, forma_literaria, fragmento, pregunta_orientacion, marco_analisis, orden)
VALUES

-- ── PROSA FICCIONAL ──────────────────────────────────────────

(
  'Cien años de soledad (apertura)',
  'Gabriel García Márquez',
  'Siglo XX',
  'Realismo mágico',
  'prosa_ficcional',
  'Muchos años después, frente al pelotón de fusilamiento, el coronel Aureliano Buendía había de recordar aquella tarde remota en que su padre lo llevó a conocer el hielo. Macondo era entonces una aldea de veinte casas de barro y cañabrava construida a la orilla de un río de aguas diáfanas que se precipitaban por un lecho de piedras pulidas, blancas y enormes como huevos prehistóricos. El mundo era tan reciente, que muchas cosas carecían de nombre, y para mencionarlas había que señalarlas con el dedo. Todos los años, por el mes de marzo, una familia de gitanos desarrapados plantaba su carpa cerca de la aldea, y con un grande alboroto de pitos y timbales daban a conocer los nuevos inventos. Primero trajeron el imán. Un gitano corpulento, de barba montaraz y manos de gorrión, que se presentó con el nombre de Melquíades, hizo una truculenta demostración pública de lo que él mismo llamaba la octava maravilla de los sabios alquimistas de Macedonia. Fue de casa en casa arrastrando dos lingotes metálicos, y todo el mundo se espantó al ver que los calderos, las pailas, las tenazas y los anafes se caían de su sitio, y las maderas crujían por la desesperación de los clavos y los tornillos tratando de desenclavarse, y aun los objetos perdidos desde hacía mucho tiempo aparecían por donde más se les había buscado, y se arrastraban en desbandada turbulenta detrás de los fierros mágicos de Melquíades.',
  '¿Cómo construye García Márquez el mundo mítico de Macondo, y qué recursos narrativos emplea para fusionar lo cotidiano con lo extraordinario?',
  'Este fragmento inicial de Cien años de soledad (1967) establece el tono del realismo mágico mediante varias estrategias. El incipit temporal —«Muchos años después, frente al pelotón de fusilamiento»— rompe la linealidad e instala la muerte desde el primer párrafo mediante una prolepsis. La descripción de Macondo como espacio paradisíaco («aguas diáfanas», «piedras blancas y enormes como huevos prehistóricos») mezcla la objetividad del narrador omnisciente con imágenes de creación primordial: el símil «huevos prehistóricos» remite al origen del mundo. La frase «el mundo era tan reciente que muchas cosas carecían de nombre» reescribe el Génesis bíblico y sitúa el relato en un tiempo mítico. La llegada del imán como «maravilla» invierte la mirada racionalista: lo científico se experimenta como magia. La enumeración climática de objetos domésticos («calderos, las pailas, las tenazas, los anafes») crea un efecto de abundancia caótica, mientras la personificación «las maderas crujían por la desesperación de los clavos» atribuye emoción a la materia. El estudiante debe analizar: en Criterio A, la función del narrador retrospectivo y el tiempo circular; en Criterio B, la prolepsis, el símil creacionista y la personificación; en Criterio C, el arco de lo mítico a lo cotidiano; en Criterio D, el registro épico-bíblico.',
  1
),

(
  'Casa tomada',
  'Julio Cortázar',
  'Siglo XX',
  'Fantástico / Neorrealismo',
  'prosa_ficcional',
  'Nos gustaba la casa porque aparte de espaciosa y antigua (hoy que las casas antiguas sucumben a la más ventajosa liquidación de sus materiales) guardaba los recuerdos de nuestros bisabuelos, el abuelo paterno, nuestros padres y toda la infancia. Nos habituamos Irene y yo a persistir solos en ella, lo que era una locura pues en esa casa podían vivir ocho personas sin estorbarse. Hacíamos la limpieza por la mañana, levantándonos a las siete, y a eso de las once yo le dejaba a Irene las últimas habitaciones por repasar y me iba a la cocina. Almorzábamos al mediodía, siempre puntuales; ya no quedaba nada por hacer fuera de unos pocos platos sucios. Nos resultaba grato almorzar pensando en la casa profunda y silenciosa y cómo nos bastábamos para mantenerla limpia. A veces llegábamos a creer que era ella la que no nos dejaba casarnos. Irene rechazó dos pretendientes sin mayor explicación, yo me devolví antes de casarme porque a último momento me pareció que el matrimonio nos iba a complicar. Llegamos a los cuarenta años con la inconfesada idea de que el nuestro, simple y silencioso matrimonio de hermanos, era necesaria clausura de la genealogía asentada por los bisabuelos en nuestra casa.',
  '¿Cómo construye Cortázar la atmósfera opresiva y la relación perturbadora entre los personajes y la casa en este fragmento?',
  'La apertura de «Casa tomada» (1946) establece la atmósfera claustrofóbica y la codependencia patológica de los protagonistas desde el primer párrafo. La casa actúa como personaje más que como escenario: el narrador reconoce que «era ella la que no nos dejaba casarnos», animizando el espacio doméstico mediante personificación. La rutina detallada —levantarse a las siete, almorzar puntuales— sugiere una existencia fosilizada donde el tiempo no avanza: la repetición léxica («limpieza», «ordenar», «mantener») refuerza la idea de una vida reducida a rituales sin propósito. La historia familiar enumerada (bisabuelos, abuelo, padres) subraya el peso de la herencia y la incapacidad de ruptura generacional. El eufemismo «simple y silencioso matrimonio de hermanos» apunta hacia el tabú implícito en la relación, nunca nombrado directamente: la elipsis como recurso narrativo genera incomodidad en el lector. La ironía emerge del contraste entre el tono frío y burocrático del narrador y la perturbación emocional subyacente. En Criterio A: la doble función de la casa (refugio/trampa) y el tabú no nombrado; en Criterio B: personificación, eufemismo e ironía; en Criterio C: la progresión del encierro voluntario; en Criterio D: el registro clínico que contrasta con el contenido perturbador.',
  2
),

(
  'El Aleph (visión del Aleph)',
  'Jorge Luis Borges',
  'Siglo XX',
  'Vanguardismo / Fantástico',
  'prosa_ficcional',
  'En la parte inferior del escalón, hacia la derecha, vi una pequeña esfera tornasolada, de casi intolerable fulgor. Al principio la creí giratoria; luego comprendí que ese movimiento era una ilusión producida por los vertiginosos espectáculos que encerraba. El diámetro del Aleph sería de dos o tres centímetros, pero el espacio cósmico estaba ahí, sin disminución de tamaño. Cada cosa (la luna del espejo, digamos) era infinitas cosas, porque yo claramente la veía desde todos los puntos del universo. Vi el populoso mar, vi el alba y la tarde, vi las muchedumbres de América, vi una plateada telaraña en el centro de una negra pirámide, vi un laberinto roto (era Londres), vi interminables ojos inmediatos escrutándose en mí como en un espejo, vi todos los espejos del planeta y ninguno me reflejó, vi en un traspatio de la calle Soler las mismas baldosas que hace treinta años vi en el zaguán de una casa en Fray Bentos, vi racimos, nieve, tabaco, vetas de metal, vapor de agua, vi convexos desiertos ecuatoriales y cada uno de sus granos de arena, vi en Inverness a una mujer que no olvidaré, vi la violenta cabellera, el altivo cuerpo, vi un cáncer en el pecho, vi un círculo de tierra seca en una vereda, donde antes hubo un árbol, vi una quinta de Adrogué, un ejemplar de la primera versión inglesa de Plinio, la de Philemon Holland, vi a un tiempo cada letra de cada página (de chico, yo solía maravillarme de que las letras de un volumen cerrado no se mezclaran y perdieran en el decurso de la noche), vi la noche y el día contemporáneo, vi un poniente en Querétaro que parecía reflejar el color de una rosa en Bengala.',
  '¿Cómo representa Borges la experiencia de percibir el infinito en este fragmento, y qué recursos retóricos emplea para transmitir lo inefable?',
  'Este fragmento central de «El Aleph» (1945) presenta la visión del punto donde converge todo el espacio, el clímax de la narración. La enumeración anafórica («Vi... vi... vi...») —que se extiende por todo el párrafo— mimetiza el ritmo abrumador de la percepción infinita: el lector experimenta en la forma lo que el narrador describe en el contenido. La paradoja central («el espacio cósmico estaba ahí, sin disminución de tamaño») desafía la lógica euclidiana y sitúa al relato en el terreno metafísico. La mezcla de lo cósmico («las muchedumbres de América», «convexos desiertos ecuatoriales») con lo doméstico («las mismas baldosas», «un cáncer en el pecho») refleja la tesis borgiana de que el infinito contiene igualmente lo universal y lo particular. La ekphrasis truncada —«vi en Inverness a una mujer que no olvidaré»— introduce la emoción personal sin explicarla: la elipsis humaniza lo metafísico. El símil «vi todos los espejos del planeta y ninguno me reflejó» convierte la experiencia en crisis de identidad: el sujeto se disuelve en el Aleph. En Criterio A: la función del Aleph como metáfora de la omnisciencia y la búsqueda del absoluto; en Criterio B: anáfora, paradoja, enumeración y elipsis; en Criterio C: la estructura del clímax narrativo; en Criterio D: el registro filosófico-poético.',
  3
),

-- ── PROSA NO FICCIONAL ───────────────────────────────────────

(
  'El laberinto de la soledad — Máscaras mexicanas (fragmento)',
  'Octavio Paz',
  'Siglo XX',
  'Ensayo contemporáneo',
  'prosa_no_ficcional',
  'Cohibido, su cara no expresa nada o expresa burla y desconfianza. El mexicano no se raja: ante la adversidad, calla; bajo la presión, resiste. Estos gestos de resistencia no son solamente expresión de una actitud moral: son formas de la vida cotidiana. El disimulo, el mutismo, la desconfianza no son solo defensas; son formas de ser, maneras de estar en el mundo. El que se «raja» no solo es cobarde sino desleal a sí mismo, a la imagen que tiene de sí. Las palabras de nuestro vocabulario que expresan abiertamente lo que se siente tienen un dejo peyorativo: «quejumbroso», «llorón», «rajado». El ideal de la «hombría» consiste en no «rajarse» nunca. Los que se «abren» se desprecian. La mexicanidad, en este sentido, es una forma del estoicismo, un estoicismo impuesto por circunstancias históricas: la Conquista, la Colonia y el mestizaje. El mexicano puede doblarse, humillarse, «agacharse», pero no «rajarse», esto es, permitir que el mundo exterior penetre en su intimidad. El «rajado» es de poco fiar, un traidor o un hombre de dudosa fidelidad, que cuenta los secretos y es incapaz de afrontar los peligros como se debe. Las mujeres son seres inferiores porque, al entregarse, se abren. Su inferioridad es constitucional y radica en su sexo, en su «rajada», herida que jamás cicatriza.',
  '¿Cómo elabora Paz su tesis sobre la psicología del mexicano en este fragmento, y qué recursos argumentativos y retóricos emplea para construirla?',
  'Este fragmento del segundo capítulo de El laberinto de la soledad (1950) ejemplifica el ensayo filosófico-cultural latinoamericano. Paz construye su argumento a través del análisis léxico: el verbo coloquial «rajarse» se convierte en la categoría central que organiza toda una cosmovisión. Al estudiar el lenguaje popular («quejumbroso», «llorón», «rajado»), el ensayista revela cómo el vocabulario cotidiano codifica valores culturales e históricamente condicionados. La enumeración de causas históricas («la Conquista, la Colonia y el mestizaje») ancla el argumento psicológico en el tiempo: el estoicismo no es una virtud innata sino un trauma colectivo. El paralelismo anafórico («ante la adversidad, calla; bajo la presión, resiste») crea un ritmo sentencioso que imita la certeza del ensayo filosófico europeo. Es crucial que el estudiante note la tensión interna del texto: el último párrafo, sobre las mujeres, revela que Paz reproduce los valores machistas que pretende analizar —esto es un ejemplo de cómo la voz ensayística puede no ser neutral. En Criterio A: comprender la tesis sobre el silencio como forma de ser; en Criterio B: el análisis léxico, la anáfora y la estructura argumentativa circular; en Criterio C: la progresión del argumento psicológico al histórico; en Criterio D: el registro ensayístico de alta formalidad y sus implicaciones ideológicas.',
  4
),

(
  'Nuestra América (fragmento)',
  'José Martí',
  'Siglo XIX',
  'Modernismo',
  'prosa_no_ficcional',
  'Cree el aldeano vanidoso que el mundo entero es su aldea, y con tal que él quede de alcalde, o le mortifique al rival que le quitó la novia, o le crezcan en la alcancía los ahorros, ya da por bueno el orden universal, sin saber de los gigantes que llevan siete leguas en las botas y le pueden poner la bota encima, ni de la pelea de los cometas en el Cielo, que van por el aire dormidos engullendo mundos. Lo que quede de aldea en América ha de despertar. Estos tiempos no son para acostarse con el pañuelo en la cabeza, sino con las armas en la almohada, como los varones de Juan de Castellanos: las armas del juicio, que vencen a las otras. Trincheras de ideas valen más que trincheras de piedras. No hay proa que taje una nube de ideas. Una idea enérgica, flameada a tiempo ante el mundo, para, como la bandera mística del juicio final, a un escuadrón de acorazados. Los pueblos que no se conocen han de darse prisa para conocerse, como quienes van a pelear juntos. Los que se enseñan los puños, como hermanos celosos, que quieren los dos la misma tierra, o el de casa chica que le tiene envidia al de casa grande, han de encajar, de modo que sean una, las dos manos. Los que, al amparo de una tradición criminal, cercenaron, con el sable tinto en la sangre de sus mismas venas, la tierra del hermano vencido, del hermano castigado más allá de sus culpas, si no quieren que les llame el pueblo ladrones, devuélvanle sus tierras.',
  '¿Cómo construye Martí un llamado a la unidad y la acción política en este fragmento, y qué estrategias retóricas emplea para persuadir al lector latinoamericano?',
  'Este fragmento del ensayo político-literario Nuestra América (1891) es un ejemplo canónico de la prosa modernista al servicio del pensamiento antiimperialista. Martí construye su argumento mediante una alegoría sostenida: el «aldeano vanidoso» representa a los dirigentes latinoamericanos que ignoran las amenazas externas, mientras que los «gigantes que llevan siete leguas en las botas» son metonimia de las potencias imperialistas —especialmente Estados Unidos. La hipérbole cósmica («cometas engullendo mundos») eleva el peligro a escala universal. La antítesis «acostarse con el pañuelo en la cabeza / con las armas en la almohada» opone pasividad y vigilancia mediante imágenes domésticas que vuelven el argumento político concreto. El aforismo «Trincheras de ideas valen más que trincheras de piedras» condensa la tesis central: la cultura y el pensamiento son la verdadera defensa. La metáfora de las «dos manos» que deben «encajar» propone la solidaridad latinoamericana como solución. El ritmo oratorio del párrafo —con acumulación de cláusulas paralelas— está diseñado para ser leído en voz alta: es prosa pensada como discurso. En Criterio A: la alegoría política y la tesis sobre la unidad latinoamericana; en Criterio B: la alegoría, la hipérbole, la antítesis y el aforismo; en Criterio C: la estructura persuasiva del argumento; en Criterio D: el registro oratorio modernista.',
  5
),

(
  'Las venas abiertas de América Latina (apertura)',
  'Eduardo Galeano',
  'Siglo XX',
  'Ensayo crítico / Neorrealismo',
  'prosa_no_ficcional',
  'La división internacional del trabajo consiste en que unos países se especializan en ganar y otros en perder. Nuestra comarca del mundo, que hoy llamamos América Latina, fue precoz: se especializó en perder desde los remotos tiempos en que los europeos del Renacimiento se abalanzaron a través del mar y le hundieron los dientes en la garganta. Pasaron los siglos y América Latina perfeccionó sus funciones. Este no es ya, ciertamente, el reino de las maravillas donde la realidad superaba a la fábula y la imaginación era humillada por los trofeos de la conquista, los yacimientos de oro, las montañas de plata. Pero la región sigue trabajando de sirvienta. Continúa existiendo al servicio de las necesidades ajenas, como fuente y reserva del petróleo y el hierro, el cobre y la carne, las frutas y el café, las materias primas y los alimentos destinados a los países ricos que ganan, al consumirlos, mucho más de lo que América Latina gana al producirlos. Son mucho más altos los impuestos que cobran los compradores que los precios que reciben los vendedores; y al fin y al cabo son mucho más las ganancias de los comerciantes que los salarios de los trabajadores. La trampa se cierra, generación tras generación, sobre los mismos condenados.',
  '¿Cómo emplea Galeano el lenguaje figurado y la estructura argumentativa para construir una crítica política del colonialismo y sus consecuencias en América Latina?',
  'La apertura de Las venas abiertas de América Latina (1971) propone la tesis central del libro mediante un juego retórico de gran eficacia. La ironía de la primera oración —«unos países se especializan en ganar y otros en perder»— aplica el lenguaje tecnocrático del comercio internacional a la explotación colonial, creando un contraste que denuncia el cinismo del sistema. La metáfora corporal y violenta («le hundieron los dientes en la garganta») presenta el colonialismo como vampirismo, transformando la abstracción económica en imagen visceral. El paralelismo anafórico («sigue trabajando de sirvienta / continúa existiendo al servicio») subraya la continuidad histórica de la dependencia: el tiempo ha pasado, pero la estructura no ha cambiado. La enumeración de materias primas («petróleo y el hierro, el cobre y la carne, las frutas y el café») es metonimia de la riqueza latinoamericana que fluye hacia afuera: la acumulación crea un efecto de abundancia que se revela irónica dado el empobrecimiento de los productores. La metáfora final —«la trampa se cierra, generación tras generación»— introduce el fatalismo histórico como motor narrativo del libro. En Criterio A: la tesis sobre la continuidad histórica de la explotación; en Criterio B: ironía, metáfora corporal, anáfora y enumeración; en Criterio C: la estructura argumentativa de denuncia; en Criterio D: el registro apasionado y su función retórica.',
  6
),

-- ── POESÍA ──────────────────────────────────────────────────

(
  'Puedo escribir los versos (Veinte poemas de amor, XX)',
  'Pablo Neruda',
  'Siglo XX',
  'Neorromanticismo / Vanguardismo',
  'poesia',
  'Puedo escribir los versos más tristes esta noche.
Escribir, por ejemplo: «La noche está estrellada,
y tiritan, azules, los astros, a lo lejos.»
El viento de la noche gira en el cielo y canta.
Puedo escribir los versos más tristes esta noche.
Yo la quise, y a veces ella también me quería.
En las noches como ésta la tuve entre mis brazos.
La besé tantas veces bajo el cielo infinito.
Ella me quiso, a veces yo también la quería.
Cómo no haber amado sus grandes ojos fijos.
Puedo escribir los versos más tristes esta noche.
Pensar que no la tengo. Sentir que la he perdido.
Oír la noche inmensa, más inmensa sin ella.
Y el verso cae al alma como al pasto el rocío.
Qué importa que mi amor no pudiera guardarla.
La noche está estrellada y ella no está conmigo.
Eso es todo. A lo lejos alguien canta. A lo lejos.
Mi alma no se contenta con que la haya perdido.
Como para acercarla mi mirada la busca.
Mi corazón la busca, y ella no está con él.
La misma noche blanqueando los mismos árboles.
Nosotros, de ese tiempo, ya no somos los mismos.
Ya no la quiero, es cierto, pero cuánto la quise.
Mi voz trató de encontrar el viento para tocarla.
De otro. Será de otro. Como antes de mis besos.
Su voz, su cuerpo claro. Sus ojos infinitos.
Ya no la quiero, es cierto, pero tal vez la quiero.
Es tan corto el amor, y es tan largo el olvido.
Porque en noches como ésta la tuve entre mis brazos,
mi alma no se contenta con que la haya perdido.
Aunque éste sea el último dolor que ella me hace sufrir,
y éstos sean los últimos versos que yo le escribo.',
  '¿Cómo construye Neruda la ambivalencia emocional entre el amor y la pérdida, y qué recursos formales subrayan esa tensión?',
  'El Poema XX de Veinte poemas de amor y una canción desesperada (1924) es uno de los poemas de desamor más conocidos de la lírica hispanoamericana. Su paradoja central —el poeta afirma que «ya no la quiero» mientras escribe un poema sobre ese amor— organiza toda la estructura. La anáfora del verso inicial («Puedo escribir los versos más tristes esta noche») regresa como leitmotiv para marcar las oscilaciones emocionales: cada retorno al mismo verso indica un nuevo vaivén. La antítesis «Ya no la quiero, es cierto, pero cuánto la quise» / «Ya no la quiero, es cierto, pero tal vez la quiero» dramatiza la ambivalencia de manera simétrica y progresiva. El símil «el verso cae al alma como al pasto el rocío» convierte el acto de escribir en proceso natural e involuntario, alejándolo de la voluntad racional. La sinécdoque «Su voz, su cuerpo claro. Sus ojos infinitos» reduce a la amada a sus atributos más evocadores mediante fragmentación. El aforismo final —«Es tan corto el amor, y es tan largo el olvido»— universaliza la experiencia individual. El tono vacilante del poema, construido sobre la repetición y la contradicción, es en sí mismo el argumento emocional. En Criterio A: la paradoja del amor/desamor simultáneos; en Criterio B: anáfora, antítesis, símil, sinécdoque y aforismo; en Criterio C: la estructura circular y oscilante; en Criterio D: el registro íntimo y confesional.',
  7
),

(
  'Romance sonámbulo (fragmento)',
  'Federico García Lorca',
  'Siglo XX',
  'Generación del 27 / Neopopularismo',
  'poesia',
  'Verde que te quiero verde.
Verde viento. Verdes ramas.
El barco sobre la mar
y el caballo en la montaña.
Con la sombra en la cintura
ella sueña en su baranda,
verde carne, pelo verde,
con ojos de fría plata.
Verde que te quiero verde.
Bajo la luna gitana,
las cosas la están mirando
y ella no puede mirarlas.

—Compadre, quiero morir
decentemente en mi cama.
De acero, si puede ser,
con las sábanas de holanda.
¿No ves la herida que tengo
desde el pecho a la garganta?
Trescientas rosas morenas
lleva tu pechera blanca.
Tu sangre rezuma y huele
alrededor de tu faja.
Pero yo ya no soy yo,
ni mi casa es ya mi casa.

—Dejadme subir al menos
hasta las altas barandas;
¡dejadme subir!, dejadme,
hasta las verdes barandas.
Barandales de la luna
por donde retumba el agua.',
  '¿Cómo crea García Lorca una atmósfera de irrealidad y fatalismo en este romance, y qué recursos poéticos contribuyen a ello?',
  'El «Romance sonámbulo» (Romancero gitano, 1928) es la obra cumbre del neopopularismo lorquiano. El símbolo del color verde es el centro semántico del poema: repetido con variaciones («verde carne, pelo verde», «verdes ramas», «verdes barandas»), no tiene un referente único sino que actúa como polisemia múltiple —puede evocar la esperanza, la muerte, lo mágico, la naturaleza gitana— creando una densidad simbólica característica de la poética de Lorca. La personificación «las cosas la están mirando / y ella no puede mirarlas» invierte la relación sujeto-objeto: la mujer ha perdido la capacidad de percibir, lo que sugiere su estado entre la vida y la muerte. La yuxtaposición «el barco sobre la mar / y el caballo en la montaña» —dos imágenes sin conexión lógica— es una técnica vanguardista que crea significado por contraste y por la sugerencia de libertad imposible. En el diálogo entre los hombres, la metáfora «Trescientas rosas morenas / lleva tu pechera blanca» transforma la sangre en imagen floral: la muerte se estetiza. El verso «Pero yo ya no soy yo, / ni mi casa es ya mi casa» opera en varios niveles simultáneamente (identidad perdida, hogar que no existe, vida que termina). El octosílabo del romance popular da al poema su ritmo hipnótico. En Criterio A: la tensión entre deseo y muerte; en Criterio B: símbolo, personificación, yuxtaposición y metáfora; en Criterio C: la estructura del romance y el arco narrativo; en Criterio D: el ritmo octosilábico y su efecto musical.',
  8
),

(
  'Rima LIII («Volverán las oscuras golondrinas»)',
  'Gustavo Adolfo Bécquer',
  'Siglo XIX',
  'Romanticismo tardío / Postromanticismo',
  'poesia',
  'Volverán las oscuras golondrinas
en tu balcón sus nidos a colgar,
y otra vez con el ala a sus cristales
jugando llamarán;
pero aquellas que el vuelo refrenaban
tu hermosura y mi dicha a contemplar,
aquellas que aprendieron nuestros nombres...
¡esas... no volverán!

Volverán las tupidas madreselvas
de tu jardín las tapias a escalar,
y otra vez a la tarde, aún más hermosas,
sus flores se abrirán;
pero aquellas, cuajadas de rocío,
cuyas gotas mirábamos temblar
y caer, como lágrimas del día...
¡esas... no volverán!

Volverán del amor en tus oídos
las palabras ardientes a sonar;
tu corazón de su profundo sueño
tal vez despertará;
pero mudo y absorto y de rodillas,
como se adora a Dios ante su altar,
como yo te he querido... desengáñate,
¡así no te querrán!',
  '¿Cómo estructura Bécquer la idea de la irreversibilidad del amor en esta rima, y qué función cumplen los recursos de repetición y contraste?',
  'La Rima LIII es uno de los poemas más representativos del Romanticismo tardío español. Su estructura anafórica —«Volverán... / pero... no volverán!»— organiza el poema en tres estrofas paralelas que establecen sistemáticamente la misma contraposición: lo que puede volver (lo natural, lo genérico) frente a lo que no puede volver (lo vivido, lo único). Esta gradación asciende de lo exterior a lo íntimo: las golondrinas (naturaleza libre) → las madreselvas (naturaleza cultivada) → el amor mismo. Cada estrofa sigue el mismo esquema bimembre: afirmación de la naturaleza cíclica / negación dolorosa de lo irrepetible. La clave emocional reside en la distinción entre las flores genéricas («sus flores se abrirán») y las flores específicas del recuerdo («cuajadas de rocío, cuyas gotas mirábamos temblar»): el amor no es el sentimiento abstracto sino ese instante compartido e irrecuperable. El símil «como se adora a Dios ante su altar» en el clímax final eleva el amor del yo poético a devoción sagrada mediante hipérbole religiosa, universalizando la experiencia particular. El uso del futuro de indicativo («volverán», «se abrirán») para describir la naturaleza contrasta con el pronombre demostrativo enfático («¡esas... no volverán!»), donde el acento expresivo recae sobre la pérdida. En Criterio A: la tesis sobre la unicidad del amor vivido frente al genérico; en Criterio B: anáfora, antítesis, gradación, símil e hipérbole religiosa; en Criterio C: la estructura tripartita y su efecto acumulativo; en Criterio D: el ritmo endecasilábico y heptasilábico y la musicalidad.',
  9
),

-- ── TEATRO ──────────────────────────────────────────────────

(
  'La casa de Bernarda Alba — Acto I (fragmento)',
  'Federico García Lorca',
  'Siglo XX',
  'Generación del 27 / Teatro social',
  'teatro',
  'BERNARDA: (A LA CRIADA.) ¡Silencio!
LA CRIADA: (Llorando.) ¡Bernarda!
BERNARDA: Menos gritos y más trabajo. Debías haber procurado que todo esto estuviera más limpio para recibir al duelo. Vete. No es éste tu lugar. (La criada se va sollozando.) Los pobres son como los animales; parece como si estuvieran hechos de otras sustancias.
PONCIA: Los pobres sienten también.
BERNARDA: Pero en su lugar.

(Magdalena llora. Se oye un gran vocerío.)

BERNARDA: ¡Silencio!
MAGDALENA: (Llorando.) Bernarda...
BERNARDA: (Levantándose y dando un golpe con el bastón en el suelo.) ¡Silencio he dicho! (Pausa.) El luto ha de respetarse. Las mujeres en la iglesia no deben mirar más hombre que al oficiante, y a ése porque tiene faldas. Volver la cabeza es buscar el calor de la pana.
PONCIA: (Entre dientes.) ¡Viborilla!
BERNARDA: (Dando golpes con el bastón en el suelo.) ¡Alabado sea Dios!
TODAS: (Santiguándose.) Sea por siempre bendito y alabado.
BERNARDA: Descansa en paz con la santa compaña de cabecera.
TODAS: ¡Descansa en paz!
BERNARDA: Con el ángel San Miguel, y su espada justiciera.
TODAS: ¡Descansa en paz!
BERNARDA: Con la llave que todo lo abre y la mano que todo lo cierra.
TODAS: ¡Descansa en paz!
BERNARDA: (Se pone de pie y canta.) Requiem aeternam dona eis, Domine.
TODAS: (De pie y cantando al modo gregoriano.) Et lux perpetua luceat eis.
BERNARDA: (A LA CRIADA.) ¿Estará lista ya la limonada?
LA CRIADA: Sí, Bernarda. (Sale.)
BERNARDA: Los pobres: agua fresca. Y los ricos... café con leche. ¡Qué vida! ¡Maldita sea la vida! ¡Silencio!',
  '¿Cómo establece Lorca la autoridad y el régimen de represión de Bernarda en este fragmento del primer acto, y qué recursos teatrales y lingüísticos emplea para ello?',
  'Este fragmento del Acto I de La casa de Bernarda Alba (1936, estrenada 1945) introduce a la protagonista como figura de poder absoluto e implacable. La exclamación «¡Silencio!» —que abre y cierra el fragmento— actúa como leitmotiv que estructura la escena: Bernarda impone el silencio con su voz, haciendo del lenguaje un instrumento de dominación. Las acotaciones son de importancia capital: «dando un golpe con el bastón en el suelo» convierte el bastón en símbolo de la autoridad patriarcal ejercida por una mujer sobre otras mujeres. La jerarquía social queda explicitada en el aparte sobre los pobres («Los pobres son como los animales») seguido de la réplica lacónica de Poncia, que resiste en voz baja: el apartes dramático es el único espacio de contestación disponible. La cita litúrgica (Requiem aeternam) crea una atmósfera de teatralidad religiosa que Bernarda manipula para reforzar su control. La ironía dramática del «¿Estará lista ya la limonada?» —inmediatamente después del canto gregoriano— revela la frialdad de Bernarda: el rito religioso es para ella un mecanismo de control social, no de emoción. En Criterio A: la función del silencio como forma de represión y la jerarquía de poderes; en Criterio B: el leitmotiv del silencio, el simbolismo del bastón, la ironía dramática y la acotación significativa; en Criterio C: cómo el fragmento establece el conflicto central de la obra; en Criterio D: el contraste entre el lenguaje litúrgico elevado y el habla cotidiana.',
  10
),

(
  'Fuenteovejuna — Acto III (escena del interrogatorio)',
  'Lope de Vega',
  'Siglos XVI-XVII',
  'Barroco / Teatro del Siglo de Oro',
  'teatro',
  'JUEZ: Decid quién mató al Comendador.
FRONDOSO: Fuenteovejuna, señor.
JUEZ: ¿Quién es Fuenteovejuna?
FRONDOSO: El pueblo todo.
JUEZ: ¿Quién mandó dar esos golpes?
LAURENCIA: Fuenteovejuna, señor.
JUEZ: ¡Traed más leña! ¿Quién lo hizo?
PASCUALA: Fuenteovejuna, señor.
JUEZ: Por vida del rey, villanos,
que os ahorque juntos por ello.
¿Quién mató al Comendador?
MENGO: Fuenteovejuna lo hizo.
JUEZ: ¿Hay tan gran bellaquería?
El mismo niño lo dice.
Ponelde en el potro. Ea,
buena guardia; que ninguno
salga. Ya sé que en el mundo
todos lo dicen a una.
ESTEBAN: Señor, ya que veis que os importa
averiguar esta muerte,
mandad parar la que vierte
sangre que el dolor acorta;
cesen ya, pues no reporta
ningún fruto este rigor,
pues Fuenteovejuna, señor,
mató a vuestro Comendador.

(El Juez se va.)

ALCALDE: ¿Qué os parece desta gente?
REY: Que no pueden ser vencidos.
Y pues todos son culpados,
el delito se perdona;
y aunque mayor sea la culpa en unos,
la clemencia del rey nunca examina
con rigor las culpas juntas.',
  '¿Cómo construye Lorca la solidaridad colectiva y la resistencia del pueblo en esta escena del interrogatorio, y qué recursos dramáticos y lingüísticos emplea?',
  'Esta escena del tercer acto de Fuenteovejuna (c. 1612-1614) es uno de los momentos más célebres del teatro del Siglo de Oro. La respuesta colectiva «Fuenteovejuna, señor» —repetida por todos los personajes interrogados, incluyendo el niño— es un caso paradigmático de solidaridad dramática: la repetición anafórica convierte el nombre del pueblo en sujeto colectivo que disuelve la responsabilidad individual. El interrogatorio funciona como estructura de tensión dramática donde el Juez representa el poder institucional (la justicia del rey) y los villanos representan la justicia popular. La paradoja que Lope plantea es política y filosófica: ¿puede haber crimen cuando todo un pueblo actúa como uno? El rey resuelve el dilema con la frase «ya que todos son culpados, el delito se perdona», que es una sentencia jurídica y una tesis moral al mismo tiempo. La gradación ascendente del interrogatorio (adultos → niño → anciano) muestra que la solidaridad trasciende la edad: el «mismo niño lo dice» es el punto culminante de la farsa judicial que el Juez no puede romper. En Criterio A: el tema de la justicia colectiva y la dignidad del pueblo; en Criterio B: la anáfora, la gradación, la paradoja y la ironía dramática; en Criterio C: el desarrollo del clímax dramático y su resolución; en Criterio D: el contraste entre el lenguaje jurídico del Juez y el habla coloquial de los villanos.',
  11
),

(
  'Don Juan Tenorio — Acto I (catálogo de Don Juan)',
  'José Zorrilla',
  'Siglo XIX',
  'Romanticismo',
  'teatro',
  'DON JUAN: Partid los días del año
entre las que ahí encontráis.
Uno a una las marcad,
y los días que sobréis,
por mí a las mujeres dais.
DON LUIS: Razón tenéis, caballero;
dividid el año entero,
y al que le toque ese día,
festeja con tal porfía
al amor con que yo espero.
DON JUAN: (Pausa, leyendo.) En Nápoles mil y trescientas.
En Roma setecientas y tres.
En Castilla siete novias en tres meses.
En Grecia: cien.
En Francia, cien. Igual en Portugal y en Flandes.
Y en cualquier parte que estuvo,
siempre de amor y de fama
la mujer que más me amó
fue la última que dejó.
CIUDADANO 1: ¡Vive Dios!
DON JUAN: (Con arrogancia.) Soy don Juan Tenorio,
y no hay hombre para mí.
De cuantos me han desafiado,
ninguno ha vuelto a saber
si hay valor en el poder
o el poder que da el valor.
Mi nombre en toda España
suena de modo que asombra,
y no hay ciudad ni campaña
que no recuerde mi nombre.
DON LUIS: Si es así, don Juan, os juro
que salís de aquí seguro;
que hay en vuestro proceder
tal arrogancia, que en mi ser
su igual jamás encontré.
Bravatas que hacen temblar,
¿quién os puede igualar?',
  '¿Cómo construye Zorrilla el personaje de Don Juan a través de su autopromoción en esta escena, y qué recursos dramáticos y lingüísticos emplea para caracterizarlo?',
  'Esta escena del primer acto de Don Juan Tenorio (1844) es una de las más conocidas del Romanticismo español: la jactanciosa enumeración de conquistas de Don Juan. El «catálogo» de mujeres por países —directamente heredado del catálogo de Leporello en el Don Giovanni de Mozart/Da Ponte— es una parodia de la épica heroica: los logros bélicos se sustituyen por conquistas amorosas, y las cifras astronómicas («mil y trescientas», «setecientas y tres») crean una hipérbole que el lector debe calibrar como autofabricación del mito. La gradación geográfica (Nápoles → Roma → Castilla → Grecia → Francia → Portugal → Flandes) construye la imagen de un conquistador cosmopolita sin raíces, figura característica del héroe romántico. La afirmación «no hay hombre para mí» es una bravata de arrogancia que el personaje pronuncia ante testigos: el teatro funciona aquí como performance de la identidad. La paradoja final —«soy don Juan, y no hay hombre para mí»— implica que Don Juan se ha colocado más allá de la humanidad ordinaria, lo que prefigura su desafío a Dios en los actos siguientes. La rima consonante del romance y el ritmo marcado refuerzan el tono grandilocuente y autoperformatico. En Criterio A: cómo la escena establece la desmesura de Don Juan y el tema del honor/deshonor; en Criterio B: la hipérbole, la enumeración, la gradación y la paradoja; en Criterio C: el lugar de la escena en la estructura de la obra; en Criterio D: el registro de la jactancia y el lenguaje del honor barroco en el contexto romántico.',
  12
);
