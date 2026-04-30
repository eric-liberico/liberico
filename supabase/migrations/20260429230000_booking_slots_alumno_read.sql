-- El alumno solo puede ver slots con status='available' (política original).
-- Esto impide que vea el slot de su propia reserva una vez que pasa a 'held' o 'booked'.
-- Esta migración añade una política adicional que le permite leer el slot de su reserva.
CREATE POLICY "Alumno lee slot de su reserva"
  ON booking_slots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE slot_id = booking_slots.id
        AND student_id = auth.uid()
    )
  );
