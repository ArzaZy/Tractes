-- Manual RLS verification. Run in the Supabase SQL editor AFTER migrations + seed.
-- Each block prints a notice; any "FAIL" means a policy is wrong.
-- Requires at least one draft project (the seed adds QRGen/Downexa as drafts).

do $$
declare n int;
begin
  -- 1. Anonymous: drafts must be invisible
  set local role anon;
  select count(*) into n from public.projects where publication_state = 'draft';
  if n = 0 then raise notice 'PASS anon cannot read drafts'; else raise notice 'FAIL anon can read % drafts', n; end if;

  -- 2. Anonymous: writes must be denied
  begin
    insert into public.projects (name, slug, short_description) values ('x', 'rls-anon-test', 'x');
    raise notice 'FAIL anon insert succeeded';
  exception when insufficient_privilege then
    raise notice 'PASS anon insert denied';
  end;

  begin
    update public.categories set name = 'hacked';
    get diagnostics n = row_count;
    if n = 0 then raise notice 'PASS anon category update affects 0 rows'; else raise notice 'FAIL anon updated categories'; end if;
  exception when insufficient_privilege then
    raise notice 'PASS anon category update denied';
  end;

  -- 3. Anonymous: allowlist must be unreadable
  begin
    perform 1 from public.admin_users limit 1;
    raise notice 'FAIL anon can query admin_users';
  exception when insufficient_privilege then
    raise notice 'PASS anon cannot query admin_users';
  end;

  reset role;
end $$;

-- v1.2.0 additions ---------------------------------------------------------------
do $$
declare n int;
begin
  set local role anon;

  -- Anonymous visitors must not read view counters or write release notes
  begin
    perform 1 from public.project_view_counts limit 1;
    raise notice 'FAIL anon can read project_view_counts';
  exception when insufficient_privilege then
    raise notice 'PASS anon cannot read project_view_counts';
  end;

  begin
    insert into public.project_updates (project_id, note) values (gen_random_uuid(), 'x');
    raise notice 'FAIL anon inserted a release note';
  exception when insufficient_privilege then
    raise notice 'PASS anon cannot insert release notes';
  end;

  -- Notes of draft projects must be invisible to anonymous visitors
  select count(*) into n from public.project_updates u
    join public.projects p on p.id = u.project_id where p.publication_state = 'draft';
  if n = 0 then raise notice 'PASS anon sees no notes of drafts'; else raise notice 'FAIL anon sees % draft notes', n; end if;

  -- The scheduler is not callable through the API
  begin
    perform public.publish_due_projects();
    raise notice 'FAIL anon can run publish_due_projects';
  exception when insufficient_privilege then
    raise notice 'PASS anon cannot run publish_due_projects';
  end;

  reset role;
end $$;
