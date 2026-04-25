-- Perfil del estudiante
CREATE TABLE public.perfiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  fecha_examen DATE,
  horas_semanales INT CHECK (horas_semanales BETWEEN 1 AND 15),
  confianza_a INT CHECK (confianza_a BETWEEN 1 AND 5),
  confianza_b INT CHECK (confianza_b BETWEEN 1 AND 5),
  confianza_c INT CHECK (confianza_c BETWEEN 1 AND 5),
  confianza_d INT CHECK (confianza_d BETWEEN 1 AND 5),
  movimientos_conocidos TEXT[] DEFAULT '{}',
  generos_comodos TEXT[] DEFAULT '{}',
  nota_objetivo INT CHECK (nota_objetivo BETWEEN 4 AND 7),
  banda_inicial_a INT CHECK (banda_inicial_a BETWEEN 0 AND 5),
  banda_inicial_b INT CHECK (banda_inicial_b BETWEEN 0 AND 5),
  banda_inicial_c INT CHECK (banda_inicial_c BETWEEN 0 AND 5),
  banda_inicial_d INT CHECK (banda_inicial_d BETWEEN 0 AND 5),
  diagnostico_completado BOOLEAN DEFAULT false,
  paso_onboarding INT DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own perfil" ON public.perfiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own perfil" ON public.perfiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own perfil" ON public.perfiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own perfil" ON public.perfiles FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_perfiles_updated_at
BEFORE UPDATE ON public.perfiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Planes de estudio
CREATE TABLE public.planes_estudio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  resumen_diagnostico TEXT NOT NULL,
  enfoque_principal TEXT NOT NULL,
  semanas_totales INT NOT NULL,
  preliminar BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  generado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.planes_estudio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own planes" ON public.planes_estudio FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own planes" ON public.planes_estudio FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own planes" ON public.planes_estudio FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own planes" ON public.planes_estudio FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_planes_user_activo ON public.planes_estudio(user_id, activo);

-- Tareas del plan
CREATE TABLE public.tareas_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.planes_estudio ON DELETE CASCADE,
  semana INT NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('lectura', 'ejercicio', 'analisis_practica', 'repaso_teoria')),
  criterio_objetivo TEXT CHECK (criterio_objetivo IN ('A', 'B', 'C', 'D', 'global')),
  duracion_estimada_min INT NOT NULL,
  completada BOOLEAN DEFAULT false,
  completada_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tareas_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own tareas" ON public.tareas_plan FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.planes_estudio p WHERE p.id = tareas_plan.plan_id AND p.user_id = auth.uid()));

CREATE POLICY "Users insert own tareas" ON public.tareas_plan FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.planes_estudio p WHERE p.id = tareas_plan.plan_id AND p.user_id = auth.uid()));

CREATE POLICY "Users update own tareas" ON public.tareas_plan FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.planes_estudio p WHERE p.id = tareas_plan.plan_id AND p.user_id = auth.uid()));

CREATE POLICY "Users delete own tareas" ON public.tareas_plan FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.planes_estudio p WHERE p.id = tareas_plan.plan_id AND p.user_id = auth.uid()));

CREATE INDEX idx_tareas_plan_semana ON public.tareas_plan(plan_id, semana);