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
