-- =====================================================================
--  Notes — Schéma Supabase (PostgreSQL)
--  À exécuter dans : Supabase Dashboard > SQL Editor > New query
--  Script idempotent : il peut être relancé sans erreur.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLE : modules
-- ---------------------------------------------------------------------
create table if not exists public.modules (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid()
                      references auth.users (id) on delete cascade,
  code              text not null
                      check (char_length(btrim(code)) between 1 and 32),
  name              text not null
                      check (char_length(btrim(name)) between 1 and 200),
  coefficient       numeric(6, 2) not null default 1.0
                      check (coefficient > 0),
  type              text not null default 'numeric'
                      check (type in ('numeric', 'status')),
  status_validation text
                      check (status_validation in ('Acquis', 'Non acquis', 'En cours')),
  created_at        timestamptz not null default now(),
  -- Le statut de validation n'a de sens que pour les modules de type 'status'
  constraint modules_status_only_for_status_type
    check (type = 'status' or status_validation is null)
);

-- Un code de module est unique par utilisateur (insensible à la casse)
create unique index if not exists modules_user_code_unique
  on public.modules (user_id, lower(code));

create index if not exists modules_user_id_idx on public.modules (user_id);

-- ---------------------------------------------------------------------
-- 2. TABLE : grades
-- ---------------------------------------------------------------------
create table if not exists public.grades (
  id          uuid primary key default gen_random_uuid(),
  module_id   uuid not null
                references public.modules (id) on delete cascade,
  user_id     uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
  title       text not null default 'Évaluation'
                check (char_length(btrim(title)) between 1 and 200),
  -- numeric(3,1) => arrondi automatique au dixième
  value       numeric(3, 1) not null
                check (value >= 1.0 and value <= 6.0),
  weight      numeric(6, 2) not null default 1.0
                check (weight > 0),
  date        date default current_date,
  remarks     text check (remarks is null or char_length(remarks) <= 2000),
  created_at  timestamptz not null default now()
);

create index if not exists grades_user_id_idx   on public.grades (user_id);
create index if not exists grades_module_id_idx on public.grades (module_id);

-- ---------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.modules enable row level security;
alter table public.grades  enable row level security;

-- Seuls les utilisateurs authentifiés ont accès aux tables
revoke all on public.modules from anon;
revoke all on public.grades  from anon;
grant select, insert, update, delete on public.modules to authenticated;
grant select, insert, update, delete on public.grades  to authenticated;

-- ---------- Policies : modules ----------
drop policy if exists "modules_select_own" on public.modules;
drop policy if exists "modules_insert_own" on public.modules;
drop policy if exists "modules_update_own" on public.modules;
drop policy if exists "modules_delete_own" on public.modules;

create policy "modules_select_own" on public.modules
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "modules_insert_own" on public.modules
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "modules_update_own" on public.modules
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "modules_delete_own" on public.modules
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------- Policies : grades ----------
-- En plus de user_id = auth.uid(), on vérifie que le module ciblé
-- appartient bien à l'utilisateur (impossible d'attacher une note au
-- module de quelqu'un d'autre).
drop policy if exists "grades_select_own" on public.grades;
drop policy if exists "grades_insert_own" on public.grades;
drop policy if exists "grades_update_own" on public.grades;
drop policy if exists "grades_delete_own" on public.grades;

create policy "grades_select_own" on public.grades
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "grades_insert_own" on public.grades
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.modules m
      where m.id = module_id and m.user_id = (select auth.uid())
    )
  );

create policy "grades_update_own" on public.grades
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.modules m
      where m.id = module_id and m.user_id = (select auth.uid())
    )
  );

create policy "grades_delete_own" on public.grades
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- =====================================================================
-- (Optionnel) Données de démonstration pour l'utilisateur connecté.
-- Exécuter depuis l'application n'est pas nécessaire ; à utiliser
-- uniquement en remplaçant <VOTRE_USER_ID> par votre UUID (Auth > Users).
-- ---------------------------------------------------------------------
-- insert into public.modules (user_id, code, name, coefficient, type) values
--   ('<VOTRE_USER_ID>', 'I320', 'Programmation orientée objet', 1.0, 'numeric'),
--   ('<VOTRE_USER_ID>', 'I322', 'Bases de données', 1.0, 'numeric'),
--   ('<VOTRE_USER_ID>', 'C107', 'Communication', 0.5, 'numeric');
-- insert into public.modules (user_id, code, name, type, status_validation) values
--   ('<VOTRE_USER_ID>', 'P_secu', 'Sécurité', 'status', 'En cours');
-- =====================================================================
