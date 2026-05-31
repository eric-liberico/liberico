-- Sistema de créditos nativos para monetización
-- 1 crédito = 1 EUR = 10 SEK (+ IVA)
-- Mínimo compra: 5 créditos. Máximo saldo: 200 créditos.

-- ─── 1. Columna creditos en perfiles ────────────────────────────────────────
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS creditos DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- ─── 2. Tabla creditos_transacciones ────────────────────────────────────────
-- Log inmutable de cada movimiento de créditos (compra, uso, ajuste admin).

CREATE TABLE IF NOT EXISTS public.creditos_transacciones (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo            TEXT        NOT NULL CHECK (tipo IN (
                                'compra',
                                'uso_evaluacion',
                                'reembolso',
                                'ajuste_admin'
                              )),
  cantidad        DECIMAL(10,2) NOT NULL,   -- positivo = ingreso, negativo = gasto
  balance_antes   DECIMAL(10,2) NOT NULL,
  balance_despues DECIMAL(10,2) NOT NULL,
  concepto        TEXT        NOT NULL,     -- e.g. "evaluate-paper1-b", "stripe-checkout"
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creditos_transacciones_user_id
  ON public.creditos_transacciones (user_id, created_at DESC);

ALTER TABLE public.creditos_transacciones ENABLE ROW LEVEL SECURITY;

-- El usuario lee sus propias transacciones
CREATE POLICY "usuario_lee_sus_transacciones"
  ON public.creditos_transacciones
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins leen todo
CREATE POLICY "admin_lee_todas_transacciones"
  ON public.creditos_transacciones
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true
    )
  );

-- Solo service_role puede insertar (via RPCs SECURITY DEFINER)
-- No policy INSERT para usuarios: se hace siempre desde RPCs.

-- ─── 3. Tabla creditos_compras ───────────────────────────────────────────────
-- Registra cada intento de compra con Stripe. Se actualiza en el webhook.

CREATE TABLE IF NOT EXISTS public.creditos_compras (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cantidad_creditos       DECIMAL(10,2) NOT NULL,
  precio_eur              DECIMAL(10,2) NOT NULL,
  stripe_session_id       TEXT        UNIQUE,
  stripe_payment_intent   TEXT,
  estado                  TEXT        NOT NULL DEFAULT 'pendiente'
                            CHECK (estado IN ('pendiente', 'completado', 'fallido', 'cancelado')),
  completado_at           TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creditos_compras_user_id
  ON public.creditos_compras (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creditos_compras_stripe_session
  ON public.creditos_compras (stripe_session_id);

ALTER TABLE public.creditos_compras ENABLE ROW LEVEL SECURITY;

-- El usuario ve sus propias compras
CREATE POLICY "usuario_lee_sus_compras"
  ON public.creditos_compras
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins leen todo
CREATE POLICY "admin_lee_todas_compras"
  ON public.creditos_compras
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true
    )
  );

-- ─── 4. Tabla evaluacion_precios ────────────────────────────────────────────
-- Precio en créditos por feature. Configurable desde admin sin deploy.

CREATE TABLE IF NOT EXISTS public.evaluacion_precios (
  concepto        TEXT        PRIMARY KEY,
  creditos        DECIMAL(10,2) NOT NULL,
  descripcion     TEXT,
  activo          BOOLEAN     NOT NULL DEFAULT true,
  actualizado_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.evaluacion_precios ENABLE ROW LEVEL SECURITY;

-- Todos los usuarios autenticados pueden leer precios
CREATE POLICY "usuarios_leen_precios"
  ON public.evaluacion_precios
  FOR SELECT
  TO authenticated
  USING (true);

-- Solo admins pueden modificar
CREATE POLICY "admin_gestiona_precios"
  ON public.evaluacion_precios
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true
    )
  );

-- Precios iniciales
INSERT INTO public.evaluacion_precios (concepto, creditos, descripcion) VALUES
  ('evaluate-paper1-b',           1.50, 'Spanish B Paper 1 — corrección básica'),
  ('evaluate-paper1-b-feedback',  2.00, 'Spanish B Paper 1 — feedback completo (extra)'),
  ('generate-questions-paper2-b', 0.50, 'Spanish B Paper 2 — generación de preguntas'),
  ('evaluate-paper2-b',           2.00, 'Spanish B Paper 2 — corrección'),
  ('evaluate-paper2-b-feedback',  2.00, 'Spanish B Paper 2 — feedback completo (extra)'),
  ('evaluate-oral-b',             2.00, 'Spanish B Oral — corrección'),
  ('evaluate-oral-b-feedback',    2.00, 'Spanish B Oral — feedback completo (extra)')
ON CONFLICT (concepto) DO NOTHING;

-- ─── 5. RPC: deducir_creditos ────────────────────────────────────────────────
-- Deduce créditos atómicamente. Retorna el nuevo saldo, o NULL si saldo insuficiente.
-- Usa advisory lock para evitar race conditions concurrentes del mismo usuario.

CREATE OR REPLACE FUNCTION public.deducir_creditos(
  p_user_id   UUID,
  p_cantidad  DECIMAL,
  p_concepto  TEXT,
  p_metadata  JSONB DEFAULT NULL
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo_antes   DECIMAL(10,2);
  v_saldo_despues DECIMAL(10,2);
BEGIN
  -- Serializa peticiones concurrentes del mismo usuario
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text)::bigint);

  -- Lee saldo actual con FOR UPDATE para bloqueo a nivel fila
  SELECT creditos INTO v_saldo_antes
  FROM public.perfiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_saldo_antes IS NULL THEN
    RETURN NULL;  -- usuario no encontrado
  END IF;

  IF v_saldo_antes < p_cantidad THEN
    RETURN NULL;  -- saldo insuficiente
  END IF;

  v_saldo_despues := v_saldo_antes - p_cantidad;

  -- Actualiza saldo
  UPDATE public.perfiles
  SET creditos = v_saldo_despues
  WHERE user_id = p_user_id;

  -- Registra transacción
  INSERT INTO public.creditos_transacciones
    (user_id, tipo, cantidad, balance_antes, balance_despues, concepto, metadata)
  VALUES
    (p_user_id, 'uso_evaluacion', -p_cantidad, v_saldo_antes, v_saldo_despues, p_concepto, p_metadata);

  RETURN v_saldo_despues;
END;
$$;

REVOKE ALL ON FUNCTION public.deducir_creditos(UUID, DECIMAL, TEXT, JSONB) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.deducir_creditos(UUID, DECIMAL, TEXT, JSONB) TO service_role;

-- ─── 6. RPC: reembolsar_creditos ────────────────────────────────────────────
-- Devuelve créditos al usuario cuando falla la llamada a Anthropic.

CREATE OR REPLACE FUNCTION public.reembolsar_creditos(
  p_user_id   UUID,
  p_cantidad  DECIMAL,
  p_concepto  TEXT,
  p_metadata  JSONB DEFAULT NULL
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo_antes   DECIMAL(10,2);
  v_saldo_despues DECIMAL(10,2);
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text)::bigint);

  SELECT creditos INTO v_saldo_antes
  FROM public.perfiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_saldo_antes IS NULL THEN
    RETURN NULL;
  END IF;

  v_saldo_despues := LEAST(v_saldo_antes + p_cantidad, 200.00);

  UPDATE public.perfiles
  SET creditos = v_saldo_despues
  WHERE user_id = p_user_id;

  INSERT INTO public.creditos_transacciones
    (user_id, tipo, cantidad, balance_antes, balance_despues, concepto, metadata)
  VALUES
    (p_user_id, 'reembolso', p_cantidad, v_saldo_antes, v_saldo_despues, p_concepto, p_metadata);

  RETURN v_saldo_despues;
END;
$$;

REVOKE ALL ON FUNCTION public.reembolsar_creditos(UUID, DECIMAL, TEXT, JSONB) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reembolsar_creditos(UUID, DECIMAL, TEXT, JSONB) TO service_role;

-- ─── 7. RPC: acreditar_creditos ──────────────────────────────────────────────
-- Añade créditos tras confirmar pago Stripe. Respeta máximo de 200.
-- Retorna nuevo saldo, o NULL si superaría el máximo.

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
  v_ya_procesado  INTEGER;
BEGIN
  -- Idempotencia: si ya se procesó esta sesión, retorna el saldo actual sin cambios
  SELECT COUNT(*) INTO v_ya_procesado
  FROM public.creditos_compras
  WHERE stripe_session_id = p_stripe_session_id AND estado = 'completado';

  IF v_ya_procesado > 0 THEN
    SELECT creditos INTO v_saldo_antes FROM public.perfiles WHERE user_id = p_user_id;
    RETURN v_saldo_antes;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text)::bigint);

  SELECT creditos INTO v_saldo_antes
  FROM public.perfiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_saldo_antes IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_saldo_antes + p_cantidad > 200.00 THEN
    RETURN NULL;  -- superaría el máximo permitido
  END IF;

  v_saldo_despues := v_saldo_antes + p_cantidad;

  UPDATE public.perfiles
  SET creditos = v_saldo_despues
  WHERE user_id = p_user_id;

  -- Marca compra como completada
  UPDATE public.creditos_compras
  SET estado = 'completado', completado_at = now()
  WHERE stripe_session_id = p_stripe_session_id;

  -- Registra transacción
  INSERT INTO public.creditos_transacciones
    (user_id, tipo, cantidad, balance_antes, balance_despues, concepto, metadata)
  VALUES
    (p_user_id, 'compra', p_cantidad, v_saldo_antes, v_saldo_despues,
     'stripe-checkout',
     jsonb_build_object('stripe_session_id', p_stripe_session_id));

  RETURN v_saldo_despues;
END;
$$;

REVOKE ALL ON FUNCTION public.acreditar_creditos(UUID, DECIMAL, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.acreditar_creditos(UUID, DECIMAL, TEXT) TO service_role;

-- ─── 8. RPC: ajustar_creditos_admin ─────────────────────────────────────────
-- Permite a un admin añadir o quitar créditos manualmente a un usuario.

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
  v_es_admin      BOOLEAN;
  v_saldo_antes   DECIMAL(10,2);
  v_saldo_despues DECIMAL(10,2);
BEGIN
  -- Verifica que el caller sea admin
  SELECT (rol = 'admin' AND activo = true) INTO v_es_admin
  FROM public.perfiles
  WHERE user_id = p_admin_id;

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
     jsonb_build_object('admin_id', p_admin_id));

  RETURN v_saldo_despues;
END;
$$;

REVOKE ALL ON FUNCTION public.ajustar_creditos_admin(UUID, UUID, DECIMAL, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.ajustar_creditos_admin(UUID, UUID, DECIMAL, TEXT) TO authenticated;
