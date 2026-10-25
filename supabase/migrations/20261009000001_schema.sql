-- TracLabs schema: tables, constraints, indexes, triggers.
-- Safe to run once via the Supabase CLI (supabase db push) or the SQL editor.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin allowlist (trusted authorization source)
-- Rows are inserted ONLY by the project owner through the SQL editor / service role.
-- No client-facing policy allows insert, update or delete.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER so policies on other tables can check the allowlist without
-- granting clients read access to it. search_path is pinned to avoid hijacking.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_length check (char_length(name) between 1 and 80),
  constraint categories_slug_format check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80
  ),
  constraint categories_description_length check (description is null or char_length(description) <= 500),
  constraint categories_icon_length check (icon is null or char_length(icon) <= 40)
);

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_description text not null,
  description text,
  website_url text,
  logo_url text,
  thumbnail_url text,
  -- Explicit deletion behaviour: deleting a category keeps the project, uncategorised.
  category_id uuid references public.categories (id) on delete set null,
  status text not null default 'development',
  publication_state text not null default 'draft',
  is_featured boolean not null default false,
  features jsonb not null default '[]'::jsonb,
  technologies jsonb not null default '[]'::jsonb,
  documentation_url text,
  source_code_url text,
  social_links jsonb not null default '{}'::jsonb,
  search_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,

  constraint projects_name_length check (char_length(name) between 1 and 120),
  constraint projects_slug_format check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120
  ),
  constraint projects_short_description_length check (char_length(short_description) between 1 and 300),
  constraint projects_description_length check (description is null or char_length(description) <= 20000),
  constraint projects_status_values check (status in ('development', 'beta', 'live', 'archived')),
  constraint projects_publication_values check (publication_state in ('draft', 'published')),
  constraint projects_features_array check (
    jsonb_typeof(features) = 'array' and jsonb_array_length(features) <= 30
  ),
  constraint projects_technologies_array check (
    jsonb_typeof(technologies) = 'array' and jsonb_array_length(technologies) <= 30
  ),
  constraint projects_social_links_object check (jsonb_typeof(social_links) = 'object'),
  -- Only http(s) links are accepted at the database layer too.
  constraint projects_website_url_http check (website_url is null or website_url ~* '^https?://[^\s]+$'),
  constraint projects_documentation_url_http check (documentation_url is null or documentation_url ~* '^https?://[^\s]+$'),
  constraint projects_source_code_url_http check (source_code_url is null or source_code_url ~* '^https?://[^\s]+$'),
  constraint projects_logo_url_http check (logo_url is null or logo_url ~* '^https?://[^\s]+$'),
  constraint projects_thumbnail_url_http check (thumbnail_url is null or thumbnail_url ~* '^https?://[^\s]+$')
);

create index if not exists projects_slug_idx on public.projects (slug);
create index if not exists projects_category_idx on public.projects (category_id);
create index if not exists projects_publication_idx on public.projects (publication_state);
create index if not exists projects_featured_idx on public.projects (is_featured) where is_featured;
create index if not exists projects_created_at_idx on public.projects (created_at desc);
create index if not exists projects_published_at_idx on public.projects (published_at desc);

-- Maintains updated_at, published_at and the denormalised search column.
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
  return new;
end;
$$;

drop trigger if exists projects_before_write on public.projects;
create trigger projects_before_write
  before insert or update on public.projects
  for each row execute function public.projects_before_write();

-- ---------------------------------------------------------------------------
-- site_settings: a single public row. Contains NO secrets by design.
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  id smallint primary key default 1,
  site_name text not null default 'TracLabs',
  tagline text not null default 'Your Digital Projects, One Place.',
  logo_url text,
  default_theme text not null default 'dark',
  contact_email text,
  social_links jsonb not null default '{}'::jsonb,
  seo_title text,
  seo_description text,
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1),
  constraint site_settings_theme_values check (default_theme in ('dark', 'light')),
  constraint site_settings_name_length check (char_length(site_name) between 1 and 80),
  constraint site_settings_tagline_length check (char_length(tagline) <= 160),
  constraint site_settings_social_object check (jsonb_typeof(social_links) = 'object'),
  constraint site_settings_email_format check (
    contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  constraint site_settings_logo_http check (logo_url is null or logo_url ~* '^https?://[^\s]+$'),
  constraint site_settings_seo_title_length check (seo_title is null or char_length(seo_title) <= 70),
  constraint site_settings_seo_description_length check (seo_description is null or char_length(seo_description) <= 200)
);

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Public category counts, derived from real rows. security_invoker makes the
-- view respect the caller's RLS, so anonymous callers can only ever count
-- published projects.
-- ---------------------------------------------------------------------------
create or replace view public.category_project_counts
with (security_invoker = true) as
select
  c.id as category_id,
  count(p.id) filter (where p.publication_state = 'published')::int as published_count
from public.categories c
left join public.projects p on p.category_id = c.id
group by c.id;
