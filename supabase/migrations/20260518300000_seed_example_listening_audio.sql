-- ─────────────────────────────────────────────────────────────────────────────
-- Spanish B — Audios de ejemplo para comprensión auditiva (Prueba 2)
--
-- Dos transcripciones originales y sencillas (B1-B2) para poder probar la
-- sección auditiva de extremo a extremo. Se insertan INACTIVAS: revísalas y
-- actívalas (o reemplázalas por material propio) desde el panel admin. El MP3
-- se sintetiza con TTS la primera vez que un alumno reproduce el audio.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

INSERT INTO public.audios_paper2_b (theme, title_es, title_en, transcript_es, source, word_count, activo)
VALUES
(
  'experiencias',
  '(Ejemplo) Un viaje que lo cambió todo',
  '(Example) A trip that changed everything',
  'Hola, me llamo Lucía y quiero contaros un viaje que cambió mi forma de ver el mundo. El verano pasado pasé un mes en un pueblo pequeño de la costa, lejos de la ciudad donde vivo. Al principio echaba de menos el ruido, las tiendas y mi teléfono, porque allí casi no había señal. Sin embargo, poco a poco aprendí a disfrutar de las cosas sencillas: caminar por la mañana, hablar con los vecinos y cocinar con productos del mercado. Una señora mayor me enseñó a preparar pan y me contó historias de cuando era joven. Cuando volví a casa, me di cuenta de que no necesitaba tantas cosas para ser feliz. Desde entonces intento desconectar un fin de semana al mes y dedicar tiempo a las personas que quiero.',
  'Texto de ejemplo creado para la herramienta (no auténtico).',
  133,
  false
),
(
  'planeta_compartido',
  '(Ejemplo) Reciclar en mi barrio',
  '(Example) Recycling in my neighbourhood',
  'Buenos días a todos. Soy Marcos y trabajo en una asociación que cuida el medio ambiente en nuestro barrio. Hoy quiero hablaros de un problema que nos afecta a todos: la basura. Cada día se tiran muchos envases de plástico, papel y vidrio que podrían reciclarse, pero que terminan mezclados en el mismo contenedor. Por eso hemos puesto contenedores de colores en cada calle y hemos organizado talleres en el colegio para explicar cómo separar los residuos. Los resultados son muy positivos: en seis meses hemos reducido la basura sin reciclar casi a la mitad. Aun así, todavía queda mucho por hacer. Os pedimos un pequeño esfuerzo: separad el plástico, el papel y el vidrio en casa. Es un gesto sencillo, pero entre todos podemos cuidar mejor el planeta donde vivimos.',
  'Texto de ejemplo creado para la herramienta (no auténtico).',
  137,
  false
);

COMMIT;
