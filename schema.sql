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


-- =====================================================================
--  Salchipaseo · migración v3 (rutina personalizada + álbum de fotos)
--  Supabase → SQL Editor → New query → pega todo → Run.
--  Es seguro ejecutarla más de una vez.
-- =====================================================================

-- Rutina, meta diaria y foto de perfil del perro
alter table public.dogs add column if not exists routine jsonb;
alter table public.dogs add column if not exists goal_minutes integer;
alter table public.dogs add column if not exists avatar_path text;
alter table public.dogs drop constraint if exists dogs_goal_minutes_check;
alter table public.dogs add constraint dogs_goal_minutes_check check (goal_minutes is null or goal_minutes between 5 and 300);

-- Fotos del álbum
create table if not exists public.photos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dog_id      uuid not null references public.dogs(id) on delete cascade,
  path        text not null,
  thumb_path  text,
  caption     text check (caption is null or char_length(caption) <= 200),
  taken_at    timestamptz not null default now(),
  width       integer,
  height      integer,
  favorite    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists photos_dog_taken_idx on public.photos (dog_id, taken_at desc);
alter table public.photos enable row level security;
drop policy if exists "photos: dueño" on public.photos;
create policy "photos: dueño" on public.photos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.dogs d where d.id = dog_id and d.user_id = auth.uid()));
grant select, insert, update, delete on public.photos to authenticated;

-- Bucket privado para las imágenes (máx. 5 MB por archivo)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Cada usuario solo puede ver, subir y borrar archivos dentro de su carpeta (su id de usuario)
drop policy if exists "fotos: ver propias"     on storage.objects;
drop policy if exists "fotos: subir propias"   on storage.objects;
drop policy if exists "fotos: editar propias"  on storage.objects;
drop policy if exists "fotos: borrar propias"  on storage.objects;
create policy "fotos: ver propias" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "fotos: subir propias" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "fotos: editar propias" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "fotos: borrar propias" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid()::text));


-- =====================================================================
--  Salchipaseo · migración v4 (mínimo por paseo)
--  Supabase → SQL Editor → New query → pega esto → Run.
--  No borra nada y se puede ejecutar más de una vez.
-- =====================================================================
alter table public.dogs
  add column if not exists walk_min_minutes integer
  check (walk_min_minutes is null or walk_min_minutes between 1 and 240);


-- =====================================================================
--  Salchipaseo · migración v8
--  · Nivel permanente (XP guardada en el perro)
--  · Fondo del perfil elegido
--  · Familias: compartir un perro entre dos o más cuentas
--  Supabase → SQL Editor → New query → pega todo → Run.
--  Es seguro ejecutarla más de una vez.
-- =====================================================================

-- ---------- 1. Nivel permanente y fondo del perfil ----------
alter table public.dogs add column if not exists xp integer not null default 0;
alter table public.dogs add column if not exists fondo text;

-- Primera vez: calcula la XP con los paseos que ya existen (1 XP por minuto + 10 XP por km)
update public.dogs d
   set xp = coalesce((select sum(round(w.duration_s / 60.0 + w.distance_m / 100.0))::int
                        from public.walks w where w.dog_id = d.id), 0)
 where d.xp = 0;

-- Cada paseo nuevo suma XP al perro. Borrar paseos NO la resta: el nivel queda para siempre.
create or replace function public.sumar_xp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('salchi.xp', 'on', true);
  update public.dogs
     set xp = xp + greatest(0, round(new.duration_s / 60.0 + new.distance_m / 100.0))::int
   where id = new.dog_id;
  perform set_config('salchi.xp', 'off', true);
  return new;
end $$;
drop trigger if exists walks_xp on public.walks;
create trigger walks_xp after insert on public.walks
  for each row execute function public.sumar_xp();

-- Nadie puede cambiar el dueño de un perro ni su XP a mano
create or replace function public.proteger_perro() returns trigger
language plpgsql as $$
begin
  new.user_id := old.user_id;
  if coalesce(current_setting('salchi.xp', true), 'off') <> 'on' then
    new.xp := old.xp;
  end if;
  return new;
end $$;
drop trigger if exists dogs_proteger on public.dogs;
create trigger dogs_proteger before update on public.dogs
  for each row execute function public.proteger_perro();

-- ---------- 2. Familias ----------
create table if not exists public.dog_members (
  dog_id      uuid not null references public.dogs(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'member' check (role in ('owner','member')),
  nombre      text,
  correo      text,
  created_at  timestamptz not null default now(),
  primary key (dog_id, user_id)
);
create index if not exists dog_members_user_idx on public.dog_members (user_id);

create table if not exists public.dog_invites (
  code        text primary key,
  dog_id      uuid not null references public.dogs(id) on delete cascade,
  created_by  uuid not null references auth.users(id) on delete cascade,
  expires_at  timestamptz not null default now() + interval '7 days',
  used_by     uuid references auth.users(id) on delete set null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- ¿El perro es mío o de mi familia?
create or replace function public.es_de_mi_familia(perro uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select perro is not null and (
    exists (select 1 from public.dogs d where d.id = perro and d.user_id = auth.uid())
    or exists (select 1 from public.dog_members m where m.dog_id = perro and m.user_id = auth.uid())
  );
$$;

create or replace function public.uuid_o_nulo(t text) returns uuid
language plpgsql immutable as $$
begin
  return t::uuid;
exception when others then
  return null;
end $$;

-- Crea un código de invitación de 6 caracteres (vence en 7 días)
create or replace function public.crear_invitacion(perro uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_dueno uuid;
  v_letras text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if auth.uid() is null then raise exception 'Inicia sesión para invitar'; end if;
  if not public.es_de_mi_familia(perro) then raise exception 'No tienes acceso a este perro'; end if;
  select user_id into v_dueno from public.dogs where id = perro;
  insert into public.dog_members (dog_id, user_id, role) values (perro, v_dueno, 'owner')
    on conflict on constraint dog_members_pkey do nothing;
  update public.dog_members
     set nombre = coalesce(nombre, auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() ->> 'email'),
         correo = coalesce(correo, auth.jwt() ->> 'email')
   where dog_id = perro and user_id = auth.uid();
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_letras, 1 + floor(random() * length(v_letras))::int, 1);
    end loop;
    exit when not exists (select 1 from public.dog_invites where code = v_code);
  end loop;
  insert into public.dog_invites (code, dog_id, created_by) values (v_code, perro, auth.uid());
  return v_code;
end $$;

-- Usa un código para unirse a la familia de un perro
create or replace function public.unirme_a_familia(codigo text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  inv public.dog_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para unirte'; end if;
  select * into inv from public.dog_invites where code = upper(regexp_replace(coalesce(codigo, ''), '[^A-Za-z0-9]', '', 'g'));
  if not found then raise exception 'Ese código no existe. Revisa que esté bien escrito.'; end if;
  if inv.expires_at < now() then raise exception 'Ese código venció. Pide uno nuevo.'; end if;
  if inv.used_by is not null and inv.used_by <> auth.uid() then raise exception 'Ese código ya se usó. Pide uno nuevo.'; end if;
  if exists (select 1 from public.dogs where id = inv.dog_id and user_id = auth.uid()) then return inv.dog_id; end if;
  insert into public.dog_members (dog_id, user_id, role, nombre, correo)
  values (inv.dog_id, auth.uid(), 'member',
          coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() ->> 'email'),
          auth.jwt() ->> 'email')
  on conflict on constraint dog_members_pkey do nothing;
  update public.dog_invites set used_by = auth.uid(), used_at = now() where code = inv.code;
  return inv.dog_id;
end $$;

-- Lista de la familia de un perro (y actualiza tu nombre)
create or replace function public.familia(perro uuid)
returns table (user_id uuid, role text, nombre text, correo text, yo boolean)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_dueno uuid;
begin
  if not public.es_de_mi_familia(perro) then raise exception 'No tienes acceso a este perro'; end if;
  select d.user_id into v_dueno from public.dogs d where d.id = perro;
  insert into public.dog_members (dog_id, user_id, role) values (perro, v_dueno, 'owner')
    on conflict on constraint dog_members_pkey do nothing;
  update public.dog_members m
     set nombre = coalesce(m.nombre, auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() ->> 'email'),
         correo = coalesce(m.correo, auth.jwt() ->> 'email')
   where m.dog_id = perro and m.user_id = auth.uid();
  return query
    select m.user_id, m.role, m.nombre, m.correo, m.user_id = auth.uid()
      from public.dog_members m
     where m.dog_id = perro
     order by (m.role = 'owner') desc, m.created_at;
end $$;

grant execute on function public.es_de_mi_familia(uuid) to authenticated;
grant execute on function public.crear_invitacion(uuid) to authenticated;
grant execute on function public.unirme_a_familia(text) to authenticated;
grant execute on function public.familia(uuid) to authenticated;

-- ---------- 3. Permisos (RLS): la familia comparte perro, paseos y fotos ----------
alter table public.dog_members enable row level security;
alter table public.dog_invites enable row level security;   -- solo se usan con las funciones de arriba

drop policy if exists "familia: ver" on public.dog_members;
drop policy if exists "familia: salir o sacar" on public.dog_members;
create policy "familia: ver" on public.dog_members for select to authenticated
  using (public.es_de_mi_familia(dog_id));
create policy "familia: salir o sacar" on public.dog_members for delete to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.dogs d where d.id = dog_id and d.user_id = auth.uid()));
grant select, delete on public.dog_members to authenticated;

-- Perros
drop policy if exists "dogs: dueño" on public.dogs;
drop policy if exists "dogs: ver" on public.dogs;
drop policy if exists "dogs: crear" on public.dogs;
drop policy if exists "dogs: editar" on public.dogs;
drop policy if exists "dogs: borrar" on public.dogs;
create policy "dogs: ver" on public.dogs for select to authenticated
  using (user_id = auth.uid() or public.es_de_mi_familia(id));
create policy "dogs: crear" on public.dogs for insert to authenticated
  with check (user_id = auth.uid());
create policy "dogs: editar" on public.dogs for update to authenticated
  using (public.es_de_mi_familia(id)) with check (public.es_de_mi_familia(id));
create policy "dogs: borrar" on public.dogs for delete to authenticated
  using (user_id = auth.uid());

-- Paseos
drop policy if exists "walks: dueño" on public.walks;
drop policy if exists "walks: familia ver" on public.walks;
drop policy if exists "walks: familia crear" on public.walks;
drop policy if exists "walks: familia editar" on public.walks;
drop policy if exists "walks: familia borrar" on public.walks;
create policy "walks: familia ver" on public.walks for select to authenticated
  using (public.es_de_mi_familia(dog_id));
create policy "walks: familia crear" on public.walks for insert to authenticated
  with check (user_id = auth.uid() and public.es_de_mi_familia(dog_id));
create policy "walks: familia editar" on public.walks for update to authenticated
  using (public.es_de_mi_familia(dog_id)) with check (public.es_de_mi_familia(dog_id));
create policy "walks: familia borrar" on public.walks for delete to authenticated
  using (public.es_de_mi_familia(dog_id));

-- Rutas: las tuyas, más las que usó tu familia en los paseos del perro compartido
drop policy if exists "routes: ver de la familia" on public.routes;
create policy "routes: ver de la familia" on public.routes for select to authenticated
  using (exists (select 1 from public.walks w where w.route_id = routes.id and public.es_de_mi_familia(w.dog_id)));

-- Fotos del álbum
drop policy if exists "photos: dueño" on public.photos;
drop policy if exists "photos: familia ver" on public.photos;
drop policy if exists "photos: familia subir" on public.photos;
drop policy if exists "photos: familia editar" on public.photos;
drop policy if exists "photos: familia borrar" on public.photos;
create policy "photos: familia ver" on public.photos for select to authenticated
  using (public.es_de_mi_familia(dog_id));
create policy "photos: familia subir" on public.photos for insert to authenticated
  with check (user_id = auth.uid() and public.es_de_mi_familia(dog_id));
create policy "photos: familia editar" on public.photos for update to authenticated
  using (public.es_de_mi_familia(dog_id)) with check (public.es_de_mi_familia(dog_id));
create policy "photos: familia borrar" on public.photos for delete to authenticated
  using (public.es_de_mi_familia(dog_id));

-- Archivos de fotos: ruta = <usuario que la subió>/<perro>/<foto>.jpg
drop policy if exists "fotos: ver propias"    on storage.objects;
drop policy if exists "fotos: borrar propias" on storage.objects;
drop policy if exists "fotos: ver familia"    on storage.objects;
drop policy if exists "fotos: borrar familia" on storage.objects;
create policy "fotos: ver familia" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or public.es_de_mi_familia(public.uuid_o_nulo((storage.foldername(name))[2]))));
create policy "fotos: borrar familia" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or public.es_de_mi_familia(public.uuid_o_nulo((storage.foldername(name))[2]))));


-- =====================================================================
--  Salchipaseo · migración v9
--  · El nivel se sube con paseos dados (no con minutos)
--  · Los logros quedan guardados para siempre (cada uno suma 1 nivel)
--  · Avisos en vivo a la familia cuando alguien pasea al perro
--  Supabase → SQL Editor → New query → pega todo → Run.
--  Es seguro ejecutarla más de una vez. Requiere la migración v8.
-- =====================================================================

alter table public.dogs add column if not exists paseos integer not null default 0;
alter table public.dogs add column if not exists logros text[] not null default '{}';

-- Primera vez: cuenta los paseos que ya existen (de 1 minuto o más)
update public.dogs d
   set paseos = (select count(*) from public.walks w where w.dog_id = d.id and w.duration_s >= 60)
 where d.paseos = 0;

-- Cada paseo nuevo (de 1 minuto o más) suma 1 al contador del perro. Borrar paseos no lo resta.
create or replace function public.sumar_xp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('salchi.xp', 'on', true);
  update public.dogs
     set xp = xp + greatest(0, round(new.duration_s / 60.0 + new.distance_m / 100.0))::int,
         paseos = paseos + (case when new.duration_s >= 60 then 1 else 0 end)
   where id = new.dog_id;
  perform set_config('salchi.xp', 'off', true);
  return new;
end $$;
drop trigger if exists walks_xp on public.walks;
create trigger walks_xp after insert on public.walks
  for each row execute function public.sumar_xp();

-- Nadie cambia el dueño, la XP ni los paseos a mano; los logros solo se suman, nunca se pierden
create or replace function public.proteger_perro() returns trigger
language plpgsql as $$
begin
  new.user_id := old.user_id;
  if coalesce(current_setting('salchi.xp', true), 'off') <> 'on' then
    new.xp := old.xp;
    new.paseos := old.paseos;
  end if;
  new.logros := array(select distinct x from unnest(coalesce(old.logros, '{}') || coalesce(new.logros, '{}')) as x where x is not null order by x);
  return new;
end $$;
drop trigger if exists dogs_proteger on public.dogs;
create trigger dogs_proteger before update on public.dogs
  for each row execute function public.proteger_perro();

-- Avisos en vivo: la app escucha los paseos nuevos de los perros de tu familia
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'walks') then
    alter publication supabase_realtime add table public.walks;
  end if;
end $$;


-- =====================================================================
--  Guau Guau (antes Salchipaseo) · migración v10
--  · Cada perro tiene raza: salchicha, pug, golden u "otra"
--  · "No está mi perro": se guardan las razas que la gente pide
--  Supabase → SQL Editor → New query → pega todo → Run.
--  Es seguro ejecutarla más de una vez. Requiere la migración v9.
-- =====================================================================

alter table public.dogs add column if not exists breed text not null default 'salchicha';
alter table public.dogs add column if not exists breed_name text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'dogs_breed_check') then
    alter table public.dogs add constraint dogs_breed_check
      check (breed in ('salchicha', 'pug', 'golden', 'otra'));
  end if;
end $$;

-- Razas pedidas desde "No está mi perro"
create table if not exists public.breed_requests (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  breed       text not null check (char_length(trim(breed)) between 1 and 60),
  created_at  timestamptz not null default now()
);
create index if not exists breed_requests_user_idx on public.breed_requests (user_id);
alter table public.breed_requests enable row level security;
grant select, insert on public.breed_requests to authenticated;
drop policy if exists "pedidos: crear" on public.breed_requests;
create policy "pedidos: crear" on public.breed_requests for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "pedidos: ver los míos" on public.breed_requests;
create policy "pedidos: ver los míos" on public.breed_requests for select to authenticated
  using (user_id = (select auth.uid()));

-- Ranking de razas pedidas (míralo en Table Editor → razas_pedidas)
create or replace view public.razas_pedidas with (security_invoker = true) as
  select initcap(lower(trim(breed))) as raza,
         count(*)                    as pedidos,
         count(distinct user_id)     as personas,
         max(created_at)             as ultimo_pedido
    from public.breed_requests
   group by 1
   order by 2 desc, 4 desc;
grant select on public.razas_pedidas to authenticated;


-- =====================================================================
--  Guau Guau · migración v11
--  · "Eliminar mi cuenta" desde la app (lo exige Google Play)
--    Los perros que compartes con tu familia pasan a otra persona de la familia;
--    todo lo demás (perros propios, paseos, rutas, fotos, pedidos) se borra solo.
--  Supabase → SQL Editor → New query → pega todo → Run.
--  Es seguro ejecutarla más de una vez. Requiere la migración v10.
-- =====================================================================

-- Nadie cambia el dueño de un perro a mano, salvo el traspaso al eliminar una cuenta
create or replace function public.proteger_perro() returns trigger
language plpgsql as $$
begin
  if coalesce(current_setting('salchi.traspaso', true), 'off') <> 'on' then
    new.user_id := old.user_id;
  end if;
  if coalesce(current_setting('salchi.xp', true), 'off') <> 'on' then
    new.xp := old.xp;
    new.paseos := old.paseos;
  end if;
  new.logros := array(select distinct x from unnest(coalesce(old.logros, '{}') || coalesce(new.logros, '{}')) as x where x is not null order by x);
  return new;
end $$;

create or replace function public.borrar_mi_cuenta() returns void
language plpgsql security definer set search_path = public as $$
declare
  yo uuid := auth.uid();
  perro record;
  heredero uuid;
begin
  if yo is null then
    raise exception 'Necesitas iniciar sesión';
  end if;
  perform set_config('salchi.traspaso', 'on', true);
  for perro in select id from public.dogs where user_id = yo loop
    select m.user_id into heredero
      from public.dog_members m
     where m.dog_id = perro.id and m.user_id <> yo
     order by m.created_at
     limit 1;
    if heredero is not null then
      update public.dogs set user_id = heredero where id = perro.id;
      update public.dog_members set role = 'owner' where dog_id = perro.id and user_id = heredero;
    end if;
  end loop;
  perform set_config('salchi.traspaso', 'off', true);
  delete from auth.users where id = yo;
end $$;
revoke all on function public.borrar_mi_cuenta() from public, anon;
grant execute on function public.borrar_mi_cuenta() to authenticated;
