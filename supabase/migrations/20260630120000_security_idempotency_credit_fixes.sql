BEGIN;

-- Acreditación de créditos endurecida:
-- - exige una compra local pendiente en creditos_compras;
-- - valida user_id y cantidad contra la fila local, no contra metadata de Stripe;
-- - bloquea la compra antes de comprobar idempotencia para evitar doble crédito;
-- - permite sesiones simuladas/test porque también deben existir como compra pendiente.
CREATE OR REPLACE FUNCTION public.acreditar_creditos(
  p_user_id            UUID,
  p_cantidad           DECIMAL,
  p_stripe_session_id  TEXT
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo_antes   DECIMAL(10,2);
  v_saldo_despues DECIMAL(10,2);
  v_activo        BOOLEAN;
  v_compra        public.creditos_compras%ROWTYPE;
  v_origen        TEXT;
BEGIN
  IF p_stripe_session_id IS NULL OR length(trim(p_stripe_session_id)) = 0 THEN
    RETURN NULL;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_stripe_session_id)::bigint);

  SELECT * INTO v_compra
  FROM public.creditos_compras
  WHERE stripe_session_id = p_stripe_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_compra.user_id <> p_user_id OR v_compra.cantidad_creditos <> p_cantidad THEN
    RETURN NULL;
  END IF;

  IF v_compra.estado = 'completado' THEN
    SELECT creditos INTO v_saldo_antes
    FROM public.perfiles
    WHERE user_id = p_user_id;
    RETURN v_saldo_antes;
  END IF;

  IF v_compra.estado <> 'pendiente' THEN
    RETURN NULL;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text)::bigint);

  SELECT creditos, activo INTO v_saldo_antes, v_activo
  FROM public.perfiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_saldo_antes IS NULL OR v_activo IS DISTINCT FROM TRUE THEN
    RETURN NULL;
  END IF;

  IF v_saldo_antes + p_cantidad > 200.00 THEN
    RETURN NULL;
  END IF;

  v_saldo_despues := v_saldo_antes + p_cantidad;

  UPDATE public.perfiles
  SET creditos = v_saldo_despues
  WHERE user_id = p_user_id;

  UPDATE public.creditos_compras
  SET estado = 'completado', completado_at = now()
  WHERE id = v_compra.id;

  v_origen := CASE
    WHEN p_stripe_session_id LIKE 'sim\_%' ESCAPE '\' THEN 'simulado'
    WHEN p_stripe_session_id LIKE 'test\_%' ESCAPE '\' THEN 'test'
    ELSE 'stripe'
  END;

  INSERT INTO public.creditos_transacciones
    (user_id, tipo, cantidad, balance_antes, balance_despues, concepto, metadata)
  VALUES
    (
      p_user_id,
      'compra',
      p_cantidad,
      v_saldo_antes,
      v_saldo_despues,
      'stripe-checkout',
      jsonb_build_object(
        'stripe_session_id', p_stripe_session_id,
        'origen', v_origen,
        'compra_id', v_compra.id
      )
    );

  RETURN v_saldo_despues;
END;
$$;

REVOKE ALL ON FUNCTION public.acreditar_creditos(UUID, DECIMAL, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acreditar_creditos(UUID, DECIMAL, TEXT) TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS ux_session_vouchers_origin_booking
  ON public.session_vouchers (origin_booking_id)
  WHERE origin_booking_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_refund_requests_booking
  ON public.refund_requests (booking_id);

COMMIT;
