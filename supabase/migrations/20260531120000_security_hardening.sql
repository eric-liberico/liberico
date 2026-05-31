-- ─────────────────────────────────────────────────────────────────────────────
-- Endurecimiento de seguridad (revisión 2026-05-31)
--
--   1. ajustar_creditos_admin: autorizar por auth.uid() real, no por el
--      parámetro p_admin_id que envía el cliente (era suplantable).
--   2. audios_paper2_b.transcript_es: dejar de exponer la transcripción a los
--      alumnos. Se retira el SELECT de alumno sobre la tabla y se publica una
--      vista sin transcript_es con solo las filas activas.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. ajustar_creditos_admin: autorización basada en el JWT del caller ───────
-- Antes confiaba en p_admin_id (enviado por el cliente). Cualquier usuario
-- autenticado que conociera un UUID de admin podía ajustar créditos. Ahora la
-- autorización se hace SIEMPRE contra auth.uid() (el usuario del JWT), que no es
-- falsificable desde el cliente. p_admin_id se conserva en la firma por
-- compatibilidad, pero ya no se usa para autorizar; el log registra auth.uid().

CREATE OR REPLACE FUNCTION public.ajustar_creditos_admin(
  p_admin_id  UUID,
  p_user_id   UUID,
  p_cantidad  DECIMAL,   -- positivo = añadir, negativo = quitar
  p_razon     TEXT
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller        UUID := auth.uid();
  v_es_admin      BOOLEAN;
  v_saldo_antes   DECIMAL(10,2);
  v_saldo_despues DECIMAL(10,2);
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- El caller real (no el parámetro) debe ser admin activo.
  SELECT (rol = 'admin' AND activo = true) INTO v_es_admin
  FROM public.perfiles
  WHERE user_id = v_caller;

  IF NOT COALESCE(v_es_admin, false) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text)::bigint);

  SELECT creditos INTO v_saldo_antes
  FROM public.perfiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_saldo_antes IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  v_saldo_despues := GREATEST(0.00, LEAST(v_saldo_antes + p_cantidad, 200.00));

  UPDATE public.perfiles
  SET creditos = v_saldo_despues
  WHERE user_id = p_user_id;

  INSERT INTO public.creditos_transacciones
    (user_id, tipo, cantidad, balance_antes, balance_despues, concepto, metadata)
  VALUES
    (p_user_id, 'ajuste_admin',
     v_saldo_despues - v_saldo_antes,
     v_saldo_antes, v_saldo_despues,
     p_razon,
     jsonb_build_object('admin_id', v_caller));

  RETURN v_saldo_despues;
END;
$$;

-- El grant a authenticated ahora es seguro: la RPC autoriza por auth.uid().
REVOKE ALL ON FUNCTION public.ajustar_creditos_admin(UUID, UUID, DECIMAL, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.ajustar_creditos_admin(UUID, UUID, DECIMAL, TEXT) TO authenticated;

-- ── 2. Ocultar transcript_es a los alumnos ────────────────────────────────────
-- La política de alumno daba SELECT de TODA la fila activa (incluida la
-- transcripción del audio), lo que permitía romper el ejercicio de comprensión
-- auditiva leyéndola por API. Se retira ese SELECT sobre la tabla y se expone
-- una vista con solo columnas seguras y filas activas.
--
-- Los administradores siguen leyendo la tabla completa vía audios_paper2_b_admin_all.
-- Las Edge Functions (service_role) siguen leyendo transcript_es directamente.

DROP POLICY IF EXISTS "audios_paper2_b_select_active_authenticated" ON public.audios_paper2_b;

-- Vista sin transcript_es. Como vista normal (security_invoker desactivado por
-- defecto), corre con privilegios del propietario y filtra a filas activas y
-- columnas no sensibles, sin exponer la transcripción.
CREATE OR REPLACE VIEW public.audios_paper2_b_publico AS
  SELECT id, theme, title_es, title_en, audio_path, source, word_count, activo, created_at
  FROM public.audios_paper2_b
  WHERE activo = true;

REVOKE ALL ON public.audios_paper2_b_publico FROM PUBLIC;
GRANT  SELECT ON public.audios_paper2_b_publico TO authenticated;

COMMIT;
