-- Idempotent seed. Safe to run any number of times.

insert into public.categories (name, slug, description, icon) values
  ('AI Tools',        'ai-tools',        'Tools powered by artificial intelligence.',          'Sparkles'),
  ('Developer Tools', 'developer-tools', 'Utilities that make building software easier.',      'Code2'),
  ('Productivity',    'productivity',    'Apps that help you get more done.',                  'CheckSquare'),
  ('Media Tools',     'media-tools',     'Tools for working with images, audio and video.',    'Clapperboard'),
  ('Web Apps',        'web-apps',        'Full web applications and online services.',         'Globe'),
  ('Games',           'games',           'Games and playful experiments.',                     'Gamepad2'),
  ('Utilities',       'utilities',       'Small, focused tools for everyday tasks.',           'Wrench'),
  ('Other',           'other',           'Everything else built at TracLabs.',                 'Boxes')
on conflict (slug) do nothing;

insert into public.site_settings (id) values (1)
on conflict (id) do nothing;

-- Starter DRAFT projects. They stay hidden from visitors until the owner adds
-- verified URLs/descriptions in the admin dashboard and publishes them.
insert into public.projects (name, slug, short_description, category_id, status, publication_state, technologies)
select 'QRGen', 'qrgen', 'A QR code generator.', c.id, 'development', 'draft', '[]'::jsonb
from public.categories c where c.slug = 'utilities'
on conflict (slug) do nothing;

insert into public.projects (name, slug, short_description, category_id, status, publication_state, technologies)
select 'Downexa', 'downexa', 'A media utility project.', c.id, 'development', 'draft', '[]'::jsonb
from public.categories c where c.slug = 'media-tools'
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- FIRST ADMIN SETUP (run manually in the Supabase SQL editor, after creating
-- the user under Authentication -> Users). Replace the email, then run:
--
--   insert into public.admin_users (user_id)
--   select id from auth.users where email = 'owner@example.com'
--   on conflict do nothing;
--
-- This is intentionally NOT executed by the seed.
-- ---------------------------------------------------------------------------
