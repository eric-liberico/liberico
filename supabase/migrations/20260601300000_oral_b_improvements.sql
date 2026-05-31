BEGIN;

-- 1. Separar el guion en tres partes en evaluaciones_oral_b.
-- Retrocompat: la columna `guion` existente permanece como fallback. El nuevo
-- esquema usa tres columnas nullable; si solo llega `guion` (legacy), el
-- evaluador lo usa entero. Si llegan las tres partes, el evaluador las usa por
-- separado para B1 (presentación + discusión del estímulo) y B2 (discusión general).
ALTER TABLE public.evaluaciones_oral_b
  ADD COLUMN IF NOT EXISTS guion_presentacion   TEXT,
  ADD COLUMN IF NOT EXISTS guion_discusion_b1   TEXT,
  ADD COLUMN IF NOT EXISTS guion_discusion_b2   TEXT;

COMMENT ON COLUMN public.evaluaciones_oral_b.guion_presentacion IS
  'Parte 1 (3-4 min): presentación basada en el estímulo visual (NM) o pasaje literario (NS). Evaluada por B1. Nullable: si NULL, el evaluador usa el guion completo.';
COMMENT ON COLUMN public.evaluaciones_oral_b.guion_discusion_b1 IS
  'Parte 2 (4-5 min): discusión sobre la presentación, preguntas del examinador. Evaluada por B1. Nullable.';
COMMENT ON COLUMN public.evaluaciones_oral_b.guion_discusion_b2 IS
  'Parte 3 (5-6 min): discusión general sobre el tema prescrito. Evaluada por B2. Nullable.';

-- 2. Feedback estructurado adicional generado por evaluate-oral-b.
ALTER TABLE public.evaluaciones_oral_b
  ADD COLUMN IF NOT EXISTS errores_lengua      JSONB,
  ADD COLUMN IF NOT EXISTS estructura_feedback JSONB,
  ADD COLUMN IF NOT EXISTS preguntas_probables JSONB;

COMMENT ON COLUMN public.evaluaciones_oral_b.errores_lengua IS
  'Array de {categoria, fragmento_original, correccion}: 2-4 ejemplos de lengua del guion (criterio A).';
COMMENT ON COLUMN public.evaluaciones_oral_b.estructura_feedback IS
  'Objeto JSON: {presentacion_ok, discusion_b1_ok, discusion_b2_ok, comentario_estructura, palabras_presentacion, minutos_estimados}.';
COMMENT ON COLUMN public.evaluaciones_oral_b.preguntas_probables IS
  'Array de strings: 3-5 preguntas que un examinador haría sobre este oral, generadas como feedback formativo.';

-- 3. Metadatos de la imagen y guía de discusión en prompts_oral_b.
ALTER TABLE public.prompts_oral_b
  ADD COLUMN IF NOT EXISTS image_alt_es        TEXT,
  ADD COLUMN IF NOT EXISTS image_alt_en        TEXT,
  ADD COLUMN IF NOT EXISTS suggested_questions JSONB,
  ADD COLUMN IF NOT EXISTS cultura_conexion    TEXT;

COMMENT ON COLUMN public.prompts_oral_b.image_alt_es IS
  'Descripción detallada de la imagen en español para el evaluador y accesibilidad: qué se ve, contexto cultural, elementos visuales relevantes.';
COMMENT ON COLUMN public.prompts_oral_b.image_alt_en IS
  'Detailed image description in English.';
COMMENT ON COLUMN public.prompts_oral_b.suggested_questions IS
  'Array de 3-5 preguntas de discusión apropiadas para este estímulo; guían al evaluador para generar preguntas_probables.';
COMMENT ON COLUMN public.prompts_oral_b.cultura_conexion IS
  'Nota breve (1-2 frases) sobre la conexión cultural hispanohablante específica que debería explorar la presentación.';

COMMIT;
