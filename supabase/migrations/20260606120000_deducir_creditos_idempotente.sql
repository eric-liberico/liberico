BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- Cobro IDEMPOTENTE de créditos por clave (cierra el bypass de "feedback completo").
--
-- Problema: el "feedback completo" hace DOS llamadas LLM (generate-analysis-extras +
-- generate-band5-essay). Sólo band5 cobraba → un usuario podía invocar *-extras
-- directamente y consumir LLM gratis. Y si se cobrara en ambas, el flujo legítimo
-- pagaría el doble.
--
-- Solución: ambas funciones cobran con la MISMA clave (p.ej. 'fc-p1:<evaluacion_id>').
-- Esta RPC sólo deduce la PRIMERA vez por clave; las siguientes son no-op idempotente.
-- Así una llamada directa a *-extras cuesta, y el flujo de dos llamadas cobra una vez.
--
-- Idempotencia robusta frente a reembolsos: miramos el NETO de transacciones con esa
-- clave (cargo = negativo, reembolso = positivo). Si el neto ya cubre el cargo →
-- ya pagado. Tras un reembolso (neto 0) se puede reintentar. El reembolso debe llevar
-- la misma clave en metadata para que neutralice.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.deducir_creditos_idempotente(
  p_user_id   uuid,
  p_cantidad  decimal,
  p_concepto  text,
  p_clave     text,
  p_metadata  jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo_antes   decimal(10,2);
  v_saldo_despues decimal(10,2);
  v_neto          decimal(10,2);
BEGIN
  -- Serializa por usuario (igual que deducir_creditos) → sin doble cobro en concurrencia.
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text)::bigint);

  SELECT creditos INTO v_saldo_antes
  FROM public.perfiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_saldo_antes IS NULL THEN
    RETURN jsonb_build_object('estado', 'insuficiente');
  END IF;

  -- ¿ya pagado por esta clave (cargo no neutralizado por reembolso)?
  SELECT COALESCE(SUM(cantidad), 0) INTO v_neto
  FROM public.creditos_transacciones
  WHERE user_id = p_user_id
    AND metadata->>'clave' = p_clave;

  IF v_neto <= -p_cantidad THEN
    RETURN jsonb_build_object('estado', 'ya_cobrado', 'saldo', v_saldo_antes);
  END IF;

  IF v_saldo_antes < p_cantidad THEN
    RETURN jsonb_build_object('estado', 'insuficiente');
  END IF;

  v_saldo_despues := v_saldo_antes - p_cantidad;

  UPDATE public.perfiles
  SET creditos = v_saldo_despues
  WHERE user_id = p_user_id;

  INSERT INTO public.creditos_transacciones
    (user_id, tipo, cantidad, balance_antes, balance_despues, concepto, metadata)
  VALUES
    (p_user_id, 'uso_evaluacion', -p_cantidad, v_saldo_antes, v_saldo_despues, p_concepto,
     jsonb_build_object('clave', p_clave) || COALESCE(p_metadata, '{}'::jsonb));

  RETURN jsonb_build_object('estado', 'cobrado', 'saldo', v_saldo_despues);
END;
$$;

REVOKE ALL ON FUNCTION public.deducir_creditos_idempotente(uuid, decimal, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deducir_creditos_idempotente(uuid, decimal, text, text, jsonb) TO service_role;

COMMIT;
