-- ─────────────────────────────────────────────────────────────────────────────
-- Sesiones 1:1 con estandarizador IB
-- ─────────────────────────────────────────────────────────────────────────────

-- Perfil extendido del profesor que ofrece sesiones
CREATE TABLE teacher_profiles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users NOT NULL UNIQUE,
  nombre        text NOT NULL DEFAULT '',
  bio           text,
  credenciales  text,
  es_estandarizador_ib boolean DEFAULT false,
  idiomas       text[] DEFAULT '{es}',
  activo        boolean DEFAULT true,
  timezone      text DEFAULT 'Europe/Stockholm',
  calendar_email text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer perfiles activos (para la página de reserva)
CREATE POLICY "Perfiles de profesor visibles para autenticados"
  ON teacher_profiles FOR SELECT
  USING (activo = true AND auth.uid() IS NOT NULL);

-- El profesor gestiona su propio perfil
CREATE POLICY "Profesor gestiona su propio perfil"
  ON teacher_profiles FOR ALL
  USING (user_id = auth.uid());

-- Admin gestiona todos los perfiles
CREATE POLICY "Admin gestiona perfiles de profesor"
  ON teacher_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────

-- Slots de disponibilidad — el profesor los crea y gestiona
CREATE TABLE booking_slots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  uuid REFERENCES auth.users NOT NULL,
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz NOT NULL,
  status      text NOT NULL DEFAULT 'available'
              CHECK (status IN ('available', 'held', 'booked', 'cancelled', 'expired')),
  price_sek   integer NOT NULL DEFAULT 1250,
  currency    text NOT NULL DEFAULT 'SEK',
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT no_overlap UNIQUE (teacher_id, starts_at)
);

ALTER TABLE booking_slots ENABLE ROW LEVEL SECURITY;

-- Alumnos autenticados ven slots disponibles
CREATE POLICY "Alumnos ven slots disponibles"
  ON booking_slots FOR SELECT
  USING (status = 'available' AND auth.uid() IS NOT NULL);

-- El profesor ve y gestiona sus propios slots
CREATE POLICY "Profesor gestiona sus slots"
  ON booking_slots FOR ALL
  USING (teacher_id = auth.uid());

-- Admin gestiona todos los slots
CREATE POLICY "Admin gestiona slots"
  ON booking_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────

-- Reservas de alumnos
CREATE TABLE bookings (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id                  uuid REFERENCES auth.users NOT NULL,
  teacher_id                  uuid REFERENCES auth.users NOT NULL,
  slot_id                     uuid REFERENCES booking_slots(id) NOT NULL,
  status                      text NOT NULL DEFAULT 'pending_payment'
                              CHECK (status IN (
                                'pending_payment', 'confirmed', 'cancelled', 'completed', 'no_show'
                              )),
  stripe_checkout_session_id  text,
  stripe_payment_intent_id    text,
  price_sek                   integer,
  vat_sek                     integer,
  total_sek                   integer,
  student_goal                text,
  student_timezone            text DEFAULT 'Europe/Stockholm',
  consent_history             boolean DEFAULT false,
  consent_payment             boolean DEFAULT false,
  calendar_event_id           text,
  meeting_url                 text,
  created_at                  timestamptz DEFAULT now(),
  confirmed_at                timestamptz
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- El alumno ve sus propias reservas
CREATE POLICY "Alumno ve sus reservas"
  ON bookings FOR SELECT
  USING (student_id = auth.uid());

-- El profesor ve las reservas de sus sesiones
CREATE POLICY "Profesor ve sus reservas"
  ON bookings FOR SELECT
  USING (teacher_id = auth.uid());

-- Admin gestiona todas las reservas
CREATE POLICY "Admin gestiona reservas"
  ON bookings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────

-- Acceso temporal del profesor al historial de calificaciones del alumno
CREATE TABLE booking_teacher_access (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       uuid REFERENCES bookings(id) NOT NULL,
  teacher_id       uuid REFERENCES auth.users NOT NULL,
  student_id       uuid REFERENCES auth.users NOT NULL,
  access_starts_at timestamptz NOT NULL DEFAULT now(),
  access_ends_at   timestamptz,
  revoked_at       timestamptz,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE booking_teacher_access ENABLE ROW LEVEL SECURITY;

-- El profesor ve sus propios registros de acceso
CREATE POLICY "Profesor ve sus accesos"
  ON booking_teacher_access FOR SELECT
  USING (teacher_id = auth.uid());

-- Admin gestiona todos los accesos
CREATE POLICY "Admin gestiona accesos"
  ON booking_teacher_access FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────

-- Notas post-sesión del profesor (resumen y próximos pasos para el alumno)
CREATE TABLE booking_notes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          uuid REFERENCES bookings(id) NOT NULL,
  teacher_id          uuid REFERENCES auth.users NOT NULL,
  summary             text,
  next_steps          text,
  visible_to_student  boolean DEFAULT false,
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE booking_notes ENABLE ROW LEVEL SECURITY;

-- El profesor gestiona sus notas
CREATE POLICY "Profesor gestiona sus notas"
  ON booking_notes FOR ALL
  USING (teacher_id = auth.uid());

-- El alumno lee las notas marcadas como visibles para él
CREATE POLICY "Alumno lee notas visibles de sus reservas"
  ON booking_notes FOR SELECT
  USING (
    visible_to_student = true
    AND EXISTS (
      SELECT 1 FROM bookings
      WHERE id = booking_notes.booking_id AND student_id = auth.uid()
    )
  );

-- Admin lee todas las notas
CREATE POLICY "Admin lee notas"
  ON booking_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Extender RLS de evaluaciones y perfiles para acceso temporal del profesor
-- ─────────────────────────────────────────────────────────────────────────────

-- El profesor puede leer las calificaciones (bandas, nota) del alumno cuando
-- tiene un booking_teacher_access activo
CREATE POLICY "Profesor lee evaluaciones con acceso activo"
  ON evaluaciones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM booking_teacher_access bta
      WHERE bta.teacher_id = auth.uid()
        AND bta.student_id = evaluaciones.user_id
        AND bta.access_starts_at <= now()
        AND (bta.access_ends_at IS NULL OR bta.access_ends_at > now())
        AND bta.revoked_at IS NULL
    )
  );

-- El profesor puede leer el perfil (nombre/email) del alumno con acceso activo
CREATE POLICY "Profesor lee perfil de alumno con acceso activo"
  ON perfiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM booking_teacher_access bta
      WHERE bta.teacher_id = auth.uid()
        AND bta.student_id = perfiles.user_id
        AND bta.access_starts_at <= now()
        AND (bta.access_ends_at IS NULL OR bta.access_ends_at > now())
        AND bta.revoked_at IS NULL
    )
  );
