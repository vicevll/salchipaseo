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
