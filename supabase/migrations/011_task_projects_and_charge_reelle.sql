-- Le Studio — Kanban : migration 011
-- À exécuter dans le SQL Editor de ton projet Supabase (safe à rejouer).
--
-- Deux nouveautés :
--   1. "charge_reelle" sur les tâches : le consommé réel (jours), à côté
--      de la charge estimée existante ("charge").
--   2. Association d'un ticket à plusieurs projets via la table
--      "task_projects" (même schéma que task_designers). L'ancienne
--      colonne "tasks.projet_id" est conservée (le formulaire public
--      demande-form continue de l'utiliser pour créer une tâche avec un
--      seul projet) et sert de repli pour les tâches sans ligne dans
--      task_projects — le frontend combine les deux.

alter table tasks add column if not exists charge_reelle numeric not null default 0;

create table if not exists task_projects (
  task_id uuid not null references tasks(id) on delete cascade,
  projet_id uuid not null references projects(id) on delete cascade,
  primary key (task_id, projet_id)
);

alter table task_projects enable row level security;

drop policy if exists "authenticated read task_projects" on task_projects;
create policy "authenticated read task_projects" on task_projects for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated insert task_projects" on task_projects;
create policy "authenticated insert task_projects" on task_projects for insert with check (is_editor());
drop policy if exists "authenticated update task_projects" on task_projects;
create policy "authenticated update task_projects" on task_projects for update using (is_editor());
drop policy if exists "authenticated delete task_projects" on task_projects;
create policy "authenticated delete task_projects" on task_projects for delete using (is_editor());

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'task_projects') then
    alter publication supabase_realtime add table task_projects;
  end if;
end $$;

-- Rattrapage : reflète le projet déjà présent sur chaque tâche existante.
insert into task_projects (task_id, projet_id)
select id, projet_id from tasks where projet_id is not null
on conflict do nothing;
