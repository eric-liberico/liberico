-- Biblioteca de textos de práctica para Prueba 1
-- Textos generados por IA, sin riesgo de copyright

CREATE TABLE IF NOT EXISTS textos_practica_p1 (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  genero      text        NOT NULL CHECK (genero IN ('poema', 'prosa', 'teatro')),
  periodo     text,
  texto       text        NOT NULL,
  pregunta    text        NOT NULL,
  activo      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE textos_practica_p1 ENABLE ROW LEVEL SECURITY;

-- Lectura pública para cualquier usuario autenticado (textos activos)
CREATE POLICY "lectura autenticados"
  ON textos_practica_p1
  FOR SELECT
  TO authenticated
  USING (activo = true);

-- Escritura solo para administradores
CREATE POLICY "escritura admin"
  ON textos_practica_p1
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.user_id = auth.uid()
        AND perfiles.rol = 'admin'
    )
  );

-- Índice para filtrar por género
CREATE INDEX IF NOT EXISTS idx_textos_practica_p1_genero
  ON textos_practica_p1 (genero)
  WHERE activo = true;
