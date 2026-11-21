-- =====================================================================
--  Salchipaseo · esquema de base de datos para Supabase
--  Cómo usarlo: Supabase → SQL Editor → New query → pega todo → Run.
--  Se puede ejecutar más de una vez sin romper nada.
-- =====================================================================

-- ---------- Perros ----------
create table if not exists public.dogs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 40),
  birth_date        date,
  weight_kg         numeric(5,2) check (weight_kg is null or weight_kg between 0.5 and 80),
  ideal_weight_kg   numeric(5,2) check (ideal_weight_kg is null or ideal_weight_kg between 0.5 and 80),
  size              text not null default 'std' check (size in ('mini','std')),
  neutered          boolean not null default true,
  activity          text not null default 'auto' check (activity in ('auto','low','normal','high')),
  food_kcal_per_kg  integer not null default 3600 check (food_kcal_per_kg between 1000 and 7000),
  wake_time         time not null default '07:30',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------- Rutas guardadas (compartidas entre los perros del usuario) ----------
create table if not exists public.routes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  color       text not null default 'orange',
  points      jsonb not null,                 -- [[lat,lng], ...] (máx. ~500 puntos)
  distance_m  integer not null default 0 check (distance_m >= 0),
  created_at  timestamptz not null default now()
);

-- ---------- Paseos ----------
create table if not exists public.walks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dog_id      uuid not null references public.dogs(id) on delete cascade,
  route_id    uuid references public.routes(id) on delete set null,
  started_at  timestamptz not null,
  duration_s  integer not null check (duration_s >= 0),
  distance_m  integer not null default 0 check (distance_m >= 0),
  points      jsonb,                          -- recorrido completo
  preview     jsonb,                          -- recorrido simplificado (≈60 puntos) para miniaturas
  pee         boolean not null default false,
  poop        boolean not null default false,
  mode        text not null default 'gps' check (mode in ('gps','sim','manual')),
  created_at  timestamptz not null default now()
);

create index if not exists walks_dog_started_idx on public.walks (dog_id, started_at desc);
create index if not exists walks_user_idx        on public.walks (user_id);
create index if not exists routes_user_idx       on public.routes (user_id);
create index if not exists dogs_user_idx         on public.dogs (user_id);

-- updated_at automático en dogs
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists dogs_touch on public.dogs;
create trigger dogs_touch before update on public.dogs
  for each row execute function public.touch_updated_at();

-- ---------- Seguridad: cada usuario solo ve y edita lo suyo ----------
alter table public.dogs   enable row level security;
alter table public.routes enable row level security;
alter table public.walks  enable row level security;

drop policy if exists "dogs: dueño"   on public.dogs;
drop policy if exists "routes: dueño" on public.routes;
drop policy if exists "walks: dueño"  on public.walks;

create policy "dogs: dueño" on public.dogs
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "routes: dueño" on public.routes
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "walks: dueño" on public.walks
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.dogs d where d.id = dog_id and d.user_id = auth.uid())
  );

grant select, insert, update, delete on public.dogs, public.routes, public.walks to authenticated;
