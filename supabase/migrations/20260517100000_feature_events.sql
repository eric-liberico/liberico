-- Tabla de eventos de producto para medir adopción y engagement por funcionalidad
create table if not exists public.feature_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  event_type  text not null,
  feature     text not null,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

comment on table public.feature_events is 'Eventos de uso de funcionalidades para análisis de producto';
comment on column public.feature_events.event_type is 'Tipo: evaluation_started, evaluation_completed, feedback_opened, rewrite_used, oral_started, paper2_started, booking_requested';
comment on column public.feature_events.feature is 'Funcionalidad: p1_literature, p2_literature, oral_literature, p1_spanish_b, oral_spanish_b, p2_spanish_b, teacher_chat';
comment on column public.feature_events.metadata is 'Datos adicionales: course_key, nota_ib, etc.';

-- Índices para queries de admin por fecha, usuario y feature
create index feature_events_user_created_idx on public.feature_events (user_id, created_at desc);
create index feature_events_feature_created_idx on public.feature_events (feature, created_at desc);
create index feature_events_type_created_idx on public.feature_events (event_type, created_at desc);

-- RLS: solo admins pueden leer; inserción por cualquier usuario autenticado o anon (para no bloquear usuarios sin perfil)
alter table public.feature_events enable row level security;

create policy "Admins pueden leer feature_events"
  on public.feature_events for select
  using (
    exists (
      select 1 from public.perfiles p
      where p.user_id = auth.uid()
        and p.rol = 'admin'
        and p.activo = true
    )
  );

create policy "Usuarios autenticados pueden insertar eventos"
  on public.feature_events for insert
  with check (auth.uid() is not null);
