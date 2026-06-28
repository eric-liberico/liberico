-- Cancelar/reprogramar sesiones 1:1: vales, reembolsos y auditoría de cancelación
-- Migración aditiva.

-- 1) Columnas de auditoría de cancelación en bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancelled_by text
    CHECK (cancelled_by IS NULL OR cancelled_by IN ('student', 'teacher', 'admin')),
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- 2) Vales de sesión (una sesión futura gratis)
CREATE TABLE IF NOT EXISTS public.session_vouchers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status              text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled')),
  motivo              text NOT NULL
                      CHECK (motivo IN ('cancelacion', 'profesor_cancelo', 'reprogramar_sin_hueco')),
  origin_booking_id   uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  redeemed_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  expires_at          timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_vouchers_student
  ON public.session_vouchers (student_id, status);

ALTER TABLE public.session_vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alumno lee sus vales"
  ON public.session_vouchers FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Admin gestiona vales"
  ON public.session_vouchers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM perfiles WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true
  ));

-- 3) Solicitudes de reembolso de dinero (procesadas a mano por el admin)
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_sek    integer NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'processed', 'rejected')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  processed_at  timestamptz,
  processed_by  uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_status
  ON public.refund_requests (status, created_at DESC);

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alumno lee sus reembolsos"
  ON public.refund_requests FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Admin gestiona reembolsos"
  ON public.refund_requests FOR ALL
  USING (EXISTS (
    SELECT 1 FROM perfiles WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true
  ));
