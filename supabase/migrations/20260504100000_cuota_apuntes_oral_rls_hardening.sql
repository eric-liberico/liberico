-- ── RPC atómica para revisiones de apuntes oral ──────────────────────────────
-- Mismo patrón que reservar_cuota_oral: advisory lock + placeholder en llm_uso.
-- Retorna el UUID del placeholder, o NULL si la cuota está agotada.
CREATE OR REPLACE FUNCTION public.reservar_cuota_apuntes_oral(
  p_user_id uuid,
  p_limite  integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uso_id  uuid;
  v_hace24h timestamptz := now() - interval '24 hours';
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text)::bigint);

  IF (
    SELECT count(*)
    FROM public.llm_uso
    WHERE user_id       = p_user_id
      AND edge_function = 'evaluate-oral-notes'
      AND created_at   >= v_hace24h
  ) >= p_limite THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.llm_uso (user_id, edge_function, modelo, tokens_entrada, tokens_salida)
  VALUES (p_user_id, 'evaluate-oral-notes', 'claude-opus-4-7', 0, 0)
  RETURNING id INTO v_uso_id;

  RETURN v_uso_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reservar_cuota_apuntes_oral(uuid, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reservar_cuota_apuntes_oral(uuid, integer) TO service_role;

-- ── Hardening RLS evaluaciones_oral: usuarios desactivados no pueden operar ──
-- Sustituye las policies simples por versiones que comprueban activo = true.
DROP POLICY IF EXISTS "Users select own evaluaciones_oral" ON public.evaluaciones_oral;
DROP POLICY IF EXISTS "Users insert own evaluaciones_oral" ON public.evaluaciones_oral;
DROP POLICY IF EXISTS "Users delete own evaluaciones_oral" ON public.evaluaciones_oral;

CREATE POLICY "Users select own evaluaciones_oral"
  ON public.evaluaciones_oral FOR SELECT
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE user_id = auth.uid() AND activo = true
    )
  );

CREATE POLICY "Users insert own evaluaciones_oral"
  ON public.evaluaciones_oral FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE user_id = auth.uid() AND activo = true
    )
  );

CREATE POLICY "Users delete own evaluaciones_oral"
  ON public.evaluaciones_oral FOR DELETE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE user_id = auth.uid() AND activo = true
    )
  );
