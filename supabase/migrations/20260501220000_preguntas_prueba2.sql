-- Banco de preguntas de Prueba 2 (past papers)

CREATE TABLE IF NOT EXISTS preguntas_prueba2 (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pregunta    text        NOT NULL,
  anio        int,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE preguntas_prueba2 ENABLE ROW LEVEL SECURITY;

-- Lectura pública para cualquier usuario autenticado
CREATE POLICY "lectura autenticados"
  ON preguntas_prueba2
  FOR SELECT
  TO authenticated
  USING (true);

-- Escritura solo para administradores
CREATE POLICY "escritura admin"
  ON preguntas_prueba2
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.user_id = auth.uid()
        AND perfiles.rol = 'admin'
    )
  );
