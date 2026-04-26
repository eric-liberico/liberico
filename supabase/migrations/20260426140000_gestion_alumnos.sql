-- Gestión de alumnos por el profesor

-- 1. Columnas en perfiles
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS codigo_clase TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS profesor_id  UUID REFERENCES auth.users ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_perfiles_codigo_clase
  ON public.perfiles(codigo_clase) WHERE codigo_clase IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_perfiles_profesor_id
  ON public.perfiles(profesor_id) WHERE profesor_id IS NOT NULL;

-- 2. Trigger: genera código de clase automáticamente al crear/actualizar perfil de profesor
CREATE OR REPLACE FUNCTION public.generar_codigo_clase()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.rol = 'profesor' AND NEW.codigo_clase IS NULL THEN
    NEW.codigo_clase := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_codigo_clase
  BEFORE INSERT OR UPDATE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.generar_codigo_clase();

-- Backfill profesores existentes sin código
UPDATE public.perfiles
  SET codigo_clase = upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  WHERE rol = 'profesor' AND codigo_clase IS NULL;

-- 3. RLS: el profesor puede leer perfiles de sus alumnos
CREATE POLICY "Profesores leen perfiles de sus alumnos"
  ON public.perfiles FOR SELECT
  USING (profesor_id = auth.uid());

-- 4. RLS: el profesor puede leer evaluaciones de sus alumnos
CREATE POLICY "Profesores leen evaluaciones de sus alumnos"
  ON public.evaluaciones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE user_id = evaluaciones.user_id
        AND profesor_id = auth.uid()
    )
  );

-- 5. RPC: el alumno se une a una clase con el código del profesor
CREATE OR REPLACE FUNCTION public.unirse_a_clase(p_codigo TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profesor_id UUID;
  v_mi_rol      TEXT;
BEGIN
  SELECT rol INTO v_mi_rol FROM perfiles WHERE user_id = auth.uid();
  IF v_mi_rol IS DISTINCT FROM 'alumno' THEN
    RETURN 'error:solo_alumnos';
  END IF;

  SELECT user_id INTO v_profesor_id
    FROM perfiles
   WHERE codigo_clase = upper(trim(p_codigo)) AND rol = 'profesor';

  IF v_profesor_id IS NULL THEN
    RETURN 'error:codigo_invalido';
  END IF;

  UPDATE perfiles SET profesor_id = v_profesor_id WHERE user_id = auth.uid();
  RETURN 'ok';
END;
$$;

-- 6. RPC: el alumno abandona su clase
CREATE OR REPLACE FUNCTION public.salir_de_clase()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE perfiles SET profesor_id = NULL
   WHERE user_id = auth.uid() AND rol = 'alumno';
END;
$$;

-- 7. RPC: el profesor obtiene sus alumnos con estadísticas agregadas
CREATE OR REPLACE FUNCTION public.get_mis_alumnos()
RETURNS TABLE(
  user_id          UUID,
  email            TEXT,
  nota_ib_media    NUMERIC,
  num_evaluaciones BIGINT,
  ultima_evaluacion TIMESTAMPTZ,
  banda_a_media    NUMERIC,
  banda_b_media    NUMERIC,
  banda_c_media    NUMERIC,
  banda_d_media    NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM perfiles WHERE user_id = auth.uid() AND rol = 'profesor'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    u.email::TEXT,
    ROUND(AVG(e.nota_ib)::NUMERIC,  1) AS nota_ib_media,
    COUNT(e.id)                        AS num_evaluaciones,
    MAX(e.created_at)                  AS ultima_evaluacion,
    ROUND(AVG(e.banda_a)::NUMERIC, 1)  AS banda_a_media,
    ROUND(AVG(e.banda_b)::NUMERIC, 1)  AS banda_b_media,
    ROUND(AVG(e.banda_c)::NUMERIC, 1)  AS banda_c_media,
    ROUND(AVG(e.banda_d)::NUMERIC, 1)  AS banda_d_media
  FROM perfiles p
  JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN evaluaciones e ON e.user_id = p.user_id
  WHERE p.profesor_id = auth.uid()
    AND p.rol = 'alumno'
  GROUP BY p.user_id, u.email;
END;
$$;
