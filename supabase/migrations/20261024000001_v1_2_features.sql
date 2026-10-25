-- v1.2.0: case-insensitive technology filter, scheduled publishing,
-- per-project release notes, and privacy-friendly view counters.
-- Run after the three earlier migrations.

-- ---------------------------------------------------------------------------
-- 1. Technology keys (lower-cased, de-duplicated) + publish_at
-- ---------------------------------------------------------------------------
alter table public.projects add column if not exists tech_keys text[] not null default '{}';
alter table public.projects add column if not exists publish_at timestamptz;

create index if not exists projects_tech_keys_idx on public.projects using gin (tech_keys);
create index if not exists projects_publish_at_idx on public.projects (publish_at) where publish_at is not null;

-- A scheduled time only makes sense for drafts; publishing clears it (see trigger).
alter table public.projects drop constraint if exists projects_publish_at_draft_only;
alter table public.projects
  add constraint projects_publish_at_draft_only check (publish_at is null or publication_state = 'draft');

-- Replaces the earlier trigger function: same behaviour plus tech_keys and publish_at handling.
create or replace function public.projects_before_write()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();

  if new.publication_state = 'published' then
    if tg_op = 'INSERT' or old.publication_state is distinct from 'published' or new.published_at is null then
      new.published_at = coalesce(new.published_at, now());
    end if;
    new.publish_at = null;
  else
    new.published_at = null;
  end if;

  new.search_text = lower(
    coalesce(new.name, '') || ' ' ||
    coalesce(new.short_description, '') || ' ' ||
    coalesce(new.description, '') || ' ' ||
    coalesce(new.technologies::text, '') || ' ' ||
    coalesce(new.features::text, '')
  );

  new.tech_keys = coalesce(
    (select array_agg(distinct lower(btrim(t)))
       from jsonb_array_elements_text(new.technologies) as t
      where btrim(t) <> ''),
    '{}'::text[]
  );
  return new;
end;
$$;

-- Backfill existing rows without touching updated_at.
alter table public.projects disable trigger projects_before_write;
update public.projects
   set tech_keys = coalesce(
     (select array_agg(distinct lower(btrim(t)))
        from jsonb_array_elements_text(technologies) as t
       where btrim(t) <> ''),
     '{}'::text[]);
alter table public.projects enable trigger projects_before_write;

-- ---------------------------------------------------------------------------
-- 2. Scheduled publishing
-- Runs as the database owner (called by pg_cron); not callable through the API.
-- ---------------------------------------------------------------------------
create or replace function public.publish_due_projects()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  update public.projects
     set publication_state = 'published',
         published_at = publish_at
   where publication_state = 'draft'
     and publish_at is not null
     and publish_at <= now();
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.publish_due_projects() from public, anon, authenticated;

-- Needs the pg_cron extension (Database -> Extensions -> pg_cron). If it is not
-- available this block only prints a notice; enable the extension, then re-run it.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'traclabs-publish-due';
  perform cron.schedule('traclabs-publish-due', '* * * * *', 'select public.publish_due_projects()');
exception when others then
  raise notice 'pg_cron is not available (%). Scheduled publishing stays inactive until it is enabled.', sqlerrm;
end
$$;

-- ---------------------------------------------------------------------------
-- 3. Per-project release notes (shown as "Update history")
-- ---------------------------------------------------------------------------
create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  version text,
  note text not null,
  created_at timestamptz not null default now(),
  constraint project_updates_version_length check (version is null or char_length(version) between 1 and 20),
  constraint project_updates_note_length check (char_length(note) between 1 and 500)
);

create index if not exists project_updates_project_idx on public.project_updates (project_id, created_at desc);

alter table public.project_updates enable row level security;
revoke all on public.project_updates from anon, authenticated;
grant select on public.project_updates to anon, authenticated;
grant insert, update, delete on public.project_updates to authenticated;

-- The sub-select runs under the caller's RLS on projects, so anonymous visitors
-- only ever see notes of published projects.
drop policy if exists project_updates_read on public.project_updates;
create policy project_updates_read on public.project_updates
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and (p.publication_state = 'published' or public.is_admin())
    )
  );

drop policy if exists project_updates_admin_insert on public.project_updates;
create policy project_updates_admin_insert on public.project_updates
  for insert to authenticated with check (public.is_admin());

drop policy if exists project_updates_admin_update on public.project_updates;
create policy project_updates_admin_update on public.project_updates
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists project_updates_admin_delete on public.project_updates;
create policy project_updates_admin_delete on public.project_updates
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. View counters: one number per project per UTC day. No IP, no cookie, no
-- user id is stored. Counts are approximate (refreshes and bots can inflate them).
-- ---------------------------------------------------------------------------
create table if not exists public.project_view_counts (
  project_id uuid not null references public.projects (id) on delete cascade,
  day date not null default ((now() at time zone 'utc')::date),
  views integer not null default 0 check (views >= 0),
  primary key (project_id, day)
);

alter table public.project_view_counts enable row level security;
revoke all on public.project_view_counts from anon, authenticated;
grant select on public.project_view_counts to authenticated;

drop policy if exists project_view_counts_admin_read on public.project_view_counts;
create policy project_view_counts_admin_read on public.project_view_counts
  for select to authenticated using (public.is_admin());

-- The only way to write counters. Counts published projects only.
create or replace function public.record_project_view(p_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_slug is null or char_length(p_slug) > 120 then
    return;
  end if;

  insert into public.project_view_counts (project_id, day, views)
  select id, ((now() at time zone 'utc')::date), 1
    from public.projects
   where slug = p_slug and publication_state = 'published'
  on conflict (project_id, day)
  do update set views = public.project_view_counts.views + 1;
end;
$$;

revoke all on function public.record_project_view(text) from public;
grant execute on function public.record_project_view(text) to anon, authenticated;
