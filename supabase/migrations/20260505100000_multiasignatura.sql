-- ─────────────────────────────────────────────────────────────────────────────
-- Migración: expansión multiasignatura
-- Añade:
--   • Tabla courses (catálogo extensible de cursos Language A: Literature)
--   • Columna course_key (FK) en 8 tablas, default 'spanish-a-literature'
--   • Normalización nivel: NM→SL, NS→HL en todas las tablas de evaluación
--   • Generalización TipoObraOral: original_espanol→original_language, etc.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. Catálogo de cursos ────────────────────────────────────────────────────

CREATE TABLE public.courses (
  key               text PRIMARY KEY,
  name_es           text NOT NULL,
  name_en           text NOT NULL,
  response_language text NOT NULL CHECK (response_language IN ('es','en','fr','de','it')),
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses_select_authenticated"
  ON public.courses FOR SELECT
  TO authenticated
  USING (is_active = true);

INSERT INTO public.courses (key, name_es, name_en, response_language) VALUES
  ('spanish-a-literature', 'Español A: Literatura', 'Spanish A: Literature', 'es'),
  ('english-a-literature', 'English A: Literature', 'English A: Literature', 'en');

-- ── 2. Añadir course_key con FK a todas las tablas relevantes ────────────────

ALTER TABLE public.evaluaciones
  ADD COLUMN course_key text NOT NULL DEFAULT 'spanish-a-literature'
  REFERENCES public.courses(key);

ALTER TABLE public.evaluaciones_prueba2
  ADD COLUMN course_key text NOT NULL DEFAULT 'spanish-a-literature'
  REFERENCES public.courses(key);

ALTER TABLE public.evaluaciones_oral
  ADD COLUMN course_key text NOT NULL DEFAULT 'spanish-a-literature'
  REFERENCES public.courses(key);

ALTER TABLE public.evaluaciones_apuntes_oral
  ADD COLUMN course_key text NOT NULL DEFAULT 'spanish-a-literature'
  REFERENCES public.courses(key);

ALTER TABLE public.textos_practica_p1
  ADD COLUMN course_key text NOT NULL DEFAULT 'spanish-a-literature'
  REFERENCES public.courses(key);

ALTER TABLE public.textos_biblioteca
  ADD COLUMN course_key text NOT NULL DEFAULT 'spanish-a-literature'
  REFERENCES public.courses(key);

ALTER TABLE public.preguntas_prueba2
  ADD COLUMN course_key text NOT NULL DEFAULT 'spanish-a-literature'
  REFERENCES public.courses(key);

ALTER TABLE public.perfiles
  ADD COLUMN course_key text NOT NULL DEFAULT 'spanish-a-literature'
  REFERENCES public.courses(key);

-- ── 3. Índices sobre course_key ──────────────────────────────────────────────

CREATE INDEX idx_evaluaciones_course_key      ON public.evaluaciones(course_key);
CREATE INDEX idx_evaluaciones_p2_course_key   ON public.evaluaciones_prueba2(course_key);
CREATE INDEX idx_evaluaciones_oral_course_key ON public.evaluaciones_oral(course_key);
CREATE INDEX idx_textos_practica_course_key   ON public.textos_practica_p1(course_key);
CREATE INDEX idx_preguntas_p2_course_key      ON public.preguntas_prueba2(course_key);

-- ── 4. Normalizar nivel: NM→SL, NS→HL ───────────────────────────────────────
-- IMPORTANTE: primero eliminar los CHECK constraints existentes,
-- luego actualizar los datos, luego añadir los nuevos constraints.
-- El orden inverso falla porque 'SL'/'HL' violarían el CHECK antiguo ('NM'|'NS').

-- 4a. Eliminar CHECK constraints de nivel existentes
DO $$
DECLARE
  r RECORD;
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'evaluaciones',
    'evaluaciones_prueba2',
    'evaluaciones_oral',
    'evaluaciones_apuntes_oral'
  ]) LOOP
    FOR r IN
      SELECT conname FROM pg_constraint
      WHERE conrelid = ('public.' || tbl)::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%nivel%'
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', tbl, r.conname);
    END LOOP;
  END LOOP;
END;
$$;

-- 4b. Migrar datos: NM→SL, NS→HL (los valores SL/HL ya existentes se conservan)
UPDATE public.evaluaciones
  SET nivel = CASE nivel
    WHEN 'NM' THEN 'SL'
    WHEN 'NS' THEN 'HL'
    ELSE nivel   -- conserva 'SL'/'HL' si ya existen
  END
  WHERE nivel IN ('NM', 'NS', 'SL', 'HL');

UPDATE public.evaluaciones_prueba2
  SET nivel = CASE nivel
    WHEN 'NM' THEN 'SL'
    WHEN 'NS' THEN 'HL'
    ELSE nivel
  END
  WHERE nivel IN ('NM', 'NS', 'SL', 'HL');

UPDATE public.evaluaciones_oral
  SET nivel = CASE nivel
    WHEN 'NM' THEN 'SL'
    WHEN 'NS' THEN 'HL'
    ELSE nivel
  END
  WHERE nivel IN ('NM', 'NS', 'SL', 'HL');

UPDATE public.evaluaciones_apuntes_oral
  SET nivel = CASE nivel
    WHEN 'NM' THEN 'SL'
    WHEN 'NS' THEN 'HL'
    ELSE nivel
  END
  WHERE nivel IN ('NM', 'NS', 'SL', 'HL');

-- 4c. Añadir nuevos CHECK constraints con SL/HL
ALTER TABLE public.evaluaciones
  ADD CONSTRAINT evaluaciones_nivel_check CHECK (nivel IN ('SL','HL'));

ALTER TABLE public.evaluaciones_prueba2
  ADD CONSTRAINT evaluaciones_prueba2_nivel_check CHECK (nivel IN ('SL','HL'));

ALTER TABLE public.evaluaciones_oral
  ADD CONSTRAINT evaluaciones_oral_nivel_check CHECK (nivel IN ('SL','HL'));

ALTER TABLE public.evaluaciones_apuntes_oral
  ADD CONSTRAINT evaluaciones_apuntes_oral_nivel_check CHECK (nivel IN ('SL','HL'));

-- 4d. Cambiar DEFAULT de nivel a SL
ALTER TABLE public.evaluaciones              ALTER COLUMN nivel SET DEFAULT 'SL';
ALTER TABLE public.evaluaciones_prueba2      ALTER COLUMN nivel SET DEFAULT 'SL';
ALTER TABLE public.evaluaciones_oral         ALTER COLUMN nivel SET DEFAULT 'SL';
ALTER TABLE public.evaluaciones_apuntes_oral ALTER COLUMN nivel SET DEFAULT 'SL';

-- ── 5. Generalizar TipoObraOral ──────────────────────────────────────────────
-- IMPORTANTE: primero eliminar los CHECK constraints existentes,
-- luego actualizar los datos, luego añadir los nuevos constraints.

-- 5a. Eliminar CHECK constraints de obra_tipo existentes
DO $$
DECLARE
  r RECORD;
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'evaluaciones_oral',
    'evaluaciones_apuntes_oral'
  ]) LOOP
    FOR r IN
      SELECT conname FROM pg_constraint
      WHERE conrelid = ('public.' || tbl)::regclass
        AND contype = 'c'
        AND (
          pg_get_constraintdef(oid) LIKE '%obra_1_tipo%'
          OR pg_get_constraintdef(oid) LIKE '%obra_2_tipo%'
        )
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', tbl, r.conname);
    END LOOP;
  END LOOP;
END;
$$;

-- 5b. Migrar datos obra_tipo
UPDATE public.evaluaciones_oral SET
  obra_1_tipo = CASE obra_1_tipo
    WHEN 'original_espanol' THEN 'original_language'
    WHEN 'traducida'        THEN 'in_translation'
    WHEN 'no_especificado'  THEN 'unspecified'
    ELSE obra_1_tipo   -- conserva valores ya migrados
  END,
  obra_2_tipo = CASE obra_2_tipo
    WHEN 'original_espanol' THEN 'original_language'
    WHEN 'traducida'        THEN 'in_translation'
    WHEN 'no_especificado'  THEN 'unspecified'
    ELSE obra_2_tipo
  END;

UPDATE public.evaluaciones_apuntes_oral SET
  obra_1_tipo = CASE obra_1_tipo
    WHEN 'original_espanol' THEN 'original_language'
    WHEN 'traducida'        THEN 'in_translation'
    WHEN 'no_especificado'  THEN 'unspecified'
    ELSE obra_1_tipo
  END,
  obra_2_tipo = CASE obra_2_tipo
    WHEN 'original_espanol' THEN 'original_language'
    WHEN 'traducida'        THEN 'in_translation'
    WHEN 'no_especificado'  THEN 'unspecified'
    ELSE obra_2_tipo
  END;

-- 5c. Añadir nuevos CHECK constraints de obra_tipo generalizados
ALTER TABLE public.evaluaciones_oral
  ADD CONSTRAINT evaluaciones_oral_obra_1_tipo_check
  CHECK (obra_1_tipo IN ('original_language','in_translation','unspecified'));

ALTER TABLE public.evaluaciones_oral
  ADD CONSTRAINT evaluaciones_oral_obra_2_tipo_check
  CHECK (obra_2_tipo IN ('original_language','in_translation','unspecified'));

COMMIT;
