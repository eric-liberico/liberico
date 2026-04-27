-- Impide auto-escalado de perfiles y aplica el estado activo en RLS.

CREATE OR REPLACE FUNCTION public.has_active_role(p_user_id UUID, p_rol TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfiles
    WHERE user_id = p_user_id
      AND activo = true
      AND (p_rol IS NULL OR rol = p_rol)
  );
$$;

CREATE OR REPLACE FUNCTION public.prevent_perfiles_sensitive_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'authenticated' AND auth.uid() = OLD.user_id THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.rol IS DISTINCT FROM OLD.rol
       OR NEW.activo IS DISTINCT FROM OLD.activo THEN
      RAISE EXCEPTION 'No puedes modificar rol, estado activo o user_id de tu propio perfil';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_perfiles_sensitive_self_update ON public.perfiles;
CREATE TRIGGER prevent_perfiles_sensitive_self_update
  BEFORE UPDATE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_perfiles_sensitive_self_update();

-- perfiles
DROP POLICY IF EXISTS "Users insert own perfil" ON public.perfiles;
CREATE POLICY "Users insert own perfil"
  ON public.perfiles FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND rol IN ('alumno', 'profesor')
    AND activo = true
  );

DROP POLICY IF EXISTS "Users update own perfil" ON public.perfiles;
CREATE POLICY "Users update own perfil"
  ON public.perfiles FOR UPDATE
  USING (auth.uid() = user_id AND activo = true)
  WITH CHECK (auth.uid() = user_id AND activo = true);

DROP POLICY IF EXISTS "Users delete own perfil" ON public.perfiles;
CREATE POLICY "Users delete own perfil"
  ON public.perfiles FOR DELETE
  USING (auth.uid() = user_id AND activo = true);

DROP POLICY IF EXISTS "Profesores leen perfiles de sus alumnos" ON public.perfiles;
CREATE POLICY "Profesores leen perfiles de sus alumnos"
  ON public.perfiles FOR SELECT
  USING (
    profesor_id = auth.uid()
    AND activo = true
    AND public.has_active_role(auth.uid(), 'profesor')
  );

-- evaluaciones
DROP POLICY IF EXISTS "Users select own evaluaciones" ON public.evaluaciones;
CREATE POLICY "Users select own evaluaciones"
  ON public.evaluaciones FOR SELECT
  USING (auth.uid() = user_id AND public.has_active_role(auth.uid()));

DROP POLICY IF EXISTS "Users insert own evaluaciones" ON public.evaluaciones;
CREATE POLICY "Users insert own evaluaciones"
  ON public.evaluaciones FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_active_role(auth.uid()));

DROP POLICY IF EXISTS "Users update own evaluaciones" ON public.evaluaciones;
CREATE POLICY "Users update own evaluaciones"
  ON public.evaluaciones FOR UPDATE
  USING (auth.uid() = user_id AND public.has_active_role(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_active_role(auth.uid()));

DROP POLICY IF EXISTS "Users delete own evaluaciones" ON public.evaluaciones;
CREATE POLICY "Users delete own evaluaciones"
  ON public.evaluaciones FOR DELETE
  USING (auth.uid() = user_id AND public.has_active_role(auth.uid()));

DROP POLICY IF EXISTS "Profesores leen evaluaciones de sus alumnos" ON public.evaluaciones;
CREATE POLICY "Profesores leen evaluaciones de sus alumnos"
  ON public.evaluaciones FOR SELECT
  USING (
    public.has_active_role(auth.uid(), 'profesor')
    AND EXISTS (
      SELECT 1
      FROM public.perfiles
      WHERE user_id = evaluaciones.user_id
        AND profesor_id = auth.uid()
        AND activo = true
    )
  );

-- planes_estudio
DROP POLICY IF EXISTS "Users select own planes" ON public.planes_estudio;
CREATE POLICY "Users select own planes"
  ON public.planes_estudio FOR SELECT
  USING (auth.uid() = user_id AND public.has_active_role(auth.uid()));

DROP POLICY IF EXISTS "Users insert own planes" ON public.planes_estudio;
CREATE POLICY "Users insert own planes"
  ON public.planes_estudio FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_active_role(auth.uid()));

DROP POLICY IF EXISTS "Users update own planes" ON public.planes_estudio;
CREATE POLICY "Users update own planes"
  ON public.planes_estudio FOR UPDATE
  USING (auth.uid() = user_id AND public.has_active_role(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_active_role(auth.uid()));

DROP POLICY IF EXISTS "Users delete own planes" ON public.planes_estudio;
CREATE POLICY "Users delete own planes"
  ON public.planes_estudio FOR DELETE
  USING (auth.uid() = user_id AND public.has_active_role(auth.uid()));

DROP POLICY IF EXISTS "Profesores leen planes de sus alumnos" ON public.planes_estudio;
CREATE POLICY "Profesores leen planes de sus alumnos"
  ON public.planes_estudio FOR SELECT
  USING (
    public.has_active_role(auth.uid(), 'profesor')
    AND EXISTS (
      SELECT 1
      FROM public.perfiles
      WHERE user_id = planes_estudio.user_id
        AND profesor_id = auth.uid()
        AND activo = true
    )
  );

-- tareas_plan
DROP POLICY IF EXISTS "Users select own tareas" ON public.tareas_plan;
CREATE POLICY "Users select own tareas"
  ON public.tareas_plan FOR SELECT
  USING (
    public.has_active_role(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.planes_estudio p
      WHERE p.id = tareas_plan.plan_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users insert own tareas" ON public.tareas_plan;
CREATE POLICY "Users insert own tareas"
  ON public.tareas_plan FOR INSERT
  WITH CHECK (
    public.has_active_role(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.planes_estudio p
      WHERE p.id = tareas_plan.plan_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users update own tareas" ON public.tareas_plan;
CREATE POLICY "Users update own tareas"
  ON public.tareas_plan FOR UPDATE
  USING (
    public.has_active_role(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.planes_estudio p
      WHERE p.id = tareas_plan.plan_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_active_role(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.planes_estudio p
      WHERE p.id = tareas_plan.plan_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users delete own tareas" ON public.tareas_plan;
CREATE POLICY "Users delete own tareas"
  ON public.tareas_plan FOR DELETE
  USING (
    public.has_active_role(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.planes_estudio p
      WHERE p.id = tareas_plan.plan_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Profesores leen tareas de planes de sus alumnos" ON public.tareas_plan;
CREATE POLICY "Profesores leen tareas de planes de sus alumnos"
  ON public.tareas_plan FOR SELECT
  USING (
    public.has_active_role(auth.uid(), 'profesor')
    AND EXISTS (
      SELECT 1
      FROM public.planes_estudio pe
      JOIN public.perfiles pf ON pf.user_id = pe.user_id
      WHERE pe.id = tareas_plan.plan_id
        AND pf.profesor_id = auth.uid()
        AND pf.activo = true
    )
  );

DROP POLICY IF EXISTS "profesor_actualiza_tareas_alumnos" ON public.tareas_plan;
CREATE POLICY "profesor_actualiza_tareas_alumnos"
  ON public.tareas_plan
  FOR UPDATE
  USING (
    public.has_active_role(auth.uid(), 'profesor')
    AND EXISTS (
      SELECT 1
      FROM public.planes_estudio pe
      JOIN public.perfiles pf ON pf.user_id = pe.user_id
      WHERE pe.id = tareas_plan.plan_id
        AND pf.profesor_id = auth.uid()
        AND pf.activo = true
    )
  )
  WITH CHECK (
    public.has_active_role(auth.uid(), 'profesor')
    AND EXISTS (
      SELECT 1
      FROM public.planes_estudio pe
      JOIN public.perfiles pf ON pf.user_id = pe.user_id
      WHERE pe.id = tareas_plan.plan_id
        AND pf.profesor_id = auth.uid()
        AND pf.activo = true
    )
  );

-- biblioteca
DROP POLICY IF EXISTS "Authenticated users read textos" ON public.textos_biblioteca;
CREATE POLICY "Authenticated users read textos"
  ON public.textos_biblioteca FOR SELECT
  TO authenticated
  USING (public.has_active_role(auth.uid()));

DROP POLICY IF EXISTS "Users select own textos_vistos" ON public.textos_vistos;
CREATE POLICY "Users select own textos_vistos"
  ON public.textos_vistos FOR SELECT
  USING (auth.uid() = user_id AND public.has_active_role(auth.uid()));

DROP POLICY IF EXISTS "Users insert own textos_vistos" ON public.textos_vistos;
CREATE POLICY "Users insert own textos_vistos"
  ON public.textos_vistos FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_active_role(auth.uid()));

-- chat profesor
DROP POLICY IF EXISTS "Profesores gestionan sus mensajes" ON public.mensajes_chat_profesor;
CREATE POLICY "Profesores gestionan sus mensajes"
  ON public.mensajes_chat_profesor
  USING (auth.uid() = profesor_id AND public.has_active_role(auth.uid(), 'profesor'))
  WITH CHECK (auth.uid() = profesor_id AND public.has_active_role(auth.uid(), 'profesor'));

DROP POLICY IF EXISTS "Profesores gestionan sus chats" ON public.chats_profesor;
CREATE POLICY "Profesores gestionan sus chats"
  ON public.chats_profesor
  USING (auth.uid() = profesor_id AND public.has_active_role(auth.uid(), 'profesor'))
  WITH CHECK (auth.uid() = profesor_id AND public.has_active_role(auth.uid(), 'profesor'));

-- comentarios y anotaciones
DROP POLICY IF EXISTS "profesor_gestiona_propios_comentarios" ON public.comentarios_profesor;
CREATE POLICY "profesor_gestiona_propios_comentarios"
  ON public.comentarios_profesor
  FOR ALL
  USING (
    auth.uid() = profesor_id
    AND public.has_active_role(auth.uid(), 'profesor')
    AND EXISTS (
      SELECT 1
      FROM public.evaluaciones e
      JOIN public.perfiles p ON p.user_id = e.user_id
      WHERE e.id = comentarios_profesor.evaluacion_id
        AND p.profesor_id = auth.uid()
        AND p.activo = true
    )
  )
  WITH CHECK (
    auth.uid() = profesor_id
    AND public.has_active_role(auth.uid(), 'profesor')
    AND EXISTS (
      SELECT 1
      FROM public.evaluaciones e
      JOIN public.perfiles p ON p.user_id = e.user_id
      WHERE e.id = comentarios_profesor.evaluacion_id
        AND p.profesor_id = auth.uid()
        AND p.activo = true
    )
  );

DROP POLICY IF EXISTS "alumno_lee_comentarios_propios" ON public.comentarios_profesor;
CREATE POLICY "alumno_lee_comentarios_propios"
  ON public.comentarios_profesor
  FOR SELECT
  USING (
    public.has_active_role(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.evaluaciones e
      WHERE e.id = comentarios_profesor.evaluacion_id
        AND e.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "profesor_gestiona_propias_anotaciones" ON public.anotaciones_evaluacion;
CREATE POLICY "profesor_gestiona_propias_anotaciones"
  ON public.anotaciones_evaluacion
  FOR ALL
  USING (
    auth.uid() = profesor_id
    AND public.has_active_role(auth.uid(), 'profesor')
    AND EXISTS (
      SELECT 1
      FROM public.evaluaciones e
      JOIN public.perfiles p ON p.user_id = e.user_id
      WHERE e.id = anotaciones_evaluacion.evaluacion_id
        AND p.profesor_id = auth.uid()
        AND p.activo = true
    )
  )
  WITH CHECK (
    auth.uid() = profesor_id
    AND public.has_active_role(auth.uid(), 'profesor')
    AND EXISTS (
      SELECT 1
      FROM public.evaluaciones e
      JOIN public.perfiles p ON p.user_id = e.user_id
      WHERE e.id = anotaciones_evaluacion.evaluacion_id
        AND p.profesor_id = auth.uid()
        AND p.activo = true
    )
  );

DROP POLICY IF EXISTS "alumno_lee_anotaciones_propias" ON public.anotaciones_evaluacion;
CREATE POLICY "alumno_lee_anotaciones_propias"
  ON public.anotaciones_evaluacion
  FOR SELECT
  USING (
    public.has_active_role(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.evaluaciones e
      WHERE e.id = anotaciones_evaluacion.evaluacion_id
        AND e.user_id = auth.uid()
    )
  );

-- RPCs de gestión profesor/alumno
CREATE OR REPLACE FUNCTION public.unirse_a_clase(p_codigo TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profesor_id UUID;
  v_mi_rol TEXT;
BEGIN
  SELECT rol
    INTO v_mi_rol
    FROM perfiles
   WHERE user_id = auth.uid()
     AND activo = true;

  IF v_mi_rol IS DISTINCT FROM 'alumno' THEN
    RETURN 'error:solo_alumnos';
  END IF;

  SELECT user_id
    INTO v_profesor_id
    FROM perfiles
   WHERE codigo_clase = upper(trim(p_codigo))
     AND rol = 'profesor'
     AND activo = true;

  IF v_profesor_id IS NULL THEN
    RETURN 'error:codigo_invalido';
  END IF;

  UPDATE perfiles SET profesor_id = v_profesor_id WHERE user_id = auth.uid() AND activo = true;
  RETURN 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION public.salir_de_clase()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE perfiles
     SET profesor_id = NULL
   WHERE user_id = auth.uid()
     AND rol = 'alumno'
     AND activo = true;
END;
$$;

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
  WHERE public.has_active_role(auth.uid(), 'profesor')
    AND p.profesor_id = auth.uid()
    AND p.rol = 'alumno'
    AND p.activo = true
  GROUP BY p.user_id, p.email;
$$;
