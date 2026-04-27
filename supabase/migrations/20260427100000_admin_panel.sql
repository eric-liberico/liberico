-- Panel de administración: uso LLM, precios, logs de auditoría y columna activo

-- 1. Columna activo en perfiles
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;

-- 2. Tabla de uso LLM (una fila por llamada a la API de Anthropic)
CREATE TABLE public.llm_uso (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  edge_function   TEXT        NOT NULL,
  modelo          TEXT        NOT NULL,
  tokens_entrada  INTEGER     NOT NULL,
  tokens_salida   INTEGER     NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.llm_uso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_lee_llm_uso"
  ON public.llm_uso FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true
    )
  );

-- 3. Tabla de precios por modelo LLM (actualizable sin tocar código)
CREATE TABLE public.llm_precios (
  modelo                    TEXT    PRIMARY KEY,
  precio_entrada_por_millon NUMERIC NOT NULL,  -- USD por millón de tokens de entrada
  precio_salida_por_millon  NUMERIC NOT NULL,  -- USD por millón de tokens de salida
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.llm_precios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_gestiona_precios"
  ON public.llm_precios FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true
    )
  );

INSERT INTO public.llm_precios (modelo, precio_entrada_por_millon, precio_salida_por_millon, updated_at) VALUES
  ('claude-opus-4-7',   5.00,  25.00, now()),
  ('claude-opus-4-6',   5.00,  25.00, now()),
  ('claude-sonnet-4-6', 3.00,  15.00, now()),
  ('claude-haiku-4-5',  1.00,   5.00, now())
ON CONFLICT (modelo) DO NOTHING;

-- 4. Logs de auditoría de acciones del admin
CREATE TABLE public.admin_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id       UUID        NOT NULL REFERENCES auth.users(id),
  accion         TEXT        NOT NULL,
  target_user_id UUID,
  detalles       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_lee_logs"
  ON public.admin_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true
    )
  );

-- 5. Ampliar el check constraint de rol para incluir 'admin'
ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS perfiles_rol_check;
ALTER TABLE public.perfiles
  ADD CONSTRAINT perfiles_rol_check
  CHECK (rol IN ('alumno', 'profesor', 'admin'));

-- 6. Primer admin
UPDATE public.perfiles
  SET rol = 'admin'
  WHERE email = 'epetterssonruiz@gmail.com';
