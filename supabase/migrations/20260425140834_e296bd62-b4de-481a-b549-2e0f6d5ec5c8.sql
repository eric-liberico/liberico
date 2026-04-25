
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Evaluaciones
create table public.evaluaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  texto_literario text not null,
  pregunta_orientacion text not null,
  analisis_estudiante text not null,
  banda_a int not null check (banda_a between 0 and 5),
  banda_b int not null check (banda_b between 0 and 5),
  banda_c int not null check (banda_c between 0 and 5),
  banda_d int not null check (banda_d between 0 and 5),
  justificacion_a text,
  justificacion_b text,
  justificacion_c text,
  justificacion_d text,
  puntuacion_total int generated always as (banda_a + banda_b + banda_c + banda_d) stored,
  nota_ib int,
  fortalezas text,
  areas_mejora text,
  comentario_global text,
  created_at timestamptz not null default now()
);

alter table public.evaluaciones enable row level security;

create policy "Users select own evaluaciones"
  on public.evaluaciones for select
  using (auth.uid() = user_id);

create policy "Users insert own evaluaciones"
  on public.evaluaciones for insert
  with check (auth.uid() = user_id);

create policy "Users update own evaluaciones"
  on public.evaluaciones for update
  using (auth.uid() = user_id);

create policy "Users delete own evaluaciones"
  on public.evaluaciones for delete
  using (auth.uid() = user_id);

create index evaluaciones_user_created_idx on public.evaluaciones(user_id, created_at desc);
