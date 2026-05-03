-- ─────────────────────────────────────────────────────────────────────────────
-- Desbloqueo selectivo de Teoría tras tutoría 1:1 confirmada
-- ─────────────────────────────────────────────────────────────────────────────

-- Foco de teoría elegido por el alumno al reservar.
-- Null = sin foco (no desbloquea nada).
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS theory_focus_id text
  CHECK (theory_focus_id IN (
    'poesia', 'narratologia', 'teatro', 'recursos',
    'vocabulario', 'movimientos', 'teoria-literaria', 'topicos'
  ));

-- Accesos individuales a secciones de Teoría.
-- Se crea cuando admin confirma la reserva y theory_focus_id no es null.
-- UNIQUE (user_id, section_id): si el alumno compra la misma sección dos veces,
-- el segundo ON CONFLICT DO NOTHING — el acceso ya está concedido.
CREATE TABLE IF NOT EXISTS theory_access_grants (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  section_id        text NOT NULL
                    CHECK (section_id IN (
                      'poesia', 'narratologia', 'teatro', 'recursos',
                      'vocabulario', 'movimientos', 'teoria-literaria', 'topicos'
                    )),
  source_booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now(),
  UNIQUE (user_id, section_id)
);

ALTER TABLE theory_access_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alumno lee sus grants"
  ON theory_access_grants FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admin gestiona grants"
  ON theory_access_grants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true
    )
  );
