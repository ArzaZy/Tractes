-- Row Level Security. Authorization is decided here, never in the frontend.

alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.projects enable row level security;
alter table public.site_settings enable row level security;

-- Start from zero privileges, then grant only what is needed.
revoke all on public.admin_users from anon, authenticated;
revoke all on public.categories from anon, authenticated;
revoke all on public.projects from anon, authenticated;
revoke all on public.site_settings from anon, authenticated;
revoke all on public.category_project_counts from anon, authenticated;

-- admin_users: nobody can read or write it through the API. is_admin() is the
-- only supported interface (SECURITY DEFINER). No policies exist on purpose.

-- categories ----------------------------------------------------------------
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;

drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories
  for select to anon, authenticated using (true);

drop policy if exists categories_admin_insert on public.categories;
create policy categories_admin_insert on public.categories
  for insert to authenticated with check (public.is_admin());

drop policy if exists categories_admin_update on public.categories;
create policy categories_admin_update on public.categories
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists categories_admin_delete on public.categories;
create policy categories_admin_delete on public.categories
  for delete to authenticated using (public.is_admin());

-- projects ------------------------------------------------------------------
-- Column list excludes nothing sensitive, but search_text stays server-side use only.
grant select on public.projects to anon, authenticated;
grant insert, update, delete on public.projects to authenticated;

drop policy if exists projects_public_read on public.projects;
create policy projects_public_read on public.projects
  for select to anon, authenticated
  using (publication_state = 'published' or public.is_admin());

drop policy if exists projects_admin_insert on public.projects;
create policy projects_admin_insert on public.projects
  for insert to authenticated with check (public.is_admin());

drop policy if exists projects_admin_update on public.projects;
create policy projects_admin_update on public.projects
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists projects_admin_delete on public.projects;
create policy projects_admin_delete on public.projects
  for delete to authenticated using (public.is_admin());

-- site_settings ---------------------------------------------------------------
grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;

drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings
  for select to anon, authenticated using (true);

drop policy if exists site_settings_admin_update on public.site_settings;
create policy site_settings_admin_update on public.site_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Row creation is handled by seed.sql (owner / service role), not by clients.

-- category counts view ------------------------------------------------------------
grant select on public.category_project_counts to anon, authenticated;
