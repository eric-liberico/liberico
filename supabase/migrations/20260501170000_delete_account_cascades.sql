-- Corrige FKs que referenciaban auth.users sin ON DELETE CASCADE/SET NULL,
-- lo que hacía fallar delete-account cuando el usuario tenía reservas, notas o logs admin.

-- booking_slots: si se borra el profesor, borrar sus slots
ALTER TABLE booking_slots
  DROP CONSTRAINT IF EXISTS booking_slots_teacher_id_fkey,
  ADD CONSTRAINT booking_slots_teacher_id_fkey
    FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- bookings: si se borra el alumno o el profesor, borrar la reserva
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_student_id_fkey,
  ADD CONSTRAINT bookings_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_teacher_id_fkey,
  ADD CONSTRAINT bookings_teacher_id_fkey
    FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- booking_teacher_access: si se borra el profesor o el alumno, borrar acceso
ALTER TABLE booking_teacher_access
  DROP CONSTRAINT IF EXISTS booking_teacher_access_teacher_id_fkey,
  ADD CONSTRAINT booking_teacher_access_teacher_id_fkey
    FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE booking_teacher_access
  DROP CONSTRAINT IF EXISTS booking_teacher_access_student_id_fkey,
  ADD CONSTRAINT booking_teacher_access_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- booking_notes: heredado vía booking_id (ya tiene FK a bookings que ahora tiene CASCADE),
-- pero teacher_id también apunta a auth.users directamente
ALTER TABLE booking_notes
  DROP CONSTRAINT IF EXISTS booking_notes_teacher_id_fkey,
  ADD CONSTRAINT booking_notes_teacher_id_fkey
    FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- teacher_profiles: si se borra el usuario, borrar su perfil de profesor
ALTER TABLE teacher_profiles
  DROP CONSTRAINT IF EXISTS teacher_profiles_user_id_fkey,
  ADD CONSTRAINT teacher_profiles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- admin_logs: anonimizar en lugar de borrar (preserva auditoría)
ALTER TABLE admin_logs
  DROP CONSTRAINT IF EXISTS admin_logs_admin_id_fkey,
  ADD CONSTRAINT admin_logs_admin_id_fkey
    FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE SET NULL;
