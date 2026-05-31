-- ─────────────────────────────────────────────────────────────────────────────
-- Spanish B — Prueba 2 v2: comprensión auditiva + lectura (esquema de respuestas)
--
-- La Guía de Lengua B define la Prueba 2 como comprensión AUDITIVA (25 pts) +
-- comprensión de LECTURA (40 pts) = 65 pts, corregida por clave de respuestas,
-- evaluando SOLO la comprensión (no la lengua). Esta migración:
--   1. Crea el bucket público `audio-listening-b` con los clips de audio.
--   2. Crea la tabla `audios_paper2_b` (transcript + audio).
--   3. Reestructura `evaluaciones_paper2_b`: de A/B (lengua+comprensión) a
--      subtotales por sección + marcas por ítem (solo comprensión).
--
-- El curso está activo: se ALTERA preservando el historial. Las evaluaciones
-- antiguas conservan criterio_a/criterio_b (obsoletos, nullable) y reciben
-- subtotales nulos; las nuevas usan subtotal_auditiva / subtotal_lectura.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. Bucket público de audio para comprensión auditiva ──────────────────────
-- Público porque son estímulos didácticos (no datos de alumno). Los clips se
-- generan vía TTS (tts-listening-b) o los sube un administrador.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio-listening-b',
  'audio-listening-b',
  true,
  26214400, -- 25 MB
  ARRAY['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/aac']
)
ON CONFLICT (id) DO NOTHING;

-- Solo administradores pueden subir/borrar clips; lectura pública vía URL.
CREATE POLICY "audio_listening_b_admin_write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'audio-listening-b'
  AND EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true
  )
);

CREATE POLICY "audio_listening_b_admin_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'audio-listening-b'
  AND EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true
  )
);

-- ── 2. audios_paper2_b: banco de audios para comprensión auditiva ─────────────
-- transcript_es alimenta la generación de preguntas, la corrección y el TTS.
-- audio_path apunta al objeto en el bucket (se rellena al generar/subir el audio).

CREATE TABLE IF NOT EXISTS public.audios_paper2_b (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  theme         TEXT         NOT NULL CHECK (theme IN (
                  'identidades', 'experiencias', 'ingenio_humano',
                  'organizacion_social', 'planeta_compartido'
                )),
  title_es      TEXT         NOT NULL,
  title_en      TEXT         NOT NULL,
  transcript_es TEXT         NOT NULL,  -- guion del audio (no se muestra al alumno)
  audio_path    TEXT,                   -- objeto en audio-listening-b (nullable hasta generar)
  source        TEXT,                   -- atribución de la fuente
  word_count    INTEGER,
  activo        BOOLEAN      NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.audios_paper2_b ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audios_paper2_b_select_active_authenticated"
  ON public.audios_paper2_b FOR SELECT
  TO authenticated
  USING (activo = true);

CREATE POLICY "audios_paper2_b_admin_all"
  ON public.audios_paper2_b FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.perfiles
            WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.perfiles
            WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true)
  );

CREATE INDEX IF NOT EXISTS idx_audios_paper2_b_activo_theme
  ON public.audios_paper2_b(activo, theme);

-- ── 3. Reestructurar evaluaciones_paper2_b ────────────────────────────────────

-- La columna generada depende de criterio_a/criterio_b: eliminarla antes.
ALTER TABLE public.evaluaciones_paper2_b DROP COLUMN IF EXISTS puntuacion_total;

-- criterio_a (Lengua) y criterio_b (Comprensión) quedan obsoletos: nullable.
ALTER TABLE public.evaluaciones_paper2_b ALTER COLUMN criterio_a DROP NOT NULL;
ALTER TABLE public.evaluaciones_paper2_b ALTER COLUMN criterio_b DROP NOT NULL;

ALTER TABLE public.evaluaciones_paper2_b
  ADD COLUMN IF NOT EXISTS audio_id          UUID REFERENCES public.audios_paper2_b(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subtotal_auditiva INTEGER CHECK (subtotal_auditiva IS NULL OR subtotal_auditiva BETWEEN 0 AND 25),
  ADD COLUMN IF NOT EXISTS subtotal_lectura  INTEGER CHECK (subtotal_lectura  IS NULL OR subtotal_lectura  BETWEEN 0 AND 40),
  ADD COLUMN IF NOT EXISTS puntuacion_max    INTEGER,  -- 25, 40 o 65 según secciones realizadas
  ADD COLUMN IF NOT EXISTS items_auditiva    JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS items_lectura     JSONB NOT NULL DEFAULT '[]'::jsonb;

-- puntuacion_total = suma de subtotales realizados (sobre /65 cuando hay ambas).
ALTER TABLE public.evaluaciones_paper2_b
  ADD COLUMN puntuacion_total INTEGER
    GENERATED ALWAYS AS (COALESCE(subtotal_auditiva, 0) + COALESCE(subtotal_lectura, 0)) STORED;

COMMIT;
