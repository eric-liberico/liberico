-- ─────────────────────────────────────────────────────────────────────────────
-- Spanish B — Prueba 2: activar audios de ejemplo y sembrar textos de lectura
--
-- Activa los dos audios de ejemplo (comprensión auditiva) e inserta dos textos
-- de lectura de ejemplo (activos) para poder probar la Prueba 2 de extremo a
-- extremo. Material original y sencillo (B1-B2), marcado como "(Ejemplo)";
-- reemplázalo por material propio cuando quieras.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Activar los audios de ejemplo sembrados anteriormente.
UPDATE public.audios_paper2_b
SET activo = true
WHERE title_es LIKE '(Ejemplo)%';

-- Textos de lectura de ejemplo.
INSERT INTO public.textos_paper2_b (theme, title_es, title_en, text_es, source, word_count, activo)
VALUES
(
  'experiencias',
  '(Ejemplo) El primer día en un país nuevo',
  '(Example) The first day in a new country',
  'Cuando bajé del avión, todo me parecía extraño. El aire olía distinto, la gente hablaba muy rápido y los carteles del aeropuerto usaban palabras que no entendía del todo. Había estudiado el idioma durante dos años, pero en ese momento sentí que no había aprendido nada. Tomé un autobús hacia el centro de la ciudad y me senté junto a la ventana para observarlo todo: las calles estrechas, los mercados llenos de color y los cafés donde la gente charlaba sin prisa.

Mi primera dificultad fue pedir comida. Entré en un pequeño restaurante y señalé un plato del menú sin saber qué era. Resultó ser una sopa de pescado deliciosa. La camarera, al ver mi cara de turista perdido, me habló despacio y con paciencia, y poco a poco entendí casi todo lo que decía. Ese pequeño gesto me dio confianza.

Durante las semanas siguientes aprendí que cometer errores no era un problema, sino una manera de avanzar. Cada conversación, aunque fuera corta, me ayudaba a sentirme menos extranjero. Descubrí que la mejor forma de aprender una cultura no es leer sobre ella, sino vivirla: equivocarse, preguntar y atreverse a hablar. Hoy, cuando recuerdo aquel primer día, ya no pienso en el miedo, sino en todo lo que esa experiencia me enseñó sobre mí mismo.',
  'Texto de ejemplo creado para la herramienta (no auténtico).',
  236,
  true
),
(
  'planeta_compartido',
  '(Ejemplo) Ciudades que apuestan por la bicicleta',
  '(Example) Cities that bet on the bicycle',
  'En los últimos años, muchas ciudades europeas han decidido transformar sus calles para dar más espacio a las bicicletas. El motivo es sencillo: el tráfico de coches contamina el aire, genera ruido y ocupa un espacio enorme. Frente a este problema, gobiernos locales como los de Ámsterdam, Sevilla o Copenhague han construido kilómetros de carriles seguros donde los ciclistas pueden circular sin miedo.

Los resultados son notables. En algunas ciudades, casi la mitad de los desplazamientos diarios ya se hacen en bicicleta. Esto reduce la contaminación, mejora la salud de los habitantes y hace las calles más tranquilas. Además, montar en bicicleta suele ser más rápido que el coche en los trayectos cortos, porque no hay que buscar aparcamiento ni esperar en los atascos.

Sin embargo, el cambio no es fácil. Algunas personas piensan que quitar espacio a los coches perjudica al comercio o complica la vida de quienes viven lejos del centro. Por eso, los expertos insisten en que la solución no es eliminar el coche por completo, sino ofrecer alternativas: buen transporte público, carriles seguros y aparcamientos para bicicletas.

La experiencia de estas ciudades demuestra que es posible imaginar un futuro urbano más limpio y más humano. La pregunta ya no es si debemos cambiar nuestra forma de movernos, sino con qué rapidez estamos dispuestos a hacerlo.',
  'Texto de ejemplo creado para la herramienta (no auténtico).',
  238,
  true
);

COMMIT;
