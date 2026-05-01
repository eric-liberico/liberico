-- Migración: Gamificación (XP, rachas, logros)

-- ── 1. Columnas nuevas en perfiles ────────────────────────────────────────
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS xp_total              integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS racha_actual          integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS racha_maxima          integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultima_actividad_fecha date;

-- ── 2. Catálogo de logros (tabla de referencia, sin datos de usuario) ──────
CREATE TABLE IF NOT EXISTS public.logros_catalogo (
  id            text    PRIMARY KEY,
  nombre        text    NOT NULL,
  descripcion   text    NOT NULL,
  xp_recompensa integer NOT NULL DEFAULT 0,
  icono         text    NOT NULL,
  categoria     text    NOT NULL
);

ALTER TABLE public.logros_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura autenticada de logros_catalogo"
  ON public.logros_catalogo FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── 3. Logros desbloqueados por usuario ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.logros_desbloqueados (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logro_id        text        NOT NULL REFERENCES public.logros_catalogo(id),
  desbloqueado_at timestamptz NOT NULL DEFAULT now(),
  notificado      boolean     NOT NULL DEFAULT false,
  UNIQUE (user_id, logro_id)
);

ALTER TABLE public.logros_desbloqueados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select own logros_desbloqueados"
  ON public.logros_desbloqueados FOR SELECT
  USING (auth.uid() = user_id);

-- El cliente puede marcar notificado=true; INSERT/DELETE solo desde service_role
CREATE POLICY "Update own notificado"
  ON public.logros_desbloqueados FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS logros_desbloqueados_user_idx
  ON public.logros_desbloqueados(user_id, desbloqueado_at DESC);

-- ── 4. Seed del catálogo (15 logros) ──────────────────────────────────────
INSERT INTO public.logros_catalogo (id, nombre, descripcion, xp_recompensa, icono, categoria)
VALUES
  ('primera_evaluacion',  'Primera corrección',       'Completa tu primera evaluación en cualquier prueba.',                         50,  'Sparkles',   'comienzo'),
  ('tres_evaluaciones',   'Primeros pasos',            'Completa 3 evaluaciones en total.',                                           75,  'BookOpen',   'comienzo'),
  ('primera_p2',          'Al comparar se aprende',   'Completa tu primera evaluación de Prueba 2.',                                 75,  'PenLine',    'comienzo'),
  ('primer_oral',         'La palabra toma forma',    'Completa tu primera evaluación de Oral Individual.',                          75,  'Mic',        'comienzo'),
  ('tres_pruebas',        'Explorador completo',      'Evalúa en P1, P2 y Oral al menos una vez.',                                 100,  'Trophy',     'cobertura'),
  ('racha_3',             'Tres días seguidos',       'Evalúa durante 3 días consecutivos.',                                        100,  'Flame',      'constancia'),
  ('racha_7',             'Semana de fuego',          'Evalúa durante 7 días consecutivos.',                                        200,  'Flame',      'constancia'),
  ('banda_maxima_p1',     'Banda 5 en P1',            'Obtén puntuación 5/5 en cualquier criterio de una evaluación de P1.',        150,  'Star',       'calidad'),
  ('nota_6_p1',           'Nota 6 en P1',             'Alcanza nota IB 6 o superior en una evaluación de Prueba 1.',               200,  'Award',      'calidad'),
  ('nota_7_p1',           'Excelencia en P1',         'Alcanza nota IB 7 en una evaluación de Prueba 1.',                          400,  'Medal',      'calidad'),
  ('mejora_criterio',     'En progreso',              'Mejora en el mismo criterio respecto a tu evaluación anterior de P1.',       100,  'TrendingUp', 'calidad'),
  ('mejora_consecutiva',  'Tendencia alcista',        'Sube la puntuación total de P1 en dos evaluaciones consecutivas.',           150,  'TrendingUp', 'calidad'),
  ('diez_evaluaciones',   'Constante',                'Completa 10 evaluaciones en total.',                                         200,  'CheckCheck', 'constancia'),
  ('veinte_evaluaciones', 'Incansable',               'Completa 20 evaluaciones en total.',                                         400,  'Zap',        'constancia'),
  ('oral_alta',           'Oral de nivel',            'Obtén puntuación total ≥ 32/40 en una evaluación de Oral Individual.',       250,  'Mic',        'calidad')
ON CONFLICT (id) DO NOTHING;
