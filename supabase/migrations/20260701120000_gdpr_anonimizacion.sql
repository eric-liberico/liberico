BEGIN;

-- GDPR + Bokföringslagen:
-- El borrado de cuenta debe eliminar la identidad y el contenido personal, pero no
-- destruir los asientos contables. Las tablas financieras se desvinculan del usuario
-- borrado con ON DELETE SET NULL; el resto de tablas de contenido conserva sus CASCADE.

ALTER TABLE public.creditos_compras
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.creditos_compras
  DROP CONSTRAINT IF EXISTS creditos_compras_user_id_fkey;

ALTER TABLE public.creditos_compras
  ADD CONSTRAINT creditos_compras_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.creditos_transacciones
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.creditos_transacciones
  DROP CONSTRAINT IF EXISTS creditos_transacciones_user_id_fkey;

ALTER TABLE public.creditos_transacciones
  ADD CONSTRAINT creditos_transacciones_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.gdpr_borrados (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL,
  estado     TEXT        NOT NULL DEFAULT 'solicitado'
                        CHECK (estado IN ('solicitado', 'completado', 'fallido')),
  error      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  borrado_at TIMESTAMPTZ
);

ALTER TABLE public.gdpr_borrados ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.gdpr_borrados IS
  'Auditoría mínima de borrados de cuenta: conserva solo el UUID afectado, estado y fecha.';
COMMENT ON COLUMN public.gdpr_borrados.user_id IS
  'UUID de auth.users eliminado. No referencia auth.users porque la fila se borra.';

COMMIT;
