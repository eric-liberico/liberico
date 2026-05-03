-- ─────────────────────────────────────────────────────────────────────────────
-- Nivel del curso (NM / NS) en evaluaciones
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE evaluaciones
  ADD COLUMN IF NOT EXISTS nivel text NOT NULL DEFAULT 'NM'
  CHECK (nivel IN ('NM', 'NS'));

ALTER TABLE evaluaciones_prueba2
  ADD COLUMN IF NOT EXISTS nivel text NOT NULL DEFAULT 'NM'
  CHECK (nivel IN ('NM', 'NS'));

ALTER TABLE evaluaciones_oral
  ADD COLUMN IF NOT EXISTS nivel text NOT NULL DEFAULT 'NM'
  CHECK (nivel IN ('NM', 'NS'));

-- ─────────────────────────────────────────────────────────────────────────────
-- Revisiones de apuntes del Oral Individual
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS evaluaciones_apuntes_oral (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  nivel       text NOT NULL DEFAULT 'NM' CHECK (nivel IN ('NM', 'NS')),
  tipo_oral   text NOT NULL CHECK (tipo_oral IN ('taught', 'self_taught')),
  asunto_global text,
  obra_1_titulo text,
  obra_1_autor  text,
  obra_1_tipo   text,
  extracto_1    text,
  obra_2_titulo text,
  obra_2_autor  text,
  obra_2_tipo   text,
  extracto_2    text,
  apuntes_oral  text NOT NULL,
  resultado     jsonb,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE evaluaciones_apuntes_oral ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alumno lee sus revisiones de apuntes"
  ON evaluaciones_apuntes_oral FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Alumno crea sus revisiones de apuntes"
  ON evaluaciones_apuntes_oral FOR INSERT
  WITH CHECK (user_id = auth.uid());
