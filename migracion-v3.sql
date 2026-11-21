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
