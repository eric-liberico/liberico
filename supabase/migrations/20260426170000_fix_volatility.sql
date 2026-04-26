-- Corrige la volatilidad de get_mis_alumnos de STABLE a VOLATILE (lee datos en tiempo real)
DROP FUNCTION IF EXISTS public.get_mis_alumnos();

CREATE OR REPLACE FUNCTION public.get_mis_alumnos()
RETURNS TABLE(
  user_id           UUID,
  email             TEXT,
  nota_ib_media     NUMERIC,
  num_evaluaciones  BIGINT,
  ultima_evaluacion TIMESTAMPTZ,
  banda_a_media     NUMERIC,
  banda_b_media     NUMERIC,
  banda_c_media     NUMERIC,
  banda_d_media     NUMERIC
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.email,
    ROUND(AVG(e.nota_ib)::NUMERIC,  1) AS nota_ib_media,
    COUNT(e.id)                        AS num_evaluaciones,
    MAX(e.created_at)                  AS ultima_evaluacion,
    ROUND(AVG(e.banda_a)::NUMERIC, 1)  AS banda_a_media,
    ROUND(AVG(e.banda_b)::NUMERIC, 1)  AS banda_b_media,
    ROUND(AVG(e.banda_c)::NUMERIC, 1)  AS banda_c_media,
    ROUND(AVG(e.banda_d)::NUMERIC, 1)  AS banda_d_media
  FROM perfiles p
  LEFT JOIN evaluaciones e ON e.user_id = p.user_id
  WHERE p.profesor_id = auth.uid()
    AND p.rol = 'alumno'
  GROUP BY p.user_id, p.email;
$$;
