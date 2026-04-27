# Ejemplos de corrección calibrados

Este documento recoge correcciones reales de exámenes de estudiantes hechas en chats previos del proyecto. Son la **calibración del corrector**: la Edge Function `evaluate-analysis` debe replicar (con tolerancia de ±1 banda) las bandas y la lógica de estos ejemplos.

**Estado de implementación (2026-04-27):** además de calibrar las bandas, estos patrones alimentan la solución anotada. Cuando el corrector detecta promesas estructurales incumplidas, conclusiones proyectivas, interferencias del inglés, verbos débiles u oportunidades de reescritura, debe devolver fragmentos localizables para que `AnalisisAnotado.tsx` pueda resaltarlos en el texto del alumno.

Los textos sobre los que se trabajan son:

- **"El desentierro de la angelita"** de Mariana Enríquez (cuento, prosa contemporánea, narrador en primera persona).
- **"Tarzán" / Monólogo del animal maldito** (poema en prosa, monólogo introspectivo).
- **"Magdalena"** de Ricardo Fernández Guardia (fragmento dramático, diálogo costumbrista).
- **"Nadie está solo"** (poema, progresión pronominal él → tú → nosotros).

Cada ejemplo se documenta en este orden: marco de análisis del texto, examen del estudiante, bandas asignadas con justificación, lección general.

---

## Texto 1 — "El desentierro de la angelita" (Mariana Enríquez)

### Pregunta de orientación

Analizar **cómo y con qué efecto el autor crea ambigüedad** en el fragmento.

### Marco de análisis (lo que una respuesta sólida debe abordar)

Una respuesta de banda alta a NM debería identificar al menos varios de estos mecanismos generadores de ambigüedad:

- **Narrador en primera persona infantil**, con focalización interna que limita el conocimiento del lector. La voz recuerda desde la infancia y, en el cierre, se traslada al presente adulto.
- **Contraste tonal**: tono lúdico, juguetón ("manía excavatoria", "tesoros") frente a la **carga macabra** de lo que se desentierra (huesos de un bebé). La ambigüedad nace del desajuste.
- **Gradación** de los hallazgos: vidrios pulidos → piedra-cucaracha → dados → huesos. Avance de lo trivial a lo siniestro sin marcar el salto.
- **Choque de marcos interpretativos**: padre racionalista ("supersticiones", "huesos de pollo o de bifes de lomo") frente a abuela supersticiosa ("la angelita la angelita"). El texto **no resuelve** el conflicto.
- **Costumbrismo del velorio del "angelito"** (tradición rioplatense): describe lo macabro con detalle doméstico y tierno.
- **Salto temporal y cambio de tiempo verbal** al final (pretérito → presente). Rompe el pacto realista y reabre la ambigüedad.
- **Negación acumulativa** en el cierre. Se define al fantasma por lo que **no es**, dejando lo que sí es indeterminado.
- **Elipsis de diez años** entre la infancia y la aparición final.
- **Título** ("desentierro") operando literal y simbólicamente.

### Errores de comprensión a vigilar

- **Confundir narradora con autora** ("Mariana Enríquez al excavar el pasado de su familia"). Error básico recurrente; baja Criterio A.
- No reconocer que la voz narrativa es **infantil** durante la mayor parte del fragmento.
- Atribuir a la narradora lo que dice **el padre** (el comentario sobre los huesos como restos de pollo).
- Confundir relaciones familiares: la angelita era la **hermana de la abuela**, no de la narradora.
- Leer el cierre como "ascenso espiritual" (no es eso: es una aparición fantasmal real al lado de la cama de la narradora adulta).

### Ejemplo: Cristina sobre "El desentierro de la angelita"

**Bandas asignadas:** A=3, B=3, C=3, D=3 → Total ~12, Nota IB = 4.

**Por qué A=3:**

Comprensión del significado literal y de varias implicaciones (contraste alegría narradora / sequedad familiares; importancia del paso "tesoros → huesos" como inflexión; cierre como reapertura de ambigüedad). Interpretación pertinente sobre la "dificultad de afrontar el pasado". Pero confunde repetidamente narradora con Mariana Enríquez; no reconoce la voz infantil; el cierre se trata con tres hipótesis sin decidirse.

**Por qué B=3:**

Identifica recursos (contraste, focalización interna, prosopopeya, parataxis, paso del artículo indefinido al definido, cambio de tiempo verbal, elipsis) y a veces los conecta con efecto. Buena observación del paso "una piedra → los huesos" como cambio gramatical inquietante. Pero **errores técnicos**: "narrador autodiegético de focalización interna" es tautológico; llamar "prosopopeya" al uso de "tierra como campo de exploración" es incorrecto; ver "animalización" en el símil de la cucaracha "sin patas ni antenas" es discutible (el símil precisamente niega la animalidad).

**Por qué C=3 y D=3:**

Estructura aceptable, tesis presente pero borrosa. Lenguaje claro con errores léxicos recurrentes.

### Ejemplo: Maija sobre "El desentierro de la angelita"

**Bandas asignadas:** A=2, B=2, C=2, D=3 → Total ~9, Nota IB = 3.

**Por qué A=2:**

Comprensión literal parcial. Confunde narradora con Enríquez (igual que Cristina). **Inventa una causalidad que no está en el texto**: que la abuela odia la lluvia "por nostalgia de la muerte de su hermana Angelita". El texto no establece esa conexión causal. Confunde la relación familiar (la angelita era hermana de la abuela). Lectura desviada del cierre: lo trata como "ascenso espiritual" cuando es una aparición fantasmal en el presente. Atribuye a "una observación general" lo que dice **el padre**.

**Por qué B=2:**

Identifica algunos recursos (contraste, paralelismo, prolepsis, imagen sensorial, _in crescendo_, simbolismo) pero las conexiones con efecto son débiles o forzadas. Etiquetas ocasionalmente erróneas.

### Ejemplo: Máximo sobre "El desentierro de la angelita"

**Bandas asignadas:** A=3 (resto sin documentar en detalle). Comprensión sólida e interpretación pertinente del eje de la pregunta. Mantiene el patrón de banda 3 del grupo.

---

## Texto 2 — Monólogo de Tarzán

### Pregunta de orientación

Analizar el tratamiento del **pánico** en el monólogo del "animal maldito".

### Marco de análisis

Eje central: la **paradoja del pánico permanente**. Tarzán está en posición intermedia entre selva y civilización; el pánico nace de no pertenecer a ninguna de las dos. El texto acepta el pánico como **condición permanente**, no se "supera" ni se vuelve "positivo". El cierre es resignación, no liberación.

### Ejemplo: Dylan sobre "Tarzán"

**Bandas asignadas:** A=3, B=2, C=3, D=3 → Total ~11, Nota IB = 4.

**Por qué A=3:**

Identifica la paradoja del "animal maldito". Mejor lectura interpretativa del grupo. Pero **lectura desviada del segundo párrafo**: sostiene que el pánico se vuelve "positivo" porque permite "pensar de manera calculada", cuando el texto dice lo contrario (Tarzán "roído por el pánico de mis incertidumbres", sin rutinas, vive de improvisaciones).

**Por qué B=2:**

Anuncia tres recursos en la introducción ("imagen visual", "dirección directa al lector implícito") pero solo desarrolla uno; el "lector implícito" ni siquiera existe en el monólogo (es introspectivo). **Cita inexacta crítica**: "rodeado" por "roído". No es lo mismo: el primero asedia desde fuera, el segundo corroe desde dentro. La cita imprecisa lleva a interpretación desviada.

### Lecciones

- Cumplir la **promesa estructural de la introducción**. Si anuncias tres recursos, los tres deben aparecer.
- **Verificar las citas** antes de construir análisis sobre ellas.
- No forzar la lectura para que encaje en un esquema "negativo → neutral → positivo".

---

## Texto 3 — Fragmento de "Magdalena" (Ricardo Fernández Guardia)

### Pregunta de orientación

Cómo se construye y se cuestiona el **arquetipo de la mujer soltera** mediante el diálogo.

### Marco de análisis

El mecanismo formal central es la **forma dialogada misma**. El arquetipo no se construye y se cuestiona por refutación abierta, sino por **polifonía con marco irónico**:

1. **María.** Largo monólogo en el centro del fragmento. Construye el arquetipo desde dentro. Su compasión cosifica a la solterona; su pragmatismo termina ridiculizándose (hipérbole "siete maridos por hombre", enumeración degradante "no digo con un zapatero, hasta con un chofer").
2. **Magdalena.** Réplicas breves al inicio y al final. Desplaza el problema desde la solterona hacia las **causas sociales** ("egoísmo de los hombres"). La metáfora final del matrimonio como "única tabla de salvación" denuncia la dependencia económica.
3. **Coro de personajes secundarios** (Ramón, Antonio, Jacinta, Adela). Sus réplicas breves enmarcan irónicamente el monólogo de María:
   - Ramón: "¡Bravo María!" (entusiasmo desproporcionado).
   - Antonio: "ha hablado como un libro" (brillante en forma, ajeno a la experiencia real).
   - Jacinta: chiste "si el Gobierno no se resuelve a importar maridos" (rompe la solemnidad).
   - Adela: califica el discurso de "disparates".

El cuestionamiento opera por el **marco irónico**, no por contradiscurso explícito. Detectar esto distingue una banda 4-5 de una 3.

### Ejemplo: Elena sobre "Magdalena"

**Bandas asignadas:** A=3, B=3, C=3, D=3 → Total 12, Nota IB = 4.

**Aciertos:**

- Identifica dos perspectivas opuestas (María / Magdalena) y sostiene que el texto construye una pluralidad, no un único arquetipo.
- Lee bien "el egoísmo de los hombres" como punto donde Magdalena señala la raíz social.
- Lee bien la metáfora final "tabla de salvación" como denuncia de dependencia económica.
- Observa que Magdalena, aunque más breve, **enmarca** el monólogo de María (estructura).

**Por qué no sube a 4-5:**

- Anuncia tres perspectivas en la introducción (María, Magdalena, "espectadores") pero **no desarrolla** la tercera. Promesa estructural incumplida.
- No analiza el **mecanismo central**: el coro irónico (Ramón / Antonio / Jacinta / Adela) y su función de marco.
- Conclusión proyectiva ("fuerte, independiente y feliz") que no se sostiene en el texto.
- Lectura binaria María vs Magdalena, sin aprovechar la polifonía.

### Reescritura propuesta — conclusión

Como ejemplo de cómo subir de banda 3 a 4-5, la conclusión del análisis se reescribiría así:

> En conclusión, el extracto de _Magdalena_ construye y cuestiona simultáneamente el arquetipo de la mujer soltera mediante la propia forma dialogada. María lo construye desde dentro, con una compasión que lo cosifica y un pragmatismo que termina ridiculizándose; Magdalena lo cuestiona desde fuera, devolviendo el problema a sus causas sociales; y el coro de personajes secundarios lo enmarca con una ironía que distancia al lector sin necesidad de refutaciones explícitas. El efecto es el de un texto que no impone una lectura única, sino que muestra cómo el arquetipo se sostiene en una red de discursos, y cómo basta con cambiar la voz —o añadir una réplica— para que esa red se afloje.

Cambios clave: se elimina la conclusión proyectiva, se nombra el mecanismo central (forma dialogada, coro irónico) y se sintetizan los tres niveles del análisis.

---

## Texto 4 — "Nadie está solo" (poema)

### Pregunta de orientación

Cómo el lector pasa de la **distancia a la identificación** con el hombre del poema.

### Marco de análisis

Mecanismos centrales:

- **Progresión pronominal él → tú → nosotros**, que arrastra al lector progresivamente desde el observador externo hasta la inclusión.
- **Pregunta bisagra "¿He dicho solo?"** que funciona como pivote del giro.
- Imagen del dolor universalizado.

Detectar estos dos elementos (progresión pronominal y pregunta bisagra) es lo que distingue una banda 4 de una banda 3 en el Criterio B.

### Ejemplo: Cristina sobre "Nadie está solo"

**Bandas asignadas:** A=4, B=3, C=4, D=4 → Total 15, Nota IB = 5.

**Aciertos:**

- Tesis clara desde el inicio.
- Tres movimientos coherentes que siguen el progreso del poema.
- Lenguaje cuidado, registro adecuado.
- Captura el eje de la pregunta (paso distancia → identificación).

**Por qué B=3 (lo que tira hacia abajo):**

- Etiquetas técnicas a veces imprecisas ("metáfora preposicional", "bimembración verbal", "epíteto" sin justificación).
- Ausencia del **mecanismo formal central**: no analiza la progresión pronominal él → tú → nosotros, ni la función bisagra de "¿He dicho solo?". Identificarlos habría llevado el total a 16-17/20.

**Errores de lenguaje (Criterio D=4):**

- "Remachan" usado repetidamente con sentido de "refuerzan" — uso impropio.
- "En adición" — calco de _in addition_; se prefiere "además".
- "Empero" — formalmente correcto pero arcaizante, disonante con el registro.
- "El yo lírico fuerza una confrontación entre el yo lírico y el dolor" — error de redacción (confronta al **lector** con el dolor).
- "Condensa la existencia del hombre **al** sufrimiento" — régimen preposicional impropio (debería ser "**en**").

---

## Patrones recurrentes detectados a través de los ejemplos

Estos patrones deben ser **reconocidos por el corrector** porque aparecen una y otra vez en estudiantes de NM:

1. **Confundir narradora con autora.** Casi todos los estudiantes lo hicieron en _El desentierro de la angelita_. Marcar siempre y bajar de banda en el Criterio A.
2. **Promesas estructurales incumplidas.** Anunciar tres recursos en la introducción y desarrollar solo dos. Bajar Criterio C.
3. **Citas inexactas.** "Roído" por "rodeado" cambia el sentido. Verificar cada cita antes de basar análisis en ella.
4. **Etiquetas técnicas forzadas.** "Prosopopeya" sin personificación, "animalización" donde el símil la niega, "narrador autodiegético de focalización interna" como tautología.
5. **Conclusión proyectiva.** Cerrar con una afirmación optimista o tesis externa al texto que no se sostiene en el fragmento.
6. **Lecturas binarias en textos polifónicos.** Reducir _Magdalena_ a María vs Magdalena ignorando el coro irónico.
7. **Errores de lenguaje recurrentes.** Calcos del inglés ("en adición"), arcaísmos disonantes ("empero"), regímenes preposicionales impropios.

## Cómo usar estos ejemplos en el corrector

- En la **Edge Function** `evaluate-analysis`: el prompt al modelo incluye el **marco de análisis** del texto (no se le pide al modelo que lo invente cada vez para textos del banco curado).
- En la **solución anotada**: las observaciones estructurales y de lenguaje deben incluir fragmentos textuales suficientemente precisos para poder marcar el análisis del alumno sin romper palabras ni generar espacios extraños.
- En las **reescrituras sugeridas**: conservar la idea del estudiante y elevarla. El objetivo no es producir el análisis modelo perfecto, sino mostrar una transformación concreta de banda media a banda alta.
- En la futura **suite de tests** del evaluador: cargar como fixtures los análisis de Cristina, Maija, Dylan, Máximo y Elena, junto con sus bandas de referencia. Verificar que el corrector devuelve bandas dentro de **±1**.
- Cuando se añadan textos nuevos al banco, añadir también su marco de análisis y al menos dos ejemplos calibrados.

> **Privacidad:** los exámenes de estudiantes reales no deben subirse al repositorio público sin anonimizar. Reemplaza nombres y cualquier dato identificable antes de versionar.
