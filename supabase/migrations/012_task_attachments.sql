-- Le Studio — Kanban : migration 012
-- À exécuter dans le SQL Editor de ton projet Supabase (safe à rejouer).
--
-- Pièces jointes : un ticket peut avoir plusieurs liens vers des documents
-- stockés ailleurs (SharePoint d'équipe, etc.) — pas de stockage de
-- fichiers côté Kanban, juste un nom + une URL.

create table if not exists task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  label text not null,
  url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table task_attachments enable row level security;

drop policy if exists "authenticated read task_attachments" on task_attachments;
create policy "authenticated read task_attachments" on task_attachments for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated insert task_attachments" on task_attachments;
create policy "authenticated insert task_attachments" on task_attachments for insert with check (is_editor());
drop policy if exists "authenticated update task_attachments" on task_attachments;
create policy "authenticated update task_attachments" on task_attachments for update using (is_editor());
drop policy if exists "authenticated delete task_attachments" on task_attachments;
create policy "authenticated delete task_attachments" on task_attachments for delete using (is_editor());

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'task_attachments') then
    alter publication supabase_realtime add table task_attachments;
  end if;
end $$;
