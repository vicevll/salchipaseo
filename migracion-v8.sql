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
