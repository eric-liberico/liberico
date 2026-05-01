-- admin_logs.admin_id era NOT NULL, impidiendo ON DELETE SET NULL al borrar un admin.
ALTER TABLE public.admin_logs
  ALTER COLUMN admin_id DROP NOT NULL;

-- booking_notes.booking_id sin CASCADE: al borrar una reserva, sus notas bloqueaban la eliminación.
ALTER TABLE booking_notes
  DROP CONSTRAINT IF EXISTS booking_notes_booking_id_fkey,
  ADD CONSTRAINT booking_notes_booking_id_fkey
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

-- booking_teacher_access.booking_id sin CASCADE: mismo problema.
ALTER TABLE booking_teacher_access
  DROP CONSTRAINT IF EXISTS booking_teacher_access_booking_id_fkey,
  ADD CONSTRAINT booking_teacher_access_booking_id_fkey
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
