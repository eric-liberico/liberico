-- 1. Índice único parcial: previene doble reserva del mismo slot en caso de carrera
--    Dos INSERTs concurrentes con el mismo slot_id y status != 'cancelled' fallarán con 23505.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_slot_id_active_idx
  ON bookings (slot_id)
  WHERE status NOT IN ('cancelled');

-- 2. Reparar RLS de booking_notes: la política original solo comprobaba teacher_id = auth.uid()
--    en USING pero no en WITH CHECK, por lo que un profesor podía insertar notas en reservas ajenas.
DROP POLICY IF EXISTS "Profesor gestiona sus notas" ON booking_notes;
CREATE POLICY "Profesor gestiona sus notas"
  ON booking_notes FOR ALL
  USING (teacher_id = auth.uid())
  WITH CHECK (
    teacher_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM bookings
      WHERE id = booking_notes.booking_id
        AND teacher_id = auth.uid()
    )
  );

-- 3. Eliminar columna duplicada meeting_url (sustituida por meet_link en migración posterior)
ALTER TABLE bookings DROP COLUMN IF EXISTS meeting_url;
