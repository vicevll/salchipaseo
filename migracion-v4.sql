-- =====================================================================
--  Salchipaseo · migración v4 (mínimo por paseo)
--  Supabase → SQL Editor → New query → pega esto → Run.
--  No borra nada y se puede ejecutar más de una vez.
-- =====================================================================
alter table public.dogs
  add column if not exists walk_min_minutes integer
  check (walk_min_minutes is null or walk_min_minutes between 1 and 240);
